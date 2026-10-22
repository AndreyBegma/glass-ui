import type { DateRange, DateRangePreset } from './date-range-picker';
import { addDays, addMonths, isWithin, todayIsoDay, toIsoDay } from './date-text';

/**
 * #180 — the arithmetic half of `DateRangePicker`, with no React in it.
 *
 * Inside, a day is `date-text.ts`'s `YYYY-MM-DD`: arithmetic on UTC numbers,
 * so a DST change never costs a day. The public contract is a local-midnight
 * `Date`, converted here and only here — `value`, `min`, `max` and a preset's
 * `range()` in, `onValueChange` out.
 */

/** A `Date`'s local calendar day; its time of day is dropped. */
export function dayOf(date: Date): string {
  return toIsoDay(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

/** A day as a `Date` at local midnight. */
export function dateOf(day: string): Date {
  const [year, month, date] = day.split('-').map(Number) as [number, number, number];
  return new Date(year, month - 1, date);
}

/** Two days in order, whichever came first. */
export function ordered(a: string, b: string): [string, string] {
  return a <= b ? [a, b] : [b, a];
}

/** A range as days, start first even if the caller passed them reversed. */
export function rangeDays(range: DateRange): [string, string] {
  return ordered(dayOf(range.start), dayOf(range.end));
}

export function toRange(start: string, end: string): DateRange {
  const [first, last] = ordered(start, end);
  return { start: dateOf(first), end: dateOf(last) };
}

export function sameRange(a: DateRange | null, b: DateRange | null): boolean {
  if (!a || !b) return a === b;
  const [aStart, aEnd] = rangeDays(a);
  const [bStart, bEnd] = rangeDays(b);
  return aStart === bStart && aEnd === bEnd;
}

/** Whole range inside `min`/`max` — a preset that is not is disabled. */
export function rangeFits(range: DateRange, min?: string, max?: string): boolean {
  const [start, end] = rangeDays(range);
  return isWithin(start, min, max) && isWithin(end, min, max);
}

export interface DefaultPresetLabels {
  today: string;
  last7Days: string;
  last30Days: string;
  thisMonth: string;
}

/**
 * Today, the last 7 and 30 days (today included), and this month from the 1st
 * to today — a log or analytics filter has nothing after today to show. Each
 * `range()` reads the clock when it is called, so a page left open overnight
 * still means today.
 */
export function defaultPresets(labels: DefaultPresetLabels): DateRangePreset[] {
  const back = (days: number) => () => {
    const today = todayIsoDay();
    return toRange(addDays(today, -days), today);
  };
  return [
    { id: 'today', label: labels.today, range: back(0) },
    { id: 'last-7-days', label: labels.last7Days, range: back(6) },
    { id: 'last-30-days', label: labels.last30Days, range: back(29) },
    {
      id: 'this-month',
      label: labels.thisMonth,
      range: () => {
        const today = todayIsoDay();
        return toRange(`${today.slice(0, 7)}-01`, today);
      },
    },
  ];
}

const rangeFormatters = new Map<string, Intl.DateTimeFormat>();

/**
 * `12 – 19 Oct 2026`, `Oct 12 – 19, 2026`: `Intl`'s own range format, which
 * drops what the two ends share the way the locale does. Days are formatted
 * as UTC dates of their own numbers, as in `date-text.ts`.
 */
export function formatRangeText(start: string, end: string, locale: string): string {
  let format = rangeFormatters.get(locale);
  if (!format) {
    format = new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });
    rangeFormatters.set(locale, format);
  }
  const [first, last] = ordered(start, end).map((day) => {
    const [year, month, date] = day.split('-').map(Number) as [number, number, number];
    return new Date(Date.UTC(year, month - 1, date));
  }) as [Date, Date];
  if (typeof format.formatRange === 'function') return format.formatRange(first, last);
  return first.getTime() === last.getTime()
    ? format.format(first)
    : `${format.format(first)} – ${format.format(last)}`;
}

/**
 * The first shown month (`YYYY-MM`) once `active` has moved: unchanged while
 * `active` is inside the `count` shown months, else the window slides just far
 * enough to hold it.
 */
export function windowFor(first: string, active: string, count: number): string {
  const month = active.slice(0, 7);
  if (month < first) return month;
  const last = addMonths(`${first}-01`, count - 1).slice(0, 7);
  if (month > last) return addMonths(`${month}-01`, -(count - 1)).slice(0, 7);
  return first;
}

/** The document's language, then the browser's, then English. */
export function documentLocale(): string {
  if (typeof document !== 'undefined' && document.documentElement.lang) {
    return document.documentElement.lang;
  }
  if (typeof navigator !== 'undefined' && navigator.language) return navigator.language;
  return 'en';
}
