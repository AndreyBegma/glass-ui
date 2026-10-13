import type { ReactNode } from 'react';

/**
 * #74 — Chart's public types. They live apart from `index.tsx` so the pure
 * parts (data, path, down-sampling) can name them without importing React
 * components; `index.tsx` re-exports every one.
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

/** Every string the chart renders or announces, with English defaults. */
export type ChartLabels = {
  showTable: string;
  hideTable: string;
  /** The table's first column header on a time x-axis. */
  time: string;
  /** The table's first column header on a category x-axis. */
  category: string;
  /** Shown when there is no point to draw and no `emptyState` is given. */
  empty: string;
  /** Added to the table caption when the chart was down-sampled (D4). */
  downsampled: (kept: number, total: number) => string;
  /** The summary's first part: "3 series". */
  seriesCount: (count: number) => string;
  /** The summary's last part, given the formatted maximum: "max 12.4". */
  max: (value: string) => string;
  /** Announced for a series with no value at the focused x. */
  noValue: string;
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
  /** Defaults to `'top'`. */
  legend?: 'top' | 'bottom' | false;
  emptyState?: ReactNode;
  /** The visually hidden table becomes visible. Controlled with the next prop. */
  showTable?: boolean;
  onShowTableChange?: (show: boolean) => void;
  /** Overrides any of the strings above; the rest stay English. */
  labels?: Partial<ChartLabels>;
  className?: string;
};
