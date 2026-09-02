import { describe, expect, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { Progress } from './progress';

describe('Progress', () => {
  test('is a real role="progressbar" with the value baked into its ARIA, and the label is the visible copy', () => {
    render(<Progress value={12} max={40} label="12 of 40 GB" hint="5 days left" />);
    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBe('12');
    expect(bar.getAttribute('aria-valuemin')).toBe('0');
    expect(bar.getAttribute('aria-valuemax')).toBe('40');
    expect(screen.getByText('12 of 40 GB')).not.toBeNull();
    expect(screen.getByText('5 days left')).not.toBeNull();
  });

  test('clamps the fill width to the 0-100 range even past max', () => {
    render(<Progress value={999} max={40} label="over" />);
    const fill = screen.getByRole('progressbar').firstElementChild as HTMLElement;
    expect(fill.style.width).toBe('100%');
  });
});
