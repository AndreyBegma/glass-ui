import { describe, expect, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { NumberInput } from './number-input';

describe('NumberInput', () => {
  test('is a native number input with a numeric inputMode by default', () => {
    render(<NumberInput aria-label="Quantity" min={0} max={10} step={1} />);
    const input = screen.getByRole('spinbutton', { name: 'Quantity' }) as HTMLInputElement;
    expect(input.type).toBe('number');
    expect(input.inputMode).toBe('numeric');
    expect(input.min).toBe('0');
    expect(input.max).toBe('10');
    expect(input.step).toBe('1');
  });
});
