import { describe, expect, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { SectionHeader } from './section-header';

describe('SectionHeader', () => {
  test('the title is an h2 at 16 px / 600', () => {
    render(<SectionHeader title="Budgets" />);
    const h2 = screen.getByRole('heading', { level: 2, name: 'Budgets' });
    expect(h2.className).toContain('text-base');
    expect(h2.className).toContain('font-semibold');
  });

  test('headingLevel moves the heading down inside another section', () => {
    render(<SectionHeader title="Limits" headingLevel={3} />);
    expect(
      screen.getByRole('heading', { level: 3, name: 'Limits' }),
    ).not.toBeNull();
  });

  test('description and actions render when given and are absent otherwise', () => {
    const { container, rerender } = render(
      <SectionHeader
        title="Budgets"
        description="Per-project spend caps."
        actions={<button type="button">Add</button>}
      />,
    );
    expect(screen.getByText('Per-project spend caps.')).not.toBeNull();
    expect(
      container.querySelector('[data-section-header-actions]')?.textContent,
    ).toBe('Add');
    rerender(<SectionHeader title="Budgets" />);
    expect(container.querySelector('[data-section-header-actions]')).toBeNull();
    expect(container.querySelector('p')).toBeNull();
  });
});
