import type { ChartSeries, ChartSeriesColor } from './types';

/**
 * #74 — how a series is painted (D5). Every colour is a token class, written
 * out in full so Tailwind's scanner finds it: a theme or material change then
 * re-colours the chart with no re-read. Series *n* defaults to `series-n`.
 *
 * Colour is never the only signal. The legend and the tooltip name each
 * series, and a line from the fourth series on also has its own dash.
 */
const STYLE: Record<ChartSeriesColor, { stroke: string; fill: string; bg: string }> = {
  'series-1': { stroke: 'stroke-series-1', fill: 'fill-series-1', bg: 'bg-series-1' },
  'series-2': { stroke: 'stroke-series-2', fill: 'fill-series-2', bg: 'bg-series-2' },
  'series-3': { stroke: 'stroke-series-3', fill: 'fill-series-3', bg: 'bg-series-3' },
  'series-4': { stroke: 'stroke-series-4', fill: 'fill-series-4', bg: 'bg-series-4' },
  'series-5': { stroke: 'stroke-series-5', fill: 'fill-series-5', bg: 'bg-series-5' },
  'series-6': { stroke: 'stroke-series-6', fill: 'fill-series-6', bg: 'bg-series-6' },
  ok: { stroke: 'stroke-ok', fill: 'fill-ok', bg: 'bg-ok' },
  warn: { stroke: 'stroke-warn', fill: 'fill-warn', bg: 'bg-warn' },
  danger: { stroke: 'stroke-danger', fill: 'fill-danger', bg: 'bg-danger' },
};

/** Series 1–3 are solid; 4, 5 and 6 are dashed, dotted and dash-dotted. */
const DASH = [undefined, undefined, undefined, '6 3', '2 3', '8 3 2 3'] as const;

export function seriesColor(series: ChartSeries, index: number): ChartSeriesColor {
  return series.color ?? (`series-${(index % 6) + 1}` as ChartSeriesColor);
}

export function seriesStyle(series: ChartSeries, index: number) {
  return STYLE[seriesColor(series, index)];
}

/** Lines only: areas and bars are told apart by their fill and the legend. */
export function seriesDash(series: ChartSeries, index: number): string | undefined {
  return series.kind === 'line' ? DASH[index] : undefined;
}
