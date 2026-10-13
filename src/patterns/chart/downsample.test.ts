import { describe, expect, test } from 'bun:test';
import { downsampleIndices, lttb, shouldDownsample } from './downsample';

const wave = (n: number) => Array.from({ length: n }, (_, i) => Math.sin(i / 50) * 10 + (i % 97 === 0 ? 40 : 0));

describe('down-sampling', () => {
  test('only above 5 000 points and above twice the width', () => {
    expect(shouldDownsample(5_000, 640)).toBe(false);
    expect(shouldDownsample(5_001, 640)).toBe(true);
    expect(shouldDownsample(6_000, 4_000)).toBe(false);
  });

  test('LTTB keeps both ends and returns exactly the threshold, ascending', () => {
    const ys = wave(10_000);
    const xs = ys.map((_, i) => i);
    const kept = lttb(xs, ys, 500);
    expect(kept).toHaveLength(500);
    expect(kept[0]).toBe(0);
    expect(kept[kept.length - 1]).toBe(9_999);
    for (let i = 1; i < kept.length; i++) expect(kept[i]).toBeGreaterThan(kept[i - 1] as number);
  });

  test('LTTB keeps the spikes a stride would drop', () => {
    const ys = new Array(1_000).fill(0);
    ys[333] = 100;
    const kept = lttb(ys.map((_, i) => i), ys, 50);
    expect(kept).toContain(333);
  });

  test('50 000 points across three series stay within 2 x width', () => {
    const width = 640;
    const n = 50_000;
    const xs = Array.from({ length: n }, (_, i) => i * 60_000);
    const rows = [wave(n), wave(n).map((v) => -v), wave(n).map((v) => v * 2)];
    const kept = downsampleIndices(xs, rows, 2 * width);
    expect(kept.length).toBeLessThanOrEqual(2 * width);
    expect(kept[0]).toBe(0);
    expect(kept[kept.length - 1]).toBe(n - 1);
  });

  test('gaps survive: each run keeps its ends and one null between runs', () => {
    const n = 20_000;
    const row: (number | null)[] = wave(n);
    for (let i = 8_000; i < 9_000; i++) row[i] = null;
    const kept = downsampleIndices(row.map((_, i) => i), [row], 400);
    expect(kept).toContain(7_999);
    expect(kept).toContain(8_000);
    expect(kept).toContain(9_000);
    expect(kept.some((i) => row[i] === null)).toBe(true);
  });
});
