import { describe, expect, test } from 'bun:test';
import { buildGrid, levelFn, neighbour, parseYmd, toYmd } from './activity-heatmap-model';

const ms = (date: string) => parseYmd(date) as number;

describe('dates', () => {
  test('round-trip and reject impossible days', () => {
    expect(toYmd(ms('2026-10-12'))).toBe('2026-10-12');
    expect(parseYmd('2026-02-30')).toBeNull();
    expect(parseYmd('12/10/2026')).toBeNull();
  });
});

describe('level bucketing', () => {
  test('quantiles of the non-zero values, zero is level 0', () => {
    const level = levelFn([0, 1, 2, 3, 4, 5, 6, 7, 8], 5);
    expect([0, 1, 2, 3, 4, 5, 6, 7, 8].map(level)).toEqual([0, 1, 1, 2, 2, 3, 3, 4, 4]);
  });

  test('the busiest day is the top level even with few days', () => {
    const level = levelFn([3, 1, 8], 5);
    expect([1, 3, 8].map(level)).toEqual([1, 3, 4]);
  });

  test('one outlier does not flatten the rest', () => {
    const level = levelFn([1, 2, 3, 4, 1000], 5);
    expect(level(1)).toBe(1);
    expect(level(1000)).toBe(4);
    expect(level(4)).toBeGreaterThan(level(1));
  });

  test('equal values share a level; a single distinct value is level 1', () => {
    const level = levelFn([5, 5, 5, 5], 5);
    expect(level(5)).toBe(1);
    expect(level(5)).toBe(level(5));
  });

  test('two levels: empty and one shade', () => {
    const level = levelFn([1, 9], 2);
    expect([1, 9].map(level)).toEqual([1, 1]);
  });

  test('negative, NaN and zero are empty', () => {
    const level = levelFn([1, 2], 5);
    expect([-3, Number.NaN, 0].map(level)).toEqual([0, 0, 0]);
  });
});

describe('week alignment', () => {
  // 2026-10-04 is a Sunday, 2026-10-12 a Monday, 2026-10-17 a Saturday.
  const range = [ms('2026-10-04'), ms('2026-10-17')] as const;
  const at = (grid: ReturnType<typeof buildGrid>, date: string) =>
    grid.days.find((d) => d.date === date);

  test('weeks start on Sunday', () => {
    const grid = buildGrid([], range[0], range[1], 0, 5);
    expect(grid.weeks).toBe(2);
    expect(at(grid, '2026-10-04')).toMatchObject({ col: 0, row: 0 });
    expect(at(grid, '2026-10-12')).toMatchObject({ col: 1, row: 1 });
    expect(at(grid, '2026-10-17')).toMatchObject({ col: 1, row: 6 });
  });

  test('weeks start on Monday', () => {
    const grid = buildGrid([], range[0], range[1], 1, 5);
    expect(grid.weeks).toBe(3);
    expect(at(grid, '2026-10-04')).toMatchObject({ col: 0, row: 6 });
    expect(at(grid, '2026-10-05')).toMatchObject({ col: 1, row: 0 });
    expect(at(grid, '2026-10-11')).toMatchObject({ col: 1, row: 6 });
    expect(at(grid, '2026-10-17')).toMatchObject({ col: 2, row: 5 });
  });

  test('a swapped range is read the right way round', () => {
    expect(buildGrid([], range[1], range[0], 0, 5).days).toHaveLength(14);
  });

  test('a daylight-saving week is still seven days', () => {
    const grid = buildGrid([], ms('2026-10-25'), ms('2026-11-07'), 0, 5);
    expect(grid.days).toHaveLength(14);
    expect(grid.weeks).toBe(2);
  });
});

describe('data', () => {
  test('sums duplicates, drops out-of-range and unparseable days', () => {
    const grid = buildGrid(
      [
        { date: '2026-10-05', value: 2 },
        { date: '2026-10-05', value: 3 },
        { date: '2026-09-01', value: 9 },
        { date: 'not a date', value: 9 },
        { date: '2026-10-06', value: -4 },
      ],
      ms('2026-10-04'),
      ms('2026-10-10'),
      0,
      5,
    );
    expect(grid.days.find((d) => d.date === '2026-10-05')?.value).toBe(5);
    expect(grid.days.find((d) => d.date === '2026-10-06')?.value).toBe(0);
    expect(grid.total).toBe(5);
    expect(grid.active).toBe(1);
  });

  test('month labels sit on the first column of the month and never overprint', () => {
    const grid = buildGrid([], ms('2026-01-01'), ms('2026-12-31'), 0, 5);
    expect(grid.months.map((m) => m.month)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    const cols = grid.months.map((m) => m.col);
    for (let i = 1; i < cols.length; i++) {
      expect((cols[i] as number) - (cols[i - 1] as number)).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('neighbour', () => {
  const grid = buildGrid([], ms('2026-10-04'), ms('2026-10-17'), 0, 5);
  const day = (date: string) => grid.days.find((d) => d.date === date) as (typeof grid.days)[number];

  test('a week left and right, a day up and down, clamped at the edges', () => {
    expect(neighbour(grid.days, day('2026-10-12'), 'ArrowLeft')?.date).toBe('2026-10-05');
    expect(neighbour(grid.days, day('2026-10-05'), 'ArrowRight')?.date).toBe('2026-10-12');
    expect(neighbour(grid.days, day('2026-10-12'), 'ArrowUp')?.date).toBe('2026-10-11');
    expect(neighbour(grid.days, day('2026-10-12'), 'ArrowDown')?.date).toBe('2026-10-13');
    expect(neighbour(grid.days, day('2026-10-04'), 'ArrowLeft')).toBeNull();
    expect(neighbour(grid.days, day('2026-10-04'), 'ArrowUp')).toBeNull();
    expect(neighbour(grid.days, day('2026-10-17'), 'ArrowDown')).toBeNull();
  });

  test('Home and End: the row, and with ctrl the whole range', () => {
    expect(neighbour(grid.days, day('2026-10-12'), 'Home')?.date).toBe('2026-10-05');
    expect(neighbour(grid.days, day('2026-10-05'), 'End')?.date).toBe('2026-10-12');
    expect(neighbour(grid.days, day('2026-10-12'), 'Home', true)?.date).toBe('2026-10-04');
    expect(neighbour(grid.days, day('2026-10-12'), 'End', true)?.date).toBe('2026-10-17');
  });
});
