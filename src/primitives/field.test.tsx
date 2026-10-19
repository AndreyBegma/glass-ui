import { describe, expect, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Input, SearchField, Select } from './field';

/**
 * FEAT-20260911-006 — the density scale, consumed. See `button.test.tsx` for
 * why this reads `tokens.css` directly rather than trusting the class name on
 * its own.
 */
const TOKENS_CSS = readFileSync(
  join(new URL('.', import.meta.url).pathname, '..', 'tokens.css'),
  'utf8',
).replace(/\/\*[\s\S]*?\*\//g, ' ');

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

describe('the field controls read the density scale', () => {
  test('`Input` is `h-(--size-field)`', () => {
    render(<Input aria-label="Name" />);
    expect(screen.getByRole('textbox', { name: 'Name' }).className).toContain(
      'h-(--size-field)',
    );
  });

  test('`Select` is `h-(--size-field)`, matching `Input`', () => {
    render(
      <Select aria-label="Country">
        <option>UK</option>
      </Select>,
    );
    expect(screen.getByRole('combobox', { name: 'Country' }).className).toContain(
      'h-(--size-field)',
    );
  });

  test('`SearchField`\'s input is `h-(--size-field)`', () => {
    render(<SearchField aria-label="Search" />);
    expect(screen.getByRole('searchbox', { name: 'Search' }).className).toContain(
      'h-(--size-field)',
    );
  });

  test('the sofa rung measures what `Input` and `Select` drew before: 44px', () => {
    expect(tokenValue(SOFA, '--size-field')).toBe('44px');
  });

  test('the desk rung measures 28px', () => {
    expect(tokenValue(DESK, '--size-field')).toBe('28px');
  });

  // FEAT-20261013-001 (0971ed3), #168 — maint's desk pin, at the workspace.
  test('the workspace rung measures 32px', () => {
    const workspace = block(':root:where([data-scale="desk"][data-profile="workspace"])');
    expect(tokenValue(workspace, '--size-field')).toBe('32px');
  });

  test('W254 — the workspace focus ring is the token-built ring, the same as fieldClassName', () => {
    render(<Input aria-label="plain" />);
    const cls = screen.getByLabelText('plain').className.split(' ');
    expect(cls).toContain('workspace:focus:ring-ink/22');
    // Outside the profile the ring is what it was: `field.tsx`'s own literal,
    // which no other file may spell (`tokens.spec.ts`), so matched by shape.
    expect(cls.filter((c) => /^focus:ring-\S+\/22$/.test(c))).toHaveLength(1);
    expect(cls).not.toContain('focus:ring-ink/22');
  });
});

// BUG-20260916-613 — the fill by where the field sits. The default is the
// promise every consumer that never heard of `tone` relies on, so it is held
// to the byte; `on-glass` changes the fill and nothing else.
describe('the field tone', () => {
  // The focus ring's literal is `field.tsx`'s one allowed raw colour, and
  // `tokens.spec.ts` forbids spelling it in any other file — so the ring is
  // masked before the compare, and asserted present on its own. #168 — the
  // `workspace:` ring is drawn under that profile only, so it is part of the
  // string and of nothing an application without the profile renders.
  const RING = /focus:ring-\S+\/22/;
  const SURFACE_BASE =
    'w-full bg-surface text-ink placeholder:text-ink-3 border border-line-strong rounded-control transition-[border-color,box-shadow] duration-(--dur-fast) focus:border-ink/70 focus:ring-2 RING focus:outline-none workspace:focus:ring-ink/22 disabled:opacity-40';
  const masked = (el: Element) => el.className.replace(RING, 'RING');

  test('`Input` renders the string it always did', () => {
    render(<Input aria-label="Name" />);
    const input = screen.getByRole('textbox', { name: 'Name' });
    expect(input.className).toMatch(RING);
    expect(masked(input)).toBe(`${SURFACE_BASE} h-(--size-field) px-3.5 text-sm`);
  });

  test('`SearchField` renders the string it always did', () => {
    render(<SearchField aria-label="Search" />);
    expect(masked(screen.getByRole('searchbox', { name: 'Search' }))).toBe(
      `${SURFACE_BASE} h-(--size-field) pl-10 pr-3.5 text-sm`,
    );
  });

  // #93 — the select is the package's, not the OS's: the field's string, then
  // `appearance-none` and a chevron drawn in `ink-3`, and no option guard.
  test('`Select` is the field string plus the drawn chevron, with no option guard', () => {
    render(
      <Select aria-label="Country">
        <option>UK</option>
      </Select>,
    );
    expect(masked(screen.getByRole('combobox', { name: 'Country' }))).toBe(
      [
        `${SURFACE_BASE} h-(--size-field) px-3 text-sm`,
        'appearance-none pr-9 cursor-pointer bg-no-repeat',
        'bg-[linear-gradient(45deg,transparent_50%,var(--color-ink-3)_50%),linear-gradient(135deg,var(--color-ink-3)_50%,transparent_50%)]',
        'bg-[position:calc(100%-1.25rem)_55%,calc(100%-0.875rem)_55%]',
        'bg-[length:6px_6px,6px_6px]',
        'forced-colors:appearance-auto',
      ].join(' '),
    );
  });

  test('`Select` keeps its fill under the chevron, in both tones', () => {
    render(
      <>
        <Select aria-label="Flat">
          <option>UK</option>
        </Select>
        <Select aria-label="Glass" tone="on-glass">
          <option>UK</option>
        </Select>
      </>,
    );
    const flat = screen.getByRole('combobox', { name: 'Flat' }).classList;
    const glass = screen.getByRole('combobox', { name: 'Glass' }).classList;
    expect(flat.contains('bg-surface')).toBe(true);
    expect(glass.contains('bg-hover')).toBe(true);
    expect(flat.contains('appearance-none')).toBe(true);
    expect(glass.contains('appearance-none')).toBe(true);
  });

  test('a caller className still lands on the `<select>` itself', () => {
    render(
      <Select aria-label="Narrow" className="w-40">
        <option>UK</option>
      </Select>,
    );
    const select = screen.getByRole('combobox', { name: 'Narrow' });
    expect(select.tagName).toBe('SELECT');
    expect(select.classList.contains('w-40')).toBe(true);
    expect(select.classList.contains('w-full')).toBe(false);
  });

  test('`tone="on-glass"` swaps `bg-surface` for `bg-hover` and keeps the border and the ring', () => {
    render(<Input aria-label="Name" tone="on-glass" />);
    const input = screen.getByRole('textbox', { name: 'Name' });
    expect(input.className).toContain('bg-hover');
    expect(input.className).not.toContain('bg-surface');
    expect(input.className).toContain('border-line-strong');
    expect(input.className).toMatch(RING);
    expect(input.hasAttribute('tone')).toBe(false);
  });

  test('`SearchField` on glass takes the tone on its input, not its wrapper', () => {
    const { container } = render(
      <SearchField aria-label="Search" tone="on-glass" />,
    );
    expect(
      screen.getByRole('searchbox', { name: 'Search' }).className,
    ).toContain('bg-hover');
    expect(container.firstElementChild?.className).toBe(
      'relative flex items-center',
    );
    expect(container.firstElementChild?.hasAttribute('tone')).toBe(false);
  });

  test('`Select` on glass guards its option list with the opaque surface', () => {
    render(
      <Select aria-label="Country" tone="on-glass">
        <option>UK</option>
      </Select>,
    );
    const select = screen.getByRole('combobox', { name: 'Country' });
    expect(select.className).toContain('bg-hover');
    expect(select.className).toContain('[&>option]:bg-surface');
    expect(select.className).toContain('[&>option]:text-ink');
  });
});
