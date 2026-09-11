import { describe, expect, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { InlineEdit } from './inline-edit';

function ControlledInlineEdit({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial);
  return <InlineEdit value={value} onCommit={setValue} aria-label="Name" />;
}

describe('InlineEdit', () => {
  test('starts as a button showing the value', () => {
    render(<ControlledInlineEdit initial="Ada" />);
    const display = screen.getByRole('button', { name: 'Name' });
    expect(display.textContent).toBe('Ada');
  });

  test('click starts the edit; Enter commits and returns to display', () => {
    render(<ControlledInlineEdit initial="Ada" />);
    fireEvent.click(screen.getByRole('button', { name: 'Name' }));

    const input = screen.getByRole('textbox', { name: 'Name' }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Grace' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    const display = screen.getByRole('button', { name: 'Name' });
    expect(display.textContent).toBe('Grace');
  });

  test('blur commits, the same as Enter', () => {
    render(<ControlledInlineEdit initial="Ada" />);
    fireEvent.click(screen.getByRole('button', { name: 'Name' }));
    const input = screen.getByRole('textbox', { name: 'Name' });
    fireEvent.change(input, { target: { value: 'Grace' } });
    fireEvent.blur(input);

    expect(screen.getByRole('button', { name: 'Name' }).textContent).toBe('Grace');
  });

  test('Escape reverts to the value the edit started from, uncommitted', () => {
    render(<ControlledInlineEdit initial="Ada" />);
    fireEvent.click(screen.getByRole('button', { name: 'Name' }));
    const input = screen.getByRole('textbox', { name: 'Name' });
    fireEvent.change(input, { target: { value: 'Grace' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    const display = screen.getByRole('button', { name: 'Name' });
    expect(display.textContent).toBe('Ada');
  });

  test("the row's height is identical in both states", () => {
    render(<ControlledInlineEdit initial="Ada" />);
    const display = screen.getByRole('button', { name: 'Name' });
    // The class that fixes the row's height, read off the token rather than a
    // hand-written pixel value — see the component's own note on why this is
    // the whole of what keeps the row from jumping.
    expect(display.className).toContain('h-[var(--size-field)]');

    fireEvent.click(display);
    const input = screen.getByRole('textbox', { name: 'Name' });
    expect(input.className).toContain('h-[var(--size-field)]');
  });
});
