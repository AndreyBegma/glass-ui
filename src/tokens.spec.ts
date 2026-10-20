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
  // #93 — the dialog and sheet scrims are `bg-scrim` now, and the primary
  // button is the accent: three survivors fewer.
  'primitives/chip.tsx': ['bg-black/55'],
  'primitives/field.tsx': ['ring-white/22'],
  'primitives/sheet.tsx': ['bg-white/25'],
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
 *  repeat in light. `--glass-blur` and `--glass-blur-strong` are distances and
 *  do not change with the theme; the two filters are composed out of them and
 *  `--glass-brightness`, so
 *  they flip themselves when the brightness does. Copying them would put
 *  `saturate(180%)` in three places — and a value in three places is a value
 *  that will one day be two values, which is a drift no "declared in both
 *  sets" assertion could ever see, because both sets would still declare it.
 *  Their *absence* is asserted below rather than tolerated, so that a future
 *  reader who trips over the exclusion cannot quietly satisfy it by copying. */
const DERIVED = [
  '--glass-blur',
  '--glass-blur-strong',
  '--glass-filter',
  '--glass-filter-strong',
];

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
  // #93 — `--color-series-1` is `var(--color-accent)`. A reference to another
  // token of the same set is measured as that token.
  const ref = /^var\((--[a-z0-9-]+)\)$/.exec(hex);
  if (ref) return value(decls, ref[1]);
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

/**
 * #74 D5 — a series colour is a graphical object, and WCAG 1.4.11 asks 3:1 of
 * those against what they sit on. A chart draws on a solid surface (D12), so
 * `--color-surface` is the one to measure against, in every value set.
 */
describe('the series colours can be seen on a surface', () => {
  test.each([
    ['the dark set', DARK],
    ['the system default', declarations(SYSTEM)],
    ['the explicit toggle', declarations(EXPLICIT)],
  ])('%s: series 1-6 clear 3:1 against surface', (_n, decls) => {
    const surface = value(decls, '--color-surface');
    for (const n of [1, 2, 3, 4, 5, 6]) {
      const token = `--color-series-${n}`;
      expect({ token, ratio: contrast(value(decls, token), surface) >= 3 }).toEqual({
        token,
        ratio: true,
      });
    }
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
  '--ease-out-expo': 'FEAT-20260916-598 — the motion vocabulary; the curve seven pop-ins had hard-coded',
  '--glass-scrim-clear': 'FEAT-20260919-618 — liquid glass; the third rung\'s scrim',
  '--glass-sheen-clear': 'FEAT-20260919-618 — liquid glass; the third rung\'s sheen',
  '--glass-shadow-clear': 'FEAT-20260919-618 — liquid glass; the third rung\'s shadow',
  '--glass-blur-strong': 'FEAT-20260919-618 — liquid glass; the strong blur as a token so the television can lower it',
  '--glass-rim': 'FEAT-20260919-618 — liquid glass; the rim, bright top-left',
  '--glass-rim-shade': 'FEAT-20260919-618 — liquid glass; the rim, dark bottom-right',
  '--glass-meniscus': 'FEAT-20260919-618 — liquid glass; the band inside the bottom edge',
  '--glass-refract': 'FEAT-20260919-618 — liquid glass; the ring along the rim',
  '--glass-rim-strong': 'BUG-20260919-626 — the rim\'s straight run on a large panel, quieter',
  '--glass-rim-shade-strong': 'BUG-20260919-626 — the shade\'s straight run on a large panel, quieter',
  '--color-ink-4': 'BUG-20260923-019 — the quiet tone, today\'s ink-3 kept by name when the desk raises ink-3',
  '--size-control-sm': 'BUG-20260930-001 (SYS-15), #168 — Button `sm`, named so the workspace profile keeps it under `md`',
  '--size-chip': 'FEAT-20260930-004, #168 — Chip `md`, named so the workspace profile can move it',
  '--breakpoint-tablet': 'C-281 (AgentDock S-7) — the tablet band\'s first pixel, Tailwind\'s `sm`',
  '--breakpoint-desktop': 'C-281 (AgentDock S-7) — the desktop band\'s first pixel, Tailwind\'s `lg`',
  '--focus-width': 'FEAT-20261013-001, #168 — the ring width, named so the workspace profile can draw 2px',
  '--focus-offset': 'FEAT-20261013-001, #168 — the ring offset, named so the workspace profile can draw 2px',
  '--color-card': 'FEAT-20260930-004 (SYS-04), #168 — the raised card; `raised` everywhere but the light workspace',
  '--color-card-line': 'FEAT-20260930-004 (SYS-04), #168 — the raised card\'s edge; `line` everywhere but the workspace',
  '--dur-scene': 'FEAT-20260924-680 — motion round 2; the fourth duration, for a change that covers the viewport',
  '--tilt-angle': 'FEAT-20260924-680 — motion round 2; how far `.luna-tilt` leans at most',
  '--tilt-depth': 'FEAT-20260924-680 — motion round 2; the perspective `.luna-tilt` leans in',
  ...Object.fromEntries(
    [1, 2, 3, 4, 5, 6].map((n) => [
      `--color-series-${n}`,
      '#74 D5 — the categorical series colours for Chart',
    ]),
  ),
  ...Object.fromEntries(
    ['--color-accent', '--color-on-accent', '--color-accent-soft', '--color-accent-ink'].map(
      (t) => [t, '#93 — the accent, global; reverses E-92 / FEAT-20260911-001 decision 6'],
    ),
  ),
  '--color-info': '#94 — the fourth semantic, a status of "waiting"',
  '--color-info-soft': '#94 — the fourth semantic, its tint',
  '--color-content': '#93 — the content surface, near-opaque paper',
  '--color-scrim': '#93 — the lighter dialog and sheet scrim',
  '--blur-scrim': '#93 — the scrim blur, much less than `backdrop-blur-sm`',
  '--canvas-glow': '#93 — how strongly `.canvas` paints the accent',
  '--press-scale': '#93 — the press feedback on controls',
  '--dur-press': '#93 — the press feedback on controls',
  '--dur-spring': '#93 — the dialog spring',
  '--ease-spring': '#93 — the dialog spring, a critically damped `linear()`',
  '--font-mono': '#93 — the monospace face, set by the consumer',
  ...Object.fromEntries(
    [
      '--text-display', '--text-display--line-height', '--text-display--letter-spacing',
      '--text-display--font-weight',
      '--text-heading', '--text-heading--line-height', '--text-heading--letter-spacing',
      '--text-heading--font-weight',
      '--text-section', '--text-section--line-height', '--text-section--font-weight',
      '--text-body', '--text-body--line-height',
      '--text-label', '--text-label--line-height', '--text-label--font-weight',
    ].map((t) => [t, '#93 — the type scale']),
  ),
  ...Object.fromEntries(
    [1, 2, 3, 4, 5, 6, 7, 8].flatMap((n) =>
      ['', '-soft', '-line', '-ink', '-glow'].map((v) => [
        `--color-hue-${n}${v}`,
        '#109 — the eight identity hues; `palette.spec.ts` gates them',
      ]),
    ),
  ),
  ...Object.fromEntries(
    ['running', 'waiting', 'paused', 'blocked', 'done', 'error'].flatMap((s) =>
      ['', '-soft', '-ink', '-glow'].map((v) => [
        `--color-status-${s}${v}`,
        '#109 — the status colours, references to the hues',
      ]),
    ),
  ),
  ...Object.fromEntries(
    [1, 2, 3].map((n) => [
      `--canvas-aurora-${n}`,
      '#109 — what the canvas glows are a glow of; the accent unless a palette says otherwise',
    ]),
  ),
};

const BASELINE: {
  commit: string;
  tokens: Record<string, string>;
  decisions?: Record<string, string>;
} = JSON.parse(
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
  // FEAT-20260919-618 moved eight `--glass-*` values in the baseline itself,
  // each named in its `decisions` map. That is the route the file's own
  // comment allows — a decision, next to the value — and this holds the two
  // in step: a value edited without a decision, or a decision left behind
  // after its value was reverted, both fail.
  test('every baseline value that moved names the decision that moved it', () => {
    const decided = Object.keys(BASELINE.decisions ?? {});
    expect(decided.length).toBeGreaterThan(0);
    for (const token of decided) expect(BASELINE.tokens).toHaveProperty(token);
  });

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
 * FEAT-20260911-001 — the desk profile, held to exactly what it said it does.
 *
 * The guard above says the base set has not moved. This says the desk rung has
 * not *grown* — which is the other half, and the one that rots quietly. A
 * fourth axis is an inviting place to put things: it is opt-in, no shipped
 * consumer sets it, and nothing downstream breaks when it gains a token. That
 * is exactly why the list is asserted rather than reviewed. An override added
 * here is a value that exists in one profile and not the other, and the next
 * person to read `tokens.css` has no way to tell an intended asymmetry from an
 * accident unless every intended one is written down.
 *
 * Overrides only, since #93: an override has a base value to fall back to, a
 * definition does not. The desk used to define the accent (decision 6); the
 * accent is global now and the desk does not re-value it.
 */

/** Tokens the desk rung re-values. Each already exists in `@theme static`. */
const DESK_OVERRIDES = [
  '--radius-control', '--radius-surface', '--radius-sheet',
  '--dur-fast', '--dur-base', '--dur-sheet', '--dur-scene',
  '--color-line', '--color-line-strong', '--color-hover',
  '--size-row', '--size-control', '--size-field', '--size-nav',
  // BUG-20260923-019 — raised to 4.5:1; the gate is `desk.spec.ts`.
  '--color-ink-3',
];

/** The accent family. Global since #93, and never re-valued by the desk. */
const ACCENT = ['--color-accent', '--color-on-accent', '--color-accent-soft', '--color-accent-ink'];

/** The theme-dependent half, repeated in the two light-desk blocks. A radius
 *  and a row height do not know what colour the page is, so they are not. */
const DESK_LIGHT = ['--color-line', '--color-line-strong', '--color-hover', '--color-ink-3'];

const DESK = block(':root:where([data-scale="desk"])');
const DESK_SYSTEM = block(':root:where(:not([data-theme="dark"])[data-scale="desk"])');
const DESK_EXPLICIT = block(':root:where([data-theme="light"][data-scale="desk"])');

describe('the desk profile changes exactly what it says it changes', () => {
  test('the desk rung overrides these tokens and no others', () => {
    const names = declarations(DESK).map((d) => d.split(':')[0]);
    expect(names.sort()).toEqual([...DESK_OVERRIDES].sort());
  });

  test('every token it overrides exists in the base set to be overridden', () => {
    // An "override" of a token that is not in `@theme static` is a definition
    // wearing an override's name, and it would resolve to nothing outside the
    // desk profile without anybody having decided that.
    for (const token of DESK_OVERRIDES) {
      expect(Object.keys(LIVE)).toContain(token);
    }
  });

  test('it does not re-value the accent (#93)', () => {
    for (const body of [DESK, DESK_SYSTEM, DESK_EXPLICIT]) {
      const names = declarations(body).map((d) => d.split(':')[0]);
      for (const token of ACCENT) expect(names).not.toContain(token);
    }
  });

  test('`--size-tap` is deliberately not among them', () => {
    // A hit area is not a visual size and a finger is the same size at either
    // distance. Asserted rather than tolerated, so that somebody who trips
    // over the omission cannot quietly satisfy it by adding the line.
    expect(Object.keys(LIVE)).toContain('--size-tap');
    expect(DESK).not.toContain('--size-tap:');
  });

  test.each([
    ['the system default', DESK_SYSTEM],
    ['the explicit toggle', DESK_EXPLICIT],
  ])('%s turns over the theme-dependent half, and only that', (_n, body) => {
    const names = declarations(body).map((d) => d.split(':')[0]);
    expect(names.sort()).toEqual([...DESK_LIGHT].sort());
  });

  test('the two light-desk blocks are the same block twice', () => {
    // The light palette's own pair is asserted this way for the reason that
    // applies here too: a drift between them fails in one direction only — the
    // toggle, or the system default, but never both — and so survives review.
    expect(declarations(DESK_EXPLICIT)).toEqual(declarations(DESK_SYSTEM));
  });

  /**
   * Source order is load-bearing here, and it is the one property of this file
   * that a diff makes invisible: every block below weighs (0,1,0), so which
   * one wins is decided purely by which comes last. Move the desk rung above
   * the light pair — a plausible tidy-up, since it reads as "the new section"
   * — and a light desk page takes the *white* hairlines and draws them on
   * white paper. Nothing else in the file changes and no other test notices.
   *
   * The comment above the blocks says so. This makes it fail a build instead.
   */
  test('the desk blocks come after the light pair, which is what makes them win', () => {
    const order = [
      ':root:where(:not([data-theme="dark"]))',
      ':root:where([data-theme="light"])',
      ':root:where([data-scale="desk"])',
      ':root:where(:not([data-theme="dark"])[data-scale="desk"])',
      ':root:where([data-theme="light"][data-scale="desk"])',
    ].map((selector) => {
      const at = TOKENS.indexOf(selector);
      if (at < 0) throw new Error(`tokens.css no longer contains \`${selector}\``);
      return { selector, at };
    });

    expect(order.map((o) => o.selector)).toEqual(
      [...order].sort((a, b) => a.at - b.at).map((o) => o.selector),
    );
  });
});

/**
 * #93 — the accent exists in every set.
 *
 * This used to assert the opposite: `E-92` retired the accent and
 * FEAT-20260911-001 decision 6 granted one to the desk profile only, so
 * `--color-accent` resolved to nothing anywhere else. #93 reverses that on
 * purpose. AgentDock's UI audit found the system read as a grey admin template
 * with no colour of its own, and g93-controls reads these four names through
 * Tailwind with no fallback. So they must exist in every set, and only there:
 * the dark set and the two light blocks.
 */
describe('the accent is defined in every theme (#93)', () => {
  test.each(ACCENT)('%s is in the base set', (token) => {
    expect(Object.keys(LIVE)).toContain(token);
  });

  test.each(ACCENT)('%s is in both light blocks', (token) => {
    expect(declarations(SYSTEM).map((d) => d.split(':')[0])).toContain(token);
    expect(declarations(EXPLICIT).map((d) => d.split(':')[0])).toContain(token);
  });

  // #110 — this used to count three declarations per token. A preset under
  // `data-accent` is a fourth place on purpose, so the assertion is now about
  // *which* blocks: the three base sets, and blocks gated on `data-accent`.
  test('no other block re-values it', () => {
    for (const rule of RULES) {
      const names = declarations(rule.body).map((d) => d.split(':')[0]);
      if (!ACCENT.some((t) => names.includes(t))) continue;
      const base = rule.selector === '@theme static' || LIGHT_SELECTORS.includes(rule.selector);
      expect({ selector: rule.selector, allowed: base || rule.selector.includes('[data-accent=') }).toEqual({
        selector: rule.selector,
        allowed: true,
      });
    }
  });

  test('chart series 1 is the accent, in every set', () => {
    for (const decls of [DARK, declarations(SYSTEM), declarations(EXPLICIT)]) {
      expect(decls).toContain('--color-series-1: var(--color-accent)');
    }
  });
});

/** An `rgb(r g b / a)` over an opaque `#rrggbb`, as the compositor would draw it. */
function over(rgba: string, hex: string): string {
  const m = /^rgb\((\d+) (\d+) (\d+) \/ ([\d.]+)\)$/.exec(rgba);
  if (!m) throw new Error(`\`${rgba}\` is not an \`rgb(r g b / a)\``);
  const a = Number(m[4]);
  const under = [0, 2, 4].map((i) => Number.parseInt(hex.slice(1 + i, 3 + i), 16));
  return `#${[1, 2, 3]
    .map((i, k) => Math.round(Number(m[i]) * a + under[k] * (1 - a)).toString(16).padStart(2, '0'))
    .join('')}`;
}

/** The value a set gives a token, as written, with no opacity check. */
function raw(decls: string[], token: string): string {
  const found = decls.find((d) => d.startsWith(`${token}:`));
  if (!found) throw new Error(`no \`${token}\` in this set`);
  return found.slice(token.length + 1).trim();
}

/**
 * #93 — the accent stays readable, whoever retunes it.
 *
 * The table in `tokens.css` is the record; this is the constraint.
 *
 *   - `--color-on-accent` on `--color-accent` is 4.5:1: the primary button's
 *     label is text.
 *   - `--color-accent` against every surface is 3:1 (WCAG 1.4.11): it is the
 *     fill of a toggle, a selected segment and a chart line, which are
 *     graphical objects. Links do not read it, so it is not held to 4.5:1.
 *   - `--color-accent-ink` is 4.5:1 on every surface, and on the soft tint
 *     laid over each: it is the colour of links and of selected rows' text.
 *
 * FEAT-20260911-001 found no dark accent that takes white text and is also a
 * 4.5:1 link. Both gates are kept; they no longer fall on the same colour.
 */
describe('the accent clears its contrast gates in both themes (#93)', () => {
  const SURFACES = ['--color-ground', '--color-surface', '--color-raised', '--color-paper'];
  const SETS = [
    ['dark', DARK],
    ['light', declarations(SYSTEM)],
    ['light (explicit)', declarations(EXPLICIT)],
  ] as const;

  test.each(SETS)('%s: the label on the accent is readable', (_n, decls) => {
    expect(
      contrast(value(decls, '--color-on-accent'), value(decls, '--color-accent')),
    ).toBeGreaterThanOrEqual(4.5);
  });

  test.each(SETS)('%s: the accent fill can be seen on every surface', (_n, decls) => {
    const accent = value(decls, '--color-accent');
    for (const surface of SURFACES) {
      expect({ surface, ok: contrast(accent, value(decls, surface)) >= 3 }).toEqual({
        surface,
        ok: true,
      });
    }
  });

  test.each(SETS)('%s: accent ink reads on every surface and on the tint over it', (_n, decls) => {
    const ink = value(decls, '--color-accent-ink');
    const soft = raw(decls, '--color-accent-soft');
    for (const surface of SURFACES) {
      const under = value(decls, surface);
      expect({ surface, ok: contrast(ink, under) >= 4.5 }).toEqual({ surface, ok: true });
      expect({ surface, tinted: contrast(ink, over(soft, under)) >= 4.5 }).toEqual({
        surface,
        tinted: true,
      });
    }
  });

  test.each(SETS)('%s: the focus ring can be seen on every surface', (_n, decls) => {
    const focus = value(decls, '--color-focus');
    for (const surface of SURFACES) {
      expect(contrast(focus, value(decls, surface))).toBeGreaterThanOrEqual(3);
    }
  });
});

/**
 * #110 — the accent axis, `data-accent="<preset>"`, resolved rather than read.
 *
 * Every assertion above reads one block at a time. A preset is only correct
 * as a *cascade*: the plain block has to lose to its own light pair, win over
 * the desk blocks, and reach nothing when the attribute is absent — and all
 * of that is source order between blocks of equal weight, which no single
 * block can show. So this resolves the file the way a browser would for a
 * given set of attributes: every rule whose conditions hold, in source order,
 * last declaration wins. All the selectors here weigh (0,1,0) (`@theme`
 * emits `:root`), so order is the whole cascade.
 *
 * Decision 4 of #110 asked that "the accent is undefined when `data-scale` is
 * unset" be rewritten, not deleted. #93 had already made the accent global
 * (indigo, in every set), so "undefined" is no longer true of the no-attribute
 * page and cannot be made true without undoing #93. What the test still
 * proves is the part that protects an application: with neither attribute
 * set, no preset value reaches it — the accent is the base set's to the
 * digit.
 */

type Attrs = {
  theme?: 'light' | 'dark';
  scale?: 'desk';
  accent?: string;
  profile?: 'workspace';
  prefersLight: boolean;
  coarse?: boolean;
};

/** Each `@media` this file uses, and when it holds. A new one fails loudly. */
const MEDIA: Record<string, (a: Attrs) => boolean> = {
  '@media (prefers-color-scheme: light)': (a) => a.prefersLight,
  // #168 — the workspace profile's touch sizes. A fine pointer unless asked.
  '@media (pointer: coarse)': (a) => a.coarse === true,
};

/** `:root:where(...)`'s conditions, as `[data-x="y"]` and `:not([data-x="y"])`. */
function matches(selector: string, a: Attrs): boolean {
  if (selector === '@theme static' || selector === ':root') return true;
  const where = /^:root:where\((.*)\)$/.exec(selector);
  if (!where) throw new Error(`the resolver does not know \`${selector}\``);
  const attrs: Record<string, string | undefined> = {
    'data-theme': a.theme,
    'data-scale': a.scale,
    'data-accent': a.accent,
    'data-profile': a.profile,
  };
  for (const m of where[1].matchAll(/:not\(\[([a-z-]+)="([^"]+)"\]\)/g)) {
    if (attrs[m[1]] === m[2]) return false;
  }
  const rest = where[1].replace(/:not\(\[[^\]]+\]\)/g, '');
  for (const m of rest.matchAll(/\[([a-z-]+)="([^"]+)"\]/g)) {
    if (attrs[m[1]] !== m[2]) return false;
  }
  return true;
}

type Rule = { selector: string; media?: string; body: string };

/** Every innermost rule in `tokens.css`, in source order, with its `@media`. */
const RULES: Rule[] = (() => {
  const out: Rule[] = [];
  const open: { at: number; head: string }[] = [];
  for (let i = 0; i < TOKENS.length; i++) {
    if (TOKENS[i] === '{') {
      const before = TOKENS.slice(0, i);
      const from = Math.max(
        before.lastIndexOf('{'),
        before.lastIndexOf('}'),
        before.lastIndexOf(';'),
      );
      open.push({ at: i, head: before.slice(from + 1).trim() });
    } else if (TOKENS[i] === '}') {
      const rule = open.pop();
      if (!rule) throw new Error('unbalanced braces in tokens.css');
      const body = TOKENS.slice(rule.at + 1, i);
      if (body.includes('{')) continue;
      out.push({ selector: rule.head, media: open.at(-1)?.head, body });
    }
  }
  return out;
})();

const LIGHT_SELECTORS = [
  ':root:where(:not([data-theme="dark"]))',
  ':root:where([data-theme="light"])',
];

function resolve(a: Attrs): string[] {
  const live = new Map<string, string>();
  for (const rule of RULES) {
    if (rule.media) {
      const holds = MEDIA[rule.media];
      if (!holds) throw new Error(`the resolver does not know \`${rule.media}\``);
      if (!holds(a)) continue;
    }
    if (!matches(rule.selector, a)) continue;
    for (const d of declarations(rule.body)) {
      const at = d.indexOf(':');
      live.set(d.slice(0, at), d.slice(at + 1).trim());
    }
  }
  return [...live].map(([k, v]) => `${k}: ${v}`);
}

/** What a preset re-values: the accent family, and the ring that takes it. */
const PRESET_TOKENS = [...ACCENT, '--color-focus'];

const PRESETS = [
  ...new Set(
    RULES.flatMap((r) =>
      [...r.selector.matchAll(/\[data-accent="([^"]+)"\]/g)].map((m) => m[1]),
    ),
  ),
];

type Lighting = Omit<Attrs, 'scale' | 'accent'>;

/** The four ways a page can be lit: unset in either OS mode, and each toggle. */
const LIGHTING: [string, Lighting][] = [
  ['dark (no attribute, dark OS)', { prefersLight: false }],
  ['light (no attribute, light OS)', { prefersLight: true }],
  ['dark (explicit, light OS)', { theme: 'dark', prefersLight: true }],
  ['light (explicit, dark OS)', { theme: 'light', prefersLight: false }],
];

const isLight = (l: Lighting) =>
  l.theme === 'light' || (l.theme === undefined && l.prefersLight);

const pick = (decls: string[], names: string[]) =>
  Object.fromEntries(names.map((n) => [n, raw(decls, n)]));

describe('the accent axis (#110)', () => {
  test('the resolver sees the file: the plain page is the base set', () => {
    // A resolver that silently matched nothing would pass every assertion
    // below by agreeing with itself.
    expect(pick(resolve({ prefersLight: false }), PRESET_TOKENS)).toEqual(
      pick(DARK, PRESET_TOKENS),
    );
    expect(pick(resolve({ prefersLight: true }), PRESET_TOKENS)).toEqual(
      pick(declarations(SYSTEM), PRESET_TOKENS),
    );
  });

  test('amber is a preset', () => {
    expect(PRESETS).toContain('amber');
  });

  test.each(LIGHTING)(
    '%s: with neither data-scale="desk" nor data-accent set, no preset reaches the accent',
    (_n, lighting) => {
      const base = isLight(lighting) ? declarations(SYSTEM) : DARK;
      const page = resolve(lighting);
      expect(pick(page, PRESET_TOKENS)).toEqual(pick(base, PRESET_TOKENS));
      for (const preset of PRESETS) {
        const theirs = Object.values(
          pick(resolve({ ...lighting, accent: preset }), ACCENT),
        );
        for (const token of ACCENT) expect(theirs).not.toContain(raw(page, token));
      }
    },
  );

  test.each(PRESETS)(
    '%s re-values exactly the accent family and the ring, in three blocks',
    (preset) => {
      const blocks = RULES.filter((r) =>
        r.selector.includes(`[data-accent="${preset}"]`),
      );
      // The plain block and the light pair, the shape the desk uses.
      expect(blocks).toHaveLength(3);
      for (const b of blocks) {
        expect(
          declarations(b.body)
            .map((d) => d.split(':')[0])
            .sort(),
        ).toEqual([...PRESET_TOKENS].sort());
      }
      for (const token of PRESET_TOKENS) expect(Object.keys(LIVE)).toContain(token);
    },
  );

  test.each(PRESETS)('%s: its two light blocks are the same block twice', (preset) => {
    const light = RULES.filter(
      (r) =>
        r.selector.includes(`[data-accent="${preset}"]`) &&
        r.selector.includes('data-theme'),
    );
    expect(light).toHaveLength(2);
    expect(declarations(light[0].body)).toEqual(declarations(light[1].body));
  });

  test('every preset block comes after the desk blocks, which is what makes it win', () => {
    const lastDesk = TOKENS.lastIndexOf('[data-scale="desk"]');
    expect(lastDesk).toBeGreaterThan(0);
    expect(TOKENS.indexOf('[data-accent=')).toBeGreaterThan(lastDesk);
  });

  const GATED = PRESETS.flatMap((preset) =>
    LIGHTING.map(
      ([n, l]) => [`${preset}, ${n}`, resolve({ ...l, accent: preset })] as const,
    ),
  );
  /** The opaque bands an accent is drawn on. The worst one decides. */
  const BANDS = [
    '--color-ground',
    '--color-canvas',
    '--color-surface',
    '--color-raised',
    '--color-paper',
  ];

  test.each(GATED)('%s: the accent clears 3:1 against the worst band', (_n, decls) => {
    const accent = value(decls, '--color-accent');
    const worst = Math.min(...BANDS.map((b) => contrast(accent, value(decls, b))));
    expect(worst).toBeGreaterThanOrEqual(3);
  });

  // The issue phrases this as `--color-accent-ink` on `--color-accent`, which
  // is what accent-ink meant under the desk before #93. Text on the fill is
  // `--color-on-accent` now, and that is the pair a label is drawn in.
  test.each(GATED)('%s: the label on the accent clears 4.5:1', (_n, decls) => {
    expect(
      contrast(value(decls, '--color-on-accent'), value(decls, '--color-accent')),
    ).toBeGreaterThanOrEqual(4.5);
  });

  test.each(GATED)(
    '%s: accent ink clears 4.5:1 on every band and on the tint over it',
    (_n, decls) => {
      const ink = value(decls, '--color-accent-ink');
      const soft = raw(decls, '--color-accent-soft');
      for (const band of BANDS) {
        const under = value(decls, band);
        expect({ band, ok: contrast(ink, under) >= 4.5 }).toEqual({ band, ok: true });
        expect({ band, tinted: contrast(ink, over(soft, under)) >= 4.5 }).toEqual({
          band,
          tinted: true,
        });
      }
    },
  );

  test.each(GATED)('%s: the focus ring clears 3:1 on every band', (_n, decls) => {
    const focus = value(decls, '--color-focus');
    for (const band of BANDS) {
      expect({ band, ok: contrast(focus, value(decls, band)) >= 3 }).toEqual({
        band,
        ok: true,
      });
    }
  });

  test.each(LIGHTING)(
    '%s: with data-scale="desk" and data-accent="amber" both set, the accent is amber\'s and every desk token is unchanged',
    (_n, lighting) => {
      const both = resolve({ ...lighting, scale: 'desk', accent: 'amber' });
      const desk = resolve({ ...lighting, scale: 'desk' });
      const amber = resolve({ ...lighting, accent: 'amber' });
      expect(pick(both, PRESET_TOKENS)).toEqual(pick(amber, PRESET_TOKENS));
      const rest = desk
        .map((d) => d.split(':')[0])
        .filter((n) => !PRESET_TOKENS.includes(n));
      expect(rest.length).toBeGreaterThan(30);
      expect(pick(both, rest)).toEqual(pick(desk, rest));
      // The desk really is in effect, and amber really differs from the base,
      // so neither comparison above is vacuous.
      expect(raw(both, '--size-row')).toBe('32px');
      expect(raw(both, '--color-accent')).not.toBe(raw(desk, '--color-accent'));
    },
  );
});

/**
 * #94 — `info` is text: a status pill's label, on its own tint. It is held to
 * 4.5:1 on every surface and on `info-soft` laid over each, in every set, and
 * it is never the accent — a waiting status that looked selected would mean
 * both.
 */
describe('the info tone reads, and is not the accent (#94)', () => {
  const SURFACES = ['--color-ground', '--color-surface', '--color-raised', '--color-paper'];
  const SETS = [
    ['dark', DARK],
    ['light', declarations(SYSTEM)],
    ['light (explicit)', declarations(EXPLICIT)],
  ] as const;

  test.each(SETS)('%s: info reads on every surface and on its tint over it', (_n, decls) => {
    const info = value(decls, '--color-info');
    const soft = raw(decls, '--color-info-soft');
    for (const surface of SURFACES) {
      const under = value(decls, surface);
      expect({ surface, ok: contrast(info, under) >= 4.5 }).toEqual({ surface, ok: true });
      expect({ surface, tinted: contrast(info, over(soft, under)) >= 4.5 }).toEqual({
        surface,
        tinted: true,
      });
    }
  });

  test.each(SETS)('%s: info is its own colour, not the accent', (_n, decls) => {
    expect(value(decls, '--color-info')).not.toBe(value(decls, '--color-accent'));
    expect(value(decls, '--color-info')).not.toBe(value(decls, '--color-accent-ink'));
  });
});

/**
 * FEAT-20260919-618 — the third rung flattens with the other two, and the
 * material stays one box.
 *
 * `material.css` reads twenty-one `--glass-*` tokens and switches the material
 * off by overriding a handful of them in three places — the reduced-transparency
 * query, `data-material="flat"`, and the `@supports` fallback. A token the
 * utilities read that one of those blocks forgets is a layer that survives
 * onto the flat rung: a rim on an opaque panel, or a translucent clear rung on
 * a browser with no `backdrop-filter`. The flat rung is the accessibility
 * route, so this is asserted rather than reviewed.
 *
 * The second block holds the shape the plan argued for: no pseudo-element and
 * no blend mode in the material. `.lit` owns `::before` and `Button` owns
 * `::after`; a `glass::before` here would silently fight one of them.
 */
const MATERIAL = readFileSync(join(SRC, 'material.css'), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  ' ',
);

/** The body of every rule in `material.css` whose selector contains `marker`. */
function materialBlocks(marker: string): string[] {
  const out: string[] = [];
  let from = 0;
  for (;;) {
    const at = MATERIAL.indexOf(marker, from);
    if (at < 0) return out;
    const open = MATERIAL.indexOf('{', at);
    let depth = 0;
    for (let i = open; i < MATERIAL.length; i++) {
      if (MATERIAL[i] === '{') depth++;
      else if (MATERIAL[i] === '}' && --depth === 0) {
        out.push(MATERIAL.slice(open + 1, i));
        from = i;
        break;
      }
    }
  }
}

/** What the flat rung must do to every token that draws a layer. */
const FLATTENED: Record<string, string> = {
  '--glass-scrim': 'var(--color-raised)',
  '--glass-scrim-strong': 'var(--color-raised)',
  '--glass-scrim-clear': 'var(--color-raised)',
  '--glass-sheen': 'transparent',
  '--glass-sheen-clear': 'transparent',
  '--glass-rim': 'transparent',
  '--glass-rim-shade': 'transparent',
  '--glass-rim-strong': 'transparent',
  '--glass-rim-shade-strong': 'transparent',
  '--glass-meniscus': 'transparent',
  '--glass-refract': 'transparent',
  '--glass-filter': 'none',
  '--glass-filter-strong': 'none',
};

/** The `@supports` fallback keeps the filter declarations (an unsupported
 *  `backdrop-filter` is ignored anyway) and the sheens (an opaque panel with a
 *  6% film on it is still an opaque panel, and that is how it has always
 *  rendered there); it flattens the scrims and the four optical layers. */
const FLATTENED_WITHOUT_FILTER = Object.fromEntries(
  Object.entries(FLATTENED).filter(
    ([token]) => !/^--glass-(filter|sheen)/.test(token),
  ),
);

describe('the flat rung resolves every rung to an opaque surface', () => {
  test.each([
    ['prefers-reduced-transparency', '@media (prefers-reduced-transparency: reduce)', FLATTENED],
    ['data-material="flat"', ':root[data-material="flat"] {', FLATTENED],
    ['no backdrop-filter', '@supports not (', FLATTENED_WITHOUT_FILTER],
  ])('%s flattens every layer the utilities draw', (_n, marker, expected) => {
    // The first block under each marker is the token override; the `.lit`
    // hiding under the same media query is a second block and is not this.
    const body = materialBlocks(marker)[0];
    expect(body).toBeDefined();
    for (const [token, value] of Object.entries(expected)) {
      expect(body).toContain(`${token}: ${value};`);
    }
  });

  test('the three utilities are declared, and read only tokens the flat rung covers', () => {
    for (const utility of ['glass', 'glass-strong', 'glass-clear']) {
      const body = materialBlocks(`@utility ${utility} {`)[0];
      expect(body).toBeDefined();
      const read = [...body.matchAll(/var\((--glass-[a-z-]+)\)/g)].map((m) => m[1]);
      expect(read.length).toBeGreaterThan(5);
      for (const token of read) {
        // The edge and the specular survive onto the flat rung on purpose: the
        // opaque panel keeps its hairline. Shadows are colours the rung keeps
        // too — an opaque panel still floats. Everything else must flatten.
        if (/^--glass-(edge|spec|shadow(-strong|-clear)?)$/.test(token)) continue;
        expect(Object.keys(FLATTENED)).toContain(token);
      }
    }
  });
});

/**
 * #93 — the content surface and the canvas follow the material's rules.
 *
 * `surface-content` reads tokens only, and the flat rung makes it opaque. The
 * canvas is part of the material: whoever has switched the material off,
 * through the OS, the attribute or forced colours, gets the flat ground and
 * no gradient. And it never costs a filter pass or an animation.
 */
describe('the content surface and the canvas (#93)', () => {
  test('`surface-content` reads the content token, a hairline and nothing literal', () => {
    const body = materialBlocks('@utility surface-content {')[0];
    expect(body).toContain('background: var(--color-content);');
    expect(body).toContain('border: 1px solid var(--color-line);');
    expect(body).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(/i);
    expect(body).not.toContain('backdrop-filter');
  });

  test.each([
    ['prefers-reduced-transparency', '@media (prefers-reduced-transparency: reduce)'],
    ['data-material="flat"', ':root[data-material="flat"] {'],
  ])('%s makes the content surface opaque paper', (_n, marker) => {
    expect(materialBlocks(marker)[0]).toContain('--color-content: var(--color-paper);');
  });

  const canvas = materialBlocks('.canvas {')[0];

  test('the canvas is a fixed, inert layer behind the app', () => {
    expect(canvas).toContain('position: fixed;');
    expect(canvas).toContain('z-index: -1;');
    expect(canvas).toContain('pointer-events: none;');
  });

  test('it paints the accent at `--canvas-glow`, with no filter and no animation', () => {
    expect(canvas.match(/radial-gradient\(/g)).toHaveLength(3);
    expect(canvas.match(/var\(--canvas-glow\)/g)).toHaveLength(3);
    expect(canvas).not.toMatch(/filter|animation|transition/);
  });

  test('it is switched off wherever the material is', () => {
    expect(MATERIAL).toMatch(
      /@media \(prefers-reduced-transparency: reduce\) \{\s*\.lit::before,\s*\.canvas \{\s*display: none;/,
    );
    expect(MATERIAL).toContain(':root[data-material="flat"] .canvas');
    expect(MATERIAL).toMatch(/@media \(forced-colors: active\) \{\s*\.canvas \{\s*display: none;/);
  });

  test('the glow is set in both themes, stronger in dark', () => {
    const glow = (body: string) =>
      Number(/--canvas-glow:\s*(\d+)%/.exec(body)?.[1] ?? Number.NaN);
    const dark = glow(block('@theme static'));
    expect(dark).toBeGreaterThanOrEqual(14);
    expect(dark).toBeLessThanOrEqual(20);
    for (const light of [glow(SYSTEM), glow(EXPLICIT)]) {
      expect(light).toBeGreaterThanOrEqual(6);
      expect(light).toBeLessThanOrEqual(10);
    }
  });
});

describe('the press: 0.97 on a control, 0.985 on a row (#93)', () => {
  test('`.lit` presses to `--press-scale` over `--dur-press`', () => {
    expect(materialBlocks('.lit:active {')[0]).toContain('transform: scale(var(--press-scale));');
    expect(materialBlocks('.lit {')[0]).toContain('transition: transform var(--dur-press)');
    expect(LIVE['--press-scale']).toBe('0.97');
    expect(LIVE['--dur-press']).toBe('100ms');
  });

  test('menu items, options and `press-row` keep the quieter press', () => {
    const at = MATERIAL.indexOf('.lit:is(');
    const rule = MATERIAL.slice(at, MATERIAL.indexOf('}', at));
    for (const row of ['[role="menuitem"]', '[role="option"]', '.press-row']) {
      expect(rule).toContain(row);
    }
    expect(rule).toContain('transform: scale(0.985);');
  });
});

describe('the material is one box', () => {
  test('no utility reaches for a pseudo-element or a blend mode', () => {
    for (const utility of ['glass', 'glass-strong', 'glass-clear']) {
      const body = materialBlocks(`@utility ${utility} {`)[0];
      expect(body).not.toMatch(/::(before|after)/);
      expect(body).not.toContain('mix-blend-mode');
      expect(body).not.toContain('background-blend-mode');
    }
    expect(MATERIAL).not.toContain('mix-blend-mode');
  });

  test('the pointer light still fades with opacity and nothing else', () => {
    const lit = materialBlocks('.lit::before {')[0];
    expect(lit).toContain('opacity: var(--lit, 0);');
    expect(lit).toMatch(/transition: opacity /);
  });
});

/**
 * BUG-20260919-626 — the rim scales with the surface, and only there.
 *
 * `glass-strong` is the rung that is always a large rectangle, so it is the one
 * whose straight run reads the quieter `-strong` pair while its corner glint
 * still reads `--glass-rim`. The discs and the header capsule were tuned on the
 * full-alpha pair and the issue's acceptance is that they do not move; a
 * `-strong` token leaking into `glass` or `glass-clear` would dim a crescent
 * that nobody complained about, and the full pair leaking back into the strong
 * run would be the hairline again. Both directions are held here.
 */
describe('the strong rung runs its rim quieter, and the other two do not', () => {
  const reads = (utility: string) =>
    [...materialBlocks(`@utility ${utility} {`)[0].matchAll(/var\((--glass-[a-z-]+)\)/g)].map(
      (m) => m[1],
    );

  test('`glass-strong` reads the `-strong` pair for its run and `--glass-rim` for its corner', () => {
    const strong = reads('glass-strong');
    expect(strong).toContain('--glass-rim-strong');
    expect(strong).toContain('--glass-rim-shade-strong');
    expect(strong).toContain('--glass-rim');
    expect(strong).toContain('--glass-rim-shade');
  });

  test.each(['glass', 'glass-clear'])('`%s` never reads the `-strong` pair', (utility) => {
    const read = reads(utility);
    expect(read).not.toContain('--glass-rim-strong');
    expect(read).not.toContain('--glass-rim-shade-strong');
    expect(read).toContain('--glass-rim');
  });

  test('the corner glint is a negative-spread inset, which is what keeps it off the straight run', () => {
    // offset o, spread −e: nothing on a straight edge, √2·o − e at the corner's
    // 45° point. e ≥ o is the invariant; e < o puts a faint line back on the run.
    const body = materialBlocks('@utility glass-strong {')[0];
    const glints = [...body.matchAll(/inset (-?\d+)px \1px \d+px (-\d+)px var\(--glass-rim(-shade)?\)/g)];
    expect(glints).toHaveLength(2);
    for (const [, offset, spread] of glints) {
      expect(Math.abs(Number(spread))).toBeGreaterThanOrEqual(Math.abs(Number(offset)));
    }
  });
});
