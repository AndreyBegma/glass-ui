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

  test('the interface locale becomes the input’s `lang` (SYS-19)', () => {
    const { container } = render(<DateInput locale="uk" aria-label="Due date" />);
    expect(container.querySelector('input')?.getAttribute('lang')).toBe('uk');
  });

  test('an explicit `lang` wins over `locale`, and neither means no attribute', () => {
    const { container, rerender } = render(
      <DateInput locale="uk" lang="ru" aria-label="Due date" />,
    );
    expect(container.querySelector('input')?.getAttribute('lang')).toBe('ru');
    rerender(<DateInput aria-label="Due date" />);
    expect(container.querySelector('input')?.hasAttribute('lang')).toBe(false);
  });
});
