import { describe, expect, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { CommandPalette, type CommandPaletteGroup } from './command-palette';

/**
 * FEAT-20260930-004 (u7-glass) — the palette's chrome: one border, quiet
 * headings, and one row of key hints that a touch screen does not draw.
 *
 * happy-dom evaluates no media query and paints nothing, so these assert the
 * classes the browser is handed — which is where each of the three defects
 * the design review photographed actually lived.
 */

const GROUPS: CommandPaletteGroup[] = [
  {
    id: 'sections',
    title: 'Sections',
    items: [{ id: 'tasks', label: 'Tasks' }],
  },
];

const HINTS = { open: 'to open', navigate: 'to move', close: 'to close' };

function open(hints?: typeof HINTS) {
  render(
    <CommandPalette
      open
      onOpenChange={() => {}}
      search={() => GROUPS}
      onSelect={() => {}}
      hints={hints}
    />,
  );
  return screen.findByRole('dialog');
}

describe('CommandPalette chrome', () => {
  test('one border between the field and the list: the field draws none, focused or not (SYS-20)', async () => {
    await open();
    const field = screen.getByRole('combobox');
    const classes = field.className.split(' ');
    expect(classes).toContain('border-transparent');
    expect(classes).toContain('focus:border-transparent');
    expect(classes).toContain('focus:ring-0');
    expect(classes).not.toContain('focus:ring-2');
    expect(classes).not.toContain('focus:border-ink/70');
  });

  test('group headings are the label role, 12/500, in the consumer’s case (TOP-3)', async () => {
    await open();
    const heading = await screen.findByText('Sections');
    const classes = heading.className.split(' ');
    expect(classes).toContain('text-xs');
    expect(classes).toContain('font-medium');
    expect(classes).not.toContain('uppercase');
    expect(heading.className).not.toMatch(/text-\[\d+px\]|tracking-/);
  });

  test('no `hints`, no footer', async () => {
    const dialog = await open();
    expect(dialog.querySelectorAll('kbd')).toHaveLength(0);
  });

  test('with `hints`, one row: open, navigate, close — hidden under a coarse pointer', async () => {
    const dialog = await open(HINTS);
    const footer = screen.getByText('to open').closest('[aria-hidden="true"]');
    if (!footer) throw new Error('no footer');
    expect(footer.className.split(' ')).toContain(
      '[@media(pointer:coarse)]:hidden',
    );
    expect(footer.textContent).toContain('to move');
    expect(footer.textContent).toContain('to close');
    // Enter, ↑, ↓, Esc — four hints, each one outer `kbd` and its caps.
    expect(
      dialog.querySelectorAll(':scope [aria-hidden="true"] > span > kbd'),
    ).toHaveLength(4);
  });
});
