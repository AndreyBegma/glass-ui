import { describe, expect, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { useState } from 'react';
import {
  MenuContent,
  MenuItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuRoot,
  MenuTrigger,
} from './menu';

function SizeMenu() {
  const [size, setSize] = useState('md');
  return (
    <MenuRoot defaultOpen>
      <MenuTrigger>Open</MenuTrigger>
      <MenuContent>
        <MenuItem>Copy</MenuItem>
        <MenuRadioGroup value={size} onValueChange={setSize}>
          <MenuRadioItem value="sm">Small</MenuRadioItem>
          <MenuRadioItem value="md">Medium</MenuRadioItem>
          <MenuRadioItem value="lg">Large</MenuRadioItem>
        </MenuRadioGroup>
      </MenuContent>
    </MenuRoot>
  );
}

/** Roving focus moves in a `setTimeout(0)`, not synchronously with the key. */
const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('MenuRadioGroup / MenuRadioItem', () => {
  test('the checked item carries `aria-checked`, from Radix', async () => {
    render(<SizeMenu />);

    const medium = await screen.findByRole('menuitemradio', { name: 'Medium' });
    expect(medium.getAttribute('aria-checked')).toBe('true');
    expect(
      screen.getByRole('menuitemradio', { name: 'Small' }).getAttribute('aria-checked'),
    ).toBe('false');
  });

  test('arrow keys rove onto the radio items; Tab does not leave the menu', async () => {
    render(<SizeMenu />);

    const copy = await screen.findByRole('menuitem', { name: 'Copy' });
    copy.focus();
    expect(document.activeElement).toBe(copy);

    fireEvent.keyDown(copy, { key: 'ArrowDown' });
    await tick();
    const small = screen.getByRole('menuitemradio', { name: 'Small' });
    expect(document.activeElement).toBe(small);

    fireEvent.keyDown(small, { key: 'ArrowDown' });
    await tick();
    const medium = screen.getByRole('menuitemradio', { name: 'Medium' });
    expect(document.activeElement).toBe(medium);

    // Radix's menu content swallows Tab, so focus stays where it was and
    // inside the menu — the thing Denitsa's hand-rolled `role="menuitemradio"`
    // could not do, because it never joined Radix's roving-focus Collection.
    const menu = screen.getByRole('menu');
    fireEvent.keyDown(medium, { key: 'Tab' });
    await tick();
    expect(document.activeElement).toBe(medium);
    expect(menu.contains(document.activeElement)).toBe(true);
  });
});

/**
 * BUG-20260919-625 — the ring follows the input, not the browser's guess.
 *
 * Radix roves DOM focus onto the item under the pointer, and Chromium lets
 * that script focus inherit `:focus-visible` from the content — so the 3px
 * television ring in `base.css` was drawn around every hovered item. The
 * content now records which input moved focus last, and `base.css` strips
 * the ring from everything under `[data-input="pointer"]`; `base.spec.ts`
 * holds the rule, and happy-dom cannot resolve `:focus-visible` (see the
 * note there), so what is asserted here is the record: the hovered item sits
 * under a `pointer` surface, the arrowed item under a `keyboard` one, both
 * ways round — a laptop user reaches for the mouse and goes back to the keys
 * inside one menu.
 */
describe('MenuContent records the input that moved focus', () => {
  test('a pointer-highlighted item sits under `data-input="pointer"`', async () => {
    render(<SizeMenu />);
    const menu = await screen.findByRole('menu');
    const copy = screen.getByRole('menuitem', { name: 'Copy' });
    expect(menu.hasAttribute('data-input')).toBe(false);

    fireEvent.pointerMove(copy, { pointerType: 'mouse' });
    await tick();
    expect(menu.getAttribute('data-input')).toBe('pointer');
    expect(document.activeElement).toBe(copy);
  });

  test('a keyboard-arrowed item sits under `data-input="keyboard"`, after a hover as well', async () => {
    render(<SizeMenu />);
    const menu = await screen.findByRole('menu');
    const copy = screen.getByRole('menuitem', { name: 'Copy' });

    fireEvent.pointerMove(copy, { pointerType: 'mouse' });
    await tick();
    expect(menu.getAttribute('data-input')).toBe('pointer');

    fireEvent.keyDown(copy, { key: 'ArrowDown' });
    await tick();
    expect(menu.getAttribute('data-input')).toBe('keyboard');
    expect(document.activeElement).toBe(screen.getByRole('menuitemradio', { name: 'Small' }));

    fireEvent.pointerMove(screen.getByRole('menuitemradio', { name: 'Large' }), { pointerType: 'mouse' });
    await tick();
    expect(menu.getAttribute('data-input')).toBe('pointer');
    expect(document.activeElement).toBe(screen.getByRole('menuitemradio', { name: 'Large' }));
  });

  test("a consumer's own `onPointerMove` / `onKeyDown` on the content still run", async () => {
    let moves = 0;
    let keys = 0;
    render(
      <MenuRoot defaultOpen>
        <MenuTrigger>Open</MenuTrigger>
        <MenuContent onPointerMove={() => moves++} onKeyDown={() => keys++}>
          <MenuItem>Copy</MenuItem>
        </MenuContent>
      </MenuRoot>,
    );
    const menu = await screen.findByRole('menu');
    fireEvent.pointerMove(screen.getByRole('menuitem', { name: 'Copy' }), { pointerType: 'mouse' });
    fireEvent.keyDown(menu, { key: 'Escape' });
    expect(moves).toBe(1);
    expect(keys).toBe(1);
  });
});

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

describe('MenuItem reads the density scale', () => {
  test('a row is `min-h-(--size-row)`, the line box centred rather than pinned by padding', async () => {
    render(<SizeMenu />);
    const copy = await screen.findByRole('menuitem', { name: 'Copy' });
    expect(copy.className).toContain('min-h-(--size-row)');
    expect(copy.className).toContain('items-center');
  });

  // BUG-20260924-672 — a fixed height let a wrapped label overflow its row
  // and paint over the next one. Both item kinds must carry a minimum only.
  test('no row has a fixed height, so a label that wraps grows its row', async () => {
    render(<SizeMenu />);
    const rows = [
      await screen.findByRole('menuitem', { name: 'Copy' }),
      ...screen.getAllByRole('menuitemradio'),
    ];
    for (const row of rows) {
      const fixed = row.className.split(/\s+/).filter((c) => /^h-/.test(c));
      expect(fixed).toEqual([]);
    }
  });

  // One `text-sm` line (20px) plus `py-1.5` (6 + 6) must fit the smaller
  // rung, or a single-line row would measure taller than it did before.
  test('a single line plus its padding fits the desk rung', async () => {
    render(<SizeMenu />);
    const copy = await screen.findByRole('menuitem', { name: 'Copy' });
    expect(copy.className).toContain('py-1.5');
    expect(copy.className).toContain('text-sm');
    const desk = Number.parseInt(tokenValue(DESK, '--size-row'), 10);
    expect(20 + 6 + 6).toBeLessThanOrEqual(desk);
  });

  test('the sofa rung measures what the row drew before: 40px', () => {
    expect(tokenValue(SOFA, '--size-row')).toBe('40px');
  });

  test('the desk rung measures 32px', () => {
    expect(tokenValue(DESK, '--size-row')).toBe('32px');
  });
});
