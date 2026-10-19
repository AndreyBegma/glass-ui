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

  // #93 — the browser's own parts are styled to match the field.
  test('digits are tabular and the picker glyph is toned down, in every type', () => {
    for (const type of ['date', 'time', 'datetime-local'] as const) {
      const { container, unmount } = render(<DateInput type={type} aria-label={type} />);
      const classes = Array.from(container.querySelector('input')?.classList ?? []);
      expect(classes).toContain('tabular-nums');
      // Never shrunk below its value: a narrow track would clip the time.
      expect(classes).not.toContain('min-w-0');
      expect(classes).toContain('[&::-webkit-calendar-picker-indicator]:opacity-55');
      expect(classes).toContain('hover:[&::-webkit-calendar-picker-indicator]:opacity-100');
      unmount();
    }
  });

  test('keeps the field look and takes a caller className', () => {
    const { container } = render(
      <DateInput aria-label="Due date" tone="on-glass" className="w-44" />,
    );
    const classes = Array.from(container.querySelector('input')?.classList ?? []);
    expect(classes).toContain('h-(--size-field)');
    expect(classes).toContain('bg-hover');
    expect(classes).toContain('w-44');
    expect(classes).not.toContain('w-full');
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
