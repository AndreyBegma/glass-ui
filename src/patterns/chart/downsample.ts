/**
 * #74 — down-sampling (D4). Above about 5 000 points a series stops being
 * something SVG draws quickly, and above the pixel width it stops being
 * something anybody can see. Largest-triangle-three-buckets keeps the points
 * that carry the shape — peaks and troughs — rather than every n-th one.
 *
 * The chart keeps one x list for every series (`data.ts`), so the kept index
 * set is the union of each series' picks, at a threshold that bounds the union
 * at `budget` for data without gaps. Gaps are kept: every run of non-null
 * points is sampled on its own, its ends are always kept, and one `null`
 * between two runs is kept so the line still breaks there.
 */

/** Down-sampling starts above this many x positions, and above twice the width. */
export const DOWNSAMPLE_ABOVE = 5_000;

export function shouldDownsample(count: number, width: number): boolean {
  return count > DOWNSAMPLE_ABOVE && count > 2 * width;
}

/** LTTB on one gap-free run. Returns indices into `xs`, ascending. */
export function lttb(xs: number[], ys: number[], threshold: number): number[] {
  const n = xs.length;
  if (threshold >= n || threshold < 3) {
    if (threshold >= n) return xs.map((_, i) => i);
    // Fewer than three buckets is just the ends.
    return n > 1 ? [0, n - 1] : [0];
  }
  const out = [0];
  const every = (n - 2) / (threshold - 2);
  let a = 0;
  for (let i = 0; i < threshold - 2; i++) {
    // The average of the next bucket is the triangle's third corner.
    const nextStart = Math.floor((i + 1) * every) + 1;
    const nextEnd = Math.min(Math.floor((i + 2) * every) + 1, n);
    let avgX = 0;
    let avgY = 0;
    for (let j = nextStart; j < nextEnd; j++) {
      avgX += xs[j] as number;
      avgY += ys[j] as number;
    }
    const len = Math.max(nextEnd - nextStart, 1);
    avgX /= len;
    avgY /= len;

    const start = Math.floor(i * every) + 1;
    const end = Math.floor((i + 1) * every) + 1;
    const ax = xs[a] as number;
    const ay = ys[a] as number;
    let best = start;
    let bestArea = -1;
    for (let j = start; j < end; j++) {
      const area = Math.abs(
        (ax - avgX) * ((ys[j] as number) - ay) - (ax - (xs[j] as number)) * (avgY - ay),
      );
      if (area > bestArea) {
        bestArea = area;
        best = j;
      }
    }
    out.push(best);
    a = best;
  }
  out.push(n - 1);
  return out;
}

/** The x indices worth keeping for one series, gaps included. */
function seriesIndices(xs: number[], row: (number | null)[], threshold: number): number[] {
  const nonNull = row.reduce<number>((n, v) => (v === null ? n : n + 1), 0);
  if (nonNull === 0) return [];
  const keep: number[] = [];
  let i = 0;
  while (i < row.length) {
    if (row[i] === null) {
      i++;
      continue;
    }
    const start = i;
    while (i < row.length && row[i] !== null) i++;
    const runXs = xs.slice(start, i);
    const runYs = row.slice(start, i) as number[];
    const share = Math.max(2, Math.round((threshold * runXs.length) / nonNull));
    for (const k of lttb(runXs, runYs, share)) keep.push(start + k);
    // The null right after the run, so the path breaks there.
    if (i < row.length) keep.push(i);
  }
  return keep;
}

/**
 * The x indices to keep across all `rows`, ascending, so that the union stays
 * within `budget` for gap-free data.
 */
export function downsampleIndices(
  xs: number[],
  rows: (number | null)[][],
  budget: number,
): number[] {
  const threshold = Math.max(3, Math.floor(budget / Math.max(rows.length, 1)));
  const keep = new Set<number>();
  for (const row of rows) for (const i of seriesIndices(xs, row, threshold)) keep.add(i);
  return [...keep].sort((a, b) => a - b);
}
