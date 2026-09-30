import { describe, expect, test } from 'bun:test';
import { readTokens } from '../tokens/read';
import { buttonClassName } from './button';

/**
 * BUG-20260930-001 (SYS-14) — the desk profile under a thumb.
 *
 * The desk takes a field to 28px, which is right under a pointer and a miss
 * under a finger. `Button` never had that problem, because its `after:` hit
 * area is `--size-tap` in both directions whatever it draws. A field has no
 * such extension, so on a coarse pointer the token goes back to the sofa's
 * 44px. This holds that, against the tokens rather than a component, so every
 * field that reads `--size-field` is covered at once.
 *
 * Its own file rather than a section of `tokens.spec.ts`, which is past the
 * size ceiling.
 */

const TOKENS = readTokens().replace(/\/\*[\s\S]*?\*\//g, ' ');

/** The body of the rule whose selector starts at `from`, braces matched. */
function block(from: number): { body: string; end: number } {
  const open = TOKENS.indexOf('{', from);
  let depth = 0;
  for (let i = open; i < TOKENS.length; i++) {
    if (TOKENS[i] === '{') depth++;
    else if (TOKENS[i] === '}' && --depth === 0) return { body: TOKENS.slice(open + 1, i), end: i };
  }
  throw new Error('unbalanced braces');
}

function px(body: string, name: string): number {
  const found = body.match(new RegExp(`${name}\\s*:\\s*(\\d+)px\\s*;`));
  if (!found) throw new Error(`no \`${name}\` in px in this block`);
  return Number(found[1]);
}

const COARSE_AT = TOKENS.indexOf('@media (pointer: coarse)');
const DESK_MARKER = ':root:where([data-scale="desk"])';

describe('a field is a thumb’s size on a coarse pointer, at the desk too', () => {
  test('tokens.css has a coarse-pointer block', () => {
    expect(COARSE_AT).toBeGreaterThan(-1);
  });

  const coarse = block(COARSE_AT).body;
  const tap = px(block(TOKENS.indexOf('@theme static')).body, '--size-tap');

  test('it re-values the desk, and only the field', () => {
    expect(coarse).toContain(DESK_MARKER);
    const names = [...coarse.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]);
    expect(names).toEqual(['--size-field']);
  });

  test('the field under a thumb is at least `--size-tap`', () => {
    expect(px(coarse, '--size-field')).toBeGreaterThanOrEqual(tap);
  });

  test('the sofa field already is', () => {
    expect(px(block(TOKENS.indexOf('@theme static')).body, '--size-field')).toBeGreaterThanOrEqual(
      tap,
    );
  });

  test('it comes after every desk block, which is what makes it win', () => {
    // All of them are (0,1,0); the last one declared takes the field.
    expect(TOKENS.indexOf('[data-scale="desk"]', block(COARSE_AT).end)).toBe(-1);
  });
});

describe('a button is a thumb’s size whatever it draws', () => {
  test.each(['sm', 'md', 'lg'] as const)('%s, and square: the hit area is `--size-tap` both ways', (size) => {
    const classes = buttonClassName({ size, icon: true }).split(/\s+/);
    expect(classes).toContain('after:h-(--size-tap)');
    expect(classes).toContain('after:min-w-(--size-tap)');
    // Hidden only on a fine pointer, so a coarse one always has it.
    expect(classes).toContain('[@media(pointer:fine)]:after:hidden');
  });
});
