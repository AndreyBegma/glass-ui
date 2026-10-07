import { afterEach, describe, expect, mock, test } from 'bun:test';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { type TraceNode, TraceTree, type TraceTreeProps } from './trace-tree';

/**
 * FEAT-20261007-067 — TraceTree. D7: the WAI-ARIA `treegrid`, with `Tree`'s
 * keyboard contract, a waterfall relative to the roots' span, and everything
 * that is a fact about the data controlled by the consumer.
 */

/*
 * root   turn   0 … 100
 * ├ plan llm    0 … 40
 * ├ grep tool  40 … (running → root end, 100)
 * │ └ sub agent 50 … 60
 * └ fail other 80 … 100, error
 */
const NODES: TraceNode[] = [
  {
    id: 'root',
    label: 'Turn 1',
    kind: 'turn',
    start: 0,
    end: 100,
    totals: '1.2k tok',
    children: [
      { id: 'plan', label: 'Plan', kind: 'llm', start: 0, end: 40, meta: 'opus' },
      {
        id: 'grep',
        label: 'Grep',
        kind: 'tool',
        start: 40,
        status: 'running',
        children: [{ id: 'sub', label: 'Sub-agent', kind: 'agent', start: 50, end: 60 }],
      },
      { id: 'fail', label: 'Fail', kind: 'other', start: 80, end: 100, status: 'error' },
    ],
  },
];

type HarnessProps = Partial<TraceTreeProps> & {
  initialExpanded?: string[];
  initialSelected?: string;
  onExpandedSpy?: (next: ReadonlySet<string>) => void;
  onSelectSpy?: (id: string) => void;
};

/** Expansion and selection are controlled, so the test owns them the way an application would. */
function Harness({
  initialExpanded = ['root'],
  initialSelected,
  onExpandedSpy,
  onSelectSpy,
  nodes = NODES,
  ...rest
}: HarnessProps) {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(
    () => new Set(initialExpanded),
  );
  const [selected, setSelected] = useState(initialSelected);
  return (
    <TraceTree
      nodes={nodes}
      expanded={expanded}
      onExpandedChange={(next) => {
        onExpandedSpy?.(next);
        setExpanded(next);
      }}
      selected={selected}
      onSelect={(id) => {
        onSelectSpy?.(id);
        setSelected(id);
      }}
      {...rest}
    />
  );
}

/** The tree's own rows — the header row carries no `aria-level`. */
const rows = () =>
  screen
    .getAllByRole('row')
    .filter((row) => row.hasAttribute('aria-level'));

const row = (name: string) => screen.getByRole('row', { name });
const labels = () => rows().map((r) => labelOf(r));
const labelOf = (r: HTMLElement) =>
  document.getElementById(r.getAttribute('aria-labelledby') ?? '')?.textContent;
const tabStops = () => rows().filter((r) => r.tabIndex === 0);
const bar = (name: string) =>
  row(name).querySelector<HTMLElement>('[data-trace-bar]') as HTMLElement;
const key = (target: Element, k: string) => {
  act(() => {
    fireEvent.keyDown(target, { key: k });
  });
};

describe('TraceTree', () => {
  test('is a treegrid with flat rows carrying level, position and expansion', () => {
    render(<Harness />);
    expect(screen.getByRole('treegrid', { name: 'Trace' })).toBeTruthy();
    expect(labels()).toEqual(['Turn 1', 'Plan', 'Grep', 'Fail']);
    expect(row('Turn 1').getAttribute('aria-level')).toBe('1');
    expect(row('Turn 1').getAttribute('aria-expanded')).toBe('true');
    expect(row('Grep').getAttribute('aria-expanded')).toBe('false');
    expect(row('Plan').hasAttribute('aria-expanded')).toBe(false);
    expect(row('Grep').getAttribute('aria-level')).toBe('2');
    expect(row('Grep').getAttribute('aria-posinset')).toBe('2');
    expect(row('Grep').getAttribute('aria-setsize')).toBe('3');
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
      'Name',
      'Details',
      'Timeline',
      'Totals',
    ]);
  });

  test('arrows move and expand, Home/End jump, Enter activates, one tab stop', () => {
    const onSelect = mock((_id: string) => {});
    render(<Harness onSelectSpy={onSelect} />);

    // One tab stop, on the first row when nothing is focused or selected.
    expect(tabStops()).toEqual([row('Turn 1')]);

    act(() => row('Turn 1').focus());
    key(row('Turn 1'), 'ArrowUp');
    expect(document.activeElement).toBe(row('Turn 1'));

    key(row('Turn 1'), 'ArrowDown');
    expect(document.activeElement).toBe(row('Plan'));
    expect(tabStops()).toEqual([row('Plan')]);

    key(row('Plan'), 'ArrowRight'); // a leaf: nothing
    expect(document.activeElement).toBe(row('Plan'));

    key(row('Plan'), 'ArrowDown');
    expect(document.activeElement).toBe(row('Grep'));

    // Right on a closed parent opens it and stays…
    key(row('Grep'), 'ArrowRight');
    expect(row('Grep').getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(row('Grep'));
    // …and on an open one moves to its first child.
    key(row('Grep'), 'ArrowRight');
    expect(document.activeElement).toBe(row('Sub-agent'));

    // Left on a child moves to its parent; on an open parent, closes it.
    key(row('Sub-agent'), 'ArrowLeft');
    expect(document.activeElement).toBe(row('Grep'));
    key(row('Grep'), 'ArrowLeft');
    expect(row('Grep').getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('row', { name: 'Sub-agent' })).toBeNull();

    key(row('Grep'), 'End');
    expect(document.activeElement).toBe(row('Fail'));
    key(row('Fail'), 'ArrowDown'); // the last row: nothing
    expect(document.activeElement).toBe(row('Fail'));
    key(row('Fail'), 'Home');
    expect(document.activeElement).toBe(row('Turn 1'));

    key(row('Turn 1'), 'End');
    key(row('Fail'), 'Enter');
    expect(onSelect).toHaveBeenLastCalledWith('fail');
    expect(row('Fail').getAttribute('aria-selected')).toBe('true');
    key(row('Fail'), ' ');
    expect(onSelect).toHaveBeenCalledTimes(2);

    // Still exactly one stop, wherever the person has been.
    expect(tabStops()).toEqual([row('Fail')]);
  });

  test('the tab stop falls back to the selected row', () => {
    render(<Harness initialSelected="plan" />);
    expect(tabStops()).toEqual([row('Plan')]);
  });

  test('`*` opens every parent among the siblings', () => {
    const spy = mock((_next: ReadonlySet<string>) => {});
    render(<Harness onExpandedSpy={spy} />);
    key(row('Plan'), '*');
    expect([...(spy.mock.calls[0]?.[0] ?? [])].sort()).toEqual(['grep', 'root']);
  });

  test('clicking a row selects it; clicking the chevron toggles without selecting', () => {
    const onSelect = mock((_id: string) => {});
    render(<Harness onSelectSpy={onSelect} />);
    act(() => {
      fireEvent.click(row('Plan'));
    });
    expect(onSelect).toHaveBeenLastCalledWith('plan');
    expect(document.activeElement).toBe(row('Plan'));

    const chevron = row('Grep').querySelector('[data-trace-chevron]') as Element;
    act(() => {
      fireEvent.click(chevron);
    });
    expect(row('Grep').getAttribute('aria-expanded')).toBe('true');
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  test('bars are positioned proportionally to start/end (computed style)', () => {
    render(<Harness />);
    const style = (name: string) => getComputedStyle(bar(name));
    expect(style('Turn 1').left).toBe('0%');
    expect(style('Turn 1').width).toBe('100%');
    expect(style('Plan').left).toBe('0%');
    expect(style('Plan').width).toBe('40%');
    expect(style('Fail').left).toBe('80%');
    expect(style('Fail').width).toBe('20%');
  });

  test('the span runs from the earliest root start to the latest root end', () => {
    render(
      <Harness
        nodes={[
          { id: 'a', label: 'A', kind: 'turn', start: 100, end: 150 },
          { id: 'b', label: 'B', kind: 'turn', start: 150, end: 300 },
        ]}
      />,
    );
    expect(getComputedStyle(bar('A')).left).toBe('0%');
    expect(getComputedStyle(bar('A')).width).toBe('25%');
    expect(getComputedStyle(bar('B')).left).toBe('25%');
    expect(getComputedStyle(bar('B')).width).toBe('75%');
  });

  test('a zero-length span renders without NaN', () => {
    render(<Harness nodes={[{ id: 'a', label: 'A', kind: 'llm', start: 5, end: 5 }]} />);
    expect(getComputedStyle(bar('A')).left).toBe('0%');
    expect(getComputedStyle(bar('A')).width).toBe('0%');
  });

  test("running nodes extend to the root's end", () => {
    render(<Harness />);
    // Grep starts at 40 with no end; the root's end (100) is "now".
    expect(getComputedStyle(bar('Grep')).left).toBe('40%');
    expect(getComputedStyle(bar('Grep')).width).toBe('60%');
    expect(bar('Grep').className).toContain('motion-safe:animate-pulse');
    expect(bar('Plan').className).not.toContain('animate-pulse');
    expect(row('Grep').textContent).toContain('Running');
  });

  test('a running root without an end ends at the latest time beneath it', () => {
    render(
      <Harness
        nodes={[
          {
            id: 'r',
            label: 'Root',
            kind: 'turn',
            start: 0,
            status: 'running',
            children: [
              { id: 'x', label: 'X', kind: 'llm', start: 0, end: 50 },
              { id: 'y', label: 'Y', kind: 'tool', start: 50 },
            ],
          },
        ]}
        initialExpanded={['r']}
      />,
    );
    expect(getComputedStyle(bar('Root')).width).toBe('100%');
    expect(getComputedStyle(bar('X')).width).toBe('100%');
    expect(getComputedStyle(bar('Y')).left).toBe('100%');
  });

  test('expanding calls onExpandedChange and renders nothing it did not receive', () => {
    const onExpandedChange = mock((_next: ReadonlySet<string>) => {});
    const expanded = new Set(['root']);
    render(
      <TraceTree nodes={NODES} expanded={expanded} onExpandedChange={onExpandedChange} />,
    );
    // Sub-agent sits under a closed parent: not in the DOM at all.
    expect(screen.queryByText('Sub-agent')).toBeNull();

    key(row('Grep'), 'ArrowRight');
    expect(onExpandedChange).toHaveBeenCalledTimes(1);
    const next = onExpandedChange.mock.calls[0]?.[0] as ReadonlySet<string>;
    expect([...next].sort()).toEqual(['grep', 'root']);
    // A new set, not the one it was handed.
    expect(next).not.toBe(expanded);
    expect(expanded.has('grep')).toBe(false);
    // Nothing renders until the consumer passes the set back.
    expect(screen.queryByText('Sub-agent')).toBeNull();
    expect(row('Grep').getAttribute('aria-expanded')).toBe('false');

    key(row('Turn 1'), 'ArrowLeft');
    const closed = onExpandedChange.mock.calls[1]?.[0] as ReadonlySet<string>;
    expect([...closed]).toEqual([]);
    expect(rows()).toHaveLength(4);
  });

  test('colour is never the only signal: kind and error carry an icon and text', () => {
    render(<Harness />);
    expect(row('Plan').textContent).toContain('Model call');
    expect(row('Grep').textContent).toContain('Tool call');
    expect(row('Turn 1').textContent).toContain('Turn');
    expect(row('Fail').textContent).toContain('Error');
    expect(row('Fail').querySelector('svg')).toBeTruthy();
  });

  test('bar colours come from tokens by kind, and an error is danger', () => {
    render(<Harness initialExpanded={['root', 'grep']} />);
    expect(bar('Turn 1').className).toContain('bg-ink-3');
    expect(bar('Plan').className).toContain('bg-ink-2');
    expect(bar('Grep').className).toContain('bg-[var(--color-accent,var(--color-ink))]');
    expect(bar('Sub-agent').className).toContain('bg-ok');
    expect(bar('Fail').className).toContain('bg-danger');
    expect(bar('Fail').className).not.toContain('bg-line-strong');
  });

  test('labels and kind names are the consumer\'s', () => {
    render(
      <Harness
        aria-label="Run 42"
        labels={{ name: 'Span', timeline: 'Zeit', kinds: { llm: 'LLM' }, error: 'Fehler' }}
      />,
    );
    expect(screen.getByRole('treegrid', { name: 'Run 42' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Span' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Zeit' })).toBeTruthy();
    expect(row('Plan').textContent).toContain('LLM');
    expect(row('Fail').textContent).toContain('Fehler');
  });

  test('optional columns follow the data unless set', () => {
    const plain: TraceNode[] = [{ id: 'a', label: 'A', kind: 'llm', start: 0, end: 1 }];
    const { unmount } = render(<Harness nodes={plain} />);
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
      'Name',
      'Timeline',
    ]);
    expect(screen.getByRole('treegrid').getAttribute('aria-colcount')).toBe('2');
    unmount();

    render(<Harness columns={{ meta: false, totals: true }} />);
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
      'Name',
      'Timeline',
      'Totals',
    ]);
    expect(row('Turn 1').querySelectorAll('[role="gridcell"]')).toHaveLength(3);
  });

  test('renders 500 visible rows', () => {
    const children: TraceNode[] = Array.from({ length: 499 }, (_, i) => ({
      id: `n${i}`,
      label: `Span ${i}`,
      kind: (['llm', 'tool', 'agent', 'other'] as const)[i % 4],
      start: i,
      end: i + 1,
    }));
    render(
      <Harness
        nodes={[{ id: 'r', label: 'Root', kind: 'turn', start: 0, end: 500, children }]}
        initialExpanded={['r']}
      />,
    );
    expect(rows()).toHaveLength(500);
    expect(tabStops()).toHaveLength(1);
    expect(getComputedStyle(bar('Span 250')).left).toBe('50%');
    key(row('Root'), 'End');
    expect(document.activeElement).toBe(row('Span 498'));
  });

  describe('renders under data-theme light, dark and data-material flat', () => {
    const root = document.documentElement;
    afterEach(() => {
      root.removeAttribute('data-theme');
      root.removeAttribute('data-material');
    });

    for (const [attr, value] of [
      ['data-theme', 'light'],
      ['data-theme', 'dark'],
      ['data-material', 'flat'],
    ] as const) {
      test(`${attr}="${value}"`, () => {
        root.setAttribute(attr, value);
        render(<Harness initialSelected="plan" />);
        const grid = screen.getByRole('treegrid');
        // A solid surface (D3): token classes, never glass.
        expect(grid.className).toContain('bg-surface');
        expect(grid.className).toContain('border-line');
        expect(grid.outerHTML).not.toContain('glass');
        // The selected row is the accent-soft tint, falling back to hover.
        expect(row('Plan').className).toContain(
          'bg-[var(--color-accent-soft,var(--color-hover))]',
        );
        expect(rows()).toHaveLength(4);
      });
    }
  });

  test('touch targets are at least 44px on a coarse pointer', () => {
    render(<Harness />);
    for (const r of rows()) {
      // `--size-tap` is 44 px and the desk profile does not shrink it.
      expect(r.className).toContain('pointer-coarse:min-h-(--size-tap)');
    }
    const chevrons = document.querySelectorAll('[data-trace-chevron]');
    expect(chevrons.length).toBe(2);
    for (const chevron of chevrons) {
      expect(chevron.className).toContain('pointer-coarse:size-11');
    }
  });
});
