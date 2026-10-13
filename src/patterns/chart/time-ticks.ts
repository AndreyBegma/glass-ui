/**
 * #74 — "nice" ticks for a time x-axis, the issue's named medium risk.
 *
 * A tick is somewhere a person expects one on a wall clock: on the hour, at
 * local midnight, on the 1st. Adding a fixed number of milliseconds gets that
 * wrong twice a year (a day is 23 or 25 hours across DST) and every month (a
 * month is not 30 days). So the steps are taken in one of two ways:
 *
 * - **Minutes and hours** are absolute. The generator walks whole minutes or
 *   hours and keeps those whose *wall-clock* minute or hour is a multiple of
 *   the step. Every-6-hours therefore lands on 00/06/12/18 on both sides of a
 *   change, an hour that does not exist is never drawn, and an hour that
 *   happens twice is drawn twice, because both of them happened.
 * - **Days and longer** are calendar arithmetic on the wall-clock parts in the
 *   zone, turned back into an instant afterwards. Day ticks sit on local
 *   midnight however long the day was, and month ticks sit on the 1st however
 *   long the month was.
 *
 * The zone is a parameter. The chart passes none, which is the browser's own,
 * and the tests freeze `Europe/Berlin` and `America/New_York` without touching
 * `TZ`.
 */

export type TimeUnit = 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';

export type TimeInterval = { unit: TimeUnit; step: number; ms: number };

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Smallest first; the generator takes the first one wide enough. */
const INTERVALS: TimeInterval[] = [
  { unit: 'minute', step: 1, ms: MINUTE },
  { unit: 'minute', step: 5, ms: 5 * MINUTE },
  { unit: 'minute', step: 15, ms: 15 * MINUTE },
  { unit: 'minute', step: 30, ms: 30 * MINUTE },
  { unit: 'hour', step: 1, ms: HOUR },
  { unit: 'hour', step: 3, ms: 3 * HOUR },
  { unit: 'hour', step: 6, ms: 6 * HOUR },
  { unit: 'hour', step: 12, ms: 12 * HOUR },
  { unit: 'day', step: 1, ms: DAY },
  { unit: 'day', step: 2, ms: 2 * DAY },
  { unit: 'week', step: 1, ms: 7 * DAY },
  { unit: 'month', step: 1, ms: 30 * DAY },
  { unit: 'month', step: 3, ms: 91 * DAY },
  { unit: 'month', step: 6, ms: 182 * DAY },
  { unit: 'year', step: 1, ms: 365 * DAY },
];

export type ZonedParts = {
  year: number;
  /** 1–12. */
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  /** 0 is Sunday. */
  weekday: number;
};

const FORMATTERS = new Map<string, Intl.DateTimeFormat>();
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatter(timeZone: string | undefined): Intl.DateTimeFormat {
  const key = timeZone ?? '';
  let f = FORMATTERS.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      weekday: 'short',
    });
    FORMATTERS.set(key, f);
  }
  return f;
}

/** The wall clock in `timeZone` at instant `ms`. */
export function zonedParts(ms: number, timeZone?: string): ZonedParts {
  const parts: Record<string, string> = {};
  for (const p of formatter(timeZone).formatToParts(ms)) parts[p.type] = p.value;
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    // Some engines still print midnight as 24 under h23.
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    second: Number(parts.second),
    weekday: WEEKDAYS.indexOf(parts.weekday ?? 'Sun'),
  };
}

/** How far `timeZone` is ahead of UTC at instant `ms`. */
function offsetAt(ms: number, timeZone?: string): number {
  const p = zonedParts(ms, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - (ms - (((ms % 1000) + 1000) % 1000));
}

/**
 * The instant at which `timeZone`'s wall clock reads the given parts. Out of
 * range parts roll over (`day: 32` is the next month), as `Date.UTC` does.
 * A wall time inside a spring-forward gap resolves to the instant just after
 * it; the caller can compare `zonedParts` back if it needs to know.
 */
export function zonedToInstant(
  p: Pick<ZonedParts, 'year' | 'month' | 'day'> &
    Partial<Pick<ZonedParts, 'hour' | 'minute'>>,
  timeZone?: string,
): number {
  const guess = Date.UTC(p.year, p.month - 1, p.day, p.hour ?? 0, p.minute ?? 0);
  // The offset at the guess may belong to the other side of a change, so it is
  // checked once more at the instant it gives.
  const first = offsetAt(guess, timeZone);
  const t1 = guess - first;
  const second = offsetAt(t1, timeZone);
  if (second === first) return t1;
  const t2 = guess - second;
  if (offsetAt(t2, timeZone) === second) return t2;
  // Neither offset holds: the wall time is inside a spring-forward gap. The
  // smaller offset gives the later instant, the first wall time after the gap.
  return guess - Math.min(first, second);
}

export function chooseInterval(span: number, count: number): TimeInterval {
  const target = span / Math.max(1, count);
  for (const i of INTERVALS) if (i.ms >= target) return i;
  const years = Math.max(1, Math.ceil(target / (365 * DAY)));
  const step = years <= 2 ? years : years <= 5 ? 5 : Math.ceil(years / 10) * 10;
  return { unit: 'year', step, ms: step * 365 * DAY };
}

/** Walks absolute minutes or hours and keeps the wall-clock multiples. */
function clockTicks(min: number, max: number, unitMs: number, step: number, timeZone?: string) {
  const ticks: number[] = [];
  const p = zonedParts(min, timeZone);
  // Back to the start of the unit on the wall clock. Offsets are whole minutes
  // everywhere today, so a whole minute is a whole minute in every zone; a
  // whole hour is found by dropping the wall clock's minutes.
  let t = min - p.second * 1000 - (((min % 1000) + 1000) % 1000);
  if (unitMs === HOUR) t -= p.minute * MINUTE;
  for (; t <= max; t += unitMs) {
    if (t < min) continue;
    const w = zonedParts(t, timeZone);
    const n = unitMs === HOUR ? w.hour : w.minute;
    if (n % step === 0) ticks.push(t);
  }
  return ticks;
}

/** Walks the calendar in the zone, one day, week, month or year at a time. */
function calendarTicks(min: number, max: number, interval: TimeInterval, timeZone?: string) {
  const ticks: number[] = [];
  const p = zonedParts(min, timeZone);
  let cursor: { year: number; month: number; day: number };
  if (interval.unit === 'day' || interval.unit === 'week') {
    cursor = { year: p.year, month: p.month, day: p.day };
    if (interval.unit === 'week') {
      // Weeks start on Monday.
      cursor.day -= (p.weekday + 6) % 7;
    }
  } else if (interval.unit === 'month') {
    cursor = { year: p.year, month: p.month, day: 1 };
  } else {
    cursor = { year: p.year, month: 1, day: 1 };
  }
  // Each step re-reads the date from UTC, so day 32 becomes the 1st and
  // month 13 becomes January. The bound is generous; it is never reached.
  for (let guard = 0; guard < 10_000; guard++) {
    const norm = new Date(Date.UTC(cursor.year, cursor.month - 1, cursor.day));
    cursor = {
      year: norm.getUTCFullYear(),
      month: norm.getUTCMonth() + 1,
      day: norm.getUTCDate(),
    };
    const t = zonedToInstant(cursor, timeZone);
    if (t > max) break;
    const keep =
      interval.unit === 'day'
        ? (cursor.day - 1) % interval.step === 0
        : interval.unit === 'month'
          ? (cursor.month - 1) % interval.step === 0
          : interval.unit === 'year'
            ? cursor.year % interval.step === 0
            : true;
    // Two-day steps restart on the 1st, so the 31st and the 1st can be
    // neighbours; that is the wall calendar, and it is what people read.
    if (t >= min && keep && ticks[ticks.length - 1] !== t) ticks.push(t);
    if (interval.unit === 'day') cursor.day += 1;
    else if (interval.unit === 'week') cursor.day += 7 * interval.step;
    else if (interval.unit === 'month') cursor.month += 1;
    else cursor.year += 1;
  }
  return ticks;
}

/**
 * Ticks between `min` and `max` (epoch ms, both inclusive), about `count` of
 * them, on wall-clock boundaries in `timeZone` (the runtime's own by default).
 */
export function timeTicks(
  min: number,
  max: number,
  count = 6,
  timeZone?: string,
): { ticks: number[]; interval: TimeInterval } {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max < min) {
    return { ticks: [], interval: INTERVALS[0] as TimeInterval };
  }
  const interval = chooseInterval(max - min, count);
  if (max === min) return { ticks: [min], interval };
  const ticks =
    interval.unit === 'minute'
      ? clockTicks(min, max, MINUTE, interval.step, timeZone)
      : interval.unit === 'hour'
        ? clockTicks(min, max, HOUR, interval.step, timeZone)
        : calendarTicks(min, max, interval, timeZone);
  return { ticks, interval };
}
