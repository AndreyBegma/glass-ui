import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buttonClassName } from './button';

/**
 * BUG-20260930-001, FEAT-20261013-002 — every Button label can be read under
 * the workspace profile, ported from `maint/v0.8` (#168).
 *
 * On maint the primary was ink everywhere, and this gate held every variant to
 * 4.5:1 at rest and on hover in both themes at both distances. On develop the
 * primary is the accent (#93), gated in `tokens.spec.ts`; maint's colours —
 * the ink primary, the ink danger label, the flat secondary tint — are the
 * workspace profile's. So this measures what the profile draws: the
 * `workspace:` utility where the variant has one, its plain utility where it
 * does not, over the workspace's own tokens.
 *
 * Two gates, and they fail for different reasons:
 *
 *   - `button.tsx` spells no colour. A raw colour is a value that does not
 *     change with the theme, which is how a hover lands on the label's colour
 *     in one theme and looks fine in the other.
 *   - every variant's label clears 4.5:1 on its own fill, at rest and on
 *     hover, in both themes. The values are read out of `tokens.css` and
 *     composited the way the browser paints them, so a token retuned without
 *     this file in view re-runs the gate.
 *
 * `.spec.ts`, not `.spec.tsx`, on purpose: `tokens.spec.ts` and `tokens.css`'s
 * `@source not` both exclude `*.spec.ts`, and this file has to write the raw
 * colours it forbids. The block parser and the compositing functions are
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
const WS = declarations(':root:where([data-scale="desk"][data-profile="workspace"])');
const WS_SYSTEM = declarations(
  ':root:where(:not([data-theme="dark"])[data-scale="desk"][data-profile="workspace"])',
);
const WS_EXPLICIT = declarations(
  ':root:where([data-theme="light"][data-scale="desk"][data-profile="workspace"])',
);

/** Both themes under the workspace profile, stacked in cascade order. */
const SETS: [string, string[][]][] = [
  ['workspace dark', [BASE, DESK, WS]],
  ['workspace light', [BASE, LIGHT_SYSTEM, DESK, DESK_SYSTEM, WS, WS_SYSTEM]],
  ['workspace light (explicit)', [BASE, LIGHT_EXPLICIT, DESK, DESK_EXPLICIT, WS, WS_EXPLICIT]],
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
/* The button, as the workspace renders it.                                  */
/* ------------------------------------------------------------------------ */

/** `glass` is measured at the flat material, below: Denitsa's, and the only
 *  place the workspace re-colours it. */
const VARIANTS = ['solid', 'ghost', 'danger', 'link'] as const;

/** The surfaces a link is gated on (#93): the ground, the surface, the card. */
const LINK_SURFACES = ['--color-ground', '--color-surface', '--color-raised'];

/** A layer a button paints: a token at an optional `/N` opacity. */
type Layer = { token: string; alpha: number };

/** The colour utility for `property` under `prefix` (`''` or `hover:`), read
 *  off the class list the component actually renders, the `workspace:` one
 *  first — so a variant restyled in `button.tsx` is measured as restyled. */
function utility(classes: string[], prefix: string, property: 'bg' | 'text'): Layer | null {
  for (const scope of ['workspace:', '']) {
    const shape = new RegExp(`^${scope}${prefix}${property}-([a-z0-9-]+?)(?:/(\\d+))?$`);
    const found = classes.map((c) => c.match(shape)).find((m) => m && m[1] !== 'base');
    if (found) return { token: `--color-${found[1]}`, alpha: found[2] ? Number(found[2]) / 100 : 1 };
  }
  return null;
}

function paint(sets: string[][], layer: Layer, bg: number[]): number[] {
  const c = colour(resolve(sets, layer.token));
  return over({ rgb: c.rgb, a: c.a * layer.alpha }, bg);
}

/** Every opaque surface a button sits on, the workspace's white card included. */
const SURFACES = [
  '--color-ground',
  '--color-surface',
  '--color-raised',
  '--color-canvas',
  '--color-paper',
  '--color-card',
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

  return (variant === 'link' ? LINK_SURFACES : SURFACES).map((surface) => {
    const page = colour(resolve(sets, surface)).rgb;
    let behind = fill ? paint(sets, fill, page) : page;
    // `before:hidden` is the variant switching the highlight off (`link`).
    if (hover && !classes.includes('before:hidden'))
      behind = over(colour(resolve(sets, '--glass-lit')), behind);
    return [surface, contrast(paint(sets, label, behind), behind)] as const;
  });
}

function failing(sets: string[][], variant: (typeof VARIANTS)[number], hover: boolean) {
  return ratios(sets, variant, hover)
    .filter(([, r]) => r < 4.5)
    .map(([s, r]) => `${s}: ${r.toFixed(2)}:1`);
}

describe('every variant can be read under the workspace, at rest and on hover', () => {
  test('the reader sees what the component renders', () => {
    // If the class parser stopped finding the fills, every ratio below would
    // be the label against the bare page and pass for the wrong reason.
    const solid = buttonClassName({ variant: 'solid' }).split(/\s+/);
    expect(utility(solid, '', 'bg')).toEqual({ token: '--color-ink', alpha: 1 });
    expect(utility(solid, 'hover:', 'bg')).toEqual({ token: '--color-ink', alpha: 0.9 });
    expect(utility(solid, '', 'text')).toEqual({ token: '--color-ground', alpha: 1 });
    const danger = buttonClassName({ variant: 'danger' }).split(/\s+/);
    expect(utility(danger, '', 'text')).toEqual({ token: '--color-ink', alpha: 1 });
    expect(utility(danger, '', 'bg')).toEqual({ token: '--color-danger', alpha: 0.12 });
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
 * FEAT-20261013-002 (W238) — a disabled primary stays a primary.
 *
 * FEAT-20260930-004 (SYS-03) had turned it into `bg-hover text-ink-2` so it
 * would not out-shout its neighbours; the audit counted that grey fill as a
 * third look for one hierarchy. It is the live fill at the base 40%. WCAG
 * 1.4.3 exempts a disabled control's label, so what is asserted is the
 * opacity, and that no variant swaps the fill or the label for a disabled one.
 */
describe('a disabled primary is the live fill at 40%', () => {
  const classes = buttonClassName({ variant: 'solid' }).split(/\s+/);

  test('the base opacity applies', () => {
    expect(classes).toContain('disabled:opacity-40');
    expect(classes.filter((c) => c.endsWith('disabled:opacity-100'))).toEqual([]);
  });

  test('no disabled fill or label of its own, under any prefix', () => {
    expect(classes.filter((c) => /(^|:)disabled:(bg|text)-/.test(c))).toEqual([]);
  });
});

/**
 * FEAT-20261013-002 (W238) — the secondary tier at the flat material.
 *
 * Under `data-material="flat"` the scrim is `raised`, so the workspace tint is
 * ink at 6% over whatever the button sits on, and the label is ink. On hover
 * the tint is 10%, with `--color-hover` painted over it by `glass-hover`. The
 * tint is an ancestor-variant utility, which `utility()` does not read, so the
 * numbers here are the spec's and a test in `button.test.tsx` pins the class
 * list to them.
 */
describe('the flat secondary can be read, at rest and on hover', () => {
  const FLAT_TINT = 0.06;
  const FLAT_HOVER = 0.1;

  test('the class list carries those two tints', () => {
    const classes = buttonClassName({ variant: 'glass' }).split(/\s+/);
    expect(classes).toContain('workspace:in-data-[material=flat]:bg-ink/[0.06]');
    expect(classes).toContain('workspace:in-data-[material=flat]:hover:bg-ink/[0.10]');
  });

  test.each(SETS)('%s', (_n, sets) => {
    const ink = colour(resolve(sets, '--color-ink'));
    const wash = colour(resolve(sets, '--color-hover'));
    const failures: string[] = [];
    for (const surface of SURFACES) {
      const page = colour(resolve(sets, surface)).rgb;
      const rest = over({ rgb: ink.rgb, a: ink.a * FLAT_TINT }, page);
      const hover = over(wash, over({ rgb: ink.rgb, a: ink.a * FLAT_HOVER }, page));
      for (const [state, behind] of [
        ['rest', rest],
        ['hover', hover],
      ] as const) {
        const ratio = contrast(paint(sets, { token: '--color-ink', alpha: 1 }, behind), behind);
        if (ratio < 4.5) failures.push(`${surface} ${state}: ${ratio.toFixed(2)}:1`);
      }
    }
    expect(failures).toEqual([]);
  });
});

/**
 * A translucent hover lets whatever is behind the button through. Pure black
 * and pure white bound every backdrop — compositing is monotonic in each
 * channel — so clearing both clears any.
 */
describe('the workspace primary hover holds over any backdrop', () => {
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
