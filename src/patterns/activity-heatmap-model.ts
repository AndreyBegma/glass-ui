/**
 * #186 — ActivityHeatmap's model: dates, the week grid, the levels and the
 * arrow-key moves, all pure so they test without a DOM.
 *
 * A day is a UTC midnight in milliseconds and nothing else. `Date` objects
 * from the consumer are read as the *local* calendar day they name, then
 * converted once; after that every step is `+ 86_400_000`, which has no
 * daylight-saving hour to get wrong.
 */

const DAY = 86_400_000;

export type Weekday = 0 | 1;

export type HeatmapDay = {
  /** `YYYY-MM-DD`. */
  date: string;
  value: number;
  /** 0 is "nothing"; 1 … `levels - 1` are the shades. */
  level: number;
  /** Column, counted in weeks from the first one drawn. */
  col: number;
  /** Row, counted in days from `weekStartsOn`. */
  row: number;
  /** UTC midnight, ms. */
  ms: number;
};

export type HeatmapMonth = { col: number; month: number };

export type HeatmapGrid = {
  days: HeatmapDay[];
  weeks: number;
  months: HeatmapMonth[];
  /** The sum of every in-range value. */
  total: number;
  /** Days with a value above zero. */
  active: number;
};

const pad = (n: number) => String(n).padStart(2, '0');

/** `YYYY-MM-DD` onto a UTC midnight, or `null` when it is not a real date. */
export function parseYmd(text: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!m) return null;
  const ms = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return toYmd(ms) === text ? ms : null;
}

export function toYmd(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** The local calendar day a `Date` falls on, as a UTC midnight. */
export function dayOf(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

/** A `Date` that formats as that day in the local zone. */
export function localDate(ms: number): Date {
  const d = new Date(ms);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** Sunday is 0. */
export const weekdayOf = (ms: number) => new Date(ms).getUTCDay();

/**
 * Quantile levels over the non-zero values: a value's level follows the middle
 * of its rank among them, so the busiest day is always in the top level, one
 * outlier does not flatten the rest, and equal values — which share the rank
 * of the first of them — never split across levels. One distinct value is
 * level 1. Zero, negative and NaN are level 0.
 */
export function levelFn(values: number[], levels: number): (value: number) => number {
  const sorted = values.filter((v) => v > 0).sort((a, b) => a - b);
  const first = new Map<number, number>();
  sorted.forEach((v, i) => {
    if (!first.has(v)) first.set(v, i);
  });
  return (value) => {
    if (!(value > 0)) return 0;
    const rank = first.get(value) ?? 0;
    return 1 + Math.floor(((rank + 0.5) / sorted.length) * (levels - 1));
  };
}

/** The levels a consumer can ask for: at least zero and one shade. */
export function clampLevels(levels: number): number {
  return Number.isFinite(levels) ? Math.max(2, Math.floor(levels)) : 5;
}

/** The default range: the 52 weeks up to and including `end`. */
export function defaultStart(end: number): number {
  return end - 52 * 7 * DAY;
}

export function buildGrid(
  data: { date: string; value: number }[],
  startMs: number,
  endMs: number,
  weekStartsOn: Weekday,
  levels: number,
): HeatmapGrid {
  const [from, to] = startMs <= endMs ? [startMs, endMs] : [endMs, startMs];
  const sums = new Map<number, number>();
  for (const d of data) {
    const ms = parseYmd(d.date);
    if (ms === null || ms < from || ms > to) continue;
    const v = Number.isFinite(d.value) && d.value > 0 ? d.value : 0;
    sums.set(ms, (sums.get(ms) ?? 0) + v);
  }

  const level = levelFn([...sums.values()], clampLevels(levels));
  const offset = (weekdayOf(from) - weekStartsOn + 7) % 7;
  const gridStart = from - offset * DAY;

  const days: HeatmapDay[] = [];
  let total = 0;
  let active = 0;
  for (let ms = from; ms <= to; ms += DAY) {
    const value = sums.get(ms) ?? 0;
    total += value;
    if (value > 0) active++;
    const index = Math.round((ms - gridStart) / DAY);
    days.push({
      date: toYmd(ms),
      value,
      level: level(value),
      col: Math.floor(index / 7),
      row: index % 7,
      ms,
    });
  }

  const weeks = (days.at(-1)?.col ?? 0) + 1;
  return { days, weeks, months: monthLabels(days, weeks), total, active };
}

/**
 * A month is named above the first column that holds one of its days, and a
 * name is dropped when the previous one is under three columns away — it
 * would overprint it. The partial first month is the usual casualty.
 */
function monthLabels(days: HeatmapDay[], weeks: number): HeatmapMonth[] {
  const candidates: HeatmapMonth[] = [];
  let last = -1;
  for (let col = 0; col < weeks; col++) {
    const first = days.find((d) => d.col === col);
    if (!first) continue;
    const month = new Date(first.ms).getUTCMonth();
    if (month !== last) candidates.push({ col, month });
    last = month;
  }
  const kept: HeatmapMonth[] = [];
  candidates.forEach((c, i) => {
    const prev = kept.at(-1);
    if (prev && c.col - prev.col < 3) return;
    const next = candidates[i + 1];
    if (!prev && next && next.col - c.col < 3) return;
    kept.push(c);
  });
  return kept;
}

export type HeatmapKey =
  | 'ArrowUp'
  | 'ArrowDown'
  | 'ArrowLeft'
  | 'ArrowRight'
  | 'Home'
  | 'End';

/**
 * The day an arrow key moves to from `from`, or `null` at an edge (no wrap).
 * Left and right are a week, up and down a day; Home and End are the ends of
 * the row, and with `ctrl` the first and last day.
 */
export function neighbour(
  days: HeatmapDay[],
  from: HeatmapDay,
  key: HeatmapKey,
  ctrl = false,
): HeatmapDay | null {
  const at = (col: number, row: number) => days.find((d) => d.col === col && d.row === row) ?? null;
  switch (key) {
    case 'ArrowLeft':
      return at(from.col - 1, from.row);
    case 'ArrowRight':
      return at(from.col + 1, from.row);
    case 'ArrowUp':
      return at(from.col, from.row - 1);
    case 'ArrowDown':
      return at(from.col, from.row + 1);
    case 'Home':
      return ctrl ? (days[0] ?? null) : (days.find((d) => d.row === from.row) ?? null);
    case 'End':
      return ctrl ? (days.at(-1) ?? null) : (days.findLast((d) => d.row === from.row) ?? null);
  }
}
