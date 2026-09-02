import { describe, expect, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { Badge } from './badge';

describe('Badge', () => {
  test('renders the count, capped at 99+', () => {
    render(<Badge count={7} />);
    expect(screen.getByText('7')).not.toBeNull();
  });

  test('caps a count over 99', () => {
    render(<Badge count={140} />);
    expect(screen.getByText('99+')).not.toBeNull();
  });

  test('a dot carries no text, regardless of count', () => {
    const { container } = render(<Badge dot count={4} />);
    expect(container.textContent).toBe('');
  });
});
