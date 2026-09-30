import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * FEAT-20260930-004 — the chip sizes by token and rounds by fraction.
 *
 * Read off the source rather than rendered: the property under test is which
 * token a size reads, and a rendered class list says the same thing with a
 * DOM in the way. The token's values are pinned in `tokens.spec.ts`.
 */
const SOURCE = readFileSync(
  join(new URL('.', import.meta.url).pathname, 'chip.tsx'),
  'utf8',
)
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/.*$/gm, '$1 ');

describe('Chip', () => {
  test('`md` reads `--size-chip`, not a fixed height', () => {
    expect(SOURCE).toMatch(/md:\s*'h-\(--size-chip\)/);
  });

  test('no radius is the control radius minus a fixed number of pixels', () => {
    // `calc(var(--radius-control)-4px)` is 2px at the desk; `-6px` is nothing.
    expect(SOURCE).not.toMatch(/--radius-control\)\s*-\s*\d+px/);
  });

  test('no text under 12px (`E-127` d3)', () => {
    expect(SOURCE).not.toMatch(/text-\[(?:[0-9]|1[01])px\]/);
  });
});
