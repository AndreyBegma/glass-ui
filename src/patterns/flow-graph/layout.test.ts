import { describe, expect, test } from 'bun:test';
import { type Box, DEFAULT_NODE_SIZE, layoutFlow } from './layout';
import { treeParents } from './tree-layout';
import type { FlowEdge } from './types';

const SIZE = { width: 100, height: 40 };
const ids = (...list: string[]) => list.map((id) => ({ id }));
const e = (source: string, target: string, kind = 'delegates'): FlowEdge => ({ source, target, kind });

const centreX = (b: Box) => b.x + b.width / 2;
const centreY = (b: Box) => b.y + b.height / 2;

function overlaps(a: Box, b: Box) {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

function expectNoOverlap(boxes: Map<string, Box>) {
  const list = [...boxes.entries()];
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const [ia, a] = list[i]!;
      const [ib, b] = list[j]!;
      if (overlaps(a, b)) throw new Error(`${ia} overlaps ${ib}`);
    }
  }
}

/** The reference's fleet: an orchestrator, four leads, eight sub-slots. */
const FLEET_NODES = ids('pm', 'arch', 'back', 'ui', 'qa', 'db', 'ipc', 'user', 'order', 'win', 'ux', 'int', 'e2e');
const FLEET_EDGES = [
  e('pm', 'arch'),
  e('pm', 'back'),
  e('pm', 'ui'),
  e('pm', 'qa'),
  e('arch', 'db'),
  e('arch', 'ipc'),
  e('back', 'user'),
  e('back', 'order'),
  e('ui', 'win'),
  e('ui', 'ux'),
  e('qa', 'int'),
  e('qa', 'e2e'),
];

describe('layoutFlow — common to both layouts', () => {
  for (const layout of ['tree', 'layered'] as const) {
    test(`${layout}: an empty graph is empty`, () => {
      const r = layoutFlow([], [], { layout });
      expect(r.boxes.size).toBe(0);
      expect(r.width).toBe(0);
      expect(r.height).toBe(0);
    });

    test(`${layout}: one node sits at the origin with its size`, () => {
      const r = layoutFlow(ids('a'), [], { layout, nodeSize: SIZE });
      expect(r.boxes.get('a')).toEqual({ x: 0, y: 0, width: 100, height: 40 });
      expect(r.width).toBe(100);
      expect(r.height).toBe(40);
    });

    test(`${layout}: the default node size is 240 × 96`, () => {
      const r = layoutFlow(ids('a'), [], { layout });
      expect(r.boxes.get('a')).toMatchObject(DEFAULT_NODE_SIZE);
    });

    test(`${layout}: a node’s own size beats the graph’s`, () => {
      const r = layoutFlow([{ id: 'a', size: { width: 300, height: 120 } }, { id: 'b' }], [e('a', 'b')], {
        layout,
        nodeSize: SIZE,
      });
      expect(r.boxes.get('a')).toMatchObject({ width: 300, height: 120 });
      expect(r.boxes.get('b')).toMatchObject(SIZE);
    });

    test(`${layout}: TB ranks run down, LR ranks run right`, () => {
      const tb = layoutFlow(ids('a', 'b'), [e('a', 'b')], { layout, nodeSize: SIZE, rankGap: 50 });
      expect(tb.boxes.get('b')!.y).toBe(tb.boxes.get('a')!.y + 40 + 50);
      expect(centreX(tb.boxes.get('b')!)).toBe(centreX(tb.boxes.get('a')!));

      const lr = layoutFlow(ids('a', 'b'), [e('a', 'b')], {
        layout,
        direction: 'LR',
        nodeSize: SIZE,
        rankGap: 50,
      });
      expect(lr.boxes.get('b')!.x).toBe(lr.boxes.get('a')!.x + 100 + 50);
      expect(centreY(lr.boxes.get('b')!)).toBe(centreY(lr.boxes.get('a')!));
    });

    test(`${layout}: a cycle terminates and places every node`, () => {
      const r = layoutFlow(ids('a', 'b', 'c'), [e('a', 'b'), e('b', 'c'), e('c', 'a')], {
        layout,
        nodeSize: SIZE,
      });
      expect(r.boxes.size).toBe(3);
      expectNoOverlap(r.boxes);
    });

    test(`${layout}: self-loops, unknown endpoints and duplicate ids are tolerated`, () => {
      const r = layoutFlow(ids('a', 'b', 'a'), [e('a', 'a'), e('a', 'ghost'), e('a', 'b')], {
        layout,
        nodeSize: SIZE,
      });
      expect([...r.boxes.keys()]).toEqual(['a', 'b']);
    });

    test(`${layout}: the reference fleet has no overlap and starts at 0, 0`, () => {
      const r = layoutFlow(FLEET_NODES, FLEET_EDGES, { layout, nodeSize: SIZE });
      expect(r.boxes.size).toBe(13);
      expectNoOverlap(r.boxes);
      const boxes = [...r.boxes.values()];
      expect(Math.min(...boxes.map((b) => b.x))).toBe(0);
      expect(Math.min(...boxes.map((b) => b.y))).toBe(0);
      expect(Math.max(...boxes.map((b) => b.x + b.width))).toBe(r.width);
      expect(Math.max(...boxes.map((b) => b.y + b.height))).toBe(r.height);
    });

    test(`${layout}: 40 nodes lay out without overlap, deterministically`, () => {
      const nodes = Array.from({ length: 40 }, (_, i) => ({ id: `n${i}` }));
      // A ternary tree plus a few cross-links.
      const edges = nodes.slice(1).map((n, i) => e(`n${Math.floor(i / 3)}`, n.id));
      edges.push(e('n5', 'n30', 'depends'), e('n12', 'n2', 'returns'));
      const a = layoutFlow(nodes, edges, { layout, nodeSize: SIZE });
      const b = layoutFlow(nodes, edges, { layout, nodeSize: SIZE });
      expect(a.boxes.size).toBe(40);
      expectNoOverlap(a.boxes);
      expect([...a.boxes]).toEqual([...b.boxes]);
    });
  }
});

describe('layoutFlow — tree', () => {
  test('a parent is centred over its children', () => {
    const r = layoutFlow(FLEET_NODES, FLEET_EDGES, { nodeSize: SIZE });
    const b = (id: string) => r.boxes.get(id)!;
    for (const [parent, kids] of [
      ['pm', ['arch', 'back', 'ui', 'qa']],
      ['arch', ['db', 'ipc']],
      ['qa', ['int', 'e2e']],
    ] as const) {
      const first = centreX(b(kids[0]!));
      const last = centreX(b(kids[kids.length - 1]!));
      expect(centreX(b(parent))).toBe((first + last) / 2);
    }
  });

  test('ranks align across the whole graph', () => {
    const r = layoutFlow(FLEET_NODES, FLEET_EDGES, { nodeSize: SIZE });
    const ys = (list: string[]) => new Set(list.map((id) => r.boxes.get(id)!.y));
    expect(ys(['arch', 'back', 'ui', 'qa']).size).toBe(1);
    expect(ys(['db', 'ipc', 'user', 'order', 'win', 'ux', 'int', 'e2e']).size).toBe(1);
  });

  test('siblings follow the node order, with the gap between them', () => {
    const r = layoutFlow(ids('p', 'b', 'a'), [e('p', 'a'), e('p', 'b')], { nodeSize: SIZE, nodeGap: 20 });
    expect(r.boxes.get('a')!.x).toBe(r.boxes.get('b')!.x + 100 + 20);
  });

  test('a wide subtree pushes its neighbour along, a parent stays centred', () => {
    const r = layoutFlow(ids('r', 'a', 'b', 'a1', 'a2', 'a3'), [e('r', 'a'), e('r', 'b'), e('a', 'a1'), e('a', 'a2'), e('a', 'a3')], {
      nodeSize: SIZE,
      nodeGap: 10,
    });
    // a's subtree is 3 × 100 + 2 × 10 = 320 wide; b starts after it.
    expect(r.boxes.get('b')!.x).toBe(320 + 10);
    expect(centreX(r.boxes.get('a')!)).toBe(centreX(r.boxes.get('a2')!));
    expectNoOverlap(r.boxes);
  });

  test('a forest lays its trees side by side', () => {
    const r = layoutFlow(ids('a', 'a1', 'b', 'b1'), [e('a', 'a1'), e('b', 'b1')], { nodeSize: SIZE, nodeGap: 10 });
    expect(r.boxes.get('a')!.y).toBe(r.boxes.get('b')!.y);
    expect(r.boxes.get('b')!.x).toBe(110);
    expect(r.width).toBe(210);
  });

  test('a rank is as thick as its tallest node; shorter ones centre in it', () => {
    const r = layoutFlow(
      [{ id: 'r' }, { id: 'tall', size: { width: 100, height: 80 } }, { id: 'short' }],
      [e('r', 'tall'), e('r', 'short')],
      { nodeSize: SIZE, rankGap: 10 },
    );
    expect(r.boxes.get('tall')!.y).toBe(50);
    expect(r.boxes.get('short')!.y).toBe(50 + 20);
    expect(r.height).toBe(40 + 10 + 80);
  });
});

describe('treeParents — which edges place the tree', () => {
  test('ownership edges win over depends and returns, whatever the order', () => {
    const p = treeParents(['pm', 'a', 'b'], [e('b', 'a', 'depends'), e('pm', 'a'), e('pm', 'b'), e('a', 'pm', 'returns')]);
    expect(p.get('a')).toBe('pm');
    expect(p.get('b')).toBe('pm');
    expect(p.has('pm')).toBe(false);
  });

  test('a graph drawn only in depends still gets a tree', () => {
    const p = treeParents(['a', 'b', 'c'], [e('a', 'b', 'depends'), e('b', 'c', 'depends')]);
    expect(p.get('b')).toBe('a');
    expect(p.get('c')).toBe('b');
  });

  test('the first parent offered is kept', () => {
    const p = treeParents(['a', 'b', 'c'], [e('a', 'c'), e('b', 'c')]);
    expect(p.get('c')).toBe('a');
  });

  test('an edge that would close a cycle is skipped', () => {
    const p = treeParents(['a', 'b', 'c'], [e('a', 'b'), e('b', 'c'), e('c', 'a')]);
    expect(p.get('b')).toBe('a');
    expect(p.get('c')).toBe('b');
    expect(p.has('a')).toBe(false);
  });
});
