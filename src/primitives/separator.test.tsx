import { describe, expect, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { Separator } from './separator';

describe('Separator', () => {
  test('defaults to a horizontal role="separator"', () => {
    render(<Separator />);
    const sep = screen.getByRole('separator');
    expect(sep.getAttribute('aria-orientation')).toBe('horizontal');
  });

  test('can be vertical', () => {
    render(<Separator orientation="vertical" />);
    const sep = screen.getByRole('separator');
    expect(sep.getAttribute('aria-orientation')).toBe('vertical');
  });
});
