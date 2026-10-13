import type { ChartSeries } from './types';

/**
 * #74 — the chart's one data model. Every part reads this rather than the
 * consumer's `series`: one ordered x list shared by all series, and a
 * `y[series][xIndex]` matrix in which a missing or `null` point is `null`.
 * Sharing the x list is what makes stacking, the tooltip's "every series at
 * this x" and the table's one-row-per-x the same lookup.
 */

/** D4: more than this many series do not render. */
export const MAX_SERIES = 6;

export type ChartModel = {
  /** Time: epoch ms, ascending. Category: an index, in first-seen order. */
  xs: number[];
  /** What the formatters are given for each x. */
  xValues: (Date | string | number)[];
  series: ChartSeries[];
  y: (number | null)[][];
};

function toMs(v: Date | string | number): number {
  if (v instanceof Date) return v.getTime();
  if (typeof v === 'number') return v;
  return Date.parse(v);
}

export function buildModel(
  input: ChartSeries[],
  kind: 'time' | 'category',
): ChartModel {
  const series = input.slice(0, MAX_SERIES);
  const index = new Map<string | number, number>();
  const keys: (string | number)[] = [];
  const firstValue: (Date | string | number)[] = [];
  const keyed = series.map((s) =>
    s.points.flatMap((p) => {
      const key = kind === 'time' ? toMs(p.x) : String(p.x);
      if (typeof key === 'number' && !Number.isFinite(key)) return [];
      if (!index.has(key)) {
        index.set(key, keys.length);
        keys.push(key);
        firstValue.push(p.x);
      }
      const y = typeof p.y === 'number' && Number.isFinite(p.y) ? p.y : null;
      return [{ key, y }];
    }),
  );

  const order = keys.map((_, i) => i);
  if (kind === 'time') order.sort((a, b) => (keys[a] as number) - (keys[b] as number));
  const position = new Map<string | number, number>();
  for (const [i, k] of order.entries()) position.set(keys[k] as string | number, i);

  const y = keyed.map((points) => {
    const row: (number | null)[] = new Array(order.length).fill(null);
    // A repeated x in one series: the later point wins.
    for (const p of points) row[position.get(p.key) as number] = p.y;
    return row;
  });

  const xs = kind === 'time' ? order.map((k) => keys[k] as number) : order.map((_, i) => i);
  const xValues = order.map((k) =>
    kind === 'time' ? new Date(keys[k] as number) : (firstValue[k] as Date | string | number),
  );
  return { xs, xValues, series, y };
}

/** Keeps only the x positions at `indices` (ascending), in every series. */
export function pickIndices(model: ChartModel, indices: number[]): ChartModel {
  return {
    xs: indices.map((i) => model.xs[i] as number),
    xValues: indices.map((i) => model.xValues[i] as Date | string | number),
    series: model.series,
    y: model.y.map((row) => indices.map((i) => row[i] ?? null)),
  };
}

export function hasData(model: ChartModel): boolean {
  return model.y.some((row) => row.some((v) => v !== null));
}
