import { describe, expect, test } from 'bun:test';
import { buildModel } from './data';
import { layoutChart } from './layout';
import { areaPath, barRects, linePath, runs, stackRows } from './path';
import { linearScale } from './scale';
import type { ChartSeries } from './types';

const DAY = 86_400_000;
const START = Date.UTC(2026, 9, 7);
const week = (ys: (number | null)[]) => ys.map((y, i) => ({ x: new Date(START + i * DAY), y }));
const segments = (d: string) => d.match(/M/g)?.length ?? 0;

const LAYOUT = {
  kind: 'time' as const,
  width: 640,
  height: 240,
  formatY: String,
  timeZone: 'UTC',
};

describe('path builder', () => {
  test('runs split on null', () => {
    expect(runs([1, 2, null, 3, null, null, 4]).map((r) => r.start)).toEqual([0, 3, 6]);
  });

  test('a null breaks a line into a new segment and an area into a new shape', () => {
    const pts = [[0, 0], [1, 1], null, [3, 3], [4, 4]] as const;
    const line = linePath([...pts]);
    expect(segments(line)).toBe(2);
    expect(line).not.toContain('NaN');
    const base = pts.map((p) => (p ? ([p[0], 10] as const) : null));
    const area = areaPath([...pts], base);
    expect(area.match(/Z/g)?.length).toBe(2);
    expect(area).not.toContain('NaN');
  });

  test('a lone point between gaps is still drawn, as a dot', () => {
    expect(linePath([null, [5, 5], null])).toBe('M5 5 h0');
  });

  test('stacked rows sum correctly at each x; a null adds nothing and is a gap', () => {
    const rows = [
      [1, 2, 3, null],
      [10, 20, null, 40],
      [100, 200, 300, 400],
    ];
    const { lo, hi } = stackRows(rows, true);
    for (let i = 0; i < 4; i++) {
      const total = rows.reduce((s, r) => s + (r[i] ?? 0), 0);
      expect(hi[2]?.[i]).toBe(total);
    }
    expect(lo[1]?.[0]).toBe(1);
    expect(hi[1]?.[0]).toBe(11);
    expect(hi[0]?.[3]).toBeNull();
    expect(hi[1]?.[2]).toBeNull();
    expect(lo[2]?.[2]).toBe(3);
  });

  test('unstacked rows all stand on the base', () => {
    const { lo, hi } = stackRows([[1, 2], [3, 4]], false);
    expect(lo).toEqual([[0, 0], [0, 0]]);
    expect(hi).toEqual([[1, 2], [3, 4]]);
  });

  test('bars: grouped side by side, stacked in one column, none for null', () => {
    const y = linearScale([0, 10], [100, 0]);
    const stack = stackRows([[2, null], [3, 4]], false);
    const grouped = barRects({ centers: [50, 150], band: 100, stack, stacked: false, y });
    expect(grouped).toHaveLength(3);
    const [a, b] = grouped.filter((r) => r.index === 0);
    expect(a?.width).toBe(40);
    expect(b?.x).toBe((a?.x ?? 0) + 40);
    const stacked = barRects({ centers: [50, 150], band: 100, stack: stackRows([[2, 1], [3, 4]], true), stacked: true, y });
    const col = stacked.filter((r) => r.index === 0);
    expect(col.map((r) => r.x)).toEqual([10, 10]);
    // The upper bar starts where the lower one ends.
    expect(col[1]?.y as number + (col[1]?.height as number)).toBe(col[0]?.y);
  });
});

describe('layout', () => {
  const three: ChartSeries[] = [
    { id: 'a', name: 'Area', kind: 'area', points: week([1, 2, 3, 4, 5, 6, 7]) },
    { id: 'l', name: 'Line', kind: 'line', points: week([7, 6, 5, 4, 3, 2, 1]) },
    { id: 'b', name: 'Bar', kind: 'bar', points: week([2, 2, 2, 2, 2, 2, 2]) },
  ];

  test('three series (area, line, bar) over 7 days: one area, one line, 7 bars', () => {
    const l = layoutChart(buildModel(three, 'time'), { ...LAYOUT, stacked: false });
    expect(l.areas).toHaveLength(1);
    expect(l.lines).toHaveLength(1);
    expect(l.bars).toHaveLength(7);
    expect(segments(l.areas[0]?.d ?? '')).toBe(1);
    expect(l.lines[0]?.d.match(/L/g)?.length).toBe(6);
    expect(l.centers).toHaveLength(7);
    // Day ticks for a week.
    expect(l.xTicks.length).toBeGreaterThanOrEqual(4);
  });

  test('stacked areas: each top is the sum of the areas under it at every x', () => {
    const areas: ChartSeries[] = [
      { id: 'x', name: 'X', kind: 'area', points: week([1, 2, 3, 4, 5, 6, 7]) },
      { id: 'y', name: 'Y', kind: 'area', points: week([3, 3, 3, 3, 3, 3, 3]) },
      { id: 'z', name: 'Z', kind: 'line', points: week([100, 1, 1, 1, 1, 1, 1]) },
    ];
    const l = layoutChart(buildModel(areas, 'time'), { ...LAYOUT, stacked: true });
    for (let i = 0; i < 7; i++) expect(l.tops[1]?.[i]).toBe(i + 1 + 3);
    // Stacking is within one kind: the line is not stacked onto the areas.
    expect(l.tops[2]?.[0]).toBe(100);
    // And the y domain covers the stacked top.
    expect(l.y.domain[1]).toBeGreaterThanOrEqual(100);
  });

  test('null points make gaps in lines and areas and no bar', () => {
    const gappy: ChartSeries[] = [
      { id: 'a', name: 'A', kind: 'area', points: week([1, 2, null, 4, 5, 6, 7]) },
      { id: 'l', name: 'L', kind: 'line', points: week([1, null, 3, 4, null, 6, 7]) },
      { id: 'b', name: 'B', kind: 'bar', points: week([1, null, 3, 4, 5, null, 7]) },
    ];
    const l = layoutChart(buildModel(gappy, 'time'), { ...LAYOUT, stacked: false });
    expect(l.areas[0]?.d.match(/Z/g)?.length).toBe(2);
    expect(segments(l.lines[0]?.d ?? '')).toBe(3);
    expect(l.bars).toHaveLength(5);
  });

  test('category x: one band per category, in first-seen order', () => {
    const cat: ChartSeries[] = [
      { id: 'c', name: 'C', kind: 'bar', points: [{ x: 'b', y: 1 }, { x: 'a', y: 2 }, { x: 'c', y: 3 }] },
    ];
    const model = buildModel(cat, 'category');
    expect(model.xValues).toEqual(['b', 'a', 'c']);
    const l = layoutChart(model, { ...LAYOUT, kind: 'category', stacked: false });
    expect(l.bars).toHaveLength(3);
    expect(l.indexAt(l.centers[2] as number)).toBe(2);
  });

  test('yMin and yMax pin the domain', () => {
    const l = layoutChart(buildModel(three, 'time'), { ...LAYOUT, stacked: false, yMin: 1, yMax: 9 });
    expect(l.y.domain).toEqual([1, 9]);
    for (const t of l.yTicks) expect(t >= 1 && t <= 9).toBe(true);
  });
});
