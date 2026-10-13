import { describe, expect, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { EmptyState } from './empty-state';

const root = (container: HTMLElement) => container.firstElementChild as HTMLElement;

describe('EmptyState', () => {
  test('centred by default', () => {
    const { container } = render(<EmptyState title="Nothing here" />);
    const cls = root(container).className;
    expect(cls).toContain('items-center');
    expect(cls).toContain('text-center');
  });

  test('align="start" starts at the left edge', () => {
    const { container } = render(<EmptyState title="Nothing here" align="start" />);
    const cls = root(container).className;
    expect(cls).toContain('items-start');
    expect(cls).toContain('text-left');
    expect(cls).not.toContain('items-center');
    expect(cls).not.toContain('text-center');
  });

  test('the title is 16/600', () => {
    render(<EmptyState title="Nothing here" />);
    const cls = screen.getByText('Nothing here').className;
    expect(cls).toContain('text-base');
    expect(cls).toContain('font-semibold');
  });

  test('an icon renders inside the size-10 rounded-full disc', () => {
    const { container } = render(
      <EmptyState title="Nothing here" icon={<svg data-testid="icon" />} />,
    );
    const disc = screen.getByTestId('icon').parentElement as HTMLElement;
    expect(disc.className).toContain('size-10');
    expect(disc.className).toContain('rounded-full');
    expect(root(container).contains(disc)).toBe(true);
  });

  test('no icon, no disc', () => {
    const { container } = render(<EmptyState title="Nothing here" />);
    expect(container.querySelector('.rounded-full')).toBeNull();
  });

  test('action then secondaryAction, in one row', () => {
    render(
      <EmptyState
        title="Nothing here"
        action={<button type="button">Create</button>}
        secondaryAction={<button type="button">Learn more</button>}
      />,
    );
    const first = screen.getByText('Create');
    const second = screen.getByText('Learn more');
    expect(first.parentElement).toBe(second.parentElement as HTMLElement);
    expect(first.nextElementSibling).toBe(second);
  });

  test('a secondaryAction alone still gets the row', () => {
    render(
      <EmptyState
        title="Nothing here"
        secondaryAction={<button type="button">Learn more</button>}
      />,
    );
    expect(screen.getByText('Learn more').parentElement?.className).toContain('flex');
  });

  test('no actions given → no actions row', () => {
    const { container } = render(
      <EmptyState title="Nothing here" description="Soon." />,
    );
    expect(container.querySelector('.mt-1')).toBeNull();
    expect(root(container).children.length).toBe(2);
  });
});
