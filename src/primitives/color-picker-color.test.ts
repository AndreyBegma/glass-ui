import { describe, expect, test } from 'bun:test';
import {
  formatColor,
  hexToRgb,
  hsvToRgb,
  isInSrgb,
  oklchToRgb,
  parseColor,
  rgbToHex,
  rgbToHsv,
  rgbToOklch,
} from './color-picker-color';

/** Every 17th step of each channel: 4096 colours, the corners included. */
const GRID: { r: number; g: number; b: number }[] = [];
for (let r = 0; r <= 255; r += 17)
  for (let g = 0; g <= 255; g += 17)
    for (let b = 0; b <= 255; b += 17) GRID.push({ r, g, b });

const rounded = ({ r, g, b }: { r: number; g: number; b: number }) => ({
  r: Math.round(r),
  g: Math.round(g),
  b: Math.round(b),
});

describe('hex', () => {
  test('parses the four lengths, case-insensitively', () => {
    expect(hexToRgb('#f00')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    expect(hexToRgb('#F008')).toEqual({ r: 255, g: 0, b: 0, a: 0x88 / 255 });
    expect(hexToRgb('#00ff7f')).toEqual({ r: 0, g: 255, b: 127, a: 1 });
    expect(hexToRgb('#00ff7f80')).toEqual({ r: 0, g: 255, b: 127, a: 128 / 255 });
  });

  test('rejects what is not hex', () => {
    for (const bad of ['', '#', '#ff', '#fffff', '#ggg', 'ff0000', '#ff00001'])
      expect(hexToRgb(bad)).toBeNull();
  });

  test('round-trips every colour on the grid exactly', () => {
    for (const rgb of GRID) {
      const hex = rgbToHex({ ...rgb, a: 1 });
      expect(hex).toHaveLength(7);
      expect(hexToRgb(hex)).toEqual({ ...rgb, a: 1 });
    }
  });

  test('writes eight digits only when not opaque', () => {
    expect(rgbToHex({ r: 0, g: 0, b: 0, a: 1 })).toHaveLength(7);
    expect(rgbToHex({ r: 0, g: 0, b: 0, a: 0.5 })).toHaveLength(9);
    expect(rgbToHex({ r: 0, g: 0, b: 0, a: 0.5 }).endsWith('80')).toBe(true);
  });
});

describe('HSV', () => {
  test('known values', () => {
    expect(rgbToHsv({ r: 255, g: 0, b: 0 })).toEqual({ h: 0, s: 100, v: 100 });
    expect(rgbToHsv({ r: 0, g: 0, b: 255 })).toEqual({ h: 240, s: 100, v: 100 });
    expect(rgbToHsv({ r: 0, g: 0, b: 0 })).toEqual({ h: 0, s: 0, v: 0 });
    expect(rounded(hsvToRgb({ h: 120, s: 100, v: 50 }))).toEqual({ r: 0, g: 128, b: 0 });
  });

  test('round-trips every colour on the grid exactly, after rounding', () => {
    for (const rgb of GRID) expect(rounded(hsvToRgb(rgbToHsv(rgb)))).toEqual(rgb);
  });

  test('a hue of 360 is a hue of 0', () => {
    expect(rounded(hsvToRgb({ h: 360, s: 100, v: 100 }))).toEqual({ r: 255, g: 0, b: 0 });
  });
});

describe('OKLCH', () => {
  test('matches the reference values for the primaries', () => {
    const red = rgbToOklch({ r: 255, g: 0, b: 0 });
    expect(red.l).toBeCloseTo(0.628, 3);
    expect(red.c).toBeCloseTo(0.2577, 3);
    expect(red.h).toBeCloseTo(29.23, 1);
    const blue = rgbToOklch({ r: 0, g: 0, b: 255 });
    expect(blue.l).toBeCloseTo(0.452, 3);
    expect(blue.h).toBeCloseTo(264.05, 1);
  });

  test('white is lightness one with no chroma, black is zero', () => {
    const white = rgbToOklch({ r: 255, g: 255, b: 255 });
    expect(white.l).toBeCloseTo(1, 4);
    expect(white.c).toBe(0);
    expect(rgbToOklch({ r: 0, g: 0, b: 0 })).toEqual({ l: 0, c: 0, h: 0 });
  });

  test('round-trips every colour on the grid exactly, after rounding', () => {
    for (const rgb of GRID) expect(rounded(oklchToRgb(rgbToOklch(rgb)))).toEqual(rgb);
  });

  test('round-trips through the formatted string within a byte', () => {
    for (const rgb of GRID) {
      const parsed = parseColor(formatColor({ ...rgb, a: 1 }, 'oklch'));
      expect(parsed?.format).toBe('oklch');
      const back = parsed?.color ?? { r: -9, g: -9, b: -9 };
      // Four places of lightness and chroma is finer than a byte, except where
      // sRGB's curve is steepest — a channel at its very bottom — which can
      // land one byte off.
      for (const key of ['r', 'g', 'b'] as const)
        expect(Math.abs(Math.round(back[key]) - rgb[key])).toBeLessThanOrEqual(1);
    }
  });

  test('an out-of-gamut colour is brought in at the same lightness and hue', () => {
    const wanted = { l: 0.7, c: 0.4, h: 150 };
    expect(isInSrgb(wanted)).toBe(false);
    const mapped = rgbToOklch(oklchToRgb(wanted));
    for (const channel of Object.values(oklchToRgb(wanted))) {
      expect(channel).toBeGreaterThanOrEqual(0);
      expect(channel).toBeLessThanOrEqual(255);
    }
    expect(mapped.l).toBeCloseTo(0.7, 2);
    expect(mapped.h).toBeCloseTo(150, 0);
    expect(mapped.c).toBeLessThan(0.4);
  });
});

describe('parseColor and formatColor', () => {
  test('reads oklch with percentages, degrees and alpha', () => {
    const parsed = parseColor('oklch(62.8% 64.4% 29.23deg / 50%)');
    expect(parsed?.format).toBe('oklch');
    expect(parsed?.color.a).toBe(0.5);
    expect(rgbToHex(parsed?.color ?? { r: 0, g: 0, b: 0, a: 1 }).slice(0, 7)).toBe(
      rgbToHex({ r: 255, g: 0, b: 0, a: 1 }),
    );
  });

  test('accepts a slash with no spaces and upper case', () => {
    expect(parseColor('OKLCH(0.5 0.1 200/0.25)')?.color.a).toBe(0.25);
  });

  test('rejects malformed input', () => {
    for (const bad of [
      '',
      'red',
      'oklch()',
      'oklch(0.5 0.1)',
      'oklch(0.5 0.1 abc)',
      'oklch(0.5, 0.1, 200)',
      'oklch(0.5 0.1 200 / x)',
      'lab(50 20 30)',
    ])
      expect(parseColor(bad)).toBeNull();
  });

  test('writes oklch compactly, alpha only when not opaque', () => {
    expect(formatColor({ r: 255, g: 0, b: 0, a: 1 }, 'oklch')).toBe('oklch(0.628 0.2577 29.23)');
    expect(formatColor({ r: 0, g: 0, b: 0, a: 0.5 }, 'oklch')).toBe('oklch(0 0 0 / 0.5)');
  });
});
