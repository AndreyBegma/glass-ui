import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { setSystemTime } from 'bun:test';
import {
  dateOf,
  dayOf,
  defaultPresets,
  formatRangeText,
  rangeDays,
  rangeFits,
  sameRange,
  toRange,
  windowFor,
} from './date-range-picker-model';

// Tuesday 13 October 2026, midday, so "today" is fixed.
beforeAll(() => setSystemTime(new Date(2026, 9, 13, 12)));
afterAll(() => setSystemTime());

const labels = {
  today: 'Today',
  last7Days: 'Last 7 days',
  last30Days: 'Last 30 days',
  thisMonth: 'This month',
};

describe('date-range-picker-model', () => {
  test('a Date becomes its local day, and back to local midnight', () => {
    expect(dayOf(new Date(2026, 9, 13, 23, 59))).toBe('2026-10-13');
    expect(dateOf('2026-03-29')).toEqual(new Date(2026, 2, 29));
  });

  test('a reversed range is put in order', () => {
    const range = toRange('2026-10-19', '2026-10-12');
    expect(rangeDays(range)).toEqual(['2026-10-12', '2026-10-19']);
    expect(rangeDays({ start: range.end, end: range.start })).toEqual([
      '2026-10-12',
      '2026-10-19',
    ]);
  });

  test('ranges compare by day, not by time of day', () => {
    const a = { start: new Date(2026, 9, 12), end: new Date(2026, 9, 19) };
    const b = { start: new Date(2026, 9, 12, 8), end: new Date(2026, 9, 19, 17) };
    expect(sameRange(a, b)).toBe(true);
    expect(sameRange(a, null)).toBe(false);
    expect(sameRange(null, null)).toBe(true);
  });

  test('the default presets count back from today, today included', () => {
    const days = defaultPresets(labels).map((preset) => [preset.id, rangeDays(preset.range())]);
    expect(days).toEqual([
      ['today', ['2026-10-13', '2026-10-13']],
      ['last-7-days', ['2026-10-07', '2026-10-13']],
      ['last-30-days', ['2026-09-14', '2026-10-13']],
      ['this-month', ['2026-10-01', '2026-10-13']],
    ]);
  });

  test('a range fits only when both ends are inside min and max', () => {
    const range = toRange('2026-10-07', '2026-10-13');
    expect(rangeFits(range, '2026-10-01', '2026-10-31')).toBe(true);
    expect(rangeFits(range, '2026-10-10')).toBe(false);
    expect(rangeFits(range, undefined, '2026-10-12')).toBe(false);
  });

  test('the trigger text is the locale range format', () => {
    // ICU versions differ in the spaces around the dash (thin, plain, none),
    // so the words are compared without them.
    const text = (start: string, end: string) =>
      formatRangeText(start, end, 'en-GB').replace(/\s+/g, '');
    expect(text('2026-10-12', '2026-10-19')).toBe('12–19Oct2026');
    expect(text('2026-10-19', '2026-10-12')).toBe('12–19Oct2026');
    expect(text('2026-10-28', '2026-11-03')).toBe('28Oct–3Nov2026');
    expect(text('2026-10-13', '2026-10-13')).toBe('13Oct2026');
  });

  test('the shown months slide only as far as the active day needs', () => {
    expect(windowFor('2026-10', '2026-11-05', 2)).toBe('2026-10');
    expect(windowFor('2026-10', '2026-12-01', 2)).toBe('2026-11');
    expect(windowFor('2026-10', '2026-09-30', 2)).toBe('2026-09');
    expect(windowFor('2026-10', '2026-11-05', 1)).toBe('2026-11');
    expect(windowFor('2026-12', '2027-01-02', 1)).toBe('2027-01');
  });
});
