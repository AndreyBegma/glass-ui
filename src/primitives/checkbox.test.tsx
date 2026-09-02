import { describe, expect, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { Checkbox } from './checkbox';

describe('Checkbox', () => {
  test('is a real checkbox input, toggled by a click, named by its own <label>', () => {
    render(<Checkbox label="Complete" />);
    const input = screen.getByRole('checkbox', { name: 'Complete' }) as HTMLInputElement;
    expect(input.checked).toBe(false);
    fireEvent.click(input);
    expect(input.checked).toBe(true);
  });

  test('sets the indeterminate DOM property, which has no HTML attribute to pass through', () => {
    render(<Checkbox label="Some selected" indeterminate />);
    const input = screen.getByRole('checkbox', { name: 'Some selected' }) as HTMLInputElement;
    expect(input.indeterminate).toBe(true);
    expect(input.hasAttribute('indeterminate')).toBe(false);
  });

  test('shows the hint alongside the label', () => {
    render(<Checkbox label="Notify me" hint="Sent to your inbox" />);
    expect(screen.getByText('Sent to your inbox')).not.toBeNull();
  });
});
