import type { LinearScale } from './scale';

/**
 * #74 — the path builder: pure functions from numbers to SVG geometry.
 *
 * A `null` anywhere is a gap. A line restarts with a new `M` after it, an area
 * closes its run before it and opens a new one after, and a bar is not drawn.
 * Nothing here ever writes `NaN` into a path.
 */

export type Pt = readonly [number, number] | null;

const round = (n: number) => Math.round(n * 100) / 100;

/** Splits `points` into its runs of non-null points. */
export function runs<T>(points: (T | null)[]): { start: number; items: T[] }[] {
  const out: { start: number; items: T[] }[] = [];
  let current: { start: number; items: T[] } | null = null;
  points.forEach((p, i) => {
    if (p === null) {
      current = null;
      return;
    }
    if (!current) {
      current = { start: i, items: [] };
      out.push(current);
    }
    current.items.push(p);
  });
  return out;
}

/** One `M…L…` segment per run. A run of one point is a dot (`h0`). */
export function linePath(points: Pt[]): string {
  return runs(points)
    .map(({ items }) => {
      const [first, ...rest] = items as [number, number][];
      const head = `M${round(first[0])} ${round(first[1])}`;
      if (rest.length === 0) return `${head} h0`;
      return `${head} ${rest.map(([x, y]) => `L${round(x)} ${round(y)}`).join(' ')}`;
    })
    .join(' ');
}

/**
 * One closed shape per run: along `top`, then back along `bottom` at the same
 * x positions. A point is a gap when either edge is `null` there.
 */
export function areaPath(top: Pt[], bottom: Pt[]): string {
  const pairs = top.map((t, i) => {
    const b = bottom[i] ?? null;
    return t && b ? ([t, b] as const) : null;
  });
  return runs(pairs)
    .map(({ items }) => {
      const upper = items.map(([t]) => t);
      const lower = items.map(([, b]) => b).reverse();
      const all = [...upper, ...lower];
      return `${all
        .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${round(x)} ${round(y)}`)
        .join(' ')} Z`;
    })
    .join(' ');
}

export type Stack = { lo: (number | null)[][]; hi: (number | null)[][] };

/**
 * Stacks `rows` (one per series, aligned on x) on top of each other, in the
 * order given. A `null` adds nothing to the base and is a gap in its own row.
 * Unstacked rows sit on `base` (0 unless the domain starts above it).
 */
export function stackRows(rows: (number | null)[][], stacked: boolean, base = 0): Stack {
  const width = rows[0]?.length ?? 0;
  const lo = rows.map(() => new Array<number | null>(width).fill(null));
  const hi = rows.map(() => new Array<number | null>(width).fill(null));
  for (let i = 0; i < width; i++) {
    let sum = base;
    rows.forEach((row, s) => {
      const v = row[i] ?? null;
      if (v === null) return;
      if (stacked) {
        (lo[s] as (number | null)[])[i] = sum;
        sum += v;
        (hi[s] as (number | null)[])[i] = sum;
      } else {
        (lo[s] as (number | null)[])[i] = base;
        (hi[s] as (number | null)[])[i] = base + v;
      }
    });
  }
  return { lo, hi };
}

export type BarRect = {
  series: number;
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * Bars for every bar series at every x. Grouped bars share the band side by
 * side; stacked bars share one column. Both take 80% of the band, so
 * neighbouring x positions never touch.
 */
export function barRects({
  centers,
  band,
  stack,
  stacked,
  y,
}: {
  centers: number[];
  band: number;
  stack: Stack;
  stacked: boolean;
  y: LinearScale;
}): BarRect[] {
  const count = stack.hi.length;
  if (count === 0) return [];
  const inner = Math.max(band * 0.8, 1);
  const width = stacked ? inner : inner / count;
  const rects: BarRect[] = [];
  stack.hi.forEach((row, s) => {
    row.forEach((hi, i) => {
      const lo = stack.lo[s]?.[i] ?? null;
      const c = centers[i];
      if (hi === null || lo === null || c === undefined) return;
      const a = y(lo);
      const b = y(hi);
      rects.push({
        series: s,
        index: i,
        x: round(c - inner / 2 + (stacked ? 0 : s * width)),
        y: round(Math.min(a, b)),
        width: round(width),
        height: round(Math.abs(a - b)),
      });
    });
  });
  return rects;
}
