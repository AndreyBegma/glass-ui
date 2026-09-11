import { describe, expect, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { Combobox, type ComboboxOption } from './combobox';

const FRUIT: ComboboxOption[] = [
  { value: 'apple', label: 'Apple' },
  { value: 'grape', label: 'Grape' },
  { value: 'grapefruit', label: 'Grapefruit' },
];

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function SingleCombobox({ options = FRUIT }: { options?: ComboboxOption[] }) {
  const [value, setValue] = useState<string | null>(null);
  return (
    <Combobox
      aria-label="Fruit"
      options={options}
      value={value}
      onValueChange={setValue}
    />
  );
}

function MultipleCombobox({ initial = [] as string[] }: { initial?: string[] }) {
  const [value, setValue] = useState<string[]>(initial);
  return (
    <Combobox aria-label="Fruit" options={FRUIT} multiple value={value} onValueChange={setValue} />
  );
}

describe('Combobox', () => {
  test('typing filters the option list', () => {
    render(<SingleCombobox />);
    const input = screen.getByRole('combobox', { name: 'Fruit' });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'grape' } });

    expect(screen.getByRole('option', { name: 'Grape' })).toBeDefined();
    expect(screen.getByRole('option', { name: 'Grapefruit' })).toBeDefined();
    expect(screen.queryByRole('option', { name: 'Apple' })).toBeNull();
  });

  test('arrow keys move the highlight; aria-activedescendant follows it', () => {
    render(<SingleCombobox />);
    const input = screen.getByRole('combobox', { name: 'Fruit' }) as HTMLInputElement;
    fireEvent.focus(input);

    // Opening the list clamps the highlight onto the first row rather than
    // onto nothing — `CommandPalette`'s own reasoning: there is always a
    // candidate for Enter to commit.
    let apple = screen.getByRole('option', { name: 'Apple' });
    expect(input.getAttribute('aria-activedescendant')).toBe(apple.id);
    expect(apple.getAttribute('aria-selected')).toBe('true');

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    apple = screen.getByRole('option', { name: 'Apple' });
    const grape = screen.getByRole('option', { name: 'Grape' });
    expect(input.getAttribute('aria-activedescendant')).toBe(grape.id);
    expect(apple.getAttribute('aria-selected')).toBe('false');

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    const grapefruit = screen.getByRole('option', { name: 'Grapefruit' });
    expect(input.getAttribute('aria-activedescendant')).toBe(grapefruit.id);
  });

  test('Enter selects the highlighted option and closes the list', () => {
    render(<SingleCombobox />);
    const input = screen.getByRole('combobox', { name: 'Fruit' }) as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.queryByRole('listbox')).toBeNull();
    expect(input.value).toBe('Apple');
  });

  test('Escape closes the list without selecting', () => {
    render(<SingleCombobox />);
    const input = screen.getByRole('combobox', { name: 'Fruit' });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'gra' } });
    expect(screen.getByRole('listbox')).toBeDefined();

    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  test('no matches renders a sentence, not a blank list', () => {
    render(<SingleCombobox />);
    const input = screen.getByRole('combobox', { name: 'Fruit' });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'zzz' } });

    expect(screen.getByRole('listbox').textContent).toContain('No matches');
  });

  test('multiple mode renders chips, and Backspace on an empty field removes the last one', () => {
    render(<MultipleCombobox initial={['apple', 'grape']} />);
    expect(screen.getByText('Apple')).toBeDefined();
    expect(screen.getByText('Grape')).toBeDefined();

    // Not focused first: the list opening would put the now-available
    // "Grape" back in front of the field as an option, which is a second,
    // unrelated match this assertion does not want to trip on.
    const input = screen.getByRole('combobox', { name: 'Fruit' });
    fireEvent.keyDown(input, { key: 'Backspace' });

    expect(screen.queryByText('Grape')).toBeNull();
    expect(screen.getByText('Apple')).toBeDefined();
  });

  test('a chip removes itself on its own button, without touching the others', () => {
    render(<MultipleCombobox initial={['apple', 'grape']} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove Apple' }));

    expect(screen.queryByText('Apple')).toBeNull();
    expect(screen.getByText('Grape')).toBeDefined();
  });

  test('an async source is debounced, and the pending state is announced', async () => {
    function AsyncCombobox() {
      const [value, setValue] = useState<string | null>(null);
      return (
        <Combobox
          aria-label="Fruit"
          debounceMs={10}
          options={(query) =>
            new Promise<ComboboxOption[]>((resolve) => {
              setTimeout(
                () =>
                  resolve(FRUIT.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))),
                40,
              );
            })
          }
          value={value}
          onValueChange={setValue}
        />
      );
    }

    render(<AsyncCombobox />);
    const input = screen.getByRole('combobox', { name: 'Fruit' });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'grape' } });

    // Nothing fires before the debounce window closes.
    await wait(5);
    expect(screen.queryByRole('option')).toBeNull();

    // The debounce has fired and the promise is in flight.
    await wait(25);
    expect(screen.getByText('Searching')).toBeDefined();

    // The promise has resolved.
    await wait(40);
    expect(screen.getByRole('option', { name: 'Grape' })).toBeDefined();
    expect(screen.queryByText('Searching')).toBeNull();
  });
});
