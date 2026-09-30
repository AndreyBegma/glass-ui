import { describe, expect, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { readTokens } from '../tokens/read';
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
const TOKENS_CSS = readTokens().replace(/\/\*[\s\S]*?\*\//g, ' ');

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

  test('`sm` reads `--size-control-sm`, its own rung', () => {
    render(<Button size="sm">Save</Button>);
    expect(screen.getByRole('button').className).toContain('h-(--size-control-sm)');
  });

  test('`sm` takes two thirds of the control radius, not 4px less', () => {
    render(<Button size="sm">Save</Button>);
    expect(screen.getByRole('button').className).toContain(
      'rounded-[calc(var(--radius-control)*2/3)]',
    );
  });

  test('the touch target follows `--size-tap`, the token named for it', () => {
    render(<Button size="md">Save</Button>);
    expect(screen.getByRole('button').className).toContain('after:h-(--size-tap)');
  });

  test('the touch target is `--size-tap` wide too, centred on the button', () => {
    render(<Button size="sm" icon aria-label="Close" />);
    const className = screen.getByRole('button').className;
    expect(className).toContain('after:min-w-(--size-tap)');
    expect(className).toContain('after:left-1/2');
    expect(className).toContain('after:-translate-x-1/2');
  });

  test('the sofa `sm` still measures the 32px it drew as `h-8`', () => {
    expect(tokenValue(SOFA, '--size-control-sm')).toBe('32px');
  });

  test('the sofa rung measures what `md` and `lg` drew before: 40px and 48px', () => {
    expect(tokenValue(SOFA, '--size-control')).toBe('40px');
  });

  test('the desk rung measures 28px', () => {
    expect(tokenValue(DESK, '--size-control')).toBe('28px');
  });
});

/**
 * BUG-20260930-001 (SYS-15) — at the desk `sm` was a fixed 32px over a 28px
 * `md`, and its radius, 4px under the desk's 6px, was 2px. Each size is
 * resolved here from the tokens it reads, at both distances, so the ladder is
 * checked as drawn rather than as named.
 */
const px = (value: string) => {
  const found = value.match(/^(\d+)px$/);
  if (!found) throw new Error(`\`${value}\` is not a px length`);
  return Number(found[1]);
};

describe.each([
  ['the sofa', [SOFA]],
  ['the desk', [SOFA, DESK]],
])('%s: the sizes step up and the corners follow', (_n, blocks) => {
  const read = (name: string) => {
    for (const body of [...blocks].reverse()) {
      if (new RegExp(`${name}\\s*:`).test(body)) return px(tokenValue(body, name));
    }
    throw new Error(`no \`${name}\``);
  };

  test('sm < md < lg', () => {
    const md = read('--size-control');
    const sm = read('--size-control-sm');
    const lg = md + 8;
    expect(sm).toBeLessThan(md);
    expect(md).toBeLessThan(lg);
  });

  test('the `sm` corner is at least 4px and no larger than `md`', () => {
    const md = read('--radius-control');
    const sm = (md * 2) / 3;
    expect(sm).toBeGreaterThanOrEqual(4);
    expect(sm).toBeLessThanOrEqual(md);
  });
});
