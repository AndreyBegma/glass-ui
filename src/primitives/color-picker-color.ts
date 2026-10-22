/**
 * v0.38.0 wave, ColorPicker — the colour maths, hand-rolled and pure.
 *
 * Four spaces and the roads between them: hex ⇄ RGB ⇄ HSV, and RGB ⇄ OKLCH
 * through linear sRGB and OKLab (Björn Ottosson's matrices, the ones CSS
 * Color 4 cites). No dependency: the whole of it is two 3×3 matrices, a cube
 * root and the sRGB transfer curve, and a library for that would be most of
 * the bundle of the component that uses it.
 *
 * Units are the ones a person reads, not the ones the maths wants: RGB
 * channels 0–255 (fractional until formatted), HSV hue in degrees with
 * saturation and value in percent, OKLCH lightness 0–1 with chroma unbounded
 * and hue in degrees. Alpha is 0–1 everywhere.
 *
 * An `oklch()` that sRGB cannot show is not rejected: its chroma is reduced,
 * at the same lightness and hue, until it fits — the gamut mapping CSS Color 4
 * describes, without its perceptual-distance refinement. The colour a person
 * sees is the closest one the screen has, and the hue they asked for is kept.
 */

export type Rgba = { r: number; g: number; b: number; a: number };
export type Hsv = { h: number; s: number; v: number };
export type Oklch = { l: number; c: number; h: number };
export type ColorFormat = 'hex' | 'oklch';

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Trims trailing zeros and never prints `-0`. */
function num(n: number, digits: number): string {
  const fixed = Number(n.toFixed(digits));
  return Object.is(fixed, -0) ? '0' : String(fixed);
}

/* ---- hex ---------------------------------------------------------------- */

const HEX = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/** `#rgb`, `#rgba`, `#rrggbb` or `#rrggbbaa`; `null` for anything else. */
export function hexToRgb(hex: string): Rgba | null {
  const match = HEX.exec(hex.trim());
  if (!match) return null;
  let digits = match[1];
  if (digits.length <= 4) digits = [...digits].map((d) => d + d).join('');
  const byte = (i: number) => Number.parseInt(digits.slice(i, i + 2), 16);
  return {
    r: byte(0),
    g: byte(2),
    b: byte(4),
    a: digits.length === 8 ? byte(6) / 255 : 1,
  };
}

/** Six digits when opaque, eight when not. Lower case. */
export function rgbToHex({ r, g, b, a }: Rgba): string {
  const byte = (n: number) =>
    Math.round(clamp(n, 0, 255))
      .toString(16)
      .padStart(2, '0');
  const alpha = Math.round(clamp(a, 0, 1) * 255);
  return `#${byte(r)}${byte(g)}${byte(b)}${alpha < 255 ? byte(alpha) : ''}`;
}

/* ---- HSV ---------------------------------------------------------------- */

/** Hue is 0 for a grey, where it is undefined; a caller that needs to keep
 *  a hue across black, white or grey keeps its own. */
export function rgbToHsv({ r, g, b }: Pick<Rgba, 'r' | 'g' | 'b'>): Hsv {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const delta = max - Math.min(rn, gn, bn);
  let h = 0;
  if (delta > 0) {
    if (max === rn) h = ((gn - bn) / delta) % 6;
    else if (max === gn) h = (bn - rn) / delta + 2;
    else h = (rn - gn) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : (delta / max) * 100, v: max * 100 };
}

export function hsvToRgb({ h, s, v }: Hsv): Pick<Rgba, 'r' | 'g' | 'b'> {
  const sn = clamp(s, 0, 100) / 100;
  const vn = clamp(v, 0, 100) / 100;
  const hn = (((h % 360) + 360) % 360) / 60;
  const chroma = vn * sn;
  const x = chroma * (1 - Math.abs((hn % 2) - 1));
  const m = vn - chroma;
  const [r, g, b] =
    hn < 1
      ? [chroma, x, 0]
      : hn < 2
        ? [x, chroma, 0]
        : hn < 3
          ? [0, chroma, x]
          : hn < 4
            ? [0, x, chroma]
            : hn < 5
              ? [x, 0, chroma]
              : [chroma, 0, x];
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

/* ---- OKLCH -------------------------------------------------------------- */

const toLinear = (c: number) =>
  c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
const fromLinear = (c: number) =>
  c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;

/** Below this chroma a colour is a grey, and its hue is noise. */
const ACHROMATIC = 1e-4;

export function rgbToOklch({ r, g, b }: Pick<Rgba, 'r' | 'g' | 'b'>): Oklch {
  return linearToOklch([toLinear(r / 255), toLinear(g / 255), toLinear(b / 255)]);
}

function linearToOklch([lr, lg, lb]: [number, number, number]): Oklch {
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const c = Math.hypot(A, B);
  if (c < ACHROMATIC) return { l: L, c: 0, h: 0 };
  let h = (Math.atan2(B, A) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { l: L, c, h };
}

/** Linear sRGB, unclamped: a channel outside 0–1 is out of gamut. */
function oklchToLinear({ l, c, h }: Oklch): [number, number, number] {
  const rad = (h * Math.PI) / 180;
  const A = c * Math.cos(rad);
  const B = c * Math.sin(rad);
  const l_ = (l + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m_ = (l - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s_ = (l - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
}

const GAMUT_EPSILON = 1e-6;
const inGamut = (rgb: number[]) =>
  rgb.every((n) => n >= -GAMUT_EPSILON && n <= 1 + GAMUT_EPSILON);

/** Whether sRGB can show this colour as written. */
export function isInSrgb(color: Oklch): boolean {
  return inGamut(oklchToLinear(color));
}

const clip = (rgb: [number, number, number]) =>
  rgb.map((n) => clamp(n, 0, 1)) as [number, number, number];

/** ΔE OK: the distance in OKLab, where 0.02 is about the smallest step an
 *  eye tells apart. */
function deltaE(a: Oklch, b: Oklch): number {
  const ar = (a.h * Math.PI) / 180;
  const br = (b.h * Math.PI) / 180;
  return Math.hypot(
    a.l - b.l,
    a.c * Math.cos(ar) - b.c * Math.cos(br),
    a.c * Math.sin(ar) - b.c * Math.sin(br),
  );
}

/** CSS Color 4's just-noticeable difference for gamut mapping. */
const JND = 0.02;

/** Into sRGB; chroma is reduced at the same lightness and hue when the colour
 *  is outside it. A colour that is outside by less than an eye can see — the
 *  usual case, a channel at 0 or 255 rounded a hair past it — is clipped
 *  instead, as CSS Color 4 does, so that a value on the gamut's edge comes
 *  back as itself rather than a step greyer. */
export function oklchToRgb(color: Oklch): Pick<Rgba, 'r' | 'g' | 'b'> {
  const l = clamp(color.l, 0, 1);
  let linear = oklchToLinear({ ...color, l });
  if (!inGamut(linear) && deltaE(linearToOklch(clip(linear)), { ...color, l }) < JND)
    linear = clip(linear);
  if (!inGamut(linear)) {
    let lo = 0;
    let hi = Math.max(0, color.c);
    // Twenty halvings of a chroma under 0.5 is well under a 1/255 step.
    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut(oklchToLinear({ l, c: mid, h: color.h }))) lo = mid;
      else hi = mid;
    }
    linear = oklchToLinear({ l, c: lo, h: color.h });
  }
  const [r, g, b] = linear.map((n) => fromLinear(clamp(n, 0, 1)) * 255);
  return { r, g, b };
}

/* ---- strings ------------------------------------------------------------ */

const NUMBER = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i;
const OKLCH =
  /^oklch\(\s*(\S+?)\s+(\S+?)\s+(\S+?)\s*(?:\/\s*(\S+?)\s*)?\)$/i;

/** A number, or a percentage of `whole`; `null` when it is neither. */
function amount(token: string, whole: number): number | null {
  const percent = token.endsWith('%');
  const body = percent ? token.slice(0, -1) : token;
  if (!NUMBER.test(body)) return null;
  const n = Number(body);
  return percent ? (n / 100) * whole : n;
}

function parseOklch(input: string): Rgba | null {
  const match = OKLCH.exec(input);
  if (!match) return null;
  const [, lToken, cToken, hToken, aToken] = match;
  const l = amount(lToken, 1);
  // CSS Color 4: 100% chroma is 0.4.
  const c = amount(cToken, 0.4);
  const hBody = hToken.toLowerCase().endsWith('deg') ? hToken.slice(0, -3) : hToken;
  const h = NUMBER.test(hBody) ? Number(hBody) : null;
  const a = aToken === undefined ? 1 : amount(aToken, 1);
  if (l === null || c === null || h === null || a === null) return null;
  // Out-of-range lightness, chroma and alpha clamp, as they do in CSS.
  const rgb = oklchToRgb({ l: clamp(l, 0, 1), c: Math.max(0, c), h });
  return { ...rgb, a: clamp(a, 0, 1) };
}

/** A hex colour or an `oklch(L C H [/ A])`, with the format it was written
 *  in; `null` for anything else. */
export function parseColor(
  input: string,
): { color: Rgba; format: ColorFormat } | null {
  const text = input.trim();
  const hex = hexToRgb(text);
  if (hex) return { color: hex, format: 'hex' };
  const oklch = parseOklch(text);
  if (oklch) return { color: oklch, format: 'oklch' };
  return null;
}

/** `#rrggbb[aa]`, or `oklch(L C H[ / A])` with lightness and chroma to four
 *  places and hue to two — finer than a byte of any sRGB channel. Alpha is
 *  written only when the colour is not opaque. */
export function formatColor(color: Rgba, format: ColorFormat): string {
  if (format === 'hex') return rgbToHex(color);
  const { l, c, h } = rgbToOklch(color);
  const alpha = clamp(color.a, 0, 1);
  const tail = alpha < 1 ? ` / ${num(alpha, 3)}` : '';
  return `oklch(${num(l, 4)} ${num(c, 4)} ${num(h, 2)}${tail})`;
}
