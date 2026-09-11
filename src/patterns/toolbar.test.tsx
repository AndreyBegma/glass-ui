import { describe, expect, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { Toolbar } from './toolbar';

describe('Toolbar', () => {
  test('renders all three slots', () => {
    render(
      <Toolbar
        views={<span>Views</span>}
        filters={<span>Filters</span>}
        actions={<button type="button">New</button>}
      />,
    );
    expect(screen.getByText('Views')).toBeDefined();
    expect(screen.getByText('Filters')).toBeDefined();
    expect(screen.getByRole('button', { name: 'New' })).toBeDefined();
  });

  test('views and filters scroll together; the trailing action does not', () => {
    const { container } = render(
      <Toolbar
        views={<span>Views</span>}
        filters={<span>Filters</span>}
        actions={<button type="button">New</button>}
      />,
    );
    const scrollArea = container.querySelector('.overflow-x-auto');
    expect(scrollArea).not.toBeNull();
    expect(scrollArea?.contains(screen.getByText('Views'))).toBe(true);
    expect(scrollArea?.contains(screen.getByText('Filters'))).toBe(true);
    expect(scrollArea?.contains(screen.getByRole('button', { name: 'New' }))).toBe(false);
  });

  test('an omitted slot renders nothing for it — no empty wrapper', () => {
    const { container } = render(<Toolbar actions={<button type="button">New</button>} />);
    expect(container.querySelector('.overflow-x-auto')).toBeNull();
    expect(screen.getByRole('button', { name: 'New' })).toBeDefined();
  });

  test('holds no state of its own: the same props always render the same output', () => {
    const props = { views: <span data-testid="v">Day</span> };
    const first = render(<Toolbar {...props} />);
    const firstHtml = first.container.innerHTML;
    first.unmount();
    const second = render(<Toolbar {...props} />);
    expect(second.container.innerHTML).toBe(firstHtml);
  });
});
