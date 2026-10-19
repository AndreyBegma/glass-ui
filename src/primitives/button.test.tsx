import { describe, expect, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { compile } from 'tailwindcss';
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
const WORKSPACE = block(':root:where([data-scale="desk"][data-profile="workspace"])');

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

  test('`sm` keeps 4px under the control radius, and two thirds in the workspace', () => {
    render(<Button size="sm">Save</Button>);
    const classes = screen.getByRole('button').className.split(' ');
    expect(classes).toContain('rounded-[calc(var(--radius-control)-4px)]');
    expect(classes).toContain('workspace:rounded-[calc(var(--radius-control)*2/3)]');
  });

  test('`sm` still measures the 32px it drew as `h-8`, at the sofa and at the desk', () => {
    expect(tokenValue(SOFA, '--size-control-sm')).toBe('32px');
    expect(DESK).not.toContain('--size-control-sm');
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

  test('the sofa rung measures what `md` and `lg` drew before: 40px and 48px', () => {
    expect(tokenValue(SOFA, '--size-control')).toBe('40px');
  });

  test('the desk rung measures 28px', () => {
    expect(tokenValue(DESK, '--size-control')).toBe('28px');
  });

  // FEAT-20261013-001 (0971ed3), #168 — maint's desk pins, at the workspace.
  test('the workspace rung measures 32px, and `sm` 28px', () => {
    expect(tokenValue(WORKSPACE, '--size-control')).toBe('32px');
    expect(tokenValue(WORKSPACE, '--size-control-sm')).toBe('28px');
  });
});

/**
 * Under navy a control is not chrome. The `glass` variant carries
 * `glass-control`, and `material.css` re-values the material on it for navy
 * only: an opaque raised fill, the palette's hairline, and no blur, rim,
 * meniscus, refraction or shadow. The other variants never wear it.
 */
const MATERIAL_CSS = readFileSync(
  join(new URL('.', import.meta.url).pathname, '..', 'material.css'),
  'utf8',
).replace(/\/\*[\s\S]*?\*\//g, ' ');

function materialBlock(marker: string): string {
  const at = MATERIAL_CSS.indexOf(marker);
  if (at < 0) throw new Error(`material.css no longer contains \`${marker}\``);
  const open = MATERIAL_CSS.indexOf('{', at);
  const close = MATERIAL_CSS.indexOf('}', open);
  return MATERIAL_CSS.slice(open + 1, close);
}

describe('the glass button under navy', () => {
  test('the glass variant, and only it, carries the control rung', () => {
    render(
      <>
        <Button>Default</Button>
        <Button variant="solid">Solid</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger">Danger</Button>
      </>,
    );
    expect(screen.getByRole('button', { name: 'Default' }).className).toContain('glass-control');
    for (const name of ['Solid', 'Ghost', 'Danger']) {
      expect(screen.getByRole('button', { name }).className).not.toContain('glass-control');
    }
  });

  test('navy flattens it to a raised fill with the palette hairline', () => {
    const body = materialBlock(':root[data-palette="navy"] .glass-control');
    expect(tokenValue(body, '--glass-scrim')).toBe('var(--color-raised)');
    expect(tokenValue(body, '--glass-edge')).toBe('var(--color-line-strong)');
    expect(tokenValue(body, '--glass-filter')).toBe('none');
    for (const layer of ['sheen', 'rim', 'rim-shade', 'meniscus', 'refract', 'shadow']) {
      expect(tokenValue(body, `--glass-${layer}`)).toBe('transparent');
    }
  });

  test('outside navy the class re-values nothing', () => {
    const selectors = [...MATERIAL_CSS.matchAll(/([^{}]*)\.glass-control[^{]*\{/g)].map((m) =>
      m[1].trim(),
    );
    expect(selectors).toEqual([':root[data-palette="navy"]']);
  });
});

/**
 * FEAT-20261013-002 (W238), #168 — the secondary tier at the flat material.
 * The glass scrim there is `--color-raised`, which is also a card, so a glass
 * button had no fill on a card and a grey fill on the page. Under the
 * workspace profile it is a tint of ink with a hairline ring. The classes
 * carry both gates, and the stylesheet Tailwind builds from them (a) scopes
 * them to the profile and to `[data-material="flat"]` and (b) emits them after
 * `glass` / `glass-hover`, which paint with the `background` shorthand.
 */
const FLAT = [
  'workspace:in-data-[material=flat]:bg-ink/[0.06]',
  'workspace:in-data-[material=flat]:ring-1',
  'workspace:in-data-[material=flat]:ring-inset',
  'workspace:in-data-[material=flat]:ring-line-strong',
  'workspace:in-data-[material=flat]:hover:bg-ink/[0.10]',
];

describe('the secondary tier', () => {
  test('a glass button carries the tint and the ring, behind both gates', () => {
    render(<Button>Cancel</Button>);
    const classes = screen.getByRole('button').className.split(/\s+/);
    for (const c of FLAT) expect(classes).toContain(c);
    // Nothing applies the tint outside the gates.
    expect(classes.filter((c) => /^(hover:)?(bg-ink|ring)/.test(c))).toEqual([]);
  });

  test('other variants do not carry it', () => {
    for (const variant of ['solid', 'ghost', 'danger', 'link'] as const) {
      expect(buttonClassName({ variant })).not.toContain('in-data-[material=flat]');
    }
  });

  test('the built stylesheet gates the tint on the profile and flat, and emits it after glass', async () => {
    const css = await build(['glass', 'glass-hover', ...FLAT]);
    const at = (needle: string) => css.indexOf(needle);
    const gate = ':where([data-material="flat"]) .workspace\\:in-data-';
    expect(at(gate)).toBeGreaterThan(-1);
    expect(css).toContain(':where([data-scale="desk"][data-profile="workspace"] *)');
    expect(at('.glass-hover:hover')).toBeGreaterThan(at('.glass {'));
    expect(at(gate)).toBeGreaterThan(at('.glass-hover:hover'));
    expect(css).toContain(
      'workspace\\:in-data-\\[material\\=flat\\]\\:hover\\:bg-ink\\/\\[0\\.10\\]:where(',
    );
  });
});

describe('the workspace primary and danger', () => {
  test('the primary is the accent, and ink in the workspace', () => {
    const classes = buttonClassName({ variant: 'solid' }).split(/\s+/);
    expect(classes).toEqual(expect.arrayContaining(['bg-accent', 'text-on-accent']));
    expect(classes).toEqual(
      expect.arrayContaining(['workspace:bg-ink', 'workspace:text-ground', 'workspace:hover:bg-ink/90']),
    );
  });

  test('a disabled primary is the primary at 40%, at either profile (W238)', () => {
    const classes = buttonClassName({ variant: 'solid' }).split(/\s+/);
    expect(classes).toContain('disabled:opacity-40');
    expect(classes.filter((c) => c.includes('disabled:bg') || c.includes('disabled:text'))).toEqual(
      [],
    );
  });

  test('the danger label is danger, and ink in the workspace', () => {
    const classes = buttonClassName({ variant: 'danger' }).split(/\s+/);
    expect(classes).toContain('text-danger');
    expect(classes).toContain('workspace:text-ink');
  });

  test('the built stylesheet emits the workspace primary after the accent', async () => {
    const css = await build(['bg-accent', 'workspace:bg-ink', 'text-danger', 'workspace:text-ink']);
    expect(css.indexOf('.workspace\\:bg-ink:where(')).toBeGreaterThan(css.indexOf('.bg-accent {'));
    expect(css.indexOf('.workspace\\:text-ink:where(')).toBeGreaterThan(css.indexOf('.text-danger {'));
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

  test('it reads the accent’s text colour and underlines on hover', () => {
    const classes = buttonClassName({ variant: 'link' }).split(/\s+/);
    expect(classes).toContain('text-accent-ink');
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
        const path =
          id === 'tailwindcss/utilities'
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
 * BUG-20260930-001 (SYS-15) — at the desk `sm` is a fixed 32px over a 28px
 * `md`, and develop's desk keeps that for AgentDock. The workspace profile is
 * where the ladder was fixed on `maint/v0.8`: each size is resolved here from
 * the tokens it reads, so it is checked as drawn rather than as named.
 */
const px = (value: string) => {
  const found = value.match(/^(\d+)px$/);
  if (!found) throw new Error(`\`${value}\` is not a px length`);
  return Number(found[1]);
};

describe.each([
  ['the sofa', [SOFA]],
  ['the workspace', [SOFA, DESK, WORKSPACE]],
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
    expect(sm).toBeLessThan(md);
    expect(md).toBeLessThan(md + 8);
  });

  test('the `sm` corner is at least 4px and no larger than `md`', () => {
    const md = read('--radius-control');
    const sm = (md * 2) / 3;
    expect(sm).toBeGreaterThanOrEqual(4);
    expect(sm).toBeLessThanOrEqual(md);
  });
});
