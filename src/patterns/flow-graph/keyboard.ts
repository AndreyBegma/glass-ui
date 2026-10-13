import type { Box } from './tree-layout';

/**
 * #94 — which node an arrow key moves focus to. Pure, so the rule is tested
 * without a canvas.
 *
 * The graph is one tab stop; arrows move between nodes by where they are drawn,
 * not by how they are connected, so a reader can reach every node whatever the
 * edges say. The candidates are the nodes whose centre lies in the arrow's
 * half-plane. Those in the beam — overlapping the current node across the
 * arrow, the row for ←/→ or the column for ↑/↓ — win over the rest, so → from
 * a parent goes to its neighbour in the rank, not down to a child. Within each
 * group the nearest wins, with drift off the axis counted twice. Ties go to
 * the node listed first, so the answer is deterministic.
 */

export type FlowArrow = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight';

const AXIS: Record<FlowArrow, { dx: number; dy: number }> = {
  ArrowUp: { dx: 0, dy: -1 },
  ArrowDown: { dx: 0, dy: 1 },
  ArrowLeft: { dx: -1, dy: 0 },
  ArrowRight: { dx: 1, dy: 0 },
};

export function isArrow(key: string): key is FlowArrow {
  return key in AXIS;
}

export function nearestInDirection(
  fromId: string,
  boxes: ReadonlyMap<string, Box>,
  arrow: FlowArrow,
): string | null {
  const from = boxes.get(fromId);
  if (!from) return null;
  const { dx, dy } = AXIS[arrow];
  const fx = from.x + from.width / 2;
  const fy = from.y + from.height / 2;

  const inBeam = (b: Box) =>
    dx !== 0
      ? b.y < from.y + from.height && from.y < b.y + b.height
      : b.x < from.x + from.width && from.x < b.x + b.width;

  let best: string | null = null;
  let bestScore = Infinity;
  for (const [id, b] of boxes) {
    if (id === fromId) continue;
    const vx = b.x + b.width / 2 - fx;
    const vy = b.y + b.height / 2 - fy;
    const along = vx * dx + vy * dy;
    if (along <= 0) continue;
    const across = Math.abs(vx * dy - vy * dx);
    // Out of the beam ranks after every node in it.
    const score = along + 2 * across + (inBeam(b) ? 0 : 1e9);
    if (score < bestScore) {
      bestScore = score;
      best = id;
    }
  }
  return best;
}
