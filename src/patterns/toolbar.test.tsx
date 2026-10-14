import { describe, expect, mock, test } from 'bun:test';
import { fireEvent, render, screen, within } from '@testing-library/react';
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

describe('Toolbar active filters (issue 130)', () => {
  const filters = (onRemove = () => {}) => [
    { key: 'project', label: 'Project: Atlas', onRemove },
    { key: 'state', label: 'State: failed', onRemove: () => {} },
  ];

  test('none of the new props: the bar is the root and nothing is added', () => {
    const { container } = render(
      <Toolbar aria-label="Filter" className="x" filters={<span>Filters</span>} />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute('aria-label')).toBe('Filter');
    expect(root.className).toContain('x');
    expect(root.className).toContain('items-center');
    expect(container.children).toHaveLength(1);
    expect(screen.queryByRole('list')).toBeNull();
  });

  test('an empty list draws no chip row', () => {
    render(<Toolbar filters={<span>Filters</span>} activeFilters={[]} onClearAll={() => {}} />);
    expect(screen.queryByRole('list', { name: 'Active filters' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Clear all' })).toBeNull();
  });

  test('each filter is a chip that removes itself, under the bar', () => {
    const onRemove = mock(() => {});
    const { container } = render(
      <Toolbar aria-label="Filter" filters={<span>Filters</span>} activeFilters={filters(onRemove)} />,
    );
    const list = screen.getByRole('list', { name: 'Active filters' });
    expect(list.querySelectorAll('li')).toHaveLength(2);
    expect(within(list).getByText('Project: Atlas')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Remove Project: Atlas' }));
    expect(onRemove).toHaveBeenCalledTimes(1);
    // The label moves to the column that now holds the bar and the chips.
    expect((container.firstElementChild as HTMLElement).getAttribute('aria-label')).toBe('Filter');
    expect(screen.queryByRole('button', { name: 'Clear all' })).toBeNull();
  });

  test('"Clear all" appears with `onClearAll` and calls it', () => {
    const onClearAll = mock(() => {});
    render(<Toolbar activeFilters={filters()} onClearAll={onClearAll} clearAllLabel="Reset" />);
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(onClearAll).toHaveBeenCalledTimes(1);
  });
});

describe('Toolbar collapse (issue 130)', () => {
  test('below the breakpoint the filters hide and one button stands in', () => {
    render(
      <Toolbar collapseBelow="md" filters={<span>Status select</span>} activeCount={2} />,
    );
    const inline = screen.getByText('Status select').parentElement as HTMLElement;
    expect(inline.className).toContain('hidden');
    expect(inline.className).toContain('md:flex');
    const button = screen.getByRole('button', { name: 'Filters (2)' });
    expect(button.className).toContain('md:hidden');
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });

  test('the count defaults to the active filters, and zero shows none', () => {
    const { unmount } = render(
      <Toolbar
        collapseBelow="sm"
        filters={<span>f</span>}
        filtersLabel="Refine"
        activeFilters={[{ key: 'a', label: 'A', onRemove: () => {} }]}
      />,
    );
    expect(screen.getByRole('button', { name: 'Refine (1)' })).toBeDefined();
    unmount();
    render(<Toolbar collapseBelow="sm" filters={<span>f</span>} />);
    expect(screen.getByRole('button', { name: 'Filters' })).toBeDefined();
  });

  test('the button opens a bottom sheet holding the filters', async () => {
    render(<Toolbar collapseBelow="sm" filters={<span>Status select</span>} />);
    fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
    const dialog = await screen.findByRole('dialog', { name: 'Filters' });
    expect(within(dialog).getByText('Status select')).toBeDefined();
  });

  test('no filters, nothing to collapse', () => {
    render(<Toolbar collapseBelow="sm" actions={<button type="button">New</button>} />);
    expect(screen.queryByRole('button', { name: 'Filters' })).toBeNull();
  });
});
