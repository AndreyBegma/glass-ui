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

  test('`children`, given, replaces the plain-string `label`', () => {
    render(
      <Checkbox label="Fallback name">
        <span>
          Proposal <strong>#42</strong>
        </span>
      </Checkbox>,
    );
    expect(screen.queryByText('Fallback name')).toBeNull();
    const input = screen.getByRole('checkbox', { name: 'Proposal #42' });
    fireEvent.click(input);
    expect((input as HTMLInputElement).checked).toBe(true);
  });

  test('`description` is a second, richer slot below the label', () => {
    render(
      <Checkbox label="Send transaction" description={<span>0x1234…5678</span>} />,
    );
    // Inside the accessible name: it is part of the same `<label htmlFor>`
    // as the checkbox, so clicking it toggles the control too.
    const input = screen.getByRole('checkbox', {
      name: 'Send transaction 0x1234…5678',
    }) as HTMLInputElement;
    expect(input.checked).toBe(false);
    fireEvent.click(screen.getByText('0x1234…5678'));
    expect(input.checked).toBe(true);
  });
});
