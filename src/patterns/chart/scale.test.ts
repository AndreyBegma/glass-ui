import { describe, expect, test } from 'bun:test';
import { bandScale, linearScale, niceLinearTicks, niceStep } from './scale';

describe('linearScale', () => {
  test('maps and inverts, including an inverted range (SVG y)', () => {
    const y = linearScale([0, 10], [200, 0]);
    expect(y(0)).toBe(200);
    expect(y(10)).toBe(0);
    expect(y(2.5)).toBe(150);
    expect(y.invert(150)).toBe(2.5);
  });

  test('a zero-width domain maps to the middle of the range, never NaN', () => {
    expect(linearScale([5, 5], [0, 100])(5)).toBe(50);
  });
});

describe('niceLinearTicks', () => {
  test('widens to whole 1/2/5 steps', () => {
    expect(niceLinearTicks(0, 12.4, 5)).toEqual({ domain: [0, 14], ticks: [0, 2, 4, 6, 8, 10, 12, 14] });
    expect(niceLinearTicks(3, 97, 5).ticks).toEqual([0, 20, 40, 60, 80, 100]);
  });

  test('small steps carry no floating error', () => {
    const { ticks } = niceLinearTicks(0, 0.7, 7);
    expect(ticks).toEqual([0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7]);
  });

  test('a constant series still gets a span, and stays non-negative when it was', () => {
    const { domain } = niceLinearTicks(4, 4);
    expect(domain[0]).toBeGreaterThanOrEqual(0);
    expect(domain[1]).toBeGreaterThan(4);
    expect(niceLinearTicks(0, 0).domain).toEqual([0, 1]);
  });

  test('negative ranges and non-finite input', () => {
    expect(niceLinearTicks(-7, 3, 5).ticks).toEqual([-8, -6, -4, -2, 0, 2, 4]);
    expect(niceLinearTicks(Number.NaN, 1)).toEqual({ domain: [0, 1], ticks: [0, 1] });
  });

  test('niceStep', () => {
    expect(niceStep(100, 5)).toBe(20);
    expect(niceStep(1, 4)).toBe(0.2);
    expect(niceStep(0, 4)).toBe(1);
  });
});

describe('bandScale', () => {
  test('equal bands, centres, and the band under a pixel', () => {
    const b = bandScale(4, [0, 400]);
    expect(b.bandwidth).toBe(100);
    expect(b(2)).toBe(200);
    expect(b.center(0)).toBe(50);
    expect(b.indexAt(-5)).toBe(0);
    expect(b.indexAt(250)).toBe(2);
    expect(b.indexAt(999)).toBe(3);
    expect(bandScale(0, [0, 1]).indexAt(0)).toBe(-1);
  });
});
