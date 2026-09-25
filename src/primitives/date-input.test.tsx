import { describe, expect, test } from 'bun:test';
import { render } from '@testing-library/react';
import { DateInput } from './date-input';

describe('DateInput', () => {
  test('defaults to a native date input', () => {
    const { container } = render(<DateInput aria-label="Due date" />);
    const input = container.querySelector('input');
    expect(input?.type).toBe('date');
  });

  test('can become a time or datetime-local field', () => {
    const { container } = render(<DateInput type="time" aria-label="Start time" />);
    const input = container.querySelector('input');
    expect(input?.type).toBe('time');
  });
});
