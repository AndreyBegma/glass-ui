import type { FlowDirection, FlowEdge, FlowNodeSize } from './types';

/**
 * #94 — `layout="tree"`: an org chart. Every parent is centred over the block
 * of its children, subtrees sit side by side without overlapping, and ranks
 * line up across the whole graph. That is the reference's fleet canvas, and it
 * is the one thing a general layered layout (dagre, ELK) does not promise —
 * they minimise crossings and will happily pull a parent off its children.
 *
 * In-house and dependency-free; about the size of the alternative's config.
 * Pure, synchronous and deterministic: the same input is the same output.
 *
 * A graph is not always a tree, so the tree is chosen out of it. Each node
 * takes the first parent offered, and the offer goes in two passes: first
 * every edge whose kind is not `depends` or `returns` — those say "uses" and
 * "answers to", not "owns" — then the rest, so a graph drawn only in
 * `depends` still gets a shape. An edge that would close a cycle is skipped.
 * Every edge is still drawn; only the chosen ones place nodes.
 */

export type Box = { x: number; y: number; width: number; height: number };

const NON_TREE_KINDS = new Set(['depends', 'returns']);

/** The chosen parent of every node that has one. Roots are absent. */
export function treeParents(
  ids: readonly string[],
  edges: readonly Pick<FlowEdge, 'source' | 'target' | 'kind'>[],
): Map<string, string> {
  const known = new Set(ids);
  const parent = new Map<string, string>();

  const isAncestor = (candidate: string, of: string) => {
    for (let at: string | undefined = of; at !== undefined; at = parent.get(at)) {
      if (at === candidate) return true;
    }
    return false;
  };

  const offer = (edge: Pick<FlowEdge, 'source' | 'target'>) => {
    const { source, target } = edge;
    if (source === target || !known.has(source) || !known.has(target)) return;
    if (parent.has(target)) return;
    // `target` above `source` already: adopting would close a loop.
    if (isAncestor(target, source)) return;
    parent.set(target, source);
  };

  for (const e of edges) if (!NON_TREE_KINDS.has(e.kind)) offer(e);
  for (const e of edges) if (NON_TREE_KINDS.has(e.kind)) offer(e);
  return parent;
}

export function layoutTree(
  nodes: readonly { id: string; size: FlowNodeSize }[],
  edges: readonly Pick<FlowEdge, 'source' | 'target' | 'kind'>[],
  options: { direction: FlowDirection; nodeGap: number; rankGap: number },
): Map<string, Box> {
  const { direction, nodeGap, rankGap } = options;
  const ids = nodes.map((n) => n.id);
  const size = new Map(nodes.map((n) => [n.id, n.size]));
  const order = new Map(ids.map((id, i) => [id, i]));
  const parent = treeParents(ids, edges);

  // TB grows down, so siblings spread along x; LR grows right, so along y.
  const cross = (id: string) => {
    const s = size.get(id)!;
    return direction === 'TB' ? s.width : s.height;
  };
  const main = (id: string) => {
    const s = size.get(id)!;
    return direction === 'TB' ? s.height : s.width;
  };

  const children = new Map<string, string[]>(ids.map((id) => [id, []]));
  for (const [child, p] of parent) children.get(p)!.push(child);
  // Siblings in the order the caller listed the nodes, not the edges.
  for (const list of children.values()) {
    list.sort((a, b) => order.get(a)! - order.get(b)!);
  }
  const roots = ids.filter((id) => !parent.has(id));

  // Depth, and the deepest node of each rank, which sets the rank's thickness.
  const depth = new Map<string, number>();
  const rankSize: number[] = [];
  const queue: [string, number][] = roots.map((id) => [id, 0]);
  for (let i = 0; i < queue.length; i++) {
    const [id, d] = queue[i]!;
    depth.set(id, d);
    rankSize[d] = Math.max(rankSize[d] ?? 0, main(id));
    for (const c of children.get(id)!) queue.push([c, d + 1]);
  }
  const rankStart: number[] = [];
  let at = 0;
  for (let d = 0; d < rankSize.length; d++) {
    rankStart[d] = at;
    at += (rankSize[d] ?? 0) + rankGap;
  }

  // Post-order: how wide each subtree is along the cross axis.
  const span = new Map<string, number>();
  const block = (id: string) => {
    const list = children.get(id)!;
    if (list.length === 0) return 0;
    return list.reduce((sum, c) => sum + span.get(c)!, 0) + nodeGap * (list.length - 1);
  };
  for (let i = queue.length - 1; i >= 0; i--) {
    const id = queue[i]![0];
    span.set(id, Math.max(cross(id), block(id)));
  }

  // Pre-order: each subtree gets a slot; the node centres in it, and so does
  // its children's block — which is what puts the parent over its children.
  const crossPos = new Map<string, number>();
  const place = (id: string, start: number) => {
    const s = span.get(id)!;
    crossPos.set(id, start + (s - cross(id)) / 2);
    let c = start + (s - block(id)) / 2;
    for (const child of children.get(id)!) {
      place(child, c);
      c += span.get(child)! + nodeGap;
    }
  };
  let start = 0;
  for (const root of roots) {
    place(root, start);
    start += span.get(root)! + nodeGap;
  }

  const boxes = new Map<string, Box>();
  for (const id of ids) {
    const d = depth.get(id)!;
    const m = rankStart[d]! + (rankSize[d]! - main(id)) / 2;
    const c = crossPos.get(id)!;
    const s = size.get(id)!;
    boxes.set(
      id,
      direction === 'TB'
        ? { x: c, y: m, width: s.width, height: s.height }
        : { x: m, y: c, width: s.width, height: s.height },
    );
  }
  return boxes;
}
