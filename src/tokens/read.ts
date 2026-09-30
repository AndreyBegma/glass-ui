import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * FEAT-20260930-004 (u7-glass) — the token layer as one text, for the specs.
 *
 * `tokens.css` is an entry of `@import`s since the split, and a spec that
 * parses a block out of it by selector finds nothing there. This inlines each
 * relative import in place, in source order, which is the order the cascade
 * reads them in — so a spec asking "which block comes last" still gets the
 * answer the browser gets.
 *
 * Not for runtime: nothing in a component imports it, and it is not exported.
 */
const ENTRY = join(dirname(new URL(import.meta.url).pathname), '..', 'tokens.css');

const IMPORT = /@import\s+"(\.[^"]+)"\s*;/g;

function inline(path: string): string {
  const text = readFileSync(path, 'utf8');
  return text.replace(IMPORT, (_all, relative: string) =>
    inline(join(dirname(path), relative)),
  );
}

/** `tokens.css` with its imports inlined, comments and all. */
export function readTokens(): string {
  return inline(ENTRY);
}
