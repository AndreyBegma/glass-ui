import { describe, expect, test } from 'bun:test';
import { block as blockOf, contrast, declarations, tokenRules, value } from './read';

/**
 * FEAT-20260911-001 — the desk profile, held to exactly what it said it does.
 *
 * Moved out of `tokens.spec.ts` unchanged by FEAT-20260930-004 (u7-glass),
 * when that file passed the 500-line ceiling. The base set's own guards — the
 * palette sentinel, both themes, the page tokens and the Luna baseline — stay
 * there; everything that is about `data-scale="desk"` is here, next to
 * `desk.css`.
 *
 * The guard over there says the base set has not moved. This says the desk
 * rung has not *grown* — which is the other half, and the one that rots
 * quietly. A fourth axis is an inviting place to put things: it is opt-in, no
 * shipped consumer sets it, and nothing downstream breaks when it gains a
 * token. That is exactly why the list is asserted rather than reviewed. An
 * override added here is a value that exists in one profile and not the other,
 * and the next person to read `tokens.css` has no way to tell an intended
 * asymmetry from an accident unless every intended one is written down.
 *
 * Sixteen overrides and three definitions, and the split matters: an override
 * has a base value to fall back to, a definition does not. `--color-accent`
 * resolving to nothing outside the desk profile is the point of decision 6,
 * not a gap in it.
 */

const TOKENS = tokenRules();
const block = (marker: string) => blockOf(TOKENS, marker);

const DARK = declarations(block('@theme static'));
const SYSTEM = block(':root:where(:not([data-theme="dark"]))');
const EXPLICIT = block(':root:where([data-theme="light"])');
const BASE_NAMES = DARK.map((d) => d.split(':')[0]);

/** Tokens the desk rung re-values. Each already exists in `@theme static`. */
const DESK_OVERRIDES = [
  '--radius-control', '--radius-surface', '--radius-sheet',
  '--dur-fast', '--dur-base', '--dur-sheet',
  '--color-line', '--color-line-strong', '--color-hover',
  '--size-row', '--size-control', '--size-control-sm', '--size-field', '--size-nav',
  // FEAT-20260930-004 — `Chip md`, at `control-sm`'s desk height.
  '--size-chip',
  // BUG-20260923-019 — raised to 4.5:1; the gate is `desk.spec.ts`.
  '--color-ink-3',
];

/** Tokens that exist *only* under the desk profile. */
const DESK_ONLY = ['--color-accent', '--color-accent-ink', '--color-accent-soft'];

/** The theme-dependent half, repeated in the two light-desk blocks. A radius
 *  and a row height do not know what colour the page is, so they are not.
 *  `--color-card-line` is here and not in the dark desk rung because dark's
 *  card edge *is* `--color-line`, by reference, and follows it for free. */
const DESK_LIGHT = [
  '--color-line', '--color-line-strong', '--color-hover', '--color-ink-3',
  '--color-card-line', ...DESK_ONLY,
];

const DESK = block(':root:where([data-scale="desk"])');
const DESK_SYSTEM = block(':root:where(:not([data-theme="dark"])[data-scale="desk"])');
const DESK_EXPLICIT = block(':root:where([data-theme="light"][data-scale="desk"])');

describe('the desk profile changes exactly what it says it changes', () => {
  test('the desk rung overrides these tokens and no others', () => {
    const names = declarations(DESK).map((d) => d.split(':')[0]);
    expect(names.filter((n) => !DESK_ONLY.includes(n)).sort()).toEqual(
      [...DESK_OVERRIDES].sort(),
    );
  });

  test('every token it overrides exists in the base set to be overridden', () => {
    // An "override" of a token that is not in `@theme static` is a definition
    // wearing an override's name, and it would resolve to nothing outside the
    // desk profile without anybody having decided that.
    for (const token of DESK_OVERRIDES) {
      expect(BASE_NAMES).toContain(token);
    }
  });

  test('it defines the three accent tokens', () => {
    const names = declarations(DESK).map((d) => d.split(':')[0]);
    expect(names.filter((n) => DESK_ONLY.includes(n)).sort()).toEqual(
      [...DESK_ONLY].sort(),
    );
  });

  test('`--size-tap` is deliberately not among them', () => {
    // A hit area is not a visual size and a finger is the same size at either
    // distance. Asserted rather than tolerated, so that somebody who trips
    // over the omission cannot quietly satisfy it by adding the line.
    expect(BASE_NAMES).toContain('--size-tap');
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
   * Since the split the order is the order of `tokens.css`'s three `@import`s,
   * and `readTokens()` inlines them in that order, so this still reads it.
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
 * FEAT-20260911-001 — the accent exists in the desk profile and nowhere else.
 *
 * `E-92` retired the accent and decision 6 does not un-retire it; it grants one
 * back to a profile that has no artwork to take colour from. Outside that
 * profile `--color-accent` must resolve to *nothing*, so a component that
 * reaches for it in Luna Watch renders visibly wrong rather than quietly
 * falling back to something plausible.
 *
 * That only holds while no other block declares it, which is one careless line
 * away at any time and is not visible in a diff that only shows the line.
 */
describe('the accent is undefined when `data-scale` is unset', () => {
  test.each(DESK_ONLY)('%s is not in the base set', (token) => {
    expect(BASE_NAMES).not.toContain(token);
  });

  test.each(DESK_ONLY)('%s is not in either light block', (token) => {
    expect(declarations(SYSTEM).map((d) => d.split(':')[0])).not.toContain(token);
    expect(declarations(EXPLICIT).map((d) => d.split(':')[0])).not.toContain(token);
  });

  test('no block outside the desk profile declares one', () => {
    // The three blocks above are the whole story only if they are the only
    // three. Counting is what catches a fourth appearing somewhere this file
    // does not name a selector for.
    for (const token of DESK_ONLY) {
      const everywhere = [...TOKENS.matchAll(new RegExp(`${token}\\s*:`, 'g'))];
      expect(everywhere).toHaveLength(3);
    }
  });
});

/**
 * FEAT-20260911-001 — the accent stays readable, whoever retunes it.
 *
 * The comment table in `desk.css` records what was sampled out of a browser
 * on 2026-09-11. A comment is a record, not a constraint: this is the
 * constraint, and it is written to survive somebody changing the hue — which
 * decision 6 expects, since the exact values were `[Unknown]` when the row was
 * specified and arrived by measurement.
 *
 * 4.5:1 on all three grounds because a link is body text, and 4.5:1 for the
 * ink because the primary action's label is too.
 *
 * Worth knowing before changing either value: in dark these two gates pull
 * against each other. White ink on the accent needs its luminance at or below
 * 0.1833 and 4.5:1 against `--color-raised` needs it at or above 0.2150, so
 * there is no dark accent of any hue that takes white text. That is why the
 * ink flips with the theme, and it is why this asserts the pair rather than
 * the accent alone.
 */
describe('the accent clears its contrast gate in both themes', () => {
  const GROUNDS = ['--color-ground', '--color-surface', '--color-raised'];

  test.each([
    ['dark', declarations(DESK), DARK],
    ['light', declarations(DESK_SYSTEM), declarations(SYSTEM)],
    ['light (explicit)', declarations(DESK_EXPLICIT), declarations(EXPLICIT)],
  ])('%s: the accent is readable on every ground', (_n, desk, theme) => {
    const accent = value(desk, '--color-accent');
    for (const ground of GROUNDS) {
      expect(contrast(accent, value(theme, ground))).toBeGreaterThanOrEqual(4.5);
    }
  });

  test.each([
    ['dark', declarations(DESK)],
    ['light', declarations(DESK_SYSTEM)],
    ['light (explicit)', declarations(DESK_EXPLICIT)],
  ])('%s: the accent ink is readable on the accent', (_n, desk) => {
    const ratio = contrast(
      value(desk, '--color-accent-ink'),
      value(desk, '--color-accent'),
    );
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});
