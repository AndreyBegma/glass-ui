import { describe, expect, test } from 'bun:test';
import { buildModel } from './data';
import { layoutChart } from './layout';
import { MAX_BAR } from './path';
import type { ChartPoint } from './types';

/**
 * #93 — AgentDock's Usage drew one solid block. The time axis takes its bar
 * step from the smallest gap between the points it was given, so one daily
 * bucket filled 80 % of the plot, two were two slabs, and sparse days made
 * every bar as wide as the widest gap allowed. These hold the geometry.
 */

const DAY = 24 * 60 * 60 * 1000;
const T0 = Date.UTC(2026, 9, 1);
const day = (i: number, y: number | null): ChartPoint => ({ x: T0 + i * DAY, y });

function layout(points: ChartPoint[], kind: 'bar' | 'area' = 'bar', width = 640) {
  const model = buildModel([{ id: 'u', name: 'Usage', kind, points }], 'time');
  return layoutChart(model, { kind: 'time', width, height: 240, stacked: false, formatY: String });
}

/** The empty space between each bar and the next. */
const gaps = (bars: { x: number; width: number }[]) =>
  bars.slice(1).map((b, i) => b.x - ((bars[i]?.x ?? 0) + (bars[i]?.width ?? 0)));

describe('bars on a sparse time axis', () => {
  test('one daily bucket is one bar, no wider than MAX_BAR, centred in the plot', () => {
    const l = layout([day(0, 1200)]);
    expect(l.bars.length).toBe(1);
    const [bar] = l.bars;
    expect(bar?.width).toBeLessThanOrEqual(MAX_BAR);
    const mid = (l.plot.left + l.plot.right) / 2;
    expect(Math.abs((bar?.x ?? 0) + (bar?.width ?? 0) / 2 - mid)).toBeLessThan(1);
  });

  test('one daily bucket reads in days on the axis, not in hours', () => {
    const l = layout([day(0, 1200)]);
    const hours = l.xTicks.map((t) => new Date(t.value).getUTCHours());
    expect(l.xTicks.length).toBeGreaterThanOrEqual(2);
    expect(hours.every((h) => h === hours[0])).toBe(true);
  });

  test('two adjacent days are two bars with a gap, not two slabs', () => {
    const l = layout([day(0, 5), day(1, 3)]);
    expect(l.bars.length).toBe(2);
    for (const b of l.bars) expect(b.width).toBeLessThanOrEqual(MAX_BAR);
    for (const g of gaps(l.bars)) expect(g).toBeGreaterThan(0);
  });

  test('sparse days (0, 3, 9) are three bars with gaps, a y-axis and a hit for each', () => {
    const l = layout([day(0, 1200), day(3, 400), day(9, 900)]);
    expect(l.bars.length).toBe(3);
    for (const b of l.bars) expect(b.width).toBeLessThanOrEqual(MAX_BAR);
    for (const g of gaps(l.bars)) expect(g).toBeGreaterThan(MAX_BAR);
    expect(l.yTicks.length).toBeGreaterThanOrEqual(2);
    // The tooltip finds every bar from its own centre.
    l.centers.forEach((c, i) => expect(l.indexAt(c)).toBe(i));
  });

  test('a dense month is unchanged: 80 % of the day band, below the cap', () => {
    const points = Array.from({ length: 30 }, (_, i) => day(i, i + 1));
    const l = layout(points);
    expect(l.bars.length).toBe(30);
    const band = (l.centers[1] ?? 0) - (l.centers[0] ?? 0);
    expect(l.bars[0]?.width).toBeCloseTo(band * 0.8, 1);
    expect(l.bars[0]?.width).toBeLessThan(MAX_BAR);
  });

  test('grouped bars share the cap: the group, not each bar, is at most MAX_BAR', () => {
    const model = buildModel(
      [
        { id: 'in', name: 'In', kind: 'bar', points: [day(0, 1)] },
        { id: 'out', name: 'Out', kind: 'bar', points: [day(0, 2)] },
      ],
      'time',
    );
    const l = layoutChart(model, { kind: 'time', width: 640, height: 240, stacked: false, formatY: String });
    const left = Math.min(...l.bars.map((b) => b.x));
    const right = Math.max(...l.bars.map((b) => b.x + b.width));
    expect(right - left).toBeLessThanOrEqual(MAX_BAR + 0.01);
  });
});

describe('areas on a time axis', () => {
  test('null days are gaps: a separate run per stretch of values', () => {
    const l = layout([day(0, 1), day(1, 2), day(2, null), day(3, 4), day(4, 5)], 'area');
    expect(l.areas[0]?.d.match(/M/g)?.length).toBe(2);
  });

  test('an area with two or more points still runs edge to edge (no bar padding)', () => {
    const l = layout([day(0, 1), day(5, 2)], 'area');
    expect(l.centers[0]).toBe(l.plot.left);
    expect(l.centers[1]).toBe(l.plot.right);
  });
});
