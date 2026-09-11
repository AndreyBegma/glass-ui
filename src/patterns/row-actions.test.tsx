import { describe, expect, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { Pencil, Pin, Trash2 } from 'lucide-react';
import { type RowAction, RowActions, rowActionsHost } from './row-actions';

const actions: RowAction[] = [
  { id: 'pin', label: 'Pin', icon: Pin, onSelect: () => {} },
  { id: 'edit', label: 'Edit', icon: Pencil, onSelect: () => {} },
  { id: 'delete', label: 'Delete', icon: Trash2, onSelect: () => {}, tone: 'danger' },
];

function Row({ selected, ariaSelected }: { selected?: boolean; ariaSelected?: boolean }) {
  // A listbox row: the shape a tree or a table row takes, where the row is
  // focusable and `aria-selected` is its own state.
  return (
    <div role="listbox" aria-label="Reviews">
      <div
        role="option"
        tabIndex={0}
        aria-selected={ariaSelected ?? false}
        className={`${rowActionsHost} flex items-center`}
      >
        <span className="flex-1">Quarterly review</span>
        <RowActions actions={actions} selected={selected} />
      </div>
    </div>
  );
}

const cluster = () => document.querySelector('[data-row-actions]') as HTMLElement;
const classes = () => cluster().className.split(' ');

describe('RowActions', () => {
  /**
   * The acceptance criterion, and the one that matters: revealing is a visual
   * state. Nothing is hovered, nothing is focused, nothing is selected — and
   * every action is still a button in the tree with its name.
   */
  test('the actions are in the accessibility tree with nothing revealing them', () => {
    render(<Row />);

    expect(screen.getByRole('button', { name: 'Pin' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDefined();

    // The cluster hides from the eye with opacity and with nothing else. Each
    // of these would take the buttons out of the tree, or out of the tab
    // order, and each is the obvious way to write "hidden until hover".
    expect(cluster().getAttribute('aria-hidden')).toBeNull();
    expect(cluster().hidden).toBe(false);
    for (const forbidden of ['hidden', 'invisible', 'sr-only', 'pointer-events-none']) {
      expect(classes()).not.toContain(forbidden);
    }
    expect(classes()).toContain('opacity-0');
  });

  test('a keyboard reaches them, and focus inside the row reveals the cluster', () => {
    render(<Row />);
    const pin = screen.getByRole('button', { name: 'Pin' });
    pin.focus();
    expect(document.activeElement).toBe(pin);
    // `focus-within` is the row's, so the rule is on the cluster as a group
    // variant rather than something JavaScript toggles.
    expect(classes()).toContain('group-focus-within/row-actions:opacity-100');
  });

  test('the row is the scope: hover on the host, not on the cluster', () => {
    render(<Row />);
    const row = screen.getByRole('option');
    expect(row.className.split(' ')).toContain(rowActionsHost);
    expect(classes()).toContain('group-hover/row-actions:opacity-100');
    expect(classes()).not.toContain('hover:opacity-100');
  });

  test('a coarse pointer always reveals it', () => {
    render(<Row />);
    expect(classes()).toContain('pointer-coarse:opacity-100');
  });

  test('a selected row always reveals it, by prop or by `aria-selected`', () => {
    const { unmount } = render(<Row selected />);
    expect(classes()).toContain('opacity-100');
    expect(cluster().getAttribute('data-selected')).toBe('true');
    unmount();

    render(<Row ariaSelected />);
    expect(screen.getByRole('option').getAttribute('aria-selected')).toBe('true');
    expect(classes()).toContain('group-aria-selected/row-actions:opacity-100');
  });

  test('each action is one button, named by its label, with the icon hidden', () => {
    let pinned = 0;
    render(
      <div className={rowActionsHost}>
        <RowActions
          actions={[{ id: 'pin', label: 'Pin', icon: Pin, onSelect: () => pinned++ }]}
        />
      </div>,
    );
    const pin = screen.getByRole('button', { name: 'Pin' });
    expect(pin.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    fireEvent.click(pin);
    expect(pinned).toBe(1);
  });

  test('a danger action is tinted; a disabled one is disabled', () => {
    render(
      <div className={rowActionsHost}>
        <RowActions
          actions={[
            { id: 'delete', label: 'Delete', icon: Trash2, onSelect: () => {}, tone: 'danger' },
            { id: 'edit', label: 'Edit', icon: Pencil, onSelect: () => {}, disabled: true },
          ]}
        />
      </div>,
    );
    expect(
      screen.getByRole('button', { name: 'Delete' }).className.split(' '),
    ).toContain('text-danger');
    expect((screen.getByRole('button', { name: 'Edit' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  test('children come after the list, for what is not a plain command', () => {
    render(
      <div className={rowActionsHost}>
        <RowActions actions={actions}>
          <button type="button">More</button>
        </RowActions>
      </div>,
    );
    const buttons = screen.getAllByRole('button');
    expect(buttons.map((b) => b.getAttribute('aria-label') ?? b.textContent)).toEqual([
      'Pin',
      'Edit',
      'Delete',
      'More',
    ]);
  });
});
