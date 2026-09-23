import { describe, expect, test } from 'bun:test';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { MenuItem } from '../primitives/menu';
import {
  applyWidgetMove,
  resolveWidgetMove,
  resolveWidgetResize,
  WidgetGrid,
  type WidgetGridItem,
  type WidgetMove,
  type WidgetResize,
} from './widget-grid';
import * as reducer from './widget-grid-reducer';

/**
 * FEAT-20260923-003 — `W1` decision 5, as a test.
 *
 * The acceptance criterion the specification names for this file is the
 * deep-equality one: from the same state, the pointer path and the menu (or
 * separator) path produce the same `WidgetMove` and the same `WidgetResize`.
 * One reducer per axis, two inputs each. The rest is the package's rules:
 * no grid item is glass, nothing writes a height, the handle is the only
 * element that swallows a touch, and arrange mode is where the controls are.
 */

const ITEMS: WidgetGridItem[] = [
  { id: 'capture', label: 'Capture', span: 4, minSpan: 2 },
  { id: 'habits', label: 'Habits', span: 2 },
  { id: 'money', label: 'Money', span: 2, minSpan: 1 },
  { id: 'week', label: 'Week', span: 2, minSpan: 2 },
];

interface HarnessProps {
  items?: WidgetGridItem[];
  columns?: 1 | 2 | 3 | 4;
  arranging?: boolean;
  resizable?: boolean;
  moves?: WidgetMove[];
  resizes?: WidgetResize[];
  withMenu?: boolean;
}

function Harness({
  items: initial = ITEMS,
  columns = 4,
  arranging = true,
  resizable = true,
  moves,
  resizes,
  withMenu = false,
}: HarnessProps) {
  const [items, setItems] = useState<readonly WidgetGridItem[]>(initial);
  return (
    <WidgetGrid
      aria-label="Today"
      items={items}
      columns={columns}
      arranging={arranging}
      resizable={resizable}
      renderItem={(item) => (
        <p>
          {item.label} body <a href={`/${item.id}`}>Open {item.label}</a>
        </p>
      )}
      renderItemMenu={
        withMenu ? (item) => <MenuItem>Hide {item.label}</MenuItem> : undefined
      }
      onMove={(move) => {
        moves?.push(move);
        setItems((current) => applyWidgetMove(current, move));
      }}
      onResize={(resize) => {
        resizes?.push(resize);
        setItems((current) =>
          current.map((item) =>
            item.id === resize.id ? { ...item, span: resize.span } : item,
          ),
        );
      }}
    />
  );
}

const itemEls = () => screen.getAllByRole('listitem');
const itemOf = (label: string) =>
  screen.getByText(`${label} body`, { exact: false }).closest('li') as HTMLLIElement;
const order = () =>
  itemEls().map((li) => li.querySelector('p')?.textContent?.split(' body')[0]);
const trigger = (label: string) => screen.getByRole('button', { name: `${label} actions` });
const grip = (label: string) => screen.getByRole('button', { name: `Move ${label}` });
const separator = (label: string) => screen.getByRole('separator', { name: `Resize ${label}` });
const announcement = () =>
  document.querySelector('[aria-live="polite"]')?.textContent ?? '';
const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

async function choose(label: string, item: string) {
  fireEvent.pointerDown(trigger(label), { button: 0, pointerType: 'mouse' });
  const menuItem = await screen.findByRole('menuitem', { name: item });
  fireEvent.click(menuItem);
  await tick();
}

async function menuOf(label: string) {
  fireEvent.pointerDown(trigger(label), { button: 0, pointerType: 'mouse' });
  return screen.findByRole('menu');
}

/** happy-dom lays nothing out; each element states its own box. */
function box(el: Element, left: number, top: number, width: number, height: number) {
  (el as HTMLElement).getBoundingClientRect = () =>
    ({
      left,
      top,
      width,
      height,
      right: left + width,
      bottom: top + height,
      x: left,
      y: top,
    }) as DOMRect;
}

/**
 * The layout a 400px, 4-column, gapless grid draws for `ITEMS`: capture
 * across the first row, habits and money side by side, week alone.
 */
function layOut() {
  box(screen.getByRole('list'), 0, 0, 400, 300);
  box(itemOf('Capture'), 0, 0, 400, 100);
  box(itemOf('Habits'), 0, 100, 200, 100);
  box(itemOf('Money'), 200, 100, 200, 100);
  box(itemOf('Week'), 0, 200, 200, 100);
}

/** `PointerEvent` where happy-dom has one; the fields read are a mouse event's. */
function pointer(el: Element, type: string, clientX: number, clientY: number) {
  const init = { bubbles: true, cancelable: true, clientX, clientY, button: 0, pointerId: 1 };
  const Ctor = typeof PointerEvent === 'function' ? PointerEvent : MouseEvent;
  fireEvent(el, new Ctor(type, init));
}

function dragTo(label: string, x: number, y: number) {
  const handle = grip(label);
  pointer(handle, 'pointerdown', 0, 0);
  pointer(handle, 'pointermove', x, y);
  pointer(handle, 'pointerup', x, y);
}

function resizeBy(label: string, fromX: number, dx: number) {
  const handle = separator(label);
  pointer(handle, 'pointerdown', fromX, 150);
  pointer(handle, 'pointermove', fromX + dx, 150);
  pointer(handle, 'pointerup', fromX + dx, 150);
}

test('the reducers are the door `glass-ui/widget-grid` re-exports, not copies', () => {
  expect(resolveWidgetMove).toBe(reducer.resolveWidgetMove);
  expect(resolveWidgetResize).toBe(reducer.resolveWidgetResize);
  expect(applyWidgetMove).toBe(reducer.applyWidgetMove);
});

describe('WidgetGrid', () => {
  describe('the layout', () => {
    test('a labelled list of items, each spanning min(span, columns)', () => {
      render(<Harness columns={2} arranging={false} />);

      expect(screen.getByRole('region', { name: 'Today' })).toBeTruthy();
      const list = screen.getByRole('list');
      expect(list.style.gridTemplateColumns).toBe('repeat(2, minmax(0, 1fr))');
      expect(list.className).toContain('items-start');
      expect(list.className).not.toContain('dense');
      expect(itemEls().map((li) => li.style.gridColumn)).toEqual([
        'span 2 / span 2',
        'span 2 / span 2',
        'span 2 / span 2',
        'span 2 / span 2',
      ]);
    });

    test('nothing writes a height, and no item or anything inside one is glass', () => {
      render(<Harness />);

      const glass = /(^|\s)glass(-strong)?(\s|$)/;
      for (const li of itemEls()) {
        expect(li.className).not.toMatch(/(^|\s)h-\d/);
        expect(li.style.height).toBe('');
        expect(li.className).not.toMatch(glass);
        for (const el of li.querySelectorAll<HTMLElement>('*')) {
          expect(el.className).not.toMatch(glass);
        }
      }
    });
  });

  describe('outside arrange mode', () => {
    test('no chrome, and the content is live', () => {
      render(<Harness arranging={false} />);

      expect(screen.queryByRole('button', { name: 'Capture actions' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Move Capture' })).toBeNull();
      expect(screen.queryByRole('separator')).toBeNull();
      expect(itemOf('Capture').querySelector('[inert]')).toBeNull();
    });
  });

  describe('arrange mode', () => {
    test('each item has a grip, a menu trigger and a separator, and its content is inert', () => {
      render(<Harness />);

      for (const label of ['Capture', 'Habits', 'Money', 'Week']) {
        const li = itemOf(label);
        expect(within(li).getByRole('button', { name: `Move ${label}` })).toBeTruthy();
        expect(within(li).getByRole('button', { name: `${label} actions` })).toBeTruthy();
        expect(within(li).getByRole('separator', { name: `Resize ${label}` })).toBeTruthy();
        expect(li.querySelector('[inert]')?.textContent).toContain(`${label} body`);
      }
    });

    test('the grip alone swallows a touch; the item body still scrolls the page', () => {
      render(<Harness />);

      expect(grip('Habits').className).toContain('touch-none');
      expect(itemOf('Habits').className).not.toContain('touch-none');
      expect(grip('Habits').className).toContain('pointer-coarse:size-11');
    });

    test('the menu moves, resizes, then carries the consumer’s own items', async () => {
      render(<Harness withMenu />);

      const menu = await menuOf('Money');
      expect(within(menu).getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
        'Move up',
        'Move down',
        'Move to top',
        'Move to bottom',
        'Wider',
        'Narrower',
        'Hide Money',
      ]);
    });

    test('the edges are disabled', async () => {
      render(<Harness />);

      const disabled = (menu: HTMLElement, name: string) =>
        within(menu).getByRole('menuitem', { name }).getAttribute('aria-disabled') === 'true';

      let menu = await menuOf('Capture');
      expect(disabled(menu, 'Move up')).toBe(true);
      expect(disabled(menu, 'Move to top')).toBe(true);
      expect(disabled(menu, 'Wider')).toBe(true);
      expect(disabled(menu, 'Narrower')).toBe(false);
      fireEvent.keyDown(menu, { key: 'Escape' });
      await tick();

      menu = await menuOf('Week');
      expect(disabled(menu, 'Move down')).toBe(true);
      expect(disabled(menu, 'Move to bottom')).toBe(true);
      expect(disabled(menu, 'Narrower')).toBe(true);
    });

    test('not resizable: no separator and no Wider or Narrower', async () => {
      render(<Harness columns={1} resizable={false} />);

      expect(screen.queryByRole('separator')).toBeNull();
      const menu = await menuOf('Habits');
      expect(within(menu).queryByRole('menuitem', { name: 'Wider' })).toBeNull();
      expect(within(menu).queryByRole('menuitem', { name: 'Narrower' })).toBeNull();
    });
  });

  describe('the keyboard path', () => {
    test('Move down reorders, is announced, and focus follows the moved trigger', async () => {
      const moves: WidgetMove[] = [];
      render(<Harness moves={moves} />);

      await choose('Habits', 'Move down');
      await tick();

      expect(moves).toEqual([{ id: 'habits', index: 2 }]);
      expect(order()).toEqual(['Capture', 'Money', 'Habits', 'Week']);
      expect(announcement()).toBe('Habits moved to position 3 of 4');
      expect(document.activeElement).toBe(trigger('Habits'));
    });

    test('Wider and Narrower resize through the menu, announced', async () => {
      const resizes: WidgetResize[] = [];
      render(<Harness resizes={resizes} />);

      await choose('Habits', 'Wider');
      expect(announcement()).toBe('Habits is now 3 columns wide');
      await choose('Money', 'Narrower');
      expect(announcement()).toBe('Money is now 1 column wide');
      expect(resizes).toEqual([
        { id: 'habits', span: 3 },
        { id: 'money', span: 1 },
      ]);
    });

    test('the separator is a window splitter: its values, the arrows, Home and End', () => {
      const resizes: WidgetResize[] = [];
      render(<Harness resizes={resizes} />);

      const handle = separator('Habits');
      expect(handle.getAttribute('aria-orientation')).toBe('vertical');
      expect(handle.getAttribute('aria-valuenow')).toBe('2');
      expect(handle.getAttribute('aria-valuemin')).toBe('1');
      expect(handle.getAttribute('aria-valuemax')).toBe('4');
      expect(handle.tabIndex).toBe(0);

      fireEvent.keyDown(handle, { key: 'ArrowRight' });
      expect(separator('Habits').getAttribute('aria-valuenow')).toBe('3');
      fireEvent.keyDown(separator('Habits'), { key: 'End' });
      fireEvent.keyDown(separator('Habits'), { key: 'Home' });
      fireEvent.keyDown(separator('Habits'), { key: 'ArrowLeft' });

      expect(resizes).toEqual([
        { id: 'habits', span: 3 },
        { id: 'habits', span: 4 },
        { id: 'habits', span: 1 },
      ]);
      expect(announcement()).toBe('Habits is now 1 column wide');
    });

    test('at two columns the separator’s bounds are the drawn ones', () => {
      render(<Harness columns={2} />);

      const handle = separator('Capture');
      expect(handle.getAttribute('aria-valuenow')).toBe('2');
      expect(handle.getAttribute('aria-valuemin')).toBe('2');
      expect(handle.getAttribute('aria-valuemax')).toBe('2');
    });
  });

  describe('one reducer, two inputs', () => {
    test('a grip drag and the menu produce deep-equal moves from the same state', async () => {
      const cases: [string, number, number, string, string][] = [
        // Week, dragged above everything, and Move to top.
        ['Week', 50, -10, 'Week', 'Move to top'],
        // Habits, dropped before Week, and Move down.
        ['Habits', 50, 250, 'Habits', 'Move down'],
        // Money, dropped on Habits' left half, and Move up.
        ['Money', 50, 150, 'Money', 'Move up'],
      ];
      for (const [label, x, y, menuLabel, command] of cases) {
        const byPointer: WidgetMove[] = [];
        const { unmount } = render(<Harness moves={byPointer} />);
        layOut();
        dragTo(label, x, y);
        unmount();

        const byMenu: WidgetMove[] = [];
        const second = render(<Harness moves={byMenu} />);
        await choose(menuLabel, command);
        second.unmount();

        expect(byPointer).toHaveLength(1);
        expect(byPointer).toEqual(byMenu);
      }
    });

    test('a drag announces its move, and a drop where it began reports nothing', () => {
      const moves: WidgetMove[] = [];
      render(<Harness moves={moves} />);
      layOut();

      dragTo('Money', 350, 150);
      expect(moves).toEqual([]);

      dragTo('Week', 50, -10);
      expect(moves).toEqual([{ id: 'week', index: 0 }]);
      expect(announcement()).toBe('Week moved to position 1 of 4');
    });

    test('while dragging, the item is a placeholder in the slot under the pointer', () => {
      render(<Harness />);
      layOut();

      const handle = grip('Week');
      pointer(handle, 'pointerdown', 0, 0);
      pointer(handle, 'pointermove', 50, 150);

      const week = itemOf('Week');
      expect(week.dataset.placeholder).toBe('true');
      // Drawn before Habits by `order`, and the DOM has not moved.
      expect(Number(week.style.order)).toBeLessThan(Number(itemOf('Habits').style.order));
      expect(order()).toEqual(['Capture', 'Habits', 'Money', 'Week']);

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(itemOf('Week').dataset.placeholder).toBeUndefined();
    });

    test('a pointer resize and the separator produce deep-equal resizes', () => {
      const cases: [string, number, number, string][] = [
        ['Habits', 200, 100, 'ArrowRight'],
        ['Money', 400, -100, 'ArrowLeft'],
      ];
      for (const [label, fromX, dx, key] of cases) {
        const byPointer: WidgetResize[] = [];
        const first = render(<Harness resizes={byPointer} />);
        layOut();
        resizeBy(label, fromX, dx);
        first.unmount();

        const byKey: WidgetResize[] = [];
        const second = render(<Harness resizes={byKey} />);
        fireEvent.keyDown(separator(label), { key });
        second.unmount();

        expect(byPointer).toHaveLength(1);
        expect(byPointer).toEqual(byKey);
      }
    });

    test('a pointer resize snaps to columns and stops at the bounds', () => {
      const resizes: WidgetResize[] = [];
      render(<Harness resizes={resizes} />);
      layOut();

      // 160px past a 200px item on 100px columns: 360px snaps to 4.
      resizeBy('Habits', 200, 160);
      // Week's minSpan is 2: dragging it to nothing stays at 2, reported as nothing.
      resizeBy('Week', 200, -190);

      expect(resizes).toEqual([{ id: 'habits', span: 4 }]);
    });
  });
});
