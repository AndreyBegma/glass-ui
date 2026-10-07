import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

/**
 * #74 — Chart: area, line and bar time series on hand-rolled SVG, no
 * dependency (D3). Series colours are tokens, so a theme change needs no
 * re-read. Colour is never the only signal: the legend and tooltip name each
 * series and line series differ in dash from series 4 onwards (D5).
 *
 * This file is the scaffold: the final prop types and a placeholder body.
 * i74-chart replaces the body and adds its part files beside this one.
 */
export type ChartSeriesColor =
  | 'series-1'
  | 'series-2'
  | 'series-3'
  | 'series-4'
  | 'series-5'
  | 'series-6'
  | 'ok'
  | 'warn'
  | 'danger';

export type ChartPoint = {
  x: Date | string | number;
  /** `null` leaves a gap in a line or area and draws no bar. */
  y: number | null;
};

export type ChartSeries = {
  id: string;
  name: string;
  kind: 'area' | 'line' | 'bar';
  color?: ChartSeriesColor;
  points: ChartPoint[];
};

/** What `formatTooltip` is given: the focused x and every series at it. */
export type ChartTooltipContext = {
  x: Date | string | number;
  entries: { series: ChartSeries; y: number | null }[];
};

export type ChartProps = {
  /** Names the chart; the SVG's `aria-label` is this plus an auto summary. */
  label: string;
  /** At most 6 series render (D4). */
  series: ChartSeries[];
  x: 'time' | 'category';
  /** Stacking applies to series of the same kind. */
  stacked?: boolean;
  height?: number;
  yMin?: number;
  yMax?: number;
  formatX?: (x: Date | string | number) => string;
  formatY?: (y: number) => string;
  formatTooltip?: (context: ChartTooltipContext) => ReactNode;
  legend?: 'top' | 'bottom' | false;
  emptyState?: ReactNode;
  /** The visually hidden table becomes visible. Controlled with the next prop. */
  showTable?: boolean;
  onShowTableChange?: (show: boolean) => void;
  className?: string;
};

export function Chart({ label, height = 240, className }: ChartProps) {
  return (
    <div
      role="img"
      aria-label={label}
      data-chart-scaffold
      style={{ height }}
      className={cn('w-full rounded-(--radius-surface) bg-surface', className)}
    />
  );
}
