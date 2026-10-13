import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { render, screen } from '@testing-library/react';
import { compile } from 'tailwindcss';
import { readTokens } from '../tokens/read';
import { Button, buttonClassName } from './button';

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

  test('the desk rung measures 32px', () => {
    expect(tokenValue(DESK, '--size-control')).toBe('32px');
  });
});

/**
 * FEAT-20261013-002 (W238) — three tiers and a link.
 *
 * The secondary's tint is written as ancestor-variant utilities, so the class
 * list is the same wherever the button is rendered: what differs is the
 * selector, which only applies under `data-material="flat"`. So there are two
 * things to hold — the class list carries the tint and the ring *only* behind
 * the flat gate, and the stylesheet Tailwind builds from them (a) scopes them
 * to `[data-material="flat"]` and (b) emits them after `glass` / `glass-hover`,
 * which paint with the `background` shorthand and would otherwise win.
 */
const FLAT = [
  'in-data-[material=flat]:bg-ink/[0.06]',
  'in-data-[material=flat]:ring-1',
  'in-data-[material=flat]:ring-inset',
  'in-data-[material=flat]:ring-line-strong',
  'in-data-[material=flat]:hover:bg-ink/[0.10]',
];

describe('the secondary tier', () => {
  test('a glass button inside flat material carries the tint and the ring', () => {
    render(
      <div data-material="flat">
        <Button>Cancel</Button>
      </div>,
    );
    const classes = screen.getByRole('button').className.split(/\s+/);
    for (const c of FLAT) expect(classes).toContain(c);
  });

  test('outside it, the tint and the ring exist only behind the flat gate', () => {
    render(<Button>Cancel</Button>);
    const classes = screen.getByRole('button').className.split(/\s+/);
    expect(classes).toContain('glass');
    expect(classes.filter((c) => /^(hover:)?(bg-ink|ring)/.test(c))).toEqual([]);
  });

  test('other variants do not carry it', () => {
    for (const variant of ['solid', 'ghost', 'danger', 'link'] as const) {
      expect(buttonClassName({ variant })).not.toContain('in-data-[material=flat]');
    }
  });

  test('the built stylesheet gates the tint on flat and emits it after glass', async () => {
    const css = await build(['glass', 'glass-hover', ...FLAT]);
    const at = (needle: string) => css.indexOf(needle);
    const gate = ':where([data-material="flat"]) .in-data-';
    expect(at(gate)).toBeGreaterThan(-1);
    expect(at('.glass-hover:hover')).toBeGreaterThan(at('.glass {'));
    // Every flat rule after both material utilities, so equal weight resolves to it.
    expect(at(gate)).toBeGreaterThan(at('.glass-hover:hover'));
    // And nothing applies the tint outside the gate.
    expect(css).not.toMatch(/(^|\n)\.in-data-\\\[material/);
    expect(css).toContain('in-data-\\[material\\=flat\\]\\:hover\\:bg-ink\\/\\[0\\.10\\]:hover');
  });
});

describe('the link variant', () => {
  test('size never reaches it: no control height, no horizontal padding', () => {
    const classes = buttonClassName({ variant: 'link', size: 'md' });
    expect(classes).not.toContain('h-(--size-control)');
    expect(classes).not.toContain('px-4');
    expect(classes.split(/\s+/)).toContain('h-auto');
    expect(classes.split(/\s+/)).toContain('px-0');
    expect(classes.split(/\s+/)).toContain('rounded-sm');
  });

  test.each(['sm', 'md', 'lg'] as const)('size %s drops its height and padding too', (size) => {
    const classes = buttonClassName({ variant: 'link', size }).split(/\s+/);
    expect(classes.some((c) => c.startsWith('h-(') || c.startsWith('h-['))).toBe(false);
    expect(classes.some((c) => /^px-[1-9]/.test(c))).toBe(false);
  });

  test('it reads the accent, falls back to ink, and underlines on hover', () => {
    const classes = buttonClassName({ variant: 'link' }).split(/\s+/);
    expect(classes).toContain('text-[color:var(--color-accent,var(--color-ink))]');
    expect(classes).toContain('hover:underline');
    expect(classes).toContain('underline-offset-4');
  });

  test('a button renders it', () => {
    render(<Button variant="link">Read more</Button>);
    expect(screen.getByRole('button').className).toContain('hover:underline');
  });
});

/** Tailwind's own compile over `tokens.css` and `material.css`, for `candidates`. */
async function build(candidates: string[]): Promise<string> {
  const root = new URL('..', import.meta.url).pathname;
  const tailwind = new URL('../../node_modules/tailwindcss/', import.meta.url).pathname;
  const compiled = await compile(
    `@import "tailwindcss/utilities";\n@import "${root}tokens.css";\n@import "${root}material.css";`,
    {
      base: root,
      loadStylesheet: async (id, base) => {
        const path = id === 'tailwindcss/utilities'
          ? `${tailwind}utilities.css`
          : id.startsWith('.')
            ? new URL(id, `file://${base}/`).pathname
            : id;
        return {
          path,
          base: path.slice(0, path.lastIndexOf('/')),
          content: readFileSync(path, 'utf8'),
        };
      },
    },
  );
  return compiled.build(candidates);
}

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
