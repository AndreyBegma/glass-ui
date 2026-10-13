import { describe, expect, mock, test } from 'bun:test';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { type FlowEdge, FlowGraph, FlowLegend, type FlowNode, FlowNodeCard } from './index';

// #94 — the composed graph, as far as a headless DOM shows it. happy-dom has
// no layout, so xyflow never measures a handle and draws no edge here; edges
// are covered by `edge-style.test.ts` and checked in a browser. What this file
// pins is what a reader and a keyboard meet: the nodes, their names, the
// roving tab stop, selection and the callbacks.

const NODES: FlowNode[] = [
  { id: 'pm', data: { title: 'Project Manager', meta: '12 agents' }, tone: 'running' },
  { id: 'back', data: { title: 'Backend' }, tone: 'running' },
  { id: 'ui', data: { title: 'UI' }, tone: 'waiting' },
  { id: 'db', data: { title: 'Database' }, tone: 'blocked' },
];
const EDGES: FlowEdge[] = [
  { source: 'pm', target: 'back', kind: 'delegates' },
  { source: 'pm', target: 'ui', kind: 'delegates' },
  { source: 'back', target: 'db', kind: 'delegates' },
  { source: 'ui', target: 'back', kind: 'depends' },
];

const nodeEl = (c: HTMLElement, id: string) =>
  c.querySelector(`[data-flow-node="${id}"]`) as HTMLElement;

describe('FlowGraph', () => {
  test('one node per input, each named with its status', () => {
    const { container } = render(<FlowGraph label="Fleet" nodes={NODES} edges={EDGES} />);
    expect(container.querySelectorAll('[data-flow-node]')).toHaveLength(4);
    expect(screen.getByRole('group', { name: 'Project Manager, Running' })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Database, Blocked' })).toBeTruthy();
    expect(container.querySelectorAll('[data-flow-node-card]')).toHaveLength(4);
  });

  test('the graph is named with a summary of what it holds', () => {
    render(<FlowGraph label="Fleet" nodes={NODES} edges={EDGES} />);
    expect(screen.getByRole('group', { name: 'Fleet. 4 nodes, 4 connections' })).toBeTruthy();
  });

  test('a node describes where its edges go, in words', () => {
    const { container } = render(<FlowGraph label="Fleet" nodes={NODES} edges={EDGES} />);
    const ui = nodeEl(container, 'ui');
    const ids = ui.getAttribute('aria-describedby')?.split(' ') ?? [];
    const text = ids.map((id) => document.getElementById(id)?.textContent).join(' ');
    expect(text).toContain('Depends on Backend');
  });

  test('a single node renders, with no edges', () => {
    const { container } = render(
      <FlowGraph label="One" nodes={[{ id: 'only', data: { title: 'Only' } }]} edges={[]} />,
    );
    expect(container.querySelectorAll('[data-flow-node]')).toHaveLength(1);
    expect(screen.getByRole('group', { name: 'One. 1 node, 0 connections' })).toBeTruthy();
  });

  test('no nodes shows the empty state', () => {
    render(<FlowGraph label="None" nodes={[]} edges={[]} emptyState="No agents yet" />);
    expect(screen.getByText('No agents yet')).toBeTruthy();
  });

  test('edges to unknown nodes and self-loops are not counted', () => {
    render(
      <FlowGraph
        label="Fleet"
        nodes={NODES}
        edges={[...EDGES, { source: 'pm', target: 'ghost', kind: 'delegates' }, { source: 'ui', target: 'ui', kind: 'x' }]}
      />,
    );
    expect(screen.getByRole('group', { name: 'Fleet. 4 nodes, 4 connections' })).toBeTruthy();
  });

  test('renderNode replaces the default card and is told the node state', () => {
    const renderNode = mock((node: FlowNode, state: { selected: boolean }) => (
      <span data-custom={node.id}>{state.selected ? 'on' : 'off'}</span>
    ));
    const { container } = render(
      <FlowGraph label="Fleet" nodes={NODES} edges={EDGES} renderNode={renderNode} defaultSelectedId="ui" />,
    );
    expect(container.querySelectorAll('[data-flow-node-card]')).toHaveLength(0);
    expect(container.querySelector('[data-custom="ui"]')?.textContent).toBe('on');
    expect(container.querySelector('[data-custom="pm"]')?.textContent).toBe('off');
  });

  test('a click selects the node and calls onNodeClick with it', () => {
    const onNodeClick = mock(() => {});
    const onSelectionChange = mock(() => {});
    const { container } = render(
      <FlowGraph
        label="Fleet"
        nodes={NODES}
        edges={EDGES}
        onNodeClick={onNodeClick}
        onSelectionChange={onSelectionChange}
      />,
    );
    fireEvent.click(nodeEl(container, 'back'));
    expect(onNodeClick).toHaveBeenCalledWith(NODES[1]);
    expect(onSelectionChange).toHaveBeenCalledWith('back');
    expect(nodeEl(container, 'back').getAttribute('data-selected')).toBe('true');
    expect(nodeEl(container, 'back').getAttribute('aria-current')).toBe('true');
  });

  test('a controlled selection follows the prop, not the click', () => {
    const { container } = render(<FlowGraph label="Fleet" nodes={NODES} edges={EDGES} selectedId="pm" />);
    fireEvent.click(nodeEl(container, 'back'));
    expect(nodeEl(container, 'pm').getAttribute('data-selected')).toBe('true');
    expect(nodeEl(container, 'back').getAttribute('data-selected')).toBeNull();
  });

  test('one tab stop, and arrows rove it by position', () => {
    const { container } = render(<FlowGraph label="Fleet" nodes={NODES} edges={EDGES} />);
    const stops = [...container.querySelectorAll('[data-flow-node]')].filter(
      (el) => el.getAttribute('tabindex') === '0',
    );
    expect(stops.map((el) => el.getAttribute('data-flow-node'))).toEqual(['pm']);

    const pm = nodeEl(container, 'pm');
    act(() => pm.focus());
    fireEvent.keyDown(pm, { key: 'ArrowDown' });
    // pm's children are back and ui, side by side under it: down reaches one.
    const moved = document.activeElement?.getAttribute('data-flow-node');
    expect(['back', 'ui']).toContain(moved as string);
    expect(nodeEl(container, moved as string).getAttribute('tabindex')).toBe('0');
    expect(pm.getAttribute('tabindex')).toBe('-1');
  });

  test('End and Home jump to the last and the first node', () => {
    const { container } = render(<FlowGraph label="Fleet" nodes={NODES} edges={EDGES} />);
    const pm = nodeEl(container, 'pm');
    act(() => pm.focus());
    fireEvent.keyDown(pm, { key: 'End' });
    expect(document.activeElement).toBe(nodeEl(container, 'db'));
    fireEvent.keyDown(nodeEl(container, 'db'), { key: 'Home' });
    expect(document.activeElement).toBe(pm);
  });

  test('Enter selects and clicks; Escape clears the selection', () => {
    const onNodeClick = mock(() => {});
    const { container } = render(
      <FlowGraph label="Fleet" nodes={NODES} edges={EDGES} onNodeClick={onNodeClick} />,
    );
    const ui = nodeEl(container, 'ui');
    fireEvent.keyDown(ui, { key: 'Enter' });
    expect(onNodeClick).toHaveBeenCalledWith(NODES[2]);
    expect(ui.getAttribute('data-selected')).toBe('true');
    fireEvent.keyDown(ui, { key: 'Escape' });
    expect(ui.getAttribute('data-selected')).toBeNull();
  });

  test('keys typed inside a node’s own content stay there', () => {
    const onNodeClick = mock(() => {});
    const { container } = render(
      <FlowGraph
        label="Fleet"
        nodes={NODES}
        edges={EDGES}
        onNodeClick={onNodeClick}
        renderNode={(node) => <input aria-label={`Prompt ${node.id}`} className="nodrag" />}
      />,
    );
    const input = screen.getByLabelText('Prompt pm');
    act(() => input.focus());
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(onNodeClick).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(input);
    expect(container.querySelector('[data-selected]')).toBeNull();
  });

  test('zoom and fit controls are labelled buttons', () => {
    render(<FlowGraph label="Fleet" nodes={NODES} edges={EDGES} />);
    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Zoom out' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Fit to view' })).toBeTruthy();
  });

  test('forty nodes render', () => {
    const many: FlowNode[] = Array.from({ length: 40 }, (_, i) => ({
      id: `n${i}`,
      data: { title: `Node ${i}` },
    }));
    const links: FlowEdge[] = many.slice(1).map((n, i) => ({
      source: `n${Math.floor(i / 3)}`,
      target: n.id,
      kind: 'delegates',
    }));
    const { container } = render(
      <FlowGraph label="Many" nodes={many} edges={links} layout="layered" direction="LR" />,
    );
    expect(container.querySelectorAll('[data-flow-node]')).toHaveLength(40);
  });
});

describe('FlowNodeCard', () => {
  test('says the status in words beside the dot, never in colour alone', () => {
    render(<FlowNodeCard title="QA" tone="blocked" meta="2 agents" />);
    expect(screen.getByText('Blocked')).toBeTruthy();
    expect(screen.getByText('2 agents')).toBeTruthy();
  });

  test('the tone paints the rim and glow, not the text', () => {
    const { container } = render(<FlowNodeCard title="QA" tone="blocked" />);
    const card = container.querySelector('[data-flow-node-card]') as HTMLElement;
    expect(card.className).toContain('border-danger/60');
    expect(card.className).toContain('shadow-[0_0_22px_-6px_var(--color-danger)]');
    expect(screen.getByText('QA').className).toContain('text-ink');
  });

  test('a node shorter than 64px gets the one-row card', () => {
    const { container } = render(
      <FlowGraph
        label="Flow"
        nodes={[{ id: 'a', data: { title: 'Build', meta: 'hidden' }, tone: 'done', size: { width: 150, height: 44 } }]}
        edges={[]}
      />,
    );
    expect(container.textContent).toContain('Build');
    expect(container.textContent).not.toContain('hidden');
    // The status is still named, on the node.
    expect(screen.getByRole('group', { name: 'Build, Done' })).toBeTruthy();
  });

  test('without a tone there is no status line', () => {
    const { container } = render(<FlowNodeCard title="Plain" />);
    expect(container.textContent).toBe('Plain');
  });
});

describe('FlowLegend', () => {
  test('defaults to the three kinds, each drawn with its own dash', () => {
    const { container } = render(<FlowLegend />);
    const items = [...container.querySelectorAll('li')];
    expect(items.map((li) => li.textContent)).toEqual(['Depends on', 'Delegates to', 'Returns result']);
    const dash = (kind: string) =>
      container.querySelector(`li[data-kind="${kind}"] line`)?.getAttribute('stroke-dasharray');
    expect(dash('delegates')).toBeNull();
    expect(dash('returns')).toBe('6 5');
    expect(dash('depends')).toBe('0.1 5');
  });

  test('takes custom kinds and phrases', () => {
    render(<FlowLegend kinds={['delegates', 'blocks']} labels={{ blocks: 'Blocks' }} />);
    expect(screen.getByText('Delegates to')).toBeTruthy();
    expect(screen.getByText('Blocks')).toBeTruthy();
  });
});
