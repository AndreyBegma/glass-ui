import { describe, expect, test } from 'bun:test';
import { chooseInterval, timeTicks, zonedParts, zonedToInstant } from './time-ticks';

// #74 — the tick generator against frozen zones, not the runner's `TZ`.
const BERLIN = 'Europe/Berlin';
const NEW_YORK = 'America/New_York';
const HOUR = 3_600_000;

const wall = (ms: number, tz: string) => {
  const p = zonedParts(ms, tz);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')} ${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
};

describe('zoned arithmetic', () => {
  test('a wall time maps to its instant on both sides of a change', () => {
    expect(zonedToInstant({ year: 2026, month: 3, day: 29, hour: 1 }, BERLIN)).toBe(
      Date.UTC(2026, 2, 29, 0),
    );
    expect(zonedToInstant({ year: 2026, month: 3, day: 29, hour: 3 }, BERLIN)).toBe(
      Date.UTC(2026, 2, 29, 1),
    );
  });

  test('a guess that lands on the other side of the change is corrected', () => {
    // 05:00 UTC is still EST, but 05:00 on the wall that day is EDT.
    expect(zonedToInstant({ year: 2026, month: 3, day: 8, hour: 5 }, NEW_YORK)).toBe(
      Date.UTC(2026, 2, 8, 9),
    );
  });

  test('a wall time inside the spring-forward gap resolves to the first one after it', () => {
    const t = zonedToInstant({ year: 2026, month: 3, day: 29, hour: 2, minute: 30 }, BERLIN);
    expect(wall(t, BERLIN)).toBe('2026-03-29 03:30');
  });

  test('day 32 rolls into the next month', () => {
    expect(wall(zonedToInstant({ year: 2026, month: 1, day: 32 }, BERLIN), BERLIN)).toBe(
      '2026-02-01 00:00',
    );
  });
});

describe('timeTicks', () => {
  test('six-hour ticks stay on 00/06/12/18 across spring-forward (Berlin)', () => {
    const from = zonedToInstant({ year: 2026, month: 3, day: 29 }, BERLIN);
    const to = zonedToInstant({ year: 2026, month: 3, day: 30 }, BERLIN);
    expect(to - from).toBe(23 * HOUR);
    const { ticks, interval } = timeTicks(from, to, 4, BERLIN);
    expect(interval).toMatchObject({ unit: 'hour', step: 6 });
    expect(ticks.map((t) => wall(t, BERLIN))).toEqual([
      '2026-03-29 00:00',
      '2026-03-29 06:00',
      '2026-03-29 12:00',
      '2026-03-29 18:00',
      '2026-03-30 00:00',
    ]);
    // The first step is the short one: 02:00 did not happen.
    expect((ticks[1] as number) - (ticks[0] as number)).toBe(5 * HOUR);
  });

  test('hourly ticks skip the hour that does not exist (New York, spring-forward)', () => {
    const from = zonedToInstant({ year: 2026, month: 3, day: 8, hour: 0 }, NEW_YORK);
    const to = zonedToInstant({ year: 2026, month: 3, day: 8, hour: 5 }, NEW_YORK);
    const { ticks } = timeTicks(from, to, 4, NEW_YORK);
    expect(ticks.map((t) => zonedParts(t, NEW_YORK).hour)).toEqual([0, 1, 3, 4, 5]);
  });

  test('hourly ticks draw the repeated hour twice (Berlin, fall-back)', () => {
    const from = zonedToInstant({ year: 2026, month: 10, day: 25, hour: 0 }, BERLIN);
    const to = from + 6 * HOUR;
    const { ticks } = timeTicks(from, to, 6, BERLIN);
    expect(ticks.map((t) => zonedParts(t, BERLIN).hour)).toEqual([0, 1, 2, 2, 3, 4, 5]);
    for (let i = 1; i < ticks.length; i++)
      expect((ticks[i] as number) - (ticks[i - 1] as number)).toBe(HOUR);
  });

  test('day ticks sit on local midnight, 23 h and 25 h apart across the changes', () => {
    const spring = timeTicks(
      zonedToInstant({ year: 2026, month: 3, day: 27 }, BERLIN),
      zonedToInstant({ year: 2026, month: 4, day: 1 }, BERLIN),
      6,
      BERLIN,
    );
    expect(spring.interval.unit).toBe('day');
    for (const t of spring.ticks) expect(wall(t, BERLIN).endsWith(' 00:00')).toBe(true);
    const gaps = spring.ticks.slice(1).map((t, i) => (t - (spring.ticks[i] as number)) / HOUR);
    expect(gaps).toContain(23);

    const fall = timeTicks(
      zonedToInstant({ year: 2026, month: 10, day: 23 }, BERLIN),
      zonedToInstant({ year: 2026, month: 10, day: 28 }, BERLIN),
      6,
      BERLIN,
    );
    for (const t of fall.ticks) expect(wall(t, BERLIN).endsWith(' 00:00')).toBe(true);
    expect(fall.ticks.slice(1).map((t, i) => (t - (fall.ticks[i] as number)) / HOUR)).toContain(25);
  });

  test('month ticks land on the 1st whatever the month length, across DST', () => {
    const { ticks, interval } = timeTicks(
      zonedToInstant({ year: 2026, month: 1, day: 31 }, BERLIN),
      zonedToInstant({ year: 2026, month: 6, day: 15 }, BERLIN),
      6,
      BERLIN,
    );
    expect(interval.unit).toBe('month');
    expect(ticks.map((t) => wall(t, BERLIN))).toEqual([
      '2026-02-01 00:00',
      '2026-03-01 00:00',
      '2026-04-01 00:00',
      '2026-05-01 00:00',
      '2026-06-01 00:00',
    ]);
  });

  test('day ticks include 29 Feb in a leap year and run on into March', () => {
    const { ticks } = timeTicks(
      zonedToInstant({ year: 2028, month: 2, day: 27 }, NEW_YORK),
      zonedToInstant({ year: 2028, month: 3, day: 2 }, NEW_YORK),
      6,
      NEW_YORK,
    );
    expect(ticks.map((t) => wall(t, NEW_YORK).slice(5, 10))).toEqual([
      '02-27',
      '02-28',
      '02-29',
      '03-01',
      '03-02',
    ]);
  });

  test('week ticks start on Monday', () => {
    const { ticks, interval } = timeTicks(
      zonedToInstant({ year: 2026, month: 10, day: 1 }, BERLIN),
      zonedToInstant({ year: 2026, month: 11, day: 20 }, BERLIN),
      8,
      BERLIN,
    );
    expect(interval.unit).toBe('week');
    for (const t of ticks) expect(zonedParts(t, BERLIN).weekday).toBe(1);
  });

  test('chooses the smallest interval that keeps to about the count', () => {
    expect(chooseInterval(7 * 24 * HOUR, 6).unit).toBe('day');
    expect(chooseInterval(2 * HOUR, 6)).toMatchObject({ unit: 'minute', step: 30 });
    expect(chooseInterval(30 * 365 * 24 * HOUR, 6)).toMatchObject({ unit: 'year', step: 5 });
  });

  test('an empty or reversed range has no ticks, and nothing is NaN', () => {
    expect(timeTicks(10, 0).ticks).toEqual([]);
    expect(timeTicks(Number.NaN, 0).ticks).toEqual([]);
    expect(timeTicks(5, 5).ticks).toEqual([5]);
  });
});
