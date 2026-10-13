import type { ModelLink, ModelNode, SankeyModel } from './normalize';

/**
 * #94 — "+N more". A column with more than `max` nodes keeps the top `max - 1`
 * by value and folds the rest into one node that carries their summed value.
 * Every link that touched a folded node is moved onto the "+N more" node and
 * merged with the others that now share both ends, so the flow in and out of
 * every column is unchanged — only the names are fewer.
 *
 * Ties keep input order. `max` below 2 is read as 2: one "+N more" node and
 * nothing else would hide the whole column.
 */

/** The prefix of a "+N more" node's `id`; a NUL cannot clash with a real id. */
export const MORE_PREFIX = '\u0000more:';

export const isMore = (id: string) => id.startsWith(MORE_PREFIX);

export function collapse(
  model: SankeyModel,
  max: number,
  moreLabel: (count: number) => string,
): SankeyModel {
  const limit = Math.max(2, Math.floor(max));
  const folded = new Map<string, string>();
  const nodes: ModelNode[] = [];

  for (const [column, c] of model.columns.entries()) {
    const own = model.nodes.filter((n) => n.column === column);
    if (own.length <= limit) {
      nodes.push(...own);
      continue;
    }
    // `sort` is stable, so equal values keep the order they were given in.
    const ranked = [...own].sort((a, b) => b.value - a.value);
    const kept = ranked.slice(0, limit - 1);
    const rest = ranked.slice(limit - 1);
    const id = `${MORE_PREFIX}${c.id}`;
    for (const n of rest) folded.set(n.id, id);
    nodes.push(...kept, {
      id,
      label: moreLabel(rest.length),
      column,
      tone: 'neutral',
      value: rest.reduce((sum, n) => sum + n.value, 0),
      collapsed: rest.map((n) => ({
        id: n.id,
        label: n.label,
        column: c.id,
        tone: n.tone,
        hue: n.hue,
        value: n.value,
      })),
    });
  }

  if (folded.size === 0) return model;

  const merged = new Map<string, ModelLink>();
  for (const l of model.links) {
    const source = folded.get(l.source) ?? l.source;
    const target = folded.get(l.target) ?? l.target;
    const key = `${source}\u0000${target}`;
    const seen = merged.get(key);
    if (seen) seen.value += l.value;
    else merged.set(key, { source, target, value: l.value });
  }

  return { ...model, nodes, links: [...merged.values()] };
}
