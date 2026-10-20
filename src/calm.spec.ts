import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * C-281 (AgentDock S-7) — the calm default under navy.
 *
 * `material.css` quiets the glass for `data-palette="navy"` by switching off
 * the four optical layers. What is held here: it is navy-only (so the
 * baseline consumers do not move), it only ever writes `transparent` (so it
 * cannot fight a flat route, which writes the same), and it never touches a
 * colour of the palette.
 */
const MATERIAL = readFileSync(
  join(new URL('.', import.meta.url).pathname, 'material.css'),
  'utf8',
).replace(/\/\*[\s\S]*?\*\//g, ' ');

const SELECTOR = ':root:where([data-palette="navy"]) {';

function body(): string {
  const at = MATERIAL.indexOf(SELECTOR);
  if (at < 0) throw new Error('material.css no longer has the navy calm block');
  return MATERIAL.slice(at + SELECTOR.length, MATERIAL.indexOf('}', at));
}

const declarations = (text: string) =>
  text
    .split(';')
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => d.split(':').map((part) => part.trim()) as [string, string]);

describe('the calm default under navy (C-281)', () => {
  test('switches off exactly the optical layers', () => {
    expect(
      declarations(body())
        .map(([name]) => name)
        .sort(),
    ).toEqual(
      [
        '--glass-meniscus',
        '--glass-refract',
        '--glass-rim',
        '--glass-rim-shade',
        '--glass-rim-shade-strong',
        '--glass-rim-strong',
      ].sort(),
    );
  });

  test('only ever writes transparent, so every flat route agrees with it', () => {
    for (const [, value] of declarations(body()))
      expect(value).toBe('transparent');
  });

  test('is the only navy block that re-values the material, and it is opt-in', () => {
    expect(MATERIAL.split(SELECTOR)).toHaveLength(2);
    // No unscoped `:root` block in material.css sets these outside a flat route.
    expect(body()).not.toContain('--color-');
    expect(body()).not.toContain('--glass-scrim');
    expect(body()).not.toContain('--glass-filter');
  });
});
