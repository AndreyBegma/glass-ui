import { describe, expect, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
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
