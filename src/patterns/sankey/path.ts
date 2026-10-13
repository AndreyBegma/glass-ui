import type { ModelLink } from './normalize';

/**
 * #94 — what "its path" means when a node or a link is hovered or focused:
 * everything that flows into it, transitively, and everything that flows out
 * of it, transitively. A Sankey shows aggregates, so this is every route the
 * flow *could* have taken through the item, not one traced session — the
 * README says so.
 */

export type Active = { kind: 'node'; id: string } | { kind: 'link'; key: string } | null;

export type Path = { nodes: Set<string>; links: Set<string> };

export const linkKey = (l: Pick<ModelLink, 'source' | 'target'>) =>
  `${l.source}\u0000${l.target}`;

export function pathOf(active: Active, links: ModelLink[]): Path | null {
  if (active === null) return null;
  const into = new Map<string, ModelLink[]>();
  const from = new Map<string, ModelLink[]>();
  for (const l of links) {
    into.set(l.target, [...(into.get(l.target) ?? []), l]);
    from.set(l.source, [...(from.get(l.source) ?? []), l]);
  }

  const nodes = new Set<string>();
  const found = new Set<string>();
  // Links only run left to right, so neither walk can loop.
  const walk = (start: string, edges: Map<string, ModelLink[]>, end: 'source' | 'target') => {
    const stack = [start];
    while (stack.length > 0) {
      const id = stack.pop()!;
      nodes.add(id);
      for (const l of edges.get(id) ?? []) {
        found.add(linkKey(l));
        if (!nodes.has(l[end])) stack.push(l[end]);
      }
    }
  };

  if (active.kind === 'node') {
    walk(active.id, into, 'source');
    walk(active.id, from, 'target');
  } else {
    const link = links.find((l) => linkKey(l) === active.key);
    if (!link) return null;
    found.add(active.key);
    walk(link.source, into, 'source');
    walk(link.target, from, 'target');
  }
  return { nodes, links: found };
}
