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
 * The block parser lives here too, so the specs that share it import it
 * instead of repeating it: a spec cannot import another spec without
 * registering its tests twice, and this file is not a spec.
 *
 * Not for runtime: nothing in a component imports it, and it is not exported.
 */
const ENTRY = join(
  dirname(new URL(import.meta.url).pathname),
  '..',
  'tokens.css',
);

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

/** `readTokens()` with the comments taken out, which is what a parser wants:
 *  a selector quoted in prose is not a rule. */
export function tokenRules(): string {
  return readTokens().replace(/\/\*[\s\S]*?\*\//g, ' ');
}

/** The body of the rule whose selector starts at `marker` in `text`, braces
 *  matched. Throws when the marker is gone, so a renamed selector fails loud. */
export function block(text: string, marker: string): string {
  const at = text.indexOf(marker);
  if (at < 0) throw new Error(`tokens.css no longer contains \`${marker}\``);
  const open = text.indexOf('{', at);
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}' && --depth === 0) return text.slice(open + 1, i);
  }
  throw new Error(`unbalanced braces after \`${marker}\``);
}

/** WCAG 2.x relative luminance of an `#rrggbb`. */
function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = Number.parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.x contrast of two opaque `#rrggbb`s. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** The value a set gives a token, as written. Opaque hex only — a contrast
 *  ratio against a translucent colour is a ratio against whatever happens to
 *  be behind it, which is not a thing a stylesheet can be asked. */
export function value(decls: string[], token: string): string {
  const found = decls.find((d) => d.startsWith(`${token}:`));
  if (!found) throw new Error(`no \`${token}\` in this set`);
  const hex = found.slice(token.length + 1).trim();
  if (!/^#[0-9a-f]{6}$/i.test(hex))
    throw new Error(`\`${token}\` is \`${hex}\`, which is not an opaque hex`);
  return hex;
}

/** Every custom property a block declares, in source order, as `name: value`. */
export function declarations(body: string): string[] {
  return [...body.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)].map(
    (m) => `${m[1]}: ${m[2].replace(/\s+/g, ' ').trim()}`,
  );
}
