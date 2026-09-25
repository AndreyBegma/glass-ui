import { describe, expect, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { Avatar } from './avatar';

describe('Avatar', () => {
  test('renders two-letter initials from a name — first and last word', () => {
    render(<Avatar name="Ada Lovelace" />);
    expect(screen.getByText('AL')).not.toBeNull();
  });

  test('a single-word name is truncated to two letters', () => {
    render(<Avatar name="Cher" />);
    expect(screen.getByText('CH')).not.toBeNull();
  });

  test('an image renders instead of initials', () => {
    render(<Avatar name="Ada Lovelace" image="/ada.png" alt="Ada Lovelace" />);
    const img = screen.getByRole('img', { name: 'Ada Lovelace' }) as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('/ada.png');
    expect(screen.queryByText('AL')).toBeNull();
  });
});
