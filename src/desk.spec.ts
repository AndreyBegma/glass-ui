import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * BUG-20260923-019 — the third level of text is readable at a desk.
 *
 * `--color-ink-3` carries metadata and empty-state copy — 359 uses in Denitsa —
 * and its sofa values were pinned to *each other* across the two themes, not
 * to WCAG 1.4.3: 3.18:1 and 3.25:1 on their grounds, and less on a card. The
 * desk profile re-values it; the sofa keeps it, and the Luna guard in
 * `tokens.spec.ts` holds the sofa to that.
 *
 * It is an alpha, so a ratio against it is a ratio against whatever it is
 * painted over — which is why this composites rather than reads a hex: the
 * text over each surface, and each glass rung over the page it floats on,
 * built out of the `--glass-*` layers as `material.css` stacks them. The glass
 * values are read from `tokens.css`, so retuning the material re-runs the gate.
 *
 * The sets are stacked in cascade order — base, light, desk, light-desk — and
 * the last declaration wins, which is what the browser does with five blocks
 * at (0,1,0).
 *
 * Its own file rather than a section of `tokens.spec.ts`, which is at the size
 * ceiling. The block parser below is that file's, repeated: a spec cannot import
 * another spec without registering its tests twice.
 */

const TOKENS = readFileSync(
  join(new URL('.', import.meta.url).pathname, 'tokens.css'),
  'utf8',
).replace(/\/\*[\s\S]*?\*\//g, ' ');

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

/** Each theme at a desk, as the cascade stacks it. */
const AT_DESK: [string, string[][]][] = [
  ['dark', [BASE, DESK]],
  ['light', [BASE, LIGHT_SYSTEM, DESK, DESK_SYSTEM]],
  ['light (explicit)', [BASE, LIGHT_EXPLICIT, DESK, DESK_EXPLICIT]],
];

/** The same themes with `data-scale` unset — the sofa, which is Luna Watch. */
const AT_SOFA: [string, string[][]][] = [
  ['dark', [BASE]],
  ['light', [BASE, LIGHT_SYSTEM]],
  ['light (explicit)', [BASE, LIGHT_EXPLICIT]],
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

/** A glass rung over an opaque page: the backdrop through `brightness()`
 *  (blur and saturation do nothing to a flat grey), then the scrim, then the
 *  sheen — the order `material.css` lists them in its `background`. */
function glassOver(sets: string[][], rung: '' | '-strong', page: number[]): number[] {
  const bright = Number(resolve(sets, `--glass-brightness${rung}`));
  const backdrop = page.map((c) => Math.min(255, Math.round(c * bright)));
  const scrimmed = over(colour(resolve(sets, `--glass-scrim${rung}`)), backdrop);
  return over(colour(resolve(sets, '--glass-sheen')), scrimmed);
}

const PAGES = ['--color-ground', '--color-canvas', '--color-paper'];
const CARDS = ['--color-surface', '--color-raised'];

/** Every surface ink-3 is read on at a desk, by name: the page, the card, the
 *  two text-bearing glass rungs over each page, and a hovered row on any of
 *  them. `glass-clear` is not here — it carries no body text, and its gate in
 *  `material.css` is 3:1 for a graphic. */
function deskSurfaces(sets: string[][]): [string, number[]][] {
  const opaque = (token: string) => colour(resolve(sets, token)).rgb;
  const hover = colour(resolve(sets, '--color-hover'));
  return [
    ...[...PAGES, ...CARDS].map((t): [string, number[]] => [t, opaque(t)]),
    ...PAGES.flatMap((p): [string, number[]][] => [
      [`glass over ${p}`, glassOver(sets, '', opaque(p))],
      [`glass-strong over ${p}`, glassOver(sets, '-strong', opaque(p))],
    ]),
    ...[...PAGES, ...CARDS].map((t): [string, number[]] => [
      `hover over ${t}`,
      over(hover, opaque(t)),
    ]),
  ];
}

function failing(sets: string[][], token: string, floor: number): string[] {
  const ink = colour(resolve(sets, token));
  return deskSurfaces(sets)
    .map(([name, bg]) => [name, contrast(over(ink, bg), bg)] as const)
    .filter(([, ratio]) => ratio < floor)
    .map(([name, ratio]) => `${name}: ${ratio.toFixed(2)}:1`);
}

describe('the third level of text clears 4.5:1 at a desk', () => {
  test.each(AT_DESK)('%s: ink-3 on every page, card and glass surface', (_n, sets) => {
    expect(failing(sets, '--color-ink-3', 4.5)).toEqual([]);
  });

  test.each(AT_DESK)('%s: ink-3 stays a step below ink-2', (_n, sets) => {
    // A third level that reaches the second is not a third level. Measured on
    // the page, where the two are read side by side.
    const page = colour(resolve(sets, '--color-ground')).rgb;
    const ratio = (token: string) => contrast(over(colour(resolve(sets, token)), page), page);
    expect(ratio('--color-ink-2')).toBeGreaterThan(ratio('--color-ink-3') + 1);
  });
});

/**
 * The quiet tone survives, under its own name.
 *
 * Some text is allowed to be quiet — a decorative glyph, the label of a
 * disabled control (WCAG 1.4.3 exempts inactive components) — and raising
 * ink-3 at the desk would have taken the only quiet tone with it. `--color-ink-4`
 * carries today's ink-3 in every theme and is not re-valued at the desk, so the
 * tone that existed before this fix still exists, named for what it is for.
 */
describe('the quiet tone is the sofa ink-3, at either distance', () => {
  test.each(AT_SOFA)('%s: ink-4 is ink-3 when `data-scale` is unset', (_n, sets) => {
    expect(resolve(sets, '--color-ink-4')).toBe(resolve(sets, '--color-ink-3'));
  });

  test.each(AT_DESK.map(([n, sets], i): [string, string[][], string[][]] => [n, sets, AT_SOFA[i][1]]))(
    '%s: the desk leaves ink-4 where the sofa has it',
    (_n, desk, sofa) => {
      expect(resolve(desk, '--color-ink-4')).toBe(resolve(sofa, '--color-ink-4'));
    },
  );
});
