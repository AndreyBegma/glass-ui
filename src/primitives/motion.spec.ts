import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';

/**
 * FEAT-20260916-598 — the motion vocabulary, held to its contract.
 *
 * Source-level, like `base.spec.ts` and for the same reason: happy-dom does
 * not resolve a stylesheet's cascade, so a test that mounted an element and
 * read its computed `animation-name` would pass whether or not the rule
 * existed. What is asserted instead is what a reader of `motion.css` is
 * promised — that each name in the vocabulary is declared, that everything
 * that moves is gated on `prefers-reduced-motion`, that no duration or curve
 * is written by hand, and that no primitive has gone back to spelling the
 * curve out.
 */

const SRC = new URL('..', import.meta.url).pathname;
const MOTION = readFileSync(join(SRC, 'primitives/motion.css'), 'utf8');
const BASE = readFileSync(join(SRC, 'base.css'), 'utf8');

/** A rule quoted in a comment is not a rule anybody renders. */
function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, ' ');
}

const RULES = stripComments(MOTION);

/** The body of the media block that gates motion, braces matched. */
function reducedMotionBlock(): string {
  const marker = '@media (prefers-reduced-motion: no-preference)';
  const at = RULES.indexOf(marker);
  if (at < 0) throw new Error(`motion.css no longer contains \`${marker}\``);
  const open = RULES.indexOf('{', at);
  let depth = 0;
  for (let i = open; i < RULES.length; i++) {
    if (RULES[i] === '{') depth++;
    else if (RULES[i] === '}' && --depth === 0) return RULES.slice(open + 1, i);
  }
  throw new Error(`unbalanced braces after \`${marker}\``);
}

const GATED = reducedMotionBlock();

describe('the vocabulary is declared', () => {
  test.each([
    'lunaFadeIn',
    'lunaFadeOut',
    'lunaDialogIn',
    'lunaDialogOut',
    'lunaPopIn',
    'lunaPopOut',
    'lunaRiseIn',
    'lunaDropIn',
    'lunaImgIn',
    'lunaPulseOut',
  ])('@keyframes %s', (name) => {
    expect(RULES).toContain(`@keyframes ${name} {`);
  });

  test.each([
    '.luna-rise-in',
    '.luna-stagger',
    '.luna-img-in[data-loaded="false"]',
    '.luna-img-in[data-loaded="true"]',
    '.luna-focus-lift',
    '.luna-focus-lift:focus-visible',
  ])('%s', (selector) => {
    expect(RULES).toContain(`${selector} {`);
  });
});

describe('an entrance lands on the element, not on the keyframe', () => {
  // A `to` frame would pin a watched poster at opacity 1 and a pressed card
  // at `translateY(0)`; `from` alone interpolates to the computed values.
  test.each([
    'lunaRiseIn',
    'lunaDropIn',
    'lunaImgIn',
  ])('%s has a from and no to', (name) => {
    const at = RULES.indexOf(`@keyframes ${name} {`);
    const body = RULES.slice(at, RULES.indexOf('\n}', at));
    expect(body).toContain('from {');
    expect(body).not.toContain('to {');
  });

  test('.luna-stagger fills backwards, never forwards', () => {
    expect(GATED).toMatch(/\.luna-stagger \{[^}]*animation:[^;]*\bbackwards\b/);
    expect(GATED).not.toMatch(
      /\.luna-stagger \{[^}]*animation:[^;]*\b(both|forwards)\b/,
    );
  });

  test('.luna-rise-in rests with no transform', () => {
    // `translateY(0)` draws the same as `none` and is a permanent containing
    // block for every fixed descendant; only `none` is not.
    const at = RULES.indexOf('.luna-rise-in {');
    const body = RULES.slice(at, RULES.indexOf('}', at));
    expect(body).toContain('transform: none;');
  });
});

describe('everything that moves is gated on reduced motion', () => {
  test.each([
    '.luna-stagger',
    '.luna-img-in[data-loaded="false"]',
    '.luna-focus-lift',
  ])('%s is inside prefers-reduced-motion: no-preference', (selector) => {
    expect(GATED).toContain(`${selector} {`);
    // And declared nowhere outside it.
    const outside = RULES.replace(GATED, '');
    expect(outside).not.toContain(`${selector} {`);
  });
});

describe('durations and curves are tokens', () => {
  test('no curve is written by hand', () => {
    expect(RULES).not.toContain('cubic-bezier(');
  });

  test('the only literal millisecond value is the stagger step', () => {
    const literals = RULES.match(/\b\d+(?:\.\d+)?m?s\b/g) ?? [];
    expect(literals).toEqual(['30ms']);
  });

  test('every animation and transition names a duration token', () => {
    const uses = RULES.match(/(?:animation|transition):[^;]+;/g) ?? [];
    expect(uses.length).toBeGreaterThan(0);
    for (const use of uses) {
      expect(use).toMatch(/var\(--dur-(fast|base|sheet)\)/);
    }
  });
});

describe('keyframes are declared in one file', () => {
  test('base.css no longer declares fadeIn', () => {
    expect(stripComments(BASE)).not.toContain('@keyframes');
  });

  test('only opacity and transform are animated', () => {
    const frames = RULES.match(/@keyframes[\s\S]*?\n\}/g) ?? [];
    expect(frames.length).toBeGreaterThan(0);
    for (const frame of frames) {
      const properties = [...frame.matchAll(/^\s*([a-z-]+)\s*:/gm)].map(
        (m) => m[1],
      );
      expect(
        properties.every((p) => p === 'opacity' || p === 'transform'),
      ).toBe(true);
    }
  });
});

/**
 * The seven call sites that wrote `cubic-bezier(0.23,1,0.32,1)` by hand now
 * read `--ease-out-expo`. This is the guard against an eighth.
 */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return ['.ts', '.tsx'].includes(extname(full)) && !full.endsWith('.spec.ts')
      ? [full]
      : [];
  });
}

describe('no primitive spells a curve out', () => {
  test.each(
    sourceFiles(SRC).map((f) => [f.slice(SRC.length), f] as const),
  )('%s', (_name, path) => {
    expect(readFileSync(path, 'utf8')).not.toContain('cubic-bezier(');
  });
});
