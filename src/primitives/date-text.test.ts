import { describe, expect, test } from 'bun:test';
import {
  addMonths,
  datePlaceholder,
  formatNumericDay,
  isIsoDay,
  parseDayText,
  weekdayNames,
} from './date-text';
import { parseTimeText, stepTime } from './time-text';

/**
 * FEAT-20261013-006 (W242) — the parsers' rules, without a DOM. `today` is
 * passed, so nothing here depends on the clock.
 */
const TODAY = '2026-10-13';

describe('parseDayText', () => {
  const ru = (text: string) => parseDayText(text, 'ru', TODAY);

  test.each([
    ['13.10.2026', '2026-10-13'],
    ['13/10/2026', '2026-10-13'],
    ['13 10 26', '2026-10-13'],
    ['1.2.3', '2003-02-01'],
    ['14.10', '2026-10-14'],
    ['13102026', '2026-10-13'],
    ['131026', '2026-10-13'],
    ['1410', '2026-10-14'],
    ['  29.02.2028 ', '2028-02-29'],
  ])('ru reads %p as %p', (text, day) => {
    expect(ru(text)).toBe(day);
  });

  test.each(['31.02.2026', '29.02.2027', '13.13.2026', '0.10.2026', '13.10.202', '13 окт', 'abc', '1', '1.2.3.4'])(
    'ru refuses %p',
    (text) => {
      expect(ru(text)).toBeNull();
    },
  );

  test('empty is empty, not invalid', () => {
    expect(ru('   ')).toBe('');
  });

  test('en reads month first', () => {
    expect(parseDayText('10/14/2026', 'en', TODAY)).toBe('2026-10-14');
    expect(parseDayText('10/14', 'en', TODAY)).toBe('2026-10-14');
  });

  test('ja reads year first', () => {
    expect(parseDayText('2026/10/14', 'ja', TODAY)).toBe('2026-10-14');
  });
});

describe('the locale pattern', () => {
  test('ru and en', () => {
    expect(datePlaceholder('ru')).toBe('DD.MM.YYYY');
    expect(datePlaceholder('en')).toBe('MM/DD/YYYY');
    expect(formatNumericDay('2026-01-05', 'ru')).toBe('05.01.2026');
    expect(formatNumericDay('2026-01-05', 'en')).toBe('01/05/2026');
  });

  test('weekday heads start where asked and carry the long name', () => {
    expect(weekdayNames('en', 1)[0]?.long).toBe('Monday');
    expect(weekdayNames('en', 0)[0]?.long).toBe('Sunday');
    expect(weekdayNames('ru', 1)[1]?.long).toBe('Вторник');
  });
});

describe('day arithmetic', () => {
  test('a month on keeps the day where it can', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2026-12-15', 1)).toBe('2027-01-15');
    expect(addMonths('2026-01-15', -1)).toBe('2025-12-15');
  });

  test('isIsoDay knows the calendar', () => {
    expect(isIsoDay('2028-02-29')).toBe(true);
    expect(isIsoDay('2026-02-29')).toBe(false);
    expect(isIsoDay('2026-1-01')).toBe(false);
  });
});

describe('parseTimeText', () => {
  test.each([
    ['1430', '14:30'],
    ['14:30', '14:30'],
    ['14.30', '14:30'],
    ['14 30', '14:30'],
    ['9', '09:00'],
    ['930', '09:30'],
    ['9:5', '09:05'],
    ['0', '00:00'],
  ])('h23 reads %p as %p', (text, time) => {
    expect(parseTimeText(text, 'ru', 'h23')).toBe(time);
  });

  test.each(['25:00', '12:60', '2pm', '12345', 'noon'])('h23 refuses %p', (text) => {
    expect(parseTimeText(text, 'ru', 'h23')).toBeNull();
  });

  test.each([
    ['2:30 pm', '14:30'],
    ['2:30pm', '14:30'],
    ['2:30 p', '14:30'],
    ['12 am', '00:00'],
    ['12:15 PM', '12:15'],
    ['9 a.m.', '09:00'],
    ['14:30', '14:30'],
  ])('h12 reads %p as %p', (text, time) => {
    expect(parseTimeText(text, 'en', 'h12')).toBe(time);
  });

  test.each(['13 pm', '0 am'])('h12 refuses %p', (text) => {
    expect(parseTimeText(text, 'en', 'h12')).toBeNull();
  });

  test('stepping wraps both ways', () => {
    expect(stepTime('23:50', 15)).toBe('00:05');
    expect(stepTime('00:05', -10)).toBe('23:55');
  });
});
