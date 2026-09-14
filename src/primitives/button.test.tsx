import { describe, expect, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Button } from './button';

/**
 * FEAT-20260911-006 — the density scale, consumed.
 *
 * `md` and the touch target used to write `h-10` / `after:h-11` by hand,
 * matching the scale's numbers by coincidence rather than reading them. These
 * tests hold both ends of that: the class the component renders, and the
 * value `tokens.css` actually declares for the token it now reads — so a
 * token nudged without the component in view, or a component detached from
 * the token, both fail here rather than only looking right in one file.
 */
const TOKENS_CSS = readFileSync(
  join(new URL('.', import.meta.url).pathname, '..', 'tokens.css'),
  'utf8',
).replace(/\/\*[\s\S]*?\*\//g, ' ');

/** The body of the rule whose selector starts at `marker`, braces matched. */
function block(marker: string): string {
  const at = TOKENS_CSS.indexOf(marker);
  if (at < 0) throw new Error(`tokens.css no longer contains \`${marker}\``);
  const open = TOKENS_CSS.indexOf('{', at);
  let depth = 0;
  for (let i = open; i < TOKENS_CSS.length; i++) {
    if (TOKENS_CSS[i] === '{') depth++;
    else if (TOKENS_CSS[i] === '}' && --depth === 0) return TOKENS_CSS.slice(open + 1, i);
  }
  throw new Error(`unbalanced braces after \`${marker}\``);
}

function tokenValue(body: string, name: string): string {
  const found = body.match(new RegExp(`${name}\\s*:\\s*([^;]+);`));
  if (!found) throw new Error(`no \`${name}\` in this block`);
  return found[1].trim();
}

const SOFA = block('@theme static');
const DESK = block(':root:where([data-scale="desk"])');

describe('Button reads the density scale', () => {
  test('`md` is `h-(--size-control)`', () => {
    render(<Button size="md">Save</Button>);
    expect(screen.getByRole('button').className).toContain('h-(--size-control)');
  });

  test('`lg` is one documented step above the control token', () => {
    render(<Button size="lg">Save</Button>);
    expect(screen.getByRole('button').className).toContain(
      'h-[calc(var(--size-control)+8px)]',
    );
  });

  test('`sm` is unchanged — the scale gives it no rung', () => {
    render(<Button size="sm">Save</Button>);
    expect(screen.getByRole('button').className).toContain('h-8');
  });

  test('the touch target follows `--size-tap`, the token named for it', () => {
    render(<Button size="md">Save</Button>);
    expect(screen.getByRole('button').className).toContain('after:h-(--size-tap)');
  });

  test('the sofa rung measures what `md` and `lg` drew before: 40px and 48px', () => {
    expect(tokenValue(SOFA, '--size-control')).toBe('40px');
  });

  test('the desk rung measures 28px', () => {
    expect(tokenValue(DESK, '--size-control')).toBe('28px');
  });
});
