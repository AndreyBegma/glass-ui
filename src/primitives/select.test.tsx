import { describe, expect, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { Select as FromField } from './field';
import { Select } from './select';

describe('Select', () => {
  test('`./select` is the same component as the one in `./field`', () => {
    expect(Select).toBe(FromField);
  });

  test('is a native combobox: the value changes with the keyboard-driven change event', () => {
    let seen = '';
    render(
      <Select aria-label="Model" defaultValue="a" onChange={(e) => (seen = e.target.value)}>
        <option value="a">Opus</option>
        <option value="b">Sonnet</option>
      </Select>,
    );
    const select = screen.getByRole('combobox', { name: 'Model' }) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'b' } });
    expect(seen).toBe('b');
    expect(select.value).toBe('b');
  });
});
