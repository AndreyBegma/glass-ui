import { describe, expect, mock, test } from 'bun:test';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MORE_PREFIX } from './collapse';
import { Sankey, type SankeyColumn, type SankeyLink, type SankeyNode } from './index';

// #94 — the composed graph. The geometry, normalisation, "+N more" and the
// highlighted path are tested on their own beside their modules; these render.

const COLUMNS: SankeyColumn[] = [
  { id: 'origin', label: 'Origin' },
  { id: 'main', label: 'Main agent' },
  { id: 'sub', label: 'Subagent types' },
  { id: 'out', label: 'Outcomes' },
];

const SUBS = ['General', 'Docs', 'Explore', 'Review', 'Search'];
const SUB_VALUES = [50, 40, 30, 20, 10];

const NODES: SankeyNode[] = [
  { id: 'sessions', label: 'Sessions', column: 'origin' },
  { id: 'agent', label: 'Main agent', column: 'main' },
  ...SUBS.map((label, i) => ({ id: `s${i}`, label, column: 'sub' })),
  { id: 'done', label: 'Completed', column: 'out', tone: 'ok' as const },
  { id: 'error', label: 'Error', column: 'out', tone: 'danger' as const },
];

const LINKS: SankeyLink[] = [
  { source: 'sessions', target: 'agent', value: 150 },
  ...SUB_VALUES.map((value, i) => ({ source: 'agent', target: `s${i}`, value })),
  ...SUB_VALUES.map((value, i) => ({ source: `s${i}`, target: 'done', value: value - 1 })),
  ...SUB_VALUES.map((_, i) => ({ source: `s${i}`, target: 'error', value: 1 })),
];

const nodeEl = (c: HTMLElement, id: string) =>
  c.querySelector(`[data-sankey-node="${id}"]`) as HTMLElement;
const visibleLinks = (c: HTMLElement) => c.querySelectorAll('[data-sankey-link]');

describe('Sankey', () => {
  test('names the graph and describes how it reads', () => {
    render(<Sankey label="Agent orchestration" columns={COLUMNS} nodes={NODES} links={LINKS} />);
    const figure = screen.getByRole('figure');
    expect(figure.getAttribute('aria-label')).toBe(
      'Agent orchestration. 4 columns, 9 nodes, 16 links',
    );
    const description = document.getElementById(figure.getAttribute('aria-describedby') ?? '');
    expect(description?.textContent).toContain('Origin, Main agent, Subagent types, Outcomes');
  });

  test('every node and every link has an accessible name with its value', () => {
    const { container } = render(
      <Sankey label="Flow" columns={COLUMNS} nodes={NODES} links={LINKS} />,
    );
    expect(nodeEl(container, 's2').getAttribute('aria-label')).toBe('Explore, Subagent types, 30');
    expect(screen.getByRole('img', { name: 'Main agent to Explore, 30' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Sessions to Main agent, 150' })).toBeTruthy();
    expect(visibleLinks(container)).toHaveLength(LINKS.length);
    expect(container.innerHTML).not.toContain('NaN');
  });

  test('column names are drawn, and values are compact by default', () => {
    const { container } = render(
      <Sankey
        label="Flow"
        columns={COLUMNS}
        nodes={NODES}
        links={[...LINKS, { source: 'sessions', target: 'done', value: 1200 }]}
      />,
    );
    expect(
      [...container.querySelectorAll('[data-sankey-column]')].map((el) => el.textContent),
    ).toEqual(['Origin', 'Main agent', 'Subagent types', 'Outcomes']);
    // 145 from the subagents + 1 200 straight from the sessions.
    expect(nodeEl(container, 'done').textContent).toContain('1.3K');
  });

  test('a long column folds into "+N more", and the table still lists every link', () => {
    const { container } = render(
      <Sankey label="Flow" columns={COLUMNS} nodes={NODES} links={LINKS} maxPerColumn={3} />,
    );
    const more = nodeEl(container, `${MORE_PREFIX}sub`);
    expect(more.textContent).toContain('+3 more');
    expect(nodeEl(container, 's4')).toBeNull();
    const rows = container.querySelectorAll('[data-sankey-table] tbody tr');
    expect(rows).toHaveLength(LINKS.length);
    expect(container.querySelector('[data-sankey-table]')?.textContent).toContain(
      'Search (Subagent types)',
    );
  });

  test('onNodeClick gets the node, and a "+N more" node carries what it folds', () => {
    const onNodeClick = mock();
    const { container } = render(
      <Sankey
        label="Flow"
        columns={COLUMNS}
        nodes={NODES}
        links={LINKS}
        maxPerColumn={3}
        onNodeClick={onNodeClick}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Completed, Outcomes, 145' }));
    expect(onNodeClick.mock.calls[0]?.[0]).toMatchObject({
      id: 'done',
      column: 'out',
      tone: 'ok',
      value: 145,
      collapsed: [],
    });
    fireEvent.click(nodeEl(container, `${MORE_PREFIX}sub`));
    const folded = onNodeClick.mock.calls[1]?.[0];
    expect(folded.value).toBe(60);
    expect(folded.collapsed.map((n: SankeyNode) => n.label)).toEqual(['Explore', 'Review', 'Search']);
  });

  test('without onNodeClick the nodes are not buttons', () => {
    render(<Sankey label="Flow" columns={COLUMNS} nodes={NODES} links={LINKS} />);
    expect(screen.queryAllByRole('button').map((b) => b.textContent)).toEqual(['Show table']);
  });

  test('hovering a node lights its path, dims the rest, and shows its value', () => {
    const { container } = render(
      <Sankey label="Flow" columns={COLUMNS} nodes={NODES} links={LINKS} />,
    );
    fireEvent.pointerEnter(nodeEl(container, 's2'));
    const state = (key: string) =>
      container.querySelector(`[data-sankey-link="${key}"]`)?.getAttribute('data-state');
    expect(state('agent\u0000s2')).toBe('lit');
    expect(state('sessions\u0000agent')).toBe('lit');
    expect(state('s2\u0000done')).toBe('lit');
    expect(state('agent\u0000s1')).toBe('dim');
    expect(nodeEl(container, 's1').getAttribute('data-state')).toBe('dim');
    expect(nodeEl(container, 'error').getAttribute('data-state')).toBe('lit');
    const tip = container.querySelector('[data-sankey-tooltip]');
    expect(tip?.textContent).toContain('Explore');
    expect(tip?.textContent).toContain('30');

    fireEvent.pointerLeave(nodeEl(container, 's2'));
    expect(state('agent\u0000s1')).toBeNull();
    expect(container.querySelector('[data-sankey-tooltip]')).toBeNull();
  });

  test('hovering a link lights it and shows both ends with its value', () => {
    const { container } = render(
      <Sankey label="Flow" columns={COLUMNS} nodes={NODES} links={LINKS} />,
    );
    const hit = container.querySelector('[data-sankey-link="agent\u0000s0"]') as Element;
    fireEvent.pointerOver(hit, { clientX: 300, clientY: 100 });
    expect(hit.getAttribute('data-state')).toBe('lit');
    expect(
      container.querySelector('[data-sankey-link="agent\u0000s1"]')?.getAttribute('data-state'),
    ).toBe('dim');
    expect(container.querySelector('[data-sankey-tooltip]')?.textContent).toContain(
      'Main agent → General',
    );
  });

  test('the nodes are one tab stop, and the arrow keys move between them', () => {
    const { container } = render(
      <Sankey label="Flow" columns={COLUMNS} nodes={NODES} links={LINKS} />,
    );
    const stops = [...container.querySelectorAll('[data-sankey-node]')].filter(
      (el) => el.getAttribute('tabindex') === '0',
    );
    expect(stops.map((el) => el.getAttribute('data-sankey-node'))).toEqual(['sessions']);

    act(() => nodeEl(container, 'sessions').focus());
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(nodeEl(container, 'agent'));
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' });
    // The main agent is centred on the column, so the nearest subagent is the middle one.
    expect(document.activeElement).toBe(nodeEl(container, 's2'));
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(nodeEl(container, 's1'));
    fireEvent.keyDown(document.activeElement!, { key: 'End' });
    expect(document.activeElement).toBe(nodeEl(container, 'error'));
    expect(nodeEl(container, 'error').getAttribute('tabindex')).toBe('0');
    expect(nodeEl(container, 'sessions').getAttribute('tabindex')).toBe('-1');
    // Focus does what hover does; Escape lets go.
    expect(container.querySelector('[data-sankey-tooltip]')?.textContent).toContain('Error');
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(container.querySelector('[data-sankey-tooltip]')).toBeNull();
  });

  test('"Show table" reveals the table; it is otherwise in the document but visually hidden', () => {
    const { container } = render(
      <Sankey label="Flow" columns={COLUMNS} nodes={NODES} links={LINKS} />,
    );
    const table = container.querySelector('[data-sankey-table]') as HTMLElement;
    expect(table.className).toContain('sr-only');
    const toggle = screen.getByRole('button', { name: 'Show table' });
    expect(toggle.getAttribute('aria-controls')).toBe(table.id);
    fireEvent.click(toggle);
    expect(table.className).not.toContain('sr-only');
    expect(screen.getByRole('button', { name: 'Hide table' }).getAttribute('aria-expanded')).toBe(
      'true',
    );
  });

  test('input that cannot be drawn is named in the table caption', () => {
    const { container } = render(
      <Sankey
        label="Flow"
        columns={COLUMNS}
        nodes={NODES}
        links={[...LINKS, { source: 'done', target: 'agent', value: 3 }]}
      />,
    );
    expect(container.querySelector('[data-sankey-table] caption')?.textContent).toBe(
      'Flow — 1 link could not be drawn',
    );
  });

  test('tones come from tokens: Completed is ok, Error is danger, links take the accent', () => {
    const { container } = render(
      <Sankey label="Flow" columns={COLUMNS} nodes={NODES} links={LINKS} />,
    );
    expect(nodeEl(container, 'done').className).toContain('bg-ok/14');
    expect(nodeEl(container, 'error').className).toContain('bg-danger/14');
    expect(nodeEl(container, 'agent').className).toContain('bg-accent-soft');
    expect(container.querySelectorAll('path.stroke-accent')).toHaveLength(LINKS.length);
  });

  test('labels override the English strings', () => {
    render(
      <Sankey
        label="Flow"
        columns={COLUMNS}
        nodes={NODES}
        links={LINKS}
        labels={{ showTable: 'Tabelle', link: (s, t, v) => `${s} → ${t}: ${v}` }}
      />,
    );
    expect(screen.getByRole('button', { name: 'Tabelle' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Main agent → Explore: 30' })).toBeTruthy();
  });

  test('one node renders; nothing at all shows the empty state', () => {
    const { container, rerender } = render(
      <Sankey label="Flow" columns={COLUMNS} nodes={[NODES[0]!]} links={[]} />,
    );
    expect(nodeEl(container, 'sessions')).toBeTruthy();
    rerender(<Sankey label="Flow" columns={COLUMNS} nodes={[]} links={[]} emptyState="Nothing yet" />);
    expect(container.querySelector('[data-sankey-empty]')?.textContent).toBe('Nothing yet');
  });
});
