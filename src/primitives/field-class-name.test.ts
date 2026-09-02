import { describe, expect, test } from 'bun:test';
import { fieldClassName } from './field-class-name';

describe('fieldClassName', () => {
  test('carries the field base — surface, border, focus ring — as plain classes', () => {
    const result = fieldClassName();
    expect(result).toContain('bg-surface');
    expect(result).toContain('border-line-strong');
    expect(result).toContain('rounded-control');
    expect(result).toContain('focus:ring-ink/22');
  });

  test('lets a caller extend the string with an extra class', () => {
    const result = fieldClassName('mt-2');
    expect(result).toContain('mt-2');
    expect(result).toContain('bg-surface');
  });
});
