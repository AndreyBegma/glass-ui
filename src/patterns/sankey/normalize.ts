import type { Hue } from '../../lib/hue';
import type { SankeyColumn, SankeyLink, SankeyNode, SankeyTone } from './types';

/**
 * #94 — the one model every part reads. The input is taken as given where it
 * can be drawn as given, and what cannot be drawn is counted, never quietly
 * reshaped into a different picture:
 *
 * - a node in an unknown column, or with an `id` already taken, is ignored;
 * - a link with a value that is not a finite number above zero, an end that is
 *   not a node, or that does not run strictly left to right, is ignored;
 * - two links with the same ends are one link carrying both values.
 *
 * A node's value is the largest of its own `value`, the sum of its incoming
 * links and the sum of its outgoing ones — the flow through it, as the link
 * widths show it, unless the caller says it is more.
 */

export type ModelNode = {
  id: string;
  label: string;
  /** The column's index, left to right. */
  column: number;
  tone: SankeyTone;
  /** #109 — the node's identity hue, and every link out of it. */
  hue?: Hue;
  value: number;
  /** For a "+N more" node, the nodes it stands for; otherwise empty. */
  collapsed: SankeyNode[];
};

export type ModelLink = { source: string; target: string; value: number };

export type SankeyModel = {
  columns: SankeyColumn[];
  nodes: ModelNode[];
  links: ModelLink[];
  /** How much of the input was not drawn. */
  ignored: { nodes: number; links: number };
};

/** Finite and above zero — the only values a width can be drawn for. */
export const isDrawable = (value: number) => Number.isFinite(value) && value > 0;

export function normalize(
  columns: SankeyColumn[],
  nodes: SankeyNode[],
  links: SankeyLink[],
): SankeyModel {
  const columnIndex = new Map<string, number>();
  for (const [i, c] of columns.entries()) if (!columnIndex.has(c.id)) columnIndex.set(c.id, i);

  const byId = new Map<string, ModelNode>();
  let ignoredNodes = 0;
  for (const n of nodes) {
    const column = columnIndex.get(n.column);
    if (column === undefined || byId.has(n.id)) {
      ignoredNodes += 1;
      continue;
    }
    const floor = n.value !== undefined && isDrawable(n.value) ? n.value : 0;
    byId.set(n.id, {
      id: n.id,
      label: n.label,
      column,
      tone: n.tone ?? 'accent',
      hue: n.hue,
      value: floor,
      collapsed: [],
    });
  }

  const merged = new Map<string, ModelLink>();
  let ignoredLinks = 0;
  for (const l of links) {
    const s = byId.get(l.source);
    const t = byId.get(l.target);
    if (!s || !t || !isDrawable(l.value) || s.column >= t.column) {
      ignoredLinks += 1;
      continue;
    }
    // A NUL cannot appear in an id a person typed, so the key is unambiguous.
    const key = `${l.source}\u0000${l.target}`;
    const seen = merged.get(key);
    if (seen) seen.value += l.value;
    else merged.set(key, { source: l.source, target: l.target, value: l.value });
  }

  const inflow = new Map<string, number>();
  const outflow = new Map<string, number>();
  for (const l of merged.values()) {
    outflow.set(l.source, (outflow.get(l.source) ?? 0) + l.value);
    inflow.set(l.target, (inflow.get(l.target) ?? 0) + l.value);
  }
  for (const n of byId.values()) {
    n.value = Math.max(n.value, inflow.get(n.id) ?? 0, outflow.get(n.id) ?? 0);
  }

  return {
    columns,
    nodes: [...byId.values()],
    links: [...merged.values()],
    ignored: { nodes: ignoredNodes, links: ignoredLinks },
  };
}
