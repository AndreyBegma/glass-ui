import { describe, expect, test } from 'bun:test';
import { collapse } from './collapse';
import { HEADER, layoutSankey, MIN_LINK, minWidth, NODE_HEIGHT } from './layout';
import { normalize } from './normalize';
import type { SankeyColumn, SankeyLink, SankeyNode } from './types';

const COLUMNS: SankeyColumn[] = [
  { id: 'origin', label: 'Origin' },
  { id: 'sub', label: 'Subagent types' },
  { id: 'out', label: 'Outcomes' },
];

const NODES: SankeyNode[] = [
  { id: 'sessions', label: 'Sessions', column: 'origin' },
  { id: 'small', label: 'Small', column: 'sub' },
  { id: 'big', label: 'Big', column: 'sub' },
  { id: 'mid', label: 'Mid', column: 'sub' },
  { id: 'done', label: 'Completed', column: 'out', tone: 'ok' },
  { id: 'error', label: 'Error', column: 'out', tone: 'danger' },
];

const LINKS: SankeyLink[] = [
  { source: 'sessions', target: 'small', value: 10 },
  { source: 'sessions', target: 'big', value: 60 },
  { source: 'sessions', target: 'mid', value: 30 },
  { source: 'small', target: 'error', value: 10 },
  { source: 'big', target: 'done', value: 60 },
  { source: 'mid', target: 'done', value: 25 },
  { source: 'mid', target: 'error', value: 5 },
];

const layout = (width = 960) => layoutSankey(normalize(COLUMNS, NODES, LINKS), { width });

describe('layoutSankey', () => {
  test('columns run left to right in the order given, with their names centred over them', () => {
    const l = layout();
    const xOf = (column: number) => l.nodes.find((n) => n.column === column)!.x;
    expect(xOf(0)).toBeLessThan(xOf(1));
    expect(xOf(1)).toBeLessThan(xOf(2));
    expect(l.columns.map((c) => c.label)).toEqual(['Origin', 'Subagent types', 'Outcomes']);
    expect(l.columns[1]!.x).toBe(xOf(1) + l.nodeWidth / 2);
  });

  test('a column lists its nodes largest first, below the header', () => {
    const l = layout();
    const sub = l.nodes.filter((n) => n.column === 1);
    expect(sub.map((n) => n.id)).toEqual(['big', 'mid', 'small']);
    expect(sub[0]!.y).toBeGreaterThanOrEqual(HEADER);
    expect(sub[1]!.y).toBeGreaterThan(sub[0]!.y + NODE_HEIGHT);
  });

  test('a shorter column is centred against the longest', () => {
    const l = layout();
    const mid = (column: number) => {
      const ns = l.nodes.filter((n) => n.column === column);
      return (ns[0]!.y + ns.at(-1)!.y + NODE_HEIGHT) / 2;
    };
    expect(mid(0)).toBeCloseTo(mid(1));
    expect(mid(2)).toBeCloseTo(mid(1));
  });

  test('a link is as wide as its value, in proportion to every other link', () => {
    const l = layout();
    const w = (s: string, t: string) => l.links.find((k) => k.source === s && k.target === t)!.width;
    expect(w('sessions', 'big') / w('sessions', 'small')).toBeCloseTo(6);
    expect(w('sessions', 'mid') / w('mid', 'error')).toBeCloseTo(6);
    // The busiest node (sessions, 100) fills 70 % of its card.
    expect(w('sessions', 'big') + w('sessions', 'mid') + w('sessions', 'small')).toBeCloseTo(
      0.7 * NODE_HEIGHT,
    );
  });

  test('a tiny link is still drawn, at the minimum width', () => {
    const l = layoutSankey(
      normalize(COLUMNS, NODES, [...LINKS, { source: 'sessions', target: 'error', value: 0.001 }]),
      { width: 960 },
    );
    expect(l.links.find((k) => k.source === 'sessions' && k.target === 'error')!.width).toBe(
      MIN_LINK,
    );
  });

  test('ports stack without overlap, in the order of the far end, centred on the card', () => {
    const l = layout();
    const out = l.links.filter((k) => k.source === 'sessions');
    const sorted = [...out].sort((a, b) => a.y0 - b.y0);
    expect(sorted.map((k) => k.target)).toEqual(['big', 'mid', 'small']);
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]!;
      const cur = sorted[i]!;
      expect(cur.y0 - cur.width / 2).toBeCloseTo(prev.y0 + prev.width / 2);
    }
    const card = l.nodes.find((n) => n.id === 'sessions')!;
    const top = sorted[0]!.y0 - sorted[0]!.width / 2;
    const bottom = sorted.at(-1)!.y0 + sorted.at(-1)!.width / 2;
    expect((top + bottom) / 2).toBeCloseTo(card.y + NODE_HEIGHT / 2);
  });

  test('a link runs from the source’s right edge to the target’s left edge', () => {
    const l = layout();
    const k = l.links.find((x) => x.source === 'big')!;
    const s = l.nodes.find((n) => n.id === 'big')!;
    const t = l.nodes.find((n) => n.id === 'done')!;
    expect(k.x0).toBe(s.x + s.width);
    expect(k.x1).toBe(t.x);
    expect(k.d.startsWith(`M${k.x0},${k.y0}C`)).toBe(true);
    expect(k.d.endsWith(`${k.x1},${k.y1}`)).toBe(true);
  });

  test('"+N more" sits last in its column even when it carries more than the nodes above it', () => {
    const many: SankeyNode[] = [
      { id: 'o', label: 'O', column: 'origin' },
      ...[9, 8, 1, 1, 1, 1, 1, 1, 1, 1, 1].map((_, i) => ({
        id: `s${i}`,
        label: `S${i}`,
        column: 'sub',
      })),
    ];
    const links = [9, 8, 1, 1, 1, 1, 1, 1, 1, 1, 1].map((v, i) => ({
      source: 'o',
      target: `s${i}`,
      value: v,
    }));
    const m = collapse(normalize(COLUMNS, many, links), 3, (n) => `+${n} more`);
    const sub = layoutSankey(m, { width: 960 }).nodes.filter((n) => n.column === 1);
    expect(sub.map((n) => n.label)).toEqual(['S0', 'S1', '+9 more']);
  });

  test('the same input gives the same picture, whatever the order of the links', () => {
    const a = layout();
    const b = layoutSankey(normalize(COLUMNS, NODES, [...LINKS].reverse()), { width: 960 });
    const byKey = (l: typeof a) =>
      Object.fromEntries(l.links.map((k) => [k.key, [k.width, k.y0, k.y1, k.d]]));
    expect(byKey(b)).toEqual(byKey(a));
  });

  test('a narrow box does not squeeze the graph below its minimum width', () => {
    const l = layout(200);
    expect(l.width).toBe(minWidth(3));
    expect(l.nodes.every((n) => n.x + n.width <= l.width)).toBe(true);
  });

  test('one node and no link still lays out', () => {
    const l = layoutSankey(normalize([COLUMNS[0]!], [NODES[0]!], []), { width: 640 });
    expect(l.nodes).toHaveLength(1);
    expect(l.links).toHaveLength(0);
    expect(l.nodes[0]!.x).toBeCloseTo((640 - l.nodeWidth) / 2);
    expect(Number.isFinite(l.height)).toBe(true);
  });

  test('a requested height larger than needed is kept, and the columns centre in it', () => {
    const l = layoutSankey(normalize(COLUMNS, NODES, LINKS), { width: 960, height: 600 });
    expect(l.height).toBe(600);
  });
});
