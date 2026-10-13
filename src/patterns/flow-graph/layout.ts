import { Graph, layout as dagreLayout } from '@dagrejs/dagre';
import { type Box, layoutTree } from './tree-layout';
import type { FlowDirection, FlowEdge, FlowLayout, FlowNodeSize } from './types';

/**
 * #94 — where every node goes. Pure and synchronous, so the graph renders in
 * place on its first frame and the tests need no DOM.
 *
 * `tree` is in-house (`tree-layout.ts`): parents centred over their children.
 * `layered` is dagre's Sugiyama layout, which minimises crossings — the
 * reference's "Dependencies & Flow" graph, where a node has many parents.
 * Not ELK: `elkjs` is a ~1.5 MB GWT build with an asynchronous API, and the
 * graph would either flash unplaced or wait on a worker. dagre is a tenth of
 * that, synchronous, and more than enough for the graphs this draws (tens of
 * nodes, not thousands).
 *
 * Duplicate node ids keep the first; edges to an unknown node and self-loops
 * are left out of the layout (and out of the drawing, in `index.tsx`). Boxes
 * are top-left corners, normalised so the graph starts at 0, 0.
 */

export type { Box } from './tree-layout';

export const DEFAULT_NODE_SIZE: FlowNodeSize = { width: 240, height: 96 };
export const DEFAULT_NODE_GAP = 32;
export const DEFAULT_RANK_GAP = 64;

export type FlowLayoutOptions = {
  layout?: FlowLayout;
  direction?: FlowDirection;
  nodeSize?: FlowNodeSize;
  nodeGap?: number;
  rankGap?: number;
};

export type FlowLayoutResult = {
  boxes: Map<string, Box>;
  /** The extent of every box. Zero for an empty graph. */
  width: number;
  height: number;
};

export function layoutFlow(
  nodes: readonly { id: string; size?: FlowNodeSize }[],
  edges: readonly Pick<FlowEdge, 'source' | 'target' | 'kind'>[],
  options: FlowLayoutOptions = {},
): FlowLayoutResult {
  const {
    layout = 'tree',
    direction = 'TB',
    nodeSize = DEFAULT_NODE_SIZE,
    nodeGap = DEFAULT_NODE_GAP,
    rankGap = DEFAULT_RANK_GAP,
  } = options;

  const seen = new Set<string>();
  const sized: { id: string; size: FlowNodeSize }[] = [];
  for (const n of nodes) {
    if (seen.has(n.id)) continue;
    seen.add(n.id);
    sized.push({ id: n.id, size: n.size ?? nodeSize });
  }
  const drawn = edges.filter((e) => e.source !== e.target && seen.has(e.source) && seen.has(e.target));

  const boxes =
    layout === 'layered'
      ? layoutLayered(sized, drawn, { direction, nodeGap, rankGap })
      : layoutTree(sized, drawn, { direction, nodeGap, rankGap });

  return normalise(boxes);
}

function layoutLayered(
  nodes: readonly { id: string; size: FlowNodeSize }[],
  edges: readonly Pick<FlowEdge, 'source' | 'target'>[],
  options: { direction: FlowDirection; nodeGap: number; rankGap: number },
): Map<string, Box> {
  const g = new Graph({ multigraph: true });
  g.setGraph({
    rankdir: options.direction,
    nodesep: options.nodeGap,
    ranksep: options.rankGap,
    marginx: 0,
    marginy: 0,
  });
  g.setDefaultEdgeLabel(() => ({}));
  for (const n of nodes) g.setNode(n.id, { width: n.size.width, height: n.size.height });
  edges.forEach((e, i) => {
    g.setEdge(e.source, e.target, {}, String(i));
  });
  dagreLayout(g);

  const boxes = new Map<string, Box>();
  for (const n of nodes) {
    // dagre places centres.
    const { x, y } = g.node(n.id) as { x: number; y: number };
    boxes.set(n.id, {
      x: x - n.size.width / 2,
      y: y - n.size.height / 2,
      width: n.size.width,
      height: n.size.height,
    });
  }
  return boxes;
}

function normalise(boxes: Map<string, Box>): FlowLayoutResult {
  if (boxes.size === 0) return { boxes, width: 0, height: 0 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const b of boxes.values()) {
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.width);
    maxY = Math.max(maxY, b.y + b.height);
  }
  const out = new Map<string, Box>();
  for (const [id, b] of boxes) out.set(id, { ...b, x: b.x - minX, y: b.y - minY });
  return { boxes: out, width: maxX - minX, height: maxY - minY };
}
