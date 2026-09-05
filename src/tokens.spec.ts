import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

/**
 * FEAT-20260831-501 — the one rule that has to survive a second application.
 *
 * In Luna Watch this lived in `CLAUDE.md` as prose, which works exactly as long
 * as everyone writing components has read it. A package is used by people and
 * agents who have not, so the rule arrives with the code as a build failure.
 *
 * Colour is spelled in exactly one file — `tokens.css` — and everything else
 * refers to it by name. That is what buys the palette being changeable: a
 * redesign is an edit to one file rather than a search across two repositories.
 *
 * Deliberately not scanning the CSS. `tokens.css` is where hex is *supposed* to
 * be, and `material.css` builds the material out of `rgb()` by necessity. The
 * ban is on a component reaching for a colour instead of a token.
 */

const SRC = new URL('.', import.meta.url).pathname;

/** Tailwind's numbered palette. Every one of these has a token that means it. */
const PALETTE =
  /\b(zinc|violet|emerald|rose|yellow|blue|slate|gray|grey|red|green|amber|orange|indigo|purple|teal|cyan|sky|lime|fuchsia|pink|stone|neutral)-(50|[1-9]00|950)\b/g;

/** A colour written out rather than named. */
const LITERAL = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/g;

/**
 * `black` and `white` at an opacity are the one thing left that is a colour
 * rather than a token, and every survivor is listed here with the reason.
 *
 * They are not an oversight and they are not free to grow: a scrim is black by
 * definition — it is a film over whatever is behind it, not a surface with a
 * hue — and the design system has no token that means "a film over the page".
 * The slider track and the sheet's grab handle are the same argument at the
 * other end: they are the material's own highlight, not ink.
 *
 * FEAT-20260831-501 moved these verbatim and deliberately did not re-decide
 * them; a move that also edits is a move nobody can review. Giving them names
 * is worth doing and is its own change. Until then, this list is the ceiling:
 * a new one fails the build.
 */
const ALLOWED: Record<string, string[]> = {
  'primitives/button.tsx': ['bg-white'],
  'primitives/chip.tsx': ['bg-black/55'],
  'primitives/dialog.tsx': ['bg-black/55'],
  'primitives/field.tsx': ['ring-white/22'],
  'primitives/sheet.tsx': ['bg-black/55', 'bg-white/25'],
  'primitives/slider.tsx': ['bg-white/16', 'bg-white/16'],
};

const MONOCHROME =
  /\b(?:bg|text|border|from|via|to|fill|stroke|ring|outline)-(?:black|white)(?:\/\d+)?\b/g;

/** A rule quoted in prose is not a rule anybody renders. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1 ');
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    if (!['.ts', '.tsx'].includes(extname(full))) return [];
    if (full.endsWith('.spec.ts')) return [];
    return [full];
  });
}

const files = sourceFiles(SRC).map((f) => ({
  name: relative(SRC, f),
  body: stripComments(readFileSync(f, 'utf8')),
}));

describe('the palette is spelled once', () => {
  test('there are components to check at all', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  test.each(
    files.map((f) => [f.name, f.body] as const),
  )('%s names no Tailwind palette colour', (_name, body) => {
    expect(body.match(PALETTE) ?? []).toEqual([]);
  });

  test.each(
    files.map((f) => [f.name, f.body] as const),
  )('%s writes no colour literal', (_name, body) => {
    expect(body.match(LITERAL) ?? []).toEqual([]);
  });

  test.each(
    files.map((f) => [f.name, f.body] as const),
  )('%s adds no black or white beyond the ones written down', (name, body) => {
    expect((body.match(MONOCHROME) ?? []).sort()).toEqual(
      [...(ALLOWED[name] ?? [])].sort(),
    );
  });
});

/**
 * FEAT-20260902-004 — a colour that exists in one theme only.
 *
 * This is the assertion Denitsa's `packages/ui/src/tokens.spec.ts` has carried
 * since A0d, moved to where the tokens now live. The bug it catches is
 * specific and it is not hypothetical: a token added to the dark set and
 * forgotten in the light one does not disappear, it **falls back to the dark
 * value** — a near-black surface on a white page, or worse, white text on it.
 * And it fails in one direction only, so whoever added it sees nothing wrong
 * unless they happened to be working in the theme they forgot.
 *
 * Three things are asserted, and the third is the one that is easy to leave
 * out: the two light blocks must be *identical*, not merely both present. They
 * are the system default and the explicit toggle, and a value that drifts
 * between them is a page that changes appearance when somebody flips a switch
 * to the setting they were already on.
 */

/** The tokens `tokens.css` declares in the dark set and deliberately does not
 *  repeat in light. `--glass-blur` is a distance and does not change with the
 *  theme; the two filters are composed out of it and `--glass-brightness`, so
 *  they flip themselves when the brightness does. Copying them would put
 *  `saturate(180%)` in three places — and a value in three places is a value
 *  that will one day be two values, which is a drift no "declared in both
 *  sets" assertion could ever see, because both sets would still declare it.
 *  Their *absence* is asserted below rather than tolerated, so that a future
 *  reader who trips over the exclusion cannot quietly satisfy it by copying. */
const DERIVED = ['--glass-blur', '--glass-filter', '--glass-filter-strong'];

const TOKENS = readFileSync(join(SRC, 'tokens.css'), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  ' ',
);

/** The body of the rule whose selector starts at `marker`, braces matched. */
function block(marker: string): string {
  const at = TOKENS.indexOf(marker);
  if (at < 0) throw new Error(`tokens.css no longer contains \`${marker}\``);
  const open = TOKENS.indexOf('{', at);
  let depth = 0;
  for (let i = open; i < TOKENS.length; i++) {
    if (TOKENS[i] === '{') depth++;
    else if (TOKENS[i] === '}' && --depth === 0)
      return TOKENS.slice(open + 1, i);
  }
  throw new Error(`unbalanced braces after \`${marker}\``);
}

/** Every custom property a block declares, in source order, as `name: value`. */
function declarations(body: string): string[] {
  return [...body.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)].map(
    (m) => `${m[1]}: ${m[2].replace(/\s+/g, ' ').trim()}`,
  );
}

const named = (decls: string[], prefix: string) =>
  decls.map((d) => d.split(':')[0]).filter((n) => n.startsWith(prefix));

const DARK = declarations(block('@theme static'));
const SYSTEM = block(':root:where(:not([data-theme="dark"]))');
const EXPLICIT = block(':root:where([data-theme="light"])');

describe('both themes carry the same palette', () => {
  test('the dark set is the one with no selector, and it is not empty', () => {
    expect(named(DARK, '--color-').length).toBeGreaterThan(10);
    expect(named(DARK, '--glass-').length).toBeGreaterThan(5);
  });

  test.each([
    ['the system default', SYSTEM],
    ['the explicit toggle', EXPLICIT],
  ])('%s defines every colour the dark set does, and no other', (_n, body) => {
    const light = declarations(body);
    expect(named(light, '--color-').sort()).toEqual(
      named(DARK, '--color-').sort(),
    );
  });

  test.each([
    ['the system default', SYSTEM],
    ['the explicit toggle', EXPLICIT],
  ])('%s flips every glass token that is not derived', (_n, body) => {
    const light = declarations(body);
    expect(named(light, '--glass-').sort()).toEqual(
      named(DARK, '--glass-')
        .filter((n) => !DERIVED.includes(n))
        .sort(),
    );
  });

  test.each([
    ['the system default', SYSTEM],
    ['the explicit toggle', EXPLICIT],
  ])('%s leaves the derived tokens to the dark set', (_n, body) => {
    const darkNames = DARK.map((d) => d.split(':')[0]);
    for (const token of DERIVED) {
      expect(darkNames).toContain(token);
      expect(body).not.toContain(`${token}:`);
    }
  });

  test('the two light blocks are the same block twice', () => {
    expect(declarations(EXPLICIT)).toEqual(declarations(SYSTEM));
  });

  test('both light blocks hand the browser its own furniture', () => {
    // Without `color-scheme` a light page gets dark scrollbars, a dark date
    // picker and dark autofill, and the application cannot fix it from outside.
    expect(SYSTEM).toContain('color-scheme: light');
    expect(EXPLICIT).toContain('color-scheme: light');
    expect(block(':root').includes('color-scheme: dark')).toBe(true);
  });
});

/**
 * FEAT-20260905-001 — the page tokens, by value and not only by name.
 *
 * The block above already refuses a token that exists in one theme and not the
 * other, and it does that the moment a name lands in the dark set. What it
 * cannot see is a *value* — `--color-paper` present in all three sets and
 * quietly retuned in one of them passes every assertion up there, because
 * every set still declares it.
 *
 * These two are the pair where that matters most. `--color-paper`'s dark value
 * is the one number in this file that was decided by looking at a screen
 * rather than by arithmetic — `Q40` carries it as a default with a trigger, so
 * it is a value somebody is *expected* to come back and argue with one day.
 * Pinning it here means that argument arrives as a failing test with the
 * decision's name on it, rather than as a diff nobody reads twice.
 */
const PAGE_TOKENS = {
  dark: ['--color-canvas: #09090c', '--color-paper: #1a1a21'],
  light: ['--color-canvas: #ececef', '--color-paper: #ffffff'],
};

describe('the page tokens carry the values C34 decided', () => {
  test('the dark set: the canvas is the ground, the page is lifted off it', () => {
    for (const declaration of PAGE_TOKENS.dark) {
      expect(DARK).toContain(declaration);
    }
  });

  test.each([
    ['the system default', SYSTEM],
    ['the explicit toggle', EXPLICIT],
  ])('%s: the page is the ground, the canvas is darkened behind it', (_n, body) => {
    for (const declaration of PAGE_TOKENS.light) {
      expect(declarations(body)).toContain(declaration);
    }
  });
});

/**
 * FEAT-20260905-001 — body text on a page stays readable, in every value set.
 *
 * The assertions above pin today's four hex values, which is the right guard
 * against an accidental edit and the wrong one against a deliberate change:
 * whoever `Q40`'s trigger eventually sends back here to retune the dark page
 * will update those constants as part of the job, and should. This is the
 * constraint that must survive them doing it.
 *
 * `ink` on `paper` at 12:1 is well past the 4.5:1 WCAG asks of body text, and
 * that is the point — a document is the one surface in this system that is
 * read for an hour at a time rather than glanced at, and the value it is read
 * on was set by eye. A floor this far above the legal one is what makes it
 * safe to have set it by eye.
 */

/** WCAG 2.x relative luminance of an `#rrggbb`. */
function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = Number.parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** The value a set gives a token, as written. Opaque hex only — every token
 *  this file measures is one, and a contrast ratio against a translucent
 *  colour is a ratio against whatever happens to be behind it, which is not a
 *  thing a stylesheet can be asked. */
function value(decls: string[], token: string): string {
  const found = decls.find((d) => d.startsWith(`${token}:`));
  if (!found) throw new Error(`no \`${token}\` in this set`);
  const hex = found.slice(token.length + 1).trim();
  if (!/^#[0-9a-f]{6}$/i.test(hex))
    throw new Error(`\`${token}\` is \`${hex}\`, which is not an opaque hex`);
  return hex;
}

describe('a page can be read', () => {
  test.each([
    ['the dark set', DARK],
    ['the system default', declarations(SYSTEM)],
    ['the explicit toggle', declarations(EXPLICIT)],
  ])('%s: ink on paper clears 12:1', (_n, decls) => {
    const ratio = contrast(value(decls, '--color-ink'), value(decls, '--color-paper'));
    expect(ratio).toBeGreaterThanOrEqual(12);
  });
});
