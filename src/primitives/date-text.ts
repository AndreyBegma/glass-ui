/**
 * FEAT-20261013-006 (W242) — the text half of `DateField`: what a date looks
 * like in a locale, and how typed text becomes one. No React here, so every
 * rule below is tested without a DOM (`date-text.test.ts`).
 *
 * A day is the native input's string, `YYYY-MM-DD`, and arithmetic is done on
 * UTC dates built from its three numbers. A local `Date` at midnight is the
 * classic way to lose a day to a DST change; UTC has none, and every
 * formatter below is told `timeZone: 'UTC'` so it reads the same numbers back.
 *
 * **Nothing about a locale is hard-coded.** The order of day, month and year
 * and the separator between them come from `formatToParts` of a fixed date:
 * `13.10.2026` in ru and uk, `10/13/2026` in en, `2026/10/13` in ja.
 */

type DatePart = 'day' | 'month' | 'year';

interface NumericPattern {
  /** Day, month and year, each once, in the locale's order. */
  order: DatePart[];
  /** The pattern itself: a part's name, or the literal between parts. */
  tokens: Array<{ part: DatePart } | { literal: string }>;
}

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

const formatters = new Map<string, Intl.DateTimeFormat>();

/** One `Intl.DateTimeFormat` per locale and options — they are not cheap to build. */
function formatter(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let found = formatters.get(key);
  if (!found) {
    found = new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' });
    formatters.set(key, found);
  }
  return found;
}

function pad(value: number, width = 2): string {
  return String(value).padStart(width, '0');
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function toIsoDay(year: number, month: number, day: number): string {
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
}

/** A real calendar day in `YYYY-MM-DD` form — `2026-02-31` is not one. */
export function isIsoDay(value: string): boolean {
  const match = ISO_DAY.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number) as [number, number, number];
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);
}

function toUtc(day: string): Date {
  const [year, month, date] = day.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(year, month - 1, date));
}

function fromUtc(date: Date): string {
  return toIsoDay(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

/** Today on this device, as a day. */
export function todayIsoDay(now = new Date()): string {
  return toIsoDay(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function addDays(day: string, amount: number): string {
  const date = toUtc(day);
  date.setUTCDate(date.getUTCDate() + amount);
  return fromUtc(date);
}

/** A month on, keeping the day where it can: 31 January plus one is 28 February. */
export function addMonths(day: string, amount: number): string {
  const [year, month, date] = day.split('-').map(Number) as [number, number, number];
  const target = new Date(Date.UTC(year, month - 1 + amount, 1));
  const targetYear = target.getUTCFullYear();
  const targetMonth = target.getUTCMonth() + 1;
  return toIsoDay(targetYear, targetMonth, Math.min(date, daysInMonth(targetYear, targetMonth)));
}

/** 0 is Sunday, as `Date#getDay`. */
export function weekdayOf(day: string): number {
  return toUtc(day).getUTCDay();
}

export function clampDay(day: string, min?: string, max?: string): string {
  if (min && day < min) return min;
  if (max && day > max) return max;
  return day;
}

/** `ISO` strings of one width compare as dates, so the bounds are plain string order. */
export function isWithin(day: string, min?: string, max?: string): boolean {
  return !(min && day < min) && !(max && day > max);
}

const patterns = new Map<string, NumericPattern>();

function numericPattern(locale: string): NumericPattern {
  const cached = patterns.get(locale);
  if (cached) return cached;

  const parts = formatter(locale, { day: '2-digit', month: '2-digit', year: 'numeric' })
    .formatToParts(new Date(Date.UTC(2026, 9, 13)));
  const tokens: NumericPattern['tokens'] = [];
  for (const { type, value } of parts) {
    if (type === 'day' || type === 'month' || type === 'year') tokens.push({ part: type });
    else if (type === 'literal') tokens.push({ literal: value });
    // Anything else (an era, a relatedYear) is not something a person types.
  }
  const pattern = {
    order: tokens.flatMap((token) => ('part' in token ? [token.part] : [])),
    tokens,
  };
  patterns.set(locale, pattern);
  return pattern;
}

function render(locale: string, value: (part: DatePart) => string): string {
  return numericPattern(locale)
    .tokens.map((token) => ('part' in token ? value(token.part) : token.literal))
    .join('');
}

/** `ДД.ММ.ГГГГ` is not hard-coded: it is the locale's pattern with `DD`, `MM`, `YYYY` in it. */
export function datePlaceholder(locale: string): string {
  return render(locale, (part) => ({ day: 'DD', month: 'MM', year: 'YYYY' })[part]);
}

/** What the field shows while it has focus: `13.10.2026`, `10/13/2026`. */
export function formatNumericDay(day: string, locale: string): string {
  const [year, month, date] = day.split('-');
  return render(locale, (part) => ({ day: date, month, year })[part] ?? '');
}

/** What the field shows at rest: `вт, 13 окт.` — the year only when it is not this one. */
export function formatLongDay(day: string, locale: string, today: string): string {
  const otherYear = day.slice(0, 4) !== today.slice(0, 4);
  return formatter(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(otherYear ? { year: 'numeric' } : {}),
  }).format(toUtc(day));
}

/** A day's whole name, for a reader: `Tuesday, October 13, 2026`. */
export function formatFullDay(day: string, locale: string): string {
  return formatter(locale, { dateStyle: 'full' }).format(toUtc(day));
}

export function capitalize(text: string, locale: string): string {
  return text.charAt(0).toLocaleUpperCase(locale) + text.slice(1);
}

/** The grid's title: `Октябрь 2026 г.`, `October 2026`. */
export function formatMonthTitle(day: string, locale: string): string {
  return capitalize(formatter(locale, { month: 'long', year: 'numeric' }).format(toUtc(day)), locale);
}

/**
 * The seven column heads from `weekStartsOn`. `narrow` is what is drawn; it is
 * ambiguous in ru and uk (вторник and воскресенье are both «В»), so `long`
 * travels with it for a reader.
 */
export function weekdayNames(
  locale: string,
  weekStartsOn: 0 | 1,
): Array<{ narrow: string; long: string }> {
  const narrow = formatter(locale, { weekday: 'narrow' });
  const long = formatter(locale, { weekday: 'long' });
  // 2026-10-11 is a Sunday.
  return Array.from({ length: 7 }, (_, index) => {
    const date = toUtc(addDays('2026-10-11', index + weekStartsOn));
    return { narrow: narrow.format(date), long: capitalize(long.format(date), locale) };
  });
}

/** The parts' widths when a person types the digits without separators. */
const COMPACT_WIDTHS: Record<number, { year: number | null }> = {
  4: { year: null },
  6: { year: 2 },
  8: { year: 4 },
};

function splitCompact(digits: string, order: DatePart[]): string[] | null {
  const widths = COMPACT_WIDTHS[digits.length];
  if (!widths) return null;
  const groups: string[] = [];
  let at = 0;
  for (const part of order) {
    if (part === 'year' && widths.year === null) continue;
    const width = part === 'year' ? (widths.year as number) : 2;
    groups.push(digits.slice(at, at + width));
    at += width;
  }
  return groups;
}

/**
 * Typed text to a day, forgivingly.
 *
 * The digit groups are read in the locale's order whatever separates them —
 * `13.10.2026`, `13/10/2026`, `13 10 26` and `13102026` are the same day in
 * ru. Two groups are day and month in this year; a one- or two-digit year is
 * 20YY. A run of 4, 6 or 8 digits with no separator is split by the same
 * order. Letters are never a date.
 *
 * Returns `''` for empty text, the day for a real one, and `null` otherwise —
 * `31.02.2026` included.
 */
export function parseDayText(text: string, locale: string, today: string): string | null {
  const trimmed = text.trim();
  if (trimmed === '') return '';
  if (/\p{L}/u.test(trimmed)) return null;

  const { order } = numericPattern(locale);
  const found = trimmed.match(/\d+/g) ?? [];
  const groups = found.length === 1 ? splitCompact(found[0] as string, order) : found;
  if (!groups || groups.length < 2 || groups.length > 3) return null;

  const fields = groups.length === 3 ? order : order.filter((part) => part !== 'year');
  const read: Partial<Record<DatePart, string>> = {};
  fields.forEach((part, index) => {
    read[part] = groups[index];
  });

  const yearText = read.year ?? today.slice(0, 4);
  if (yearText.length === 3 || yearText.length > 4) return null;
  if ((read.day?.length ?? 0) > 2 || (read.month?.length ?? 0) > 2) return null;

  const year = yearText.length <= 2 ? 2000 + Number(yearText) : Number(yearText);
  const day = toIsoDay(year, Number(read.month), Number(read.day));
  return isIsoDay(day) ? day : null;
}
