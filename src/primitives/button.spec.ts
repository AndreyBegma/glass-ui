import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buttonClassName } from './button';

/**
 * BUG-20260930-001 — the primary button's label vanished under the pointer.
 *
 * `solid` was `bg-ink text-ground hover:bg-white`. In dark that is a white
 * fill turning a shade whiter; in light it is a near-black fill turning into
 * the label's own colour, and the label is gone for as long as the pointer is
 * on it. Nothing caught it because the one gate on raw colour listed
 * `bg-white` in `button.tsx` as an allowed survivor.
 *
 * Two gates, and they fail for different reasons:
 *
 *   - `button.tsx` spells no colour. A raw colour is a value that does not
 *     change with the theme, which is how a hover lands on the label's colour
 *     in one theme and looks fine in the other.
 *   - every variant's label clears 4.5:1 on its own fill, at rest and on
 *     hover, in both themes and at both distances. The values are read out of
 *     `tokens.css` and composited the way the browser paints them, so a token
 *     retuned without this file in view re-runs the gate.
 *
 * `.spec.ts`, not `.spec.tsx`, on purpose: `tokens.spec.ts` and `tokens.css`'s
 * `@source not` both exclude `*.spec.ts`, and this file has to write the
 * raw colours it forbids. The block parser and the compositing functions are
 * `desk.spec.ts`'s, repeated — a spec cannot import another spec without
 * registering its tests twice.
 */

const HERE = new URL('.', import.meta.url).pathname;

const SOURCE = readFileSync(join(HERE, 'button.tsx'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/.*$/gm, '$1 ');

/** Any utility, under any variant prefix, whose colour is black or white. */
const MONOCHROME =
  /\b(?:bg|text|border|ring|outline|fill|stroke|from|via|to|shadow|decoration|divide|caret|accent)-(?:black|white)\b/g;

/** A colour written out rather than named. */
const LITERAL = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\(/g;

/** Tailwind's numbered palette. */
const PALETTE =
  /\b(?:zinc|violet|emerald|rose|yellow|blue|slate|gray|grey|red|green|amber|orange|indigo|purple|teal|cyan|sky|lime|fuchsia|pink|stone|neutral)-(?:50|[1-9]00|950)\b/g;

const rawColours = (text: string) => [
  ...(text.match(MONOCHROME) ?? []),
  ...(text.match(LITERAL) ?? []),
  ...(text.match(PALETTE) ?? []),
];

describe('button.tsx spells no colour', () => {
  test('the gate catches the hover this bug shipped', () => {
    // A gate that cannot see the bug it was written for is decoration.
    expect(rawColours("solid: 'bg-ink text-ground hover:bg-white'")).toEqual(['bg-white']);
    expect(rawColours("'hover:text-black focus:bg-[#fff] bg-zinc-900'")).toHaveLength(3);
  });

  test('no black, white, literal or palette colour, under any prefix', () => {
    expect(rawColours(SOURCE)).toEqual([]);
  });
});

/* ------------------------------------------------------------------------ */
/* The tokens, as the cascade stacks them.                                   */
/* ------------------------------------------------------------------------ */

const TOKENS = readFileSync(join(HERE, '..', 'tokens.css'), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  ' ',
);

/** Every custom property the rule starting at `marker` declares, as `name: value`. */
function declarations(marker: string): string[] {
  const at = TOKENS.indexOf(marker);
  if (at < 0) throw new Error(`tokens.css no longer contains \`${marker}\``);
  const open = TOKENS.indexOf('{', at);
  let depth = 0;
  for (let i = open; i < TOKENS.length; i++) {
    if (TOKENS[i] === '{') depth++;
    else if (TOKENS[i] === '}' && --depth === 0)
      return [...TOKENS.slice(open + 1, i).matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)].map(
        (m) => `${m[1]}: ${m[2].replace(/\s+/g, ' ').trim()}`,
      );
  }
  throw new Error(`unbalanced braces after \`${marker}\``);
}

const BASE = declarations('@theme static');
const LIGHT_SYSTEM = declarations(':root:where(:not([data-theme="dark"]))');
const LIGHT_EXPLICIT = declarations(':root:where([data-theme="light"])');
const DESK = declarations(':root:where([data-scale="desk"])');
const DESK_SYSTEM = declarations(':root:where(:not([data-theme="dark"])[data-scale="desk"])');
const DESK_EXPLICIT = declarations(':root:where([data-theme="light"][data-scale="desk"])');

/** Both themes at both distances, stacked in cascade order. */
const SETS: [string, string[][]][] = [
  ['dark', [BASE]],
  ['light', [BASE, LIGHT_SYSTEM]],
  ['light (explicit)', [BASE, LIGHT_EXPLICIT]],
  ['desk dark', [BASE, DESK]],
  ['desk light', [BASE, LIGHT_SYSTEM, DESK, DESK_SYSTEM]],
  ['desk light (explicit)', [BASE, LIGHT_EXPLICIT, DESK, DESK_EXPLICIT]],
];

type Rgba = { rgb: number[]; a: number };

/** `#rrggbb` or `rgb(r g b / a)` — the two spellings a colour token has. */
function colour(spelled: string): Rgba {
  if (/^#[0-9a-f]{6}$/i.test(spelled))
    return { rgb: [1, 3, 5].map((i) => Number.parseInt(spelled.slice(i, i + 2), 16)), a: 1 };
  const m = spelled.match(/^rgb\((\d+) (\d+) (\d+) \/ ([\d.]+)\)$/);
  if (!m) throw new Error(`\`${spelled}\` is neither an opaque hex nor \`rgb(r g b / a)\``);
  return { rgb: [m[1], m[2], m[3]].map(Number), a: Number(m[4]) };
}

/** Source-over: `fg` at its alpha on an opaque `bg`, in 8-bit channels as painted. */
function over(fg: Rgba, bg: number[]): number[] {
  return fg.rgb.map((c, i) => Math.round(fg.a * c + (1 - fg.a) * bg[i]));
}

/** WCAG 2.x contrast of two opaque 8-bit colours. */
function contrast(a: number[], b: number[]): number {
  const luminance = (rgb: number[]) => {
    const [r, g, bl] = rgb.map((v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** The token as the cascade resolves it through `sets`, last one winning. */
function resolve(sets: string[][], token: string): string {
  const found = sets
    .flat()
    .filter((d) => d.startsWith(`${token}:`))
    .at(-1);
  if (!found) throw new Error(`no \`${token}\` in any set`);
  return found.slice(token.length + 1).trim();
}

/* ------------------------------------------------------------------------ */
/* The button, as it renders.                                                */
/* ------------------------------------------------------------------------ */

const VARIANTS = ['solid', 'glass', 'ghost', 'danger'] as const;

/** A layer a button paints: a token at an optional `/N` opacity. */
type Layer = { token: string; alpha: number };

/** The colour utility for `property` under `prefix` (`''` or `hover:`), read
 *  off the class list the component actually renders — so a variant restyled
 *  in `button.tsx` is measured as restyled, not as this file remembers it. */
function utility(classes: string[], prefix: string, property: 'bg' | 'text'): Layer | null {
  const shape = new RegExp(`^${prefix}${property}-([a-z0-9-]+?)(?:/(\\d+))?$`);
  const found = classes.map((c) => c.match(shape)).find((m) => m && m[1] !== 'base');
  if (!found) return null;
  return { token: `--color-${found[1]}`, alpha: found[2] ? Number(found[2]) / 100 : 1 };
}

function paint(sets: string[][], layer: Layer, bg: number[]): number[] {
  const c = colour(resolve(sets, layer.token));
  return over({ rgb: c.rgb, a: c.a * layer.alpha }, bg);
}

/** The `glass` utility over an opaque page, as `material.css` lists it: the
 *  backdrop through `brightness()` (blur and saturation do nothing to a flat
 *  colour), then the scrim, then the sheen. The scrim is the utility's
 *  `background-color`, so a `hover:bg-*` replaces it rather than stacking on
 *  top — which is what `fill` is for. */
function glass(sets: string[][], page: number[], fill: Layer | null): number[] {
  const bright = Number(resolve(sets, '--glass-brightness'));
  const backdrop = page.map((c) => Math.min(255, Math.round(c * bright)));
  const floor = fill ? paint(sets, fill, backdrop) : over(colour(resolve(sets, '--glass-scrim')), backdrop);
  return over(colour(resolve(sets, '--glass-sheen')), floor);
}

/** Every opaque surface a button sits on. */
const SURFACES = [
  '--color-ground',
  '--color-surface',
  '--color-raised',
  '--color-canvas',
  '--color-paper',
];

/**
 * The label and the fill behind it, for one variant in one state, on every
 * surface. On hover the pointer highlight `lit` draws is added at full
 * strength — the centre of its radial, where it is strongest.
 */
function ratios(sets: string[][], variant: (typeof VARIANTS)[number], hover: boolean) {
  const classes = buttonClassName({ variant }).split(/\s+/);
  const restFill = utility(classes, '', 'bg');
  const fill = (hover && utility(classes, 'hover:', 'bg')) || restFill;
  const label = (hover && utility(classes, 'hover:', 'text')) || utility(classes, '', 'text');
  if (!label) throw new Error(`\`${variant}\` has no label colour`);

  return SURFACES.map((surface) => {
    const page = colour(resolve(sets, surface)).rgb;
    let behind = classes.includes('glass')
      ? glass(sets, page, hover ? fill : null)
      : fill
        ? paint(sets, fill, page)
        : page;
    if (hover) behind = over(colour(resolve(sets, '--glass-lit')), behind);
    return [surface, contrast(paint(sets, label, behind), behind)] as const;
  });
}

function failing(sets: string[][], variant: (typeof VARIANTS)[number], hover: boolean) {
  return ratios(sets, variant, hover)
    .filter(([, r]) => r < 4.5)
    .map(([s, r]) => `${s}: ${r.toFixed(2)}:1`);
}

describe('every variant can be read, at rest and on hover', () => {
  test('the reader sees what the component renders', () => {
    // If the class parser stopped finding the fills, every ratio below would
    // be the label against the bare page and pass for the wrong reason.
    const solid = buttonClassName({ variant: 'solid' }).split(/\s+/);
    expect(utility(solid, '', 'bg')).toEqual({ token: '--color-ink', alpha: 1 });
    expect(utility(solid, 'hover:', 'bg')).toEqual({ token: '--color-ink', alpha: 0.9 });
    expect(utility(solid, '', 'text')).toEqual({ token: '--color-ground', alpha: 1 });
  });

  for (const variant of VARIANTS) {
    test.each(SETS)(`${variant}, at rest: %s`, (_n, sets) => {
      expect(failing(sets, variant, false)).toEqual([]);
    });

    test.each(SETS)(`${variant}, on hover: %s`, (_n, sets) => {
      expect(failing(sets, variant, true)).toEqual([]);
    });
  }
});

/**
 * The primary sits on other people's artwork in Luna, and a translucent hover
 * lets that artwork through. Pure black and pure white bound every backdrop —
 * compositing is monotonic in each channel — so clearing both clears any
 * poster.
 */
describe('the primary hover holds over any backdrop', () => {
  test.each(SETS)('%s: over black and over white', (_n, sets) => {
    const classes = buttonClassName({ variant: 'solid' }).split(/\s+/);
    const fill = utility(classes, 'hover:', 'bg');
    const label = utility(classes, '', 'text');
    if (!fill || !label) throw new Error('`solid` lost its hover fill or its label');
    for (const backdrop of [
      [0, 0, 0],
      [255, 255, 255],
    ]) {
      const behind = paint(sets, fill, backdrop);
      expect(contrast(paint(sets, label, behind), behind)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
