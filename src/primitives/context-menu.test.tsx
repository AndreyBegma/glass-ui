import { afterEach, describe, expect, test } from 'bun:test';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Pencil, Pin, Trash2 } from 'lucide-react';
import { RowActions, rowActionsHost } from '../patterns/row-actions';
import {
  type ContextMenuAction,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRoot,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from './context-menu';
import { MENU_CONTENT_CLASS, MENU_ITEM_CLASS, MENU_LABEL_CLASS } from './menu';

/** Roving focus moves in a `setTimeout(0)`, not synchronously with the key. */
const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const actions: ContextMenuAction[] = [
  { id: 'pin', label: 'Pin', icon: Pin, onSelect: () => {} },
  { id: 'edit', label: 'Edit', icon: Pencil, onSelect: () => {} },
  { id: 'delete', label: 'Delete', icon: Trash2, onSelect: () => {}, tone: 'danger' },
];

/**
 * A row built from one list: the cluster for the eye and the pointer, the
 * context menu for the right-click. This is the shape decision 6's
 * acceptance criterion describes, and the test below reads both renderers.
 */
function Row({ list = actions }: { list?: ContextMenuAction[] }) {
  return (
    <ContextMenuRoot>
      <ContextMenuTrigger asChild>
        <div className={rowActionsHost}>
          <span>Quarterly review</span>
          <RowActions actions={list} />
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent actions={list} />
    </ContextMenuRoot>
  );
}

/**
 * BUG-20260919-625 — let the previous test's menu finish leaving.
 *
 * Radix's `FocusScope` restores focus in a `setTimeout(0)` from its unmount,
 * which `cleanup` does not wait for. Under happy-dom that deferred
 * `document.body.focus()` fires `focusin`, and a menu the *next* test has
 * already opened reads it as focus leaving and dismisses itself. The tests
 * above this ticket never noticed because each asserts within the macrotask
 * that opened the menu; a test that waits for Radix's roving focus (a
 * `setTimeout(0)` of its own) does. So: unmount here, then one turn of the
 * event loop, before the next test mounts. `test-setup.ts`'s own `cleanup`
 * then finds nothing left to do.
 */
afterEach(async () => {
  cleanup();
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
});

describe('ContextMenu', () => {
  test('a right-click opens it where the pointer is, with one item per action', async () => {
    render(<Row />);
    expect(screen.queryByRole('menu')).toBeNull();

    fireEvent.contextMenu(screen.getByText('Quarterly review'), { clientX: 40, clientY: 20 });

    const menu = await screen.findByRole('menu');
    expect(menu).toBeDefined();
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
      'Pin',
      'Edit',
      'Delete',
    ]);
  });

  /**
   * Shift+F10 and the Menu key produce the same `contextmenu` event a mouse
   * does, dispatched at the focused element. Radix listens for the event and
   * not for the button, so a keyboard opens this without any code here — and
   * this test is the proof that stays true across a Radix upgrade.
   */
  test('the `contextmenu` event from a keyboard opens it too', async () => {
    render(<Row />);
    const trigger = screen.getByText('Quarterly review').parentElement as HTMLElement;
    trigger.tabIndex = 0;
    trigger.focus();

    fireEvent.contextMenu(trigger);

    expect(await screen.findByRole('menu')).toBeDefined();
  });

  /**
   * Decision 6's acceptance criterion: every action the menu offers is also
   * reachable from a `RowActions` affordance in the same row. With one list
   * and two renderers that is a property rather than a promise; this reads
   * both renderers and compares.
   */
  test('every action in the menu is also a visible affordance in the row', async () => {
    render(<Row />);

    const affordances = screen
      .getAllByRole('button')
      .map((button) => button.getAttribute('aria-label') ?? '');

    fireEvent.contextMenu(screen.getByText('Quarterly review'));
    const items = (await screen.findAllByRole('menuitem')).map((item) => item.textContent);

    expect(items).toEqual(affordances);
  });

  test('choosing an item runs its action and closes the menu', async () => {
    let edited = 0;
    render(
      <Row
        list={[{ id: 'edit', label: 'Edit', icon: Pencil, onSelect: () => edited++ }]}
      />,
    );
    fireEvent.contextMenu(screen.getByText('Quarterly review'));
    const edit = await screen.findByRole('menuitem', { name: 'Edit' });

    fireEvent.click(edit);

    expect(edited).toBe(1);
  });

  test('a danger action is tinted; a disabled one is marked', async () => {
    render(
      <Row
        list={[
          { id: 'delete', label: 'Delete', icon: Trash2, onSelect: () => {}, tone: 'danger' },
          { id: 'edit', label: 'Edit', icon: Pencil, onSelect: () => {}, disabled: true },
        ]}
      />,
    );
    fireEvent.contextMenu(screen.getByText('Quarterly review'));
    const del = await screen.findByRole('menuitem', { name: 'Delete' });
    expect(del.className.split(' ')).toContain('text-danger');
    expect(screen.getByRole('menuitem', { name: 'Edit' }).getAttribute('aria-disabled')).toBe(
      'true',
    );
  });

  test('it is non-modal by default, as `MenuRoot` is', async () => {
    render(<Row />);
    fireEvent.contextMenu(screen.getByText('Quarterly review'));
    await screen.findByRole('menu');
    // Radix's modal menus mark the body to lock its scroll; a non-modal one
    // leaves it alone, which is what keeps `base.css`'s depth rule quiet.
    expect(document.body.style.pointerEvents).not.toBe('none');
  });

  /**
   * Decision 6's other half: the styling is `Menu`'s, imported rather than
   * copied. This does not compare two menus — there is nothing to compare —
   * it asserts that what the parts wear *is* the exported string, so a future
   * local class list that quietly stops reading it would fail here.
   */
  test('the parts wear `Menu`’s exported strings', async () => {
    render(
      <ContextMenuRoot>
        <ContextMenuTrigger asChild>
          <div>Row</div>
        </ContextMenuTrigger>
        <ContextMenuContent data-testid="content">
          <ContextMenuLabel data-testid="label">Size</ContextMenuLabel>
          <ContextMenuItem data-testid="item">Copy</ContextMenuItem>
          <ContextMenuItem tone="danger" data-testid="danger">
            Delete
          </ContextMenuItem>
          <ContextMenuSeparator />
        </ContextMenuContent>
      </ContextMenuRoot>,
    );
    fireEvent.contextMenu(screen.getByText('Row'));
    const content = await screen.findByTestId('content');

    expect(content.className.startsWith(MENU_CONTENT_CLASS)).toBe(true);
    expect(screen.getByTestId('label').className).toBe(MENU_LABEL_CLASS);
    expect(screen.getByTestId('item').className).toBe(MENU_ITEM_CLASS.default);
    expect(screen.getByTestId('danger').className).toBe(MENU_ITEM_CLASS.danger);
  });

  /**
   * BUG-20260919-625 — the same Radix core roves focus on hover here, so the
   * content records the input the way `MenuContent` does; `menu.test.tsx`
   * says why the record and not the computed outline is what is asserted.
   */
  test('the content records the input that moved focus: pointer, then keyboard', async () => {
    render(<Row />);
    fireEvent.contextMenu(screen.getByText('Quarterly review'), { clientX: 40, clientY: 20 });
    const menu = await screen.findByRole('menu');
    expect(menu.hasAttribute('data-input')).toBe(false);

    const pin = screen.getByRole('menuitem', { name: 'Pin' });
    fireEvent.pointerMove(pin, { pointerType: 'mouse' });
    await tick();
    expect(menu.getAttribute('data-input')).toBe('pointer');
    expect(document.activeElement).toBe(pin);

    fireEvent.keyDown(pin, { key: 'ArrowDown' });
    await tick();
    expect(menu.getAttribute('data-input')).toBe('keyboard');
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Edit' }));
  });
});
