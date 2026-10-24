import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { createTwoFilesPatch } from 'diff';
import { useState } from 'react';
import { DiffView } from './diff-view';
import { buildDiff, splitRows } from './diff-view-model';

const lines = (n: number, from = 1) =>
  `${Array.from({ length: n }, (_, i) => `line ${from + i}`).join('\n')}\n`;

/** The text of every line row, as a screen reader reads it. */
function lineRows(container: HTMLElement) {
  return [...container.querySelectorAll('td[data-kind]')]
    .filter((td) => td.getAttribute('aria-hidden') !== 'true')
    .map((td) => td.textContent);
}

const original = window.matchMedia;
function viewport(width: number) {
  window.matchMedia = ((query: string) => {
    const min = query.match(/min-width: (\d+)px/);
    const max = query.match(/max-width: (\d+)px/);
    return {
      media: query,
      matches:
        (!min || width >= Number(min[1])) && (!max || width <= Number(max[1])),
      addEventListener: () => {},
      removeEventListener: () => {},
    };
  }) as unknown as typeof window.matchMedia;
}
afterEach(() => {
  window.matchMedia = original;
});

describe('buildDiff', () => {
  test('numbers old and new lines separately', () => {
    const { rows } = buildDiff({ oldText: 'a\nb\nc\n', newText: 'a\nB\nc\n' });
    expect(rows.map((r) => (r.type === 'line' ? r.line : null))).toEqual([
      { kind: 'context', text: 'a', oldNo: 1, newNo: 1 },
      expect.objectContaining({ kind: 'del', text: 'b', oldNo: 2 }),
      expect.objectContaining({ kind: 'add', text: 'B', newNo: 2 }),
      { kind: 'context', text: 'c', oldNo: 3, newNo: 3 },
    ]);
  });

  test('a modified pair carries the words that changed', () => {
    const { rows } = buildDiff({
      oldText: 'const a = 1;\n',
      newText: 'const a = 2;\n',
    });
    const [del, add] = rows.map((r) => (r.type === 'line' ? r.line : null));
    expect(del?.words?.filter((w) => w.changed).map((w) => w.text)).toEqual(['1']);
    expect(add?.words?.filter((w) => w.changed).map((w) => w.text)).toEqual(['2']);
  });

  test('a replacement with nothing in common is not emphasised', () => {
    const { rows } = buildDiff({ oldText: 'alpha\n', newText: 'omega\n' });
    expect(rows.every((r) => r.type === 'line' && !r.line.words)).toBe(true);
  });

  test('keeps `context` lines around a change and folds the rest', () => {
    const oldText = lines(20);
    const newText = oldText.replace('line 10\n', 'line ten\n');
    const { rows } = buildDiff({ oldText, newText }, 2);
    expect(rows.map((r) => (r.type === 'gap' ? `gap ${r.count}` : r.line.text))).toEqual([
      'gap 7',
      'line 8',
      'line 9',
      'line 10',
      'line ten',
      'line 11',
      'line 12',
      'gap 8',
    ]);
  });

  test('split pairs a change block row by row, filler opposite the longer side', () => {
    const { rows } = buildDiff({ oldText: 'a\nb\nz\n', newText: 'a\nc\nd\ne\nz\n' });
    const split = splitRows(rows).map((r) =>
      r.type === 'pair' ? [r.left?.text ?? null, r.right?.text ?? null] : r.type,
    );
    expect(split).toEqual([
      ['a', 'a'],
      ['b', 'c'],
      [null, 'd'],
      [null, 'e'],
      ['z', 'z'],
    ]);
  });
});

describe('DiffView', () => {
  // The test DOM is a phone; the switch and split mode live above the tablet edge.
  beforeEach(() => viewport(1280));

  test('identical input renders the empty state "No changes"', () => {
    render(<DiffView oldText={'a\nb\n'} newText={'a\nb\n'} fileName="a.txt" />);
    expect(screen.getByText('No changes')).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByText('a.txt')).toBeTruthy();
  });

  test('one insertion and one deletion are counted', () => {
    const { container } = render(
      <DiffView oldText={'a\nb\nc\n'} newText={'a\nc\nd\n'} />,
    );
    expect(screen.getByText('1 addition, 1 deletion')).toBeTruthy();
    expect(container.textContent).toContain('+1');
    expect(container.textContent).toContain('−1');
    expect(lineRows(container)).toEqual([
      'line 1: a',
      'removed line 2: b',
      'line 2: c',
      'added line 3: d',
    ]);
  });

  test('a changed line is signed, not only tinted', () => {
    const { container } = render(<DiffView oldText={'a\n'} newText={'b\n'} />);
    const signs = [...container.querySelectorAll('tr')].map(
      (tr) => tr.children[2]?.textContent,
    );
    expect(signs).toEqual(['−', '+']);
    expect(container.querySelector('td[data-kind="add"]')?.className).toContain('bg-ok/10');
    expect(container.querySelector('td[data-kind="del"]')?.className).toContain(
      'bg-danger/10',
    );
  });

  test('changed words within a modified line are marked', () => {
    const { container } = render(
      <DiffView oldText={'let x = 1;\n'} newText={'let x = 2;\n'} />,
    );
    expect([...container.querySelectorAll('mark')].map((m) => m.textContent)).toEqual([
      '1',
      '2',
    ]);
  });

  test('split mode aligns filler rows', () => {
    const { container } = render(
      <DiffView oldText={'a\nb\nz\n'} newText={'a\nc\nd\ne\nz\n'} defaultMode="split" />,
    );
    const table = screen.getByRole('table');
    expect(table.getAttribute('data-mode')).toBe('split');
    const rows = [...container.querySelectorAll('tbody tr')];
    expect(rows).toHaveLength(5);
    const fillers = rows.map((tr) => tr.querySelectorAll('[data-filler]').length);
    expect(fillers).toEqual([0, 0, 1, 1, 0]);
    // The filler sits on the left, opposite the insertions.
    expect(rows[2].children[2].hasAttribute('data-filler')).toBe(true);
    expect(rows[2].children[5].textContent).toBe('added line 3: d');
    // An unchanged pair is read once, from the left.
    expect(lineRows(container)).toEqual([
      'line 1: a',
      'removed line 2: b',
      'added line 2: c',
      'added line 3: d',
      'added line 4: e',
      'line 5: z',
    ]);
  });

  test('a collapsed unchanged run expands in place', () => {
    const oldText = lines(20);
    const newText = oldText.replace('line 10\n', 'line ten\n');
    const { container } = render(<DiffView oldText={oldText} newText={newText} />);
    expect(container.textContent).not.toContain('line 3');
    fireEvent.click(screen.getByRole('button', { name: '6 unchanged lines' }));
    expect(screen.queryByRole('button', { name: '6 unchanged lines' })).toBeNull();
    const rows = lineRows(container);
    expect(rows[0]).toBe('line 1: line 1');
    expect(rows[6]).toBe('line 7: line 7');
    // The run after the change is still folded.
    expect(screen.getByRole('button', { name: '7 unchanged lines' })).toBeTruthy();
  });

  test('`context` sets how many unchanged lines are kept', () => {
    const oldText = lines(20);
    const newText = oldText.replace('line 10\n', 'line ten\n');
    render(<DiffView oldText={oldText} newText={newText} context={1} />);
    expect(screen.getByRole('button', { name: '8 unchanged lines' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '9 unchanged lines' })).toBeTruthy();
  });

  test('patch input renders the same rows as the equivalent oldText and newText', () => {
    const oldText = lines(30);
    const newText = oldText
      .replace('line 5\n', 'line five\n')
      .replace('line 20\n', 'line 20\nline 20b\n')
      .replace('line 28\n', '');
    const patch = createTwoFilesPatch('a.txt', 'a.txt', oldText, newText, '', '', {
      context: 3,
    });
    const fromText = render(<DiffView oldText={oldText} newText={newText} />);
    const textRows = lineRows(fromText.container);
    const textGaps = [...fromText.container.querySelectorAll('[data-gap]')].map(
      (g) => g.textContent,
    );
    fromText.unmount();
    const fromPatch = render(<DiffView oldText="" newText="" patch={patch} />);
    expect(lineRows(fromPatch.container)).toEqual(textRows);
    expect(
      [...fromPatch.container.querySelectorAll('[data-gap]')].map((g) => g.textContent),
    ).toEqual(textGaps);
    expect(screen.getByText('2 additions, 2 deletions')).toBeTruthy();
    // A gap between hunks has no lines to show.
    expect(screen.queryByRole('button', { name: /unchanged/ })).toBeNull();
  });

  test('mode is controllable', () => {
    const seen: string[] = [];
    function Host() {
      const [mode, setMode] = useState<'unified' | 'split'>('unified');
      return (
        <DiffView
          oldText={'a\n'}
          newText={'b\n'}
          mode={mode}
          onModeChange={(next) => {
            seen.push(next);
            setMode(next);
          }}
        />
      );
    }
    render(<Host />);
    expect(screen.getByRole('table').getAttribute('data-mode')).toBe('unified');
    fireEvent.click(screen.getByRole('button', { name: 'Split' }));
    expect(seen).toEqual(['split']);
    expect(screen.getByRole('table').getAttribute('data-mode')).toBe('split');
    expect(screen.getByRole('button', { name: 'Split' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
  });

  test('a controlled mode ignores the click until the parent agrees', () => {
    const seen: string[] = [];
    render(
      <DiffView oldText={'a\n'} newText={'b\n'} mode="unified" onModeChange={(m) => seen.push(m)} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Split' }));
    expect(seen).toEqual(['split']);
    expect(screen.getByRole('table').getAttribute('data-mode')).toBe('unified');
  });

  test('below the tablet edge split renders unified and the switch is hidden', () => {
    viewport(400);
    render(<DiffView oldText={'a\n'} newText={'b\n'} defaultMode="split" />);
    expect(screen.getByRole('table').getAttribute('data-mode')).toBe('unified');
    expect(screen.queryByRole('button', { name: 'Split' })).toBeNull();
  });

  test('every visible string has a labels override', () => {
    render(
      <DiffView
        oldText={lines(12)}
        newText={lines(12).replace('line 12\n', 'line twelve\n')}
        labels={{
          unified: 'Une',
          split: 'Deux',
          copy: 'Copier',
          unchangedLines: (n) => `${n} lignes`,
          added: (n) => `ajout ${n}: `,
          counts: (a, d) => `${a} plus ${d} moins`,
        }}
      />,
    );
    expect(screen.getByRole('button', { name: 'Deux' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Copier' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '8 lignes' })).toBeTruthy();
    expect(screen.getByText('1 plus 1 moins')).toBeTruthy();
    expect(screen.getByText('ajout 12:', { exact: false })).toBeTruthy();
  });

  test('copy writes the new text', async () => {
    let written = '';
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          written = text;
        },
      },
    });
    render(<DiffView oldText={'a\n'} newText={'b\n'} />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy new text' }));
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeTruthy();
    expect(written).toBe('b\n');
  });

  test('scrolls inside maxHeight and wraps on request', () => {
    const { container } = render(
      <DiffView oldText={'a\n'} newText={'b\n'} maxHeight={120} wrap />,
    );
    const region = screen.getByRole('table').parentElement as HTMLElement;
    expect(region.style.maxHeight).toBe('120px');
    expect(region.tabIndex).toBe(0);
    expect(container.querySelector('table')?.className).toContain('whitespace-pre-wrap');
  });
});
