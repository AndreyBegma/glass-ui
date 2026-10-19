/**
 * FEAT-20261013-006 (W242) — the text half of `TimeField`. A time is the
 * native input's string, `HH:MM` on a 24-hour clock, whatever the field shows.
 */

export type HourCycle = 'h23' | 'h12';

const HH_MM = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isHhMm(value: string): boolean {
  return HH_MM.test(value);
}

/**
 * The locale's own clock: ru and uk resolve to `h23`, en to `h12`. `h11` and
 * `h24` are the same two clocks counted from another hour, so they fold in.
 */
export function resolveHourCycle(locale: string): HourCycle {
  const cycle = new Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions().hourCycle;
  return cycle === 'h11' || cycle === 'h12' ? 'h12' : 'h23';
}

function atUtc(minutes: number): Date {
  return new Date(Date.UTC(2026, 0, 1, Math.floor(minutes / 60), minutes % 60));
}

function toMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number) as [number, number];
  return hours * 60 + minutes;
}

function fromMinutes(total: number): string {
  const wrapped = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(wrapped / 60)).padStart(2, '0')}:${String(wrapped % 60).padStart(2, '0')}`;
}

/** `14:30` under `h23`, `2:30 PM` under `h12` — the locale's own words for AM and PM. */
export function formatTime(value: string, locale: string, cycle: HourCycle): string {
  return new Intl.DateTimeFormat(locale, {
    hour: cycle === 'h23' ? '2-digit' : 'numeric',
    minute: '2-digit',
    hourCycle: cycle,
    timeZone: 'UTC',
  }).format(atUtc(toMinutes(value)));
}

/** ArrowUp and ArrowDown: `23:50` plus 15 is `00:05`. */
export function stepTime(value: string, minutes: number): string {
  return fromMinutes(toMinutes(value) + minutes);
}

/**
 * The suffixes `h12` accepts, longest first so `pm` is not read as `p` + `m`:
 * the English letters every keyboard has, and the locale's own `dayPeriod`
 * from `Intl` (`пп` in uk), so what the field shows can be typed back.
 */
function dayPeriods(locale: string): Array<{ text: string; pm: boolean }> {
  const format = new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    hourCycle: 'h12',
    timeZone: 'UTC',
  });
  const local = (hour: number) =>
    format
      .formatToParts(atUtc(hour * 60))
      .find((part) => part.type === 'dayPeriod')
      ?.value.toLowerCase();
  const periods = [
    ...['a.m.', 'am', 'a', local(1)].map((text) => ({ text, pm: false })),
    ...['p.m.', 'pm', 'p', local(13)].map((text) => ({ text, pm: true })),
  ];
  return periods
    .filter((period): period is { text: string; pm: boolean } => Boolean(period.text))
    .sort((a, b) => b.text.length - a.text.length);
}

function splitDigits(body: string): [number, number] | null {
  const separated = /^(\d{1,2})(?:[:.\s]+(\d{1,2}))?$/.exec(body);
  if (separated) return [Number(separated[1]), Number(separated[2] ?? 0)];
  const compact = /^(\d{1,2})(\d{2})$/.exec(body);
  if (compact) return [Number(compact[1]), Number(compact[2])];
  return null;
}

/**
 * Typed text to `HH:MM`, forgivingly: `1430`, `14:30`, `14.30`, `14 30`, `9`,
 * `930`, and `9:5` (`09:05`). Under `h12` an `a`/`p`/`am`/`pm` suffix, or the
 * locale's own, reads the hour on the twelve-hour clock; without one the hour
 * is read on the twenty-four. Under `h23` a suffix is not accepted.
 *
 * Returns `''` for empty text, the time for a real one, and `null` otherwise.
 */
export function parseTimeText(text: string, locale: string, cycle: HourCycle): string | null {
  let body = text.trim().toLowerCase();
  if (body === '') return '';

  let pm: boolean | null = null;
  for (const period of dayPeriods(locale)) {
    const rest = body.slice(0, -period.text.length).trim();
    if (body.endsWith(period.text) && /\d$/.test(rest)) {
      pm = period.pm;
      body = rest;
      break;
    }
  }
  if (pm !== null && cycle === 'h23') return null;

  const read = splitDigits(body);
  if (!read) return null;
  let [hours] = read;
  const [, minutes] = read;
  if (minutes > 59) return null;
  if (pm === null) {
    if (hours > 23) return null;
  } else {
    if (hours < 1 || hours > 12) return null;
    hours = (hours % 12) + (pm ? 12 : 0);
  }
  return fromMinutes(hours * 60 + minutes);
}
