import { describe, expect, test } from 'bun:test';
import { collapse, isMore, MORE_PREFIX } from './collapse';
import { normalize } from './normalize';
import type { SankeyColumn, SankeyLink, SankeyNode } from './types';

const COLUMNS: SankeyColumn[] = [
  { id: 'main', label: 'Main agent' },
  { id: 'sub', label: 'Subagent types' },
  { id: 'out', label: 'Outcomes' },
];

/** One main agent fanning out to `values.length` subagents, all into "done". */
function fan(values: number[]) {
  const nodes: SankeyNode[] = [
    { id: 'main', label: 'Main', column: 'main' },
    ...values.map((_, i) => ({ id: `s${i}`, label: `Sub ${i}`, column: 'sub' })),
    { id: 'done', label: 'Done', column: 'out', tone: 'ok' as const },
  ];
  const links: SankeyLink[] = values.flatMap((v, i) => [
    { source: 'main', target: `s${i}`, value: v },
    { source: `s${i}`, target: 'done', value: v },
  ]);
  return normalize(COLUMNS, nodes, links);
}

const more = (count: number) => `+${count} more`;

describe('collapse', () => {
  test('a column at or under the limit is untouched', () => {
    const m = fan([5, 4, 3]);
    expect(collapse(m, 3, more)).toBe(m);
  });

  test('a long column keeps the top N-1 by value and folds the rest into "+N more"', () => {
    const c = collapse(fan([1, 9, 3, 7, 2, 8]), 4, more);
    const sub = c.nodes.filter((n) => n.column === 1);
    expect(sub.map((n) => n.label)).toEqual(['Sub 1', 'Sub 5', 'Sub 3', '+3 more']);
    const folded = sub[3]!;
    expect(folded.id).toBe(`${MORE_PREFIX}sub`);
    expect(isMore(folded.id)).toBe(true);
    expect(folded.tone).toBe('neutral');
    expect(folded.value).toBe(1 + 3 + 2);
    expect(folded.collapsed.map((n) => n.id)).toEqual(['s2', 's4', 's0']);
    expect(folded.collapsed[0]).toEqual({
      id: 's2',
      label: 'Sub 2',
      column: 'sub',
      tone: 'accent',
      value: 3,
    });
  });

  test('links of folded nodes are merged per counterpart, so the flow is unchanged', () => {
    const m = fan([1, 9, 3, 7, 2, 8]);
    const c = collapse(m, 4, more);
    const id = `${MORE_PREFIX}sub`;
    expect(c.links.filter((l) => l.target === id)).toEqual([
      { source: 'main', target: id, value: 6 },
    ]);
    expect(c.links.filter((l) => l.source === id)).toEqual([
      { source: id, target: 'done', value: 6 },
    ]);
    const total = (links: typeof m.links) => links.reduce((s, l) => s + l.value, 0);
    expect(total(c.links)).toBe(total(m.links));
    expect(c.links.some((l) => ['s0', 's2', 's4'].includes(l.source))).toBe(false);
  });

  test('two folded ends in neighbouring columns merge into one link between the two "+N more"', () => {
    const columns: SankeyColumn[] = [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
    ];
    const nodes: SankeyNode[] = [
      ...[0, 1, 2].map((i) => ({ id: `a${i}`, label: `A${i}`, column: 'a' })),
      ...[0, 1, 2].map((i) => ({ id: `b${i}`, label: `B${i}`, column: 'b' })),
    ];
    const links: SankeyLink[] = [
      { source: 'a0', target: 'b0', value: 10 },
      { source: 'a1', target: 'b1', value: 2 },
      { source: 'a2', target: 'b2', value: 1 },
      { source: 'a1', target: 'b2', value: 1 },
    ];
    const c = collapse(normalize(columns, nodes, links), 2, more);
    expect(c.links).toEqual([
      { source: 'a0', target: 'b0', value: 10 },
      { source: `${MORE_PREFIX}a`, target: `${MORE_PREFIX}b`, value: 4 },
    ]);
  });

  test('ties keep input order, and a limit under 2 is read as 2', () => {
    const c = collapse(fan([5, 5, 5]), 1, more);
    expect(c.nodes.filter((n) => n.column === 1).map((n) => n.label)).toEqual([
      'Sub 0',
      '+2 more',
    ]);
  });
});
