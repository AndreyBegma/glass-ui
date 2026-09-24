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
const DRIFT = readFileSync(join(SRC, 'primitives/motion-drift.css'), 'utf8');
const SCROLL = readFileSync(join(SRC, 'primitives/motion-scroll.css'), 'utf8');
const BASE = readFileSync(join(SRC, 'base.css'), 'utf8');

/** A rule quoted in a comment is not a rule anybody renders. */
function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, ' ');
}

const RULES = stripComments(MOTION);
const DRIFT_RULES = stripComments(DRIFT);
const SCROLL_RULES = stripComments(SCROLL);
/** All three files, for the rules that hold across the whole vocabulary. */
const ALL = `${RULES}\n${DRIFT_RULES}\n${SCROLL_RULES}`;

/** The body of the first block opened by `marker`, braces matched. */
function blockAfter(css: string, marker: string): string {
  const at = css.indexOf(marker);
  if (at < 0) throw new Error(`motion CSS no longer contains \`${marker}\``);
  const open = css.indexOf('{', at);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}' && --depth === 0) return css.slice(open + 1, i);
  }
  throw new Error(`unbalanced braces after \`${marker}\``);
}

const NO_PREFERENCE = '@media (prefers-reduced-motion: no-preference)';
const GATED = blockAfter(RULES, NO_PREFERENCE);

/** A keyframe's body, from its name to its closing brace. */
function keyframes(name: string): string {
  const at = ALL.indexOf(`@keyframes ${name} {`);
  if (at < 0) throw new Error(`@keyframes ${name} is not declared`);
  return ALL.slice(at, ALL.indexOf('\n}', at));
}

/** A rule's declarations, by its exact selector. */
function rule(css: string, selector: string): string {
  const at = css.indexOf(`${selector} {`);
  if (at < 0) throw new Error(`\`${selector}\` is not declared`);
  return css.slice(at, css.indexOf('}', at));
}

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
    'lunaDriftA',
    'lunaDriftB',
    'lunaDriftC',
    'lunaDriftD',
    'lunaDriftE',
    'lunaDriftF',
    'lunaBreathe',
    'lunaFillIn',
    'lunaSheen',
    'lunaBump',
    'lunaDriftK',
    'lunaScrollShift',
    'lunaScrollFade',
    'lunaWindowPan',
  ])('@keyframes %s', (name) => {
    expect(ALL).toContain(`@keyframes ${name} {`);
  });

  test.each([
    '.luna-rise-in',
    '.luna-stagger',
    '.luna-img-in[data-loaded="false"]',
    '.luna-img-in[data-loaded="true"]',
    '.luna-focus-lift',
    '.luna-focus-lift:focus-visible',
    '.luna-fill-in',
    '.luna-sheen::after',
    '.luna-tilt',
    '.luna-tilt:focus-visible',
    '.luna-tilt-sheen',
    '.luna-parallax',
    '.luna-parallax-fade',
    '.luna-window',
  ])('%s', (selector) => {
    expect(ALL).toContain(`${selector} {`);
  });

  test('motion.css imports its two families first, so one import carries all three', () => {
    // An `@import` after any other rule is ignored by the browser, silently.
    expect(
      RULES.trimStart().startsWith(
        '@import "./motion-drift.css";\n@import "./motion-scroll.css";',
      ),
    ).toBe(true);
  });

  test('the ambient paths live in motion-drift.css and nothing else does', () => {
    const names = [...DRIFT_RULES.matchAll(/@keyframes (\w+)/g)].map(
      (m) => m[1],
    );
    expect(names.sort()).toEqual(
      [
        'lunaBreathe',
        ...'ABCDEFK'.split('').map((l) => `lunaDrift${l}`),
      ].sort(),
    );
    expect(RULES).not.toMatch(/@keyframes luna(Drift|Breathe)/);
    // Paths only: no class, no animation, nothing that applies them.
    expect(DRIFT_RULES.replace(/@keyframes[\s\S]*?\n\}/g, '').trim()).toBe('');
  });
});

describe('an entrance lands on the element, not on the keyframe', () => {
  // A `to` frame would pin a watched poster at opacity 1 and a pressed card
  // at `translateY(0)`; `from` alone interpolates to the computed values.
  test.each([
    'lunaRiseIn',
    'lunaDropIn',
    'lunaImgIn',
    'lunaFillIn',
  ])('%s has a from and no to', (name) => {
    const body = keyframes(name);
    expect(body).toContain('from {');
    expect(body).not.toContain('to {');
  });

  test('.luna-stagger fills backwards, never forwards', () => {
    expect(GATED).toMatch(/\.luna-stagger \{[^}]*animation:[^;]*\bbackwards\b/);
    expect(GATED).not.toMatch(
      /\.luna-stagger \{[^}]*animation:[^;]*\b(both|forwards)\b/,
    );
  });

  test('.luna-fill-in fills backwards, never forwards', () => {
    const body = rule(GATED, '.luna-fill-in');
    expect(body).toMatch(/animation:[^;]*\bbackwards\b/);
    expect(body).not.toMatch(/animation:[^;]*\b(both|forwards)\b/);
  });

  test('.luna-fill-in and .luna-stagger share the one stagger step', () => {
    // After both shorthands, which reset `animation-delay`; one rule, so
    // the step is still the file's only bare number.
    const shared = GATED.indexOf('.luna-stagger,\n  .luna-fill-in {');
    expect(shared).toBeGreaterThan(GATED.indexOf('.luna-fill-in {'));
    expect(GATED.slice(shared)).toMatch(/^[^}]*animation-delay:[^;]*30ms/);
  });

  test('.luna-rise-in rests with no transform', () => {
    // `translateY(0)` draws the same as `none` and is a permanent containing
    // block for every fixed descendant; only `none` is not.
    const at = RULES.indexOf('.luna-rise-in {');
    const body = RULES.slice(at, RULES.indexOf('}', at));
    expect(body).toContain('transform: none;');
  });
});

describe('a drift loops through identity', () => {
  // FEAT-20260916-609. An aurora path runs for tens of seconds and loops;
  // both ends at `none` means the seam lands on the element's own values and
  // an element the consumer has not animated rests with no transform. No
  // `animation` shorthand belongs beside them: the duration is the
  // consumer's, and a literal one here would be the second bare number.
  test.each([
    'lunaDriftA',
    'lunaDriftB',
    'lunaDriftC',
    'lunaDriftD',
    'lunaDriftE',
    'lunaDriftF',
    'lunaDriftK',
  ])('%s starts and ends at transform: none', (name) => {
    const body = keyframes(name);
    expect(body).toMatch(/0% \{\s*transform: none;/);
    expect(body).toMatch(/100% \{\s*transform: none;/);
    expect(body).not.toContain('opacity');
  });

  // FEAT-20260916-611. `E` and `F` are for a layer that fills the viewport:
  // a rotation or a scale below 1 would show the ground at a corner.
  test.each([
    'lunaDriftE',
    'lunaDriftF',
    'lunaDriftK',
  ])('%s neither rotates nor shrinks', (name) => {
    const body = keyframes(name);
    expect(body).not.toContain('rotate(');
    for (const [, scale] of body.matchAll(/scale\(([\d.]+)\)/g)) {
      expect(Number(scale)).toBeGreaterThanOrEqual(1);
    }
  });

  // FEAT-20260924-680. The Ken Burns runs behind a whole title page for
  // ninety seconds: 1.5% of travel is the most a full-bleed image can move
  // before the motion itself is what the eye follows.
  test('lunaDriftK travels at most 1.5% and grows at most to 1.06', () => {
    const body = keyframes('lunaDriftK');
    for (const [, x, y] of body.matchAll(
      /translate\((-?[\d.]+)%, (-?[\d.]+)%\)/g,
    )) {
      expect(Math.abs(Number(x))).toBeLessThanOrEqual(1.5);
      expect(Math.abs(Number(y))).toBeLessThanOrEqual(1.5);
    }
    for (const [, scale] of body.matchAll(/scale\(([\d.]+)\)/g)) {
      expect(Number(scale)).toBeLessThanOrEqual(1.06);
    }
  });

  test('no drift is applied by this file', () => {
    expect(ALL).not.toMatch(/animation(?:-name)?:[^;]*lunaDrift/);
  });
});

describe('a bump is a closed path', () => {
  // FEAT-20260924-680. Replayable, and nothing left behind when it ends.
  test('lunaBump starts and ends at transform: none, and only scales', () => {
    const body = keyframes('lunaBump');
    expect(body).toMatch(/from \{\s*transform: none;/);
    expect(body).toMatch(/to \{\s*transform: none;/);
    expect(body).not.toContain('opacity');
    expect(body).not.toMatch(/translate|rotate/);
  });

  test('no bump is applied by this file', () => {
    expect(ALL).not.toMatch(/animation(?:-name)?:[^;]*lunaBump/);
  });
});

describe('a one-shot with a `to` ends invisible', () => {
  // `lunaPulseOut` was the one keyframe with a `to`; FEAT-20260924-680 lets
  // `lunaSheen` join it on the same terms — whatever it ends on cannot be
  // seen, so nothing is left drawn when the element is not reset.
  test.each(['lunaPulseOut', 'lunaSheen'])('%s ends at opacity: 0', (name) => {
    expect(keyframes(name)).toMatch(/to \{\s*opacity: 0;/);
  });

  test('lunaSheen also starts invisible', () => {
    expect(keyframes('lunaSheen')).toMatch(/from \{\s*opacity: 0;/);
  });

  test('the sheen band rests invisible once it has crossed', () => {
    expect(rule(GATED, '.luna-sheen::after')).toContain('opacity: 0;');
  });
});

describe('the tilt rests flat', () => {
  // FEAT-20260924-680. A card root carries `.luna-tilt` for its whole life;
  // a transform written on the class itself would make every card a
  // containing block while nobody is looking at it.
  test('.luna-tilt writes no transform of its own', () => {
    expect(rule(GATED, '.luna-tilt')).not.toMatch(/(^|\s)transform:/);
  });

  test('the lean is written only on focus and on a fine-pointer hover', () => {
    const leans = [
      ...ALL.matchAll(/([^{}]+)\{[^{}]*transform: var\(--tilt-lean\)/g),
    ].map((m) => m[1].trim());
    expect(leans.sort()).toEqual([
      '.luna-tilt:focus-visible',
      '.luna-tilt:hover',
    ]);
    const hover = blockAfter(
      GATED,
      '@media (hover: hover) and (pointer: fine)',
    );
    expect(hover).toContain('.luna-tilt:hover {');
  });

  test('the angle and the depth are the tokens', () => {
    const lean = rule(GATED, '.luna-tilt');
    expect(lean).toContain('perspective(var(--tilt-depth))');
    expect(lean.match(/\* var\(--tilt-angle\)/g)?.length).toBe(2);
  });

  test('the highlight moves by transform, never by background position', () => {
    expect(rule(GATED, '.luna-tilt-sheen')).not.toContain(
      'background-position',
    );
    expect(ALL).not.toMatch(/transition:[^;]*background/);
  });

  test('no colour is mixed — the Samsung set has no color-mix()', () => {
    expect(ALL).not.toContain('color-mix(');
  });
});

describe('a breath rests at full opacity', () => {
  // FEAT-20260916-611. Opacity only, so it can run beside a drift on the
  // same element; 1 at both ends, so nothing is left dimmed when it stops.
  test('lunaBreathe starts and ends at opacity: 1, and only breathes', () => {
    const body = keyframes('lunaBreathe');
    expect(body).toMatch(/from \{\s*opacity: 1;/);
    expect(body).toMatch(/to \{\s*opacity: 1;/);
    expect(body).not.toContain('transform');
  });

  test('no breath is applied by this file', () => {
    expect(ALL).not.toMatch(/animation(?:-name)?:[^;]*lunaBreathe/);
  });
});

describe('everything that moves is gated on reduced motion', () => {
  test.each([
    '.luna-stagger',
    '.luna-img-in[data-loaded="false"]',
    '.luna-focus-lift',
    '.luna-fill-in',
    '.luna-sheen::after',
    '.luna-tilt',
    '.luna-tilt:focus-visible',
    '.luna-tilt-sheen',
  ])('%s is inside prefers-reduced-motion: no-preference', (selector) => {
    expect(GATED).toContain(`${selector} {`);
    // And declared nowhere outside it.
    const outside = RULES.replace(GATED, '');
    expect(outside).not.toContain(`${selector} {`);
  });
});

describe('durations and curves are tokens', () => {
  test('no curve is written by hand', () => {
    expect(ALL).not.toContain('cubic-bezier(');
  });

  test('the only literal millisecond value is the stagger step', () => {
    const literals = ALL.match(/\b\d+(?:\.\d+)?m?s\b/g) ?? [];
    expect(literals).toEqual(['30ms']);
  });

  test('every animation and transition names a duration token', () => {
    const uses = ALL.match(/(?:animation|transition):[^;]+;/g) ?? [];
    expect(uses.length).toBeGreaterThan(0);
    for (const use of uses) {
      expect(use).toMatch(/var\(--dur-(fast|base|sheet|scene)\)/);
    }
  });

  test('the scroll-linked family is bound to a timeline, not a clock', () => {
    expect(SCROLL_RULES).not.toMatch(/var\(--dur-/);
    expect(SCROLL_RULES).not.toMatch(/\b\d+(?:\.\d+)?m?s\b/);
  });
});

/**
 * FEAT-20260924-680 — rule 6, the scroll-linked family.
 */
describe('the scroll-linked family moves only where a timeline can drive it', () => {
  const SUPPORTED = blockAfter(
    SCROLL_RULES,
    '@supports (animation-timeline: view())',
  );
  const DRIVEN = blockAfter(SUPPORTED, NO_PREFERENCE);
  const CLASSES = ['.luna-parallax', '.luna-parallax-fade', '.luna-window'];

  test.each(
    CLASSES,
  )('%s is inside @supports and no-preference, and nowhere else', (selector) => {
    expect(DRIVEN).toContain(`${selector} {`);
    const outside = ALL.replace(DRIVEN, '');
    expect(outside).not.toContain(`${selector} {`);
  });

  test.each(
    CLASSES,
  )('%s has a timeline, a range and no duration of its own', (selector) => {
    const body = rule(DRIVEN, selector);
    expect(body).toContain('animation-duration: auto;');
    expect(body).toMatch(/animation-timeline: [^;]+;/);
    expect(body).toMatch(/animation-range: [^;]+;/);
    expect(body).toContain('animation-fill-mode: both;');
    // The shorthand would reset the timeline to `auto`.
    expect(body).not.toMatch(/(^|\s)animation:/);
  });

  test('a header layer is at the start of its range at scroll 0', () => {
    for (const selector of ['.luna-parallax', '.luna-parallax-fade']) {
      expect(rule(DRIVEN, selector)).toContain(
        'animation-range: var(--parallax-range, exit);',
      );
    }
  });

  test('no scroll keyframe is applied outside the driven block', () => {
    const outside = ALL.replace(DRIVEN, '');
    expect(outside).not.toMatch(/animation(?:-name)?:[^;]*luna(Scroll|Window)/);
  });

  test('the scroll keyframes live in motion-scroll.css and are named for it', () => {
    const names = [...SCROLL_RULES.matchAll(/@keyframes (\w+)/g)].map(
      (m) => m[1],
    );
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) expect(name).toMatch(/^luna(Scroll|Window)/);
    expect(RULES).not.toMatch(/@keyframes luna(Scroll|Window)/);
  });

  test('every variable has an inert default', () => {
    for (const name of [
      '--parallax-shift',
      '--parallax-scale',
      '--window-pan',
    ]) {
      for (const [use] of SCROLL_RULES.matchAll(
        new RegExp(`var\\(${name}[^)]*\\)`, 'g'),
      )) {
        expect(use).toContain(',');
      }
    }
  });
});

describe('keyframes are declared in one file', () => {
  test('base.css no longer declares fadeIn', () => {
    expect(stripComments(BASE)).not.toContain('@keyframes');
  });

  test('only opacity and transform are animated', () => {
    const frames = ALL.match(/@keyframes[\s\S]*?\n\}/g) ?? [];
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
