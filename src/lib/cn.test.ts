import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cn, TYPE_SCALE } from './cn';
import { tv } from './tv';

/**
 * Issue 123 — tailwind-merge files unknown `text-*` classes under text colour,
 * so anything that merged a token type-scale size lost it the moment a colour
 * came later. Sizes and colours have to be orthogonal, and two sizes still
 * have to settle last-wins — through `cn` and through `tv` alike.
 *
 * (No `#` before the number in a test name: the palette guard in
 * `tokens.spec.ts` reads a string `#123` as a hex colour.)
 */
describe('cn', () => {
  test('a type-scale size survives a colour, either order', () => {
    expect(cn('px-2 text-body text-ink-2')).toBe('px-2 text-body text-ink-2');
    expect(cn('px-2 text-ink-2 text-body')).toBe('px-2 text-ink-2 text-body');
  });

  test('the size survives hover variants too', () => {
    expect(cn('text-body text-ink-2 hover:text-ink')).toBe(
      'text-body text-ink-2 hover:text-ink',
    );
  });

  test('two type-scale sizes still settle last-wins', () => {
    expect(cn('text-body text-heading')).toBe('text-heading');
    expect(cn('text-heading text-body')).toBe('text-body');
  });

  test('a core size and a token size override each other', () => {
    expect(cn('text-body text-sm')).toBe('text-sm');
    expect(cn('text-sm text-body')).toBe('text-body');
  });

  test('colours keep resolving last-wins', () => {
    expect(cn('text-ink-2 text-ink')).toBe('text-ink');
  });

  test('every step of the scale is registered', () => {
    for (const step of TYPE_SCALE) {
      expect(cn(`text-${step} text-ink`)).toBe(`text-${step} text-ink`);
    }
  });
});

describe('tv', () => {
  test('a base keeps its size next to its colour', () => {
    expect(tv({ base: 'min-w-0 text-body text-ink' })()).toBe(
      'min-w-0 text-body text-ink',
    );
  });

  test('a variant size does not drop the base colour', () => {
    const card = tv({
      slots: { title: 'text-ink' },
      variants: { size: { lg: { title: 'text-section' } } },
    });
    expect(card({ size: 'lg' }).title()).toBe('text-ink text-section');
  });

  test('a class passed in still overrides the size', () => {
    expect(tv({ base: 'text-body text-ink' })({ class: 'text-label' })).toBe(
      'text-ink text-label',
    );
  });
});

test('no component takes tv from the package, past lib/tv', () => {
  const src = join(import.meta.dir, '..');
  const offenders = [...new Bun.Glob('**/*.{ts,tsx}').scanSync(src)].filter(
    (f) =>
      f !== 'lib/tv.ts' &&
      /\btv\b[^;]*from 'tailwind-variants'/.test(
        readFileSync(join(src, f), 'utf8'),
      ),
  );
  expect(offenders).toEqual([]);
});

test('the scale is exactly the --text-* steps in tokens.css', () => {
  const css = readFileSync(join(import.meta.dir, '..', 'tokens.css'), 'utf8');
  const steps = [...css.matchAll(/--text-([a-z]+):/g)].map((m) => m[1]);
  expect(steps.sort()).toEqual([...TYPE_SCALE].sort());
});
