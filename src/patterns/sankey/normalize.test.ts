import { describe, expect, test } from 'bun:test';
import { normalize } from './normalize';
import type { SankeyColumn, SankeyNode } from './types';

const COLUMNS: SankeyColumn[] = [
  { id: 'origin', label: 'Origin' },
  { id: 'main', label: 'Main agent' },
  { id: 'out', label: 'Outcomes' },
];

const NODES: SankeyNode[] = [
  { id: 'sessions', label: 'Sessions', column: 'origin' },
  { id: 'agent', label: 'Main agent', column: 'main' },
  { id: 'done', label: 'Completed', column: 'out', tone: 'ok' },
  { id: 'error', label: 'Error', column: 'out', tone: 'danger' },
];

describe('normalize', () => {
  test('a node’s value is the flow through it — the larger of its in and out sums', () => {
    const m = normalize(COLUMNS, NODES, [
      { source: 'sessions', target: 'agent', value: 10 },
      { source: 'agent', target: 'done', value: 7 },
      { source: 'agent', target: 'error', value: 1 },
    ]);
    const value = (id: string) => m.nodes.find((n) => n.id === id)?.value;
    expect(value('sessions')).toBe(10);
    expect(value('agent')).toBe(10);
    expect(value('done')).toBe(7);
    expect(value('error')).toBe(1);
    expect(m.ignored).toEqual({ nodes: 0, links: 0 });
  });

  test('a node’s own value is a floor, not an override', () => {
    const nodes = NODES.map((n) =>
      n.id === 'done' ? { ...n, value: 20 } : n.id === 'error' ? { ...n, value: 0.5 } : n,
    );
    const m = normalize(COLUMNS, nodes, [
      { source: 'agent', target: 'done', value: 7 },
      { source: 'agent', target: 'error', value: 1 },
    ]);
    expect(m.nodes.find((n) => n.id === 'done')?.value).toBe(20);
    expect(m.nodes.find((n) => n.id === 'error')?.value).toBe(1);
  });

  test('links with the same ends are merged into one carrying both values', () => {
    const m = normalize(COLUMNS, NODES, [
      { source: 'agent', target: 'done', value: 3 },
      { source: 'agent', target: 'done', value: 4 },
    ]);
    expect(m.links).toEqual([{ source: 'agent', target: 'done', value: 7 }]);
  });

  test('links that cannot be drawn are counted and dropped, never reshaped', () => {
    const m = normalize(COLUMNS, NODES, [
      { source: 'agent', target: 'done', value: 0 },
      { source: 'agent', target: 'done', value: -2 },
      { source: 'agent', target: 'done', value: Number.NaN },
      { source: 'agent', target: 'done', value: Number.POSITIVE_INFINITY },
      { source: 'agent', target: 'nowhere', value: 1 },
      { source: 'done', target: 'agent', value: 1 }, // right to left
      { source: 'done', target: 'error', value: 1 }, // same column
      { source: 'sessions', target: 'done', value: 2 }, // skips a column: fine
    ]);
    expect(m.links).toEqual([{ source: 'sessions', target: 'done', value: 2 }]);
    expect(m.ignored.links).toBe(7);
  });

  test('a node in an unknown column, or with a duplicate id, is ignored', () => {
    const m = normalize(COLUMNS, [...NODES, { id: 'x', label: 'X', column: 'nope' }, NODES[0]!], []);
    expect(m.nodes.map((n) => n.id)).toEqual(['sessions', 'agent', 'done', 'error']);
    expect(m.ignored.nodes).toBe(2);
  });

  test('tone defaults to the accent; columns become indices', () => {
    const m = normalize(COLUMNS, NODES, []);
    expect(m.nodes.map((n) => [n.id, n.column, n.tone])).toEqual([
      ['sessions', 0, 'accent'],
      ['agent', 1, 'accent'],
      ['done', 2, 'ok'],
      ['error', 2, 'danger'],
    ]);
  });
});
