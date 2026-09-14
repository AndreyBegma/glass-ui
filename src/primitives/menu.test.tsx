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
  test('a row is `h-(--size-row)`, the line box centred rather than pinned by padding', async () => {
    render(<SizeMenu />);
    const copy = await screen.findByRole('menuitem', { name: 'Copy' });
    expect(copy.className).toContain('h-(--size-row)');
    expect(copy.className).toContain('items-center');
  });

  test('the sofa rung measures what the row drew before: 40px', () => {
    expect(tokenValue(SOFA, '--size-row')).toBe('40px');
  });

  test('the desk rung measures 32px', () => {
    expect(tokenValue(DESK, '--size-row')).toBe('32px');
  });
});
