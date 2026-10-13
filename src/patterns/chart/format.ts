/**
 * #74 — default formatting (D7). Formatting is the consumer's; these are only
 * the defaults when `formatX` / `formatY` are not passed. Dates read `d MMM`,
 * or `HH:mm` when the whole range is under two days. Numbers go through
 * `Intl.NumberFormat`, and a currency is never assumed.
 */

import type { ChartLabels } from './types';

const TWO_DAYS = 2 * 24 * 60 * 60 * 1000;

/** Every rendered string can be overridden through `labels`, as in `LogViewer`. */
export const DEFAULT_LABELS: ChartLabels = {
  showTable: 'Show table',
  hideTable: 'Hide table',
  time: 'Time',
  category: 'Category',
  empty: 'No data',
  downsampled: (kept, total) => `down-sampled to ${kept} of ${total} points`,
  seriesCount: (count) => `${count} series`,
  max: (value) => `max ${value}`,
  noValue: 'no value',
};

export type FormatX = (x: Date | string | number) => string;
export type FormatY = (y: number) => string;

export function defaultFormatX(
  kind: 'time' | 'category',
  spanMs: number,
  timeZone?: string,
): FormatX {
  if (kind === 'category') return (x) => (x instanceof Date ? x.toISOString() : String(x));
  const f =
    spanMs < TWO_DAYS
      ? new Intl.DateTimeFormat(undefined, {
          timeZone,
          hour: '2-digit',
          minute: '2-digit',
          hourCycle: 'h23',
        })
      : new Intl.DateTimeFormat(undefined, { timeZone, day: 'numeric', month: 'short' });
  return (x) => {
    const d = x instanceof Date ? x : new Date(x);
    return Number.isFinite(d.getTime()) ? f.format(d) : String(x);
  };
}

const NUMBER = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });

export const defaultFormatY: FormatY = (y) => NUMBER.format(y);

/** "3 series, 7 Oct – 14 Oct, max 12.40" — the part of `aria-label` after the label. */
export function summarize({
  seriesCount,
  first,
  last,
  max,
  formatX,
  formatY,
  labels = DEFAULT_LABELS,
}: {
  seriesCount: number;
  first: Date | string | number | undefined;
  last: Date | string | number | undefined;
  max: number | null;
  formatX: FormatX;
  formatY: FormatY;
  labels?: Pick<ChartLabels, 'seriesCount' | 'max'>;
}): string {
  const parts = [labels.seriesCount(seriesCount)];
  if (first !== undefined && last !== undefined) {
    const a = formatX(first);
    const b = formatX(last);
    parts.push(a === b ? a : `${a} – ${b}`);
  }
  if (max !== null) parts.push(labels.max(formatY(max)));
  return parts.join(', ');
}
