import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import {
  block as blockOf,
  contrast,
  declarations,
  tokenRules,
  value,
} from './tokens/read';

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

const TOKENS = tokenRules();
const block = (marker: string) => blockOf(TOKENS, marker);

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

/**
 * FEAT-20260911-001 — the Luna Watch guard.
 *
 * `E-104` splits one token layer between two products: Denitsa is read at a
 * desk, Luna Watch is operated from a sofa, and the values in this file are the
 * sofa's. The desk profile puts its own values under `[data-scale="desk"]`,
 * which Luna never sets — so Luna is safe *by construction* rather than by
 * anybody remembering.
 *
 * That is the claim, and the claim is the problem. "This change is additive" is
 * true of every change until it is not, and the way it stops being true is not
 * a dramatic one: a token gets nudged in the base set while somebody is looking
 * at the desk rung, and a media centre nobody in this wave is testing renders
 * differently on its next `bun install`. Luna is consumed by tag and is not in
 * this wave, so there is no second pair of eyes downstream.
 *
 * `tokens.baseline.json` is every `@theme static` declaration at `3d1c78e`.
 * This block holds the live file to it in all three directions — changed,
 * removed, and added — because two of those are how the promise actually
 * breaks and the third is how somebody would quietly satisfy the other two.
 */

/** Tokens added to `@theme static` since the baseline, each with the decision
 *  that put it there. A new token is not a drift — decision 5 of the desk
 *  profile adds four on purpose — but it is not free either: naming it here is
 *  the moment somebody has to say which decision it belongs to, and a token
 *  that cannot name one does not belong in the base set. */
const ADDED: Record<string, string> = {
  '--size-row': 'FEAT-20260911-001 decision 5 — the density scale',
  '--size-control': 'FEAT-20260911-001 decision 5 — the density scale',
  '--size-field': 'FEAT-20260911-001 decision 5 — the density scale',
  '--size-nav': 'FEAT-20260911-001 decision 5 — the density scale',
  '--size-tap': 'FEAT-20260911-001 decision 5 — the density scale',
  '--size-control-sm': 'BUG-20260930-001 (SYS-15) — Button `sm`, named so the desk keeps it under `md`',
  '--color-ink-4': 'BUG-20260923-019 — the quiet tone, today\'s ink-3 kept by name when the desk raises ink-3',
  '--color-card': 'FEAT-20260930-004 (SYS-04) — the card, `raised` in dark, the ground\'s white in light',
  '--color-card-line': 'FEAT-20260930-004 (SYS-04) — the card\'s edge, `line` in dark, the lift in light',
  '--size-chip': 'FEAT-20260930-004 — `Chip md`, named so the desk can move it',
};

const BASELINE: { commit: string; tokens: Record<string, string> } = JSON.parse(
  readFileSync(join(SRC, 'tokens.baseline.json'), 'utf8'),
);

/** `@theme static` as it stands, as a map rather than a list — this block is
 *  asking what each token *is*, not what order they were written in. */
const LIVE: Record<string, string> = Object.fromEntries(
  DARK.map((d) => {
    const at = d.indexOf(':');
    return [d.slice(0, at), d.slice(at + 1).trim()];
  }),
);

describe(`Luna Watch does not move (baseline ${BASELINE.commit})`, () => {
  test('the baseline is a baseline and not an empty object', () => {
    // A baseline that silently read as `{}` would pass every assertion below
    // by having nothing to say, which is the one way this guard fails open.
    expect(Object.keys(BASELINE.tokens).length).toBeGreaterThan(30);
  });

  test('no token the baseline carries has changed value', () => {
    const moved = Object.entries(BASELINE.tokens)
      .filter(([name, was]) => name in LIVE && LIVE[name] !== was)
      .map(([name, was]) => `${name}: ${was} -> ${LIVE[name]}`);
    expect(moved).toEqual([]);
  });

  test('no token the baseline carries has been removed', () => {
    const gone = Object.keys(BASELINE.tokens).filter((name) => !(name in LIVE));
    expect(gone).toEqual([]);
  });

  test('every token added since the baseline names the decision that added it', () => {
    const unexplained = Object.keys(LIVE).filter(
      (name) => !(name in BASELINE.tokens) && !(name in ADDED),
    );
    expect(unexplained).toEqual([]);
  });

  test('the added list does not name tokens that are not there', () => {
    // Otherwise a token can be deleted and the deletion hidden by leaving its
    // row in `ADDED` behind, which reads as documentation and is a hole.
    expect(Object.keys(ADDED).filter((name) => !(name in LIVE))).toEqual([]);
  });
});

/**
 * FEAT-20260930-004 (u7-glass) — the values this row decided, pinned.
 *
 * The desk profile's own guards live in `tokens/desk-profile.spec.ts`, split
 * out when this file passed the size ceiling. These are the three values U7
 * asked to be pinned *here*: the light card's step (SYS-04), the chip's desk
 * height, and the rows under a thumb.
 */

/** Source-over of `rgb(r g b / a)` on an opaque `#rrggbb`, as painted. */
function over(spelled: string, onto: string): string {
  const m = spelled.match(/^rgb\((\d+) (\d+) (\d+) \/ ([\d.]+)\)$/);
  if (!m) throw new Error(`\`${spelled}\` is not \`rgb(r g b / a)\``);
  const a = Number(m[4]);
  const bg = [1, 3, 5].map((i) => Number.parseInt(onto.slice(i, i + 2), 16));
  const rgb = [m[1], m[2], m[3]].map((c, i) => Math.round(a * Number(c) + (1 - a) * bg[i]));
  return `#${rgb.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

const lum = (hex: string) => contrast(hex, '#000000');
const tokenIn = (decls: string[], token: string) => {
  const found = decls.findLast((d) => d.startsWith(`${token}:`));
  if (!found) throw new Error(`no \`${token}\``);
  return found.slice(token.length + 1).trim();
};

const DESK_DARK = [...DARK, ...declarations(block(':root:where([data-scale="desk"])'))];
const deskLight = (light: string, deskLightMarker: string) => [
  ...DARK,
  ...declarations(light),
  ...declarations(block(':root:where([data-scale="desk"])')),
  ...declarations(block(deskLightMarker)),
];

/** The card's fill, and its edge painted over that fill, against the ground. */
function card(decls: string[]) {
  const ground = tokenIn(decls, '--color-ground');
  const fill = tokenIn(decls, '--color-card');
  let line = tokenIn(decls, '--color-card-line');
  if (line === 'var(--color-line)') line = tokenIn(decls, '--color-line');
  const edge = over(line, fill);
  return {
    up: lum(fill) >= lum(ground),
    fill: contrast(fill, ground),
    edge: contrast(edge, ground),
  };
}

const CARD_SETS: [string, string[], string[]][] = [
  ['sofa, system', declarations(SYSTEM), DARK],
  ['sofa, explicit', declarations(EXPLICIT), DARK],
  [
    'desk, system',
    deskLight(SYSTEM, ':root:where(:not([data-theme="dark"])[data-scale="desk"])'),
    DESK_DARK,
  ],
  [
    'desk, explicit',
    deskLight(EXPLICIT, ':root:where([data-theme="light"][data-scale="desk"])'),
    DESK_DARK,
  ],
];

describe('a card is raised in both themes (SYS-04)', () => {
  test('dark does not move: the card is `raised`, its edge is `line`', () => {
    expect(DARK).toContain('--color-card: #17171e');
    expect(DARK).toContain('--color-card-line: var(--color-line)');
    expect(tokenIn(DARK, '--color-card')).toBe(tokenIn(DARK, '--color-raised'));
  });

  test.each(CARD_SETS)('light %s: never below the ground', (_n, light) => {
    expect(card(light).up).toBe(true);
  });

  test.each(CARD_SETS)('light %s: its edge lifts it as far as dark does', (_n, light, dark) => {
    const [l, d] = [card(light).edge, card(dark).edge];
    expect(card(dark).up).toBe(true);
    expect(l).toBeGreaterThanOrEqual(d);
    // …and not by a mile: the smallest alpha that clears it, within 0.03.
    expect(l - d).toBeLessThan(0.03);
  });
});

describe('the chip and the rows are pinned at the desk', () => {
  const desk = declarations(block(':root:where([data-scale="desk"])'));

  test('`--size-chip` is 28px on the sofa, and 24px — `control-sm` — at the desk', () => {
    expect(DARK).toContain('--size-chip: 28px');
    expect(desk).toContain('--size-chip: 24px');
    expect(tokenIn(desk, '--size-chip')).toBe(tokenIn(desk, '--size-control-sm'));
  });

  test('under a thumb the desk gives rows and navigation `--size-tap`', () => {
    const coarse = declarations(block('@media (pointer: coarse)'));
    const tap = tokenIn(DARK, '--size-tap');
    expect(tokenIn(coarse, '--size-row')).toBe(tap);
    expect(tokenIn(coarse, '--size-nav')).toBe(tap);
  });
});

