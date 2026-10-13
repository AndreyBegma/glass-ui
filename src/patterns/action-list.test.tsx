import { describe, expect, mock, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { GitBranch, Plus, Trash2 } from 'lucide-react';
import { ActionList } from './action-list';

describe('ActionList', () => {
  test('rows are real buttons, each its own Tab stop, and run their action', () => {
    const onNew = mock();
    render(
      <ActionList
        heading="Quick actions"
        items={[
          { id: 'new', label: 'New agent', icon: Plus, onSelect: onNew },
          {
            id: 'wt',
            label: 'Open worktree',
            icon: GitBranch,
            onSelect: () => {},
          },
        ]}
      />,
    );
    expect(
      screen.getByRole('heading', { name: 'Quick actions' }),
    ).not.toBeNull();
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(2);
    for (const button of buttons) expect(button.tabIndex).toBe(0);
    fireEvent.click(screen.getByRole('button', { name: 'New agent' }));
    expect(onNew).toHaveBeenCalledTimes(1);
  });

  test('an href row is an anchor by default, with a chevron', () => {
    const { container } = render(
      <ActionList items={[{ id: 'docs', label: 'Docs', href: '/docs' }]} />,
    );
    const link = screen.getByRole('link', { name: 'Docs' });
    expect(link.getAttribute('href')).toBe('/docs');
    expect(container.querySelector('[data-action-chevron]')).not.toBeNull();
  });

  test('link renders the href rows with the consumer element', () => {
    const link = mock(({ href, className, children }) => (
      <a data-router href={href} className={className}>
        {children}
      </a>
    ));
    const { container } = render(
      <ActionList
        link={link}
        items={[{ id: 'docs', label: 'Docs', href: '/docs' }]}
      />,
    );
    expect(link).toHaveBeenCalledTimes(1);
    expect(
      container.querySelector('a[data-router]')?.getAttribute('href'),
    ).toBe('/docs');
  });

  test('chevron is opt-in for buttons and opt-out for links', () => {
    const { container } = render(
      <ActionList
        items={[
          { id: 'a', label: 'A', onSelect: () => {}, chevron: true },
          { id: 'b', label: 'B', href: '/b', chevron: false },
          { id: 'c', label: 'C', onSelect: () => {} },
        ]}
      />,
    );
    expect(
      container.querySelector('[data-action-item="a"] [data-action-chevron]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-action-item="b"] [data-action-chevron]'),
    ).toBeNull();
    expect(
      container.querySelector('[data-action-item="c"] [data-action-chevron]'),
    ).toBeNull();
  });

  test('a disabled row is a disabled button, even with an href', () => {
    const onSelect = mock();
    render(
      <ActionList
        items={[
          {
            id: 'x',
            label: 'Delete',
            icon: Trash2,
            onSelect,
            disabled: true,
            tone: 'danger',
          },
          { id: 'y', label: 'Later', href: '/later', disabled: true },
        ]}
      />,
    );
    const del = screen.getByRole('button', {
      name: 'Delete',
    }) as HTMLButtonElement;
    expect(del.disabled).toBe(true);
    expect(del.className).toContain('text-danger');
    fireEvent.click(del);
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.queryByRole('link')).toBeNull();
    expect(
      (screen.getByRole('button', { name: 'Later' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  test('glass by default, content on request', () => {
    const { container, rerender } = render(<ActionList items={[]} />);
    const root = () =>
      container.querySelector('[data-action-list]') as HTMLElement;
    expect(root().className).toMatch(/(^|\s)glass(\s|$)/);
    rerender(<ActionList items={[]} surface="content" />);
    expect(root().className).toContain('surface-content');
    expect(root().className).not.toMatch(/(^|\s)glass(\s|$)/);
  });
});
