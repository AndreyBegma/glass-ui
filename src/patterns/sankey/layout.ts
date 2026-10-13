import { isMore } from './collapse';
import type { ModelLink, ModelNode, SankeyModel } from './normalize';
import { linkKey } from './path';

/**
 * #94 — where everything goes. Pure: the same model and width always give
 * the same picture, so it is tested without a DOM.
 *
 * Hand-rolled rather than `d3-sankey` (approved on #94). The columns are given,
 * so the part a Sankey library exists for — assigning each node a column and
 * relaxing them — is not needed, and what is left is small:
 *
 * - **Nodes** are cards of one size, as in the reference, not bars as tall as
 *   their value: the value is printed on the card, and the links carry the
 *   proportion. A column lists its nodes by value, largest first, with a
 *   "+N more" node last, and is centred against the longest column.
 * - **Links** are one stroked cubic each, from the right edge of the source to
 *   the left edge of the target, as wide as `value × scale`. The scale fills
 *   `FILL` of a card's height with the busiest node's flow, so every node's
 *   links fit inside its card. A link never gets thinner than `MIN_LINK`
 *   pixels — the one place the width is not exactly proportional.
 * - **Ports.** A node's outgoing links are stacked top to bottom in the order
 *   of their targets, and its incoming links in the order of their sources,
 *   so links leave and arrive without crossing at the card.
 */

export const NODE_HEIGHT = 44;
export const ROW_GAP = 12;
/** The band above the nodes that holds the column names. */
export const HEADER = 32;
const PAD_X = 8;
const PAD_BOTTOM = 8;
const MIN_NODE_WIDTH = 96;
const MAX_NODE_WIDTH = 168;
/** The smallest gap between two columns of cards, where the links run. */
const MIN_GUTTER = 48;
/** How much of a card's height the busiest node's links fill. */
const FILL = 0.7;
export const MIN_LINK = 1;

export type LayoutNode = ModelNode & { x: number; y: number; width: number; height: number };

export type LayoutLink = ModelLink & {
  key: string;
  /** The stroke width. */
  width: number;
  /** Where the link leaves its source and reaches its target. */
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  d: string;
};

export type SankeyLayout = {
  width: number;
  height: number;
  nodeWidth: number;
  /** Pixels per unit of value. */
  scale: number;
  /** The centre of each column, for its name. */
  columns: { id: string; label: string; x: number }[];
  nodes: LayoutNode[];
  links: LayoutLink[];
};

/** Largest first; a "+N more" node last whatever it carries; ties in input order. */
function byRank(a: ModelNode, b: ModelNode) {
  const more = Number(isMore(a.id)) - Number(isMore(b.id));
  return more !== 0 ? more : b.value - a.value;
}

/** The narrowest the graph can be and still give every column a card and a gutter. */
export function minWidth(columns: number) {
  return 2 * PAD_X + columns * MIN_NODE_WIDTH + Math.max(0, columns - 1) * MIN_GUTTER;
}

export function layoutSankey(
  model: SankeyModel,
  { width: available, height: requested }: { width: number; height?: number },
): SankeyLayout {
  const count = model.columns.length;
  const width = Math.max(available, minWidth(count));
  const inner = width - 2 * PAD_X;
  // Columns and gutters share the width at about 1 : 0.6, inside the bounds.
  const nodeWidth = Math.min(
    MAX_NODE_WIDTH,
    Math.max(MIN_NODE_WIDTH, inner / (count + 0.6 * Math.max(0, count - 1))),
  );
  const step = count > 1 ? (inner - nodeWidth) / (count - 1) : 0;
  const left = (i: number) => (count > 1 ? PAD_X + i * step : (width - nodeWidth) / 2);

  const stacks = model.columns.map((_, i) =>
    model.nodes.filter((n) => n.column === i).sort(byRank),
  );
  const rows = Math.max(1, ...stacks.map((s) => s.length));
  const span = (n: number) => n * NODE_HEIGHT + Math.max(0, n - 1) * ROW_GAP;
  const needed = HEADER + span(rows) + PAD_BOTTOM;
  const height = Math.max(needed, requested ?? 0);
  const body = height - HEADER - PAD_BOTTOM;

  const nodes = new Map<string, LayoutNode>();
  for (const [i, stack] of stacks.entries()) {
    const top = HEADER + (body - span(stack.length)) / 2;
    for (const [r, n] of stack.entries()) {
      nodes.set(n.id, {
        ...n,
        x: left(i),
        y: top + r * (NODE_HEIGHT + ROW_GAP),
        width: nodeWidth,
        height: NODE_HEIGHT,
      });
    }
  }

  const busiest = Math.max(0, ...model.nodes.map((n) => n.value));
  const scale = busiest > 0 ? (FILL * NODE_HEIGHT) / busiest : 0;
  const thickness = (value: number) => Math.max(MIN_LINK, value * scale);

  const drawn = model.links.filter((l) => nodes.has(l.source) && nodes.has(l.target));
  const centreY = (id: string) => {
    const n = nodes.get(id)!;
    return n.y + n.height / 2;
  };

  /** For each link, the y of its centre where it meets `end` — stacked in `order`. */
  const ports = (end: 'source' | 'target', far: 'source' | 'target') => {
    const at = new Map<string, number>();
    const groups = new Map<string, ModelLink[]>();
    for (const l of drawn) groups.set(l[end], [...(groups.get(l[end]) ?? []), l]);
    for (const [id, group] of groups) {
      // Ties broken by the far end's id, so the order never depends on input order.
      group.sort((a, b) => centreY(a[far]) - centreY(b[far]) || (a[far] < b[far] ? -1 : 1));
      const total = group.reduce((sum, l) => sum + thickness(l.value), 0);
      let y = centreY(id) - total / 2;
      for (const l of group) {
        const w = thickness(l.value);
        at.set(linkKey(l), y + w / 2);
        y += w;
      }
    }
    return at;
  };
  const out = ports('source', 'target');
  const into = ports('target', 'source');

  const links: LayoutLink[] = drawn.map((l) => {
    const key = linkKey(l);
    const s = nodes.get(l.source)!;
    const t = nodes.get(l.target)!;
    const x0 = s.x + s.width;
    const x1 = t.x;
    const y0 = out.get(key)!;
    const y1 = into.get(key)!;
    const mx = (x0 + x1) / 2;
    return {
      ...l,
      key,
      width: thickness(l.value),
      x0,
      y0,
      x1,
      y1,
      d: `M${x0},${y0}C${mx},${y0} ${mx},${y1} ${x1},${y1}`,
    };
  });

  return {
    width,
    height,
    nodeWidth,
    scale,
    columns: model.columns.map((c, i) => ({ id: c.id, label: c.label, x: left(i) + nodeWidth / 2 })),
    nodes: stacks.flat().map((n) => nodes.get(n.id)!),
    links,
  };
}
