import type { ChartModel } from './data';
import { areaPath, type BarRect, barRects, linePath, type Pt, stackRows } from './path';
import { bandScale, type LinearScale, linearScale, niceLinearTicks } from './scale';
import { timeTicks } from './time-ticks';

/**
 * #74 — everything the SVG draws, worked out from the model in one pure pass:
 * the plot box, both scales, the ticks, and the bars, areas and lines in
 * drawing order. `index.tsx` only maps this onto elements, so the geometry is
 * tested without a DOM.
 */

const DAY = 24 * 60 * 60 * 1000;
const PAD = { top: 8, right: 12, bottom: 24 };
/** An axis label is about this wide per character at `text-xs` tabular-nums. */
const CHAR = 6.5;

export type ChartLayout = {
  width: number;
  height: number;
  plot: { left: number; top: number; right: number; bottom: number };
  y: LinearScale;
  yTicks: number[];
  /** The pixel centre of each x position. */
  centers: number[];
  xTicks: { px: number; value: Date | string | number }[];
  bars: (BarRect & { seriesIndex: number })[];
  areas: { seriesIndex: number; d: string }[];
  lines: { seriesIndex: number; d: string }[];
  /** The top of each series at each x, after stacking — where the focus dot sits. */
  tops: (number | null)[][];
  /** The x position nearest to a pixel, or `null` when there is none. */
  indexAt: (px: number) => number | null;
};

export type LayoutOptions = {
  kind: 'time' | 'category';
  width: number;
  height: number;
  stacked: boolean;
  yMin?: number;
  yMax?: number;
  formatY: (y: number) => string;
  timeZone?: string;
};

function nearest(centers: number[], px: number): number | null {
  if (centers.length === 0) return null;
  let lo = 0;
  let hi = centers.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if ((centers[mid] as number) < px) lo = mid + 1;
    else hi = mid;
  }
  if (lo > 0 && px - (centers[lo - 1] as number) <= (centers[lo] as number) - px) return lo - 1;
  return lo;
}

export function layoutChart(model: ChartModel, o: LayoutOptions): ChartLayout {
  const kinds = model.series.map((s) => s.kind);
  const groups = (['bar', 'area', 'line'] as const).map((kind) => ({
    kind,
    members: kinds.flatMap((k, i) => (k === kind ? [i] : [])),
  }));

  // Stacking applies within one kind (the spec), so each kind stacks alone.
  const stacks = groups.map((g) => ({
    ...g,
    stack: stackRows(
      g.members.map((i) => model.y[i] as (number | null)[]),
      o.stacked,
    ),
  }));

  // The y extent: every stacked top, and 0 wherever a bar or area stands on it.
  let lo = Number.POSITIVE_INFINITY;
  let hi = Number.NEGATIVE_INFINITY;
  for (const g of stacks) {
    for (const row of [...g.stack.hi, ...(g.kind === 'line' ? [] : g.stack.lo)]) {
      for (const v of row) {
        if (v === null) continue;
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
    }
  }
  if (!Number.isFinite(lo)) {
    lo = 0;
    hi = 1;
  }
  const nice = niceLinearTicks(o.yMin ?? lo, o.yMax ?? hi, Math.max(2, Math.floor(o.height / 48)));
  const domain: [number, number] = [o.yMin ?? nice.domain[0], o.yMax ?? nice.domain[1]];
  const yTicks = nice.ticks.filter((t) => t >= domain[0] && t <= domain[1]);

  const labelChars = Math.max(...yTicks.map((t) => o.formatY(t).length), 1);
  const plot = {
    left: Math.round(8 + labelChars * CHAR),
    top: PAD.top,
    right: Math.max(o.width - PAD.right, 8 + labelChars * CHAR + 1),
    bottom: Math.max(o.height - PAD.bottom, PAD.top + 1),
  };
  const y = linearScale(domain, [plot.bottom, plot.top]);
  const n = model.xs.length;
  const hasBars = groups[0]?.members.length !== 0;

  let centers: number[];
  let band: number;
  let xTicks: ChartLayout['xTicks'];
  if (o.kind === 'category') {
    const b = bandScale(n, [plot.left, plot.right]);
    centers = model.xs.map((_, i) => b.center(i));
    band = b.bandwidth;
    // About one label per 64px; the rest are skipped, never overlapped.
    const every = Math.max(1, Math.ceil(n / Math.max(1, Math.floor((plot.right - plot.left) / 64))));
    xTicks = centers.flatMap((px, i) =>
      i % every === 0 ? [{ px, value: model.xValues[i] as Date | string | number }] : [],
    );
  } else {
    const first = model.xs[0] ?? 0;
    const last = model.xs[n - 1] ?? first;
    let gap = Number.POSITIVE_INFINITY;
    for (let i = 1; i < n; i++) gap = Math.min(gap, (model.xs[i] as number) - (model.xs[i - 1] as number));
    if (!Number.isFinite(gap) || gap <= 0) gap = DAY;
    // Bars need half a step either side, or the first and last are cut in half.
    const pad = hasBars || n === 1 ? gap / 2 : 0;
    const x = linearScale([first - pad, last + pad], [plot.left, plot.right]);
    centers = model.xs.map((v) => x(v));
    band = Math.abs(x(first + gap) - x(first));
    const count = Math.max(2, Math.floor((plot.right - plot.left) / 80));
    xTicks = timeTicks(x.domain[0], x.domain[1], count, o.timeZone).ticks.map((t) => ({
      px: x(t),
      value: new Date(t),
    }));
  }

  const point = (i: number, v: number | null): Pt =>
    v === null ? null : [centers[i] as number, y(v)];
  const tops: (number | null)[][] = model.series.map(() => []);
  const bars: ChartLayout['bars'] = [];
  const areas: ChartLayout['areas'] = [];
  const lines: ChartLayout['lines'] = [];

  for (const g of stacks) {
    g.members.forEach((seriesIndex, k) => {
      tops[seriesIndex] = g.stack.hi[k] as (number | null)[];
    });
    if (g.kind === 'bar') {
      for (const r of barRects({ centers, band, stack: g.stack, stacked: o.stacked, y })) {
        bars.push({ ...r, seriesIndex: g.members[r.series] as number });
      }
    } else {
      g.members.forEach((seriesIndex, k) => {
        const top = (g.stack.hi[k] as (number | null)[]).map((v, i) => point(i, v));
        if (g.kind === 'area') {
          const bottom = (g.stack.lo[k] as (number | null)[]).map((v, i) => point(i, v));
          areas.push({ seriesIndex, d: areaPath(top, bottom) });
        } else {
          lines.push({ seriesIndex, d: linePath(top) });
        }
      });
    }
  }

  return {
    width: o.width,
    height: o.height,
    plot,
    y,
    yTicks,
    centers,
    xTicks,
    bars,
    areas,
    lines,
    tops,
    indexAt: (px) => nearest(centers, px),
  };
}
