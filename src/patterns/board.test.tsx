import { describe, expect, test } from 'bun:test';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { MenuItem } from '../primitives/menu';
import {
  applyBoardMove,
  Board,
  type BoardCardItem,
  type BoardColumn,
  type BoardMove,
  resolveBoardMove,
} from './board';

/**
 * FEAT-20260911-003 — `V3` decisions 4 and 5, as a test.
 *
 * Two of these are acceptance criteria the specification names in as many
 * words, and its `Risks` says which one gets dropped: a card moves between
 * columns and within one **by keyboard alone**, through the card's menu, the
 * result is announced, and the keyboard path and the drag path produce the
 * same `BoardMove` from the same starting state — one reducer, two inputs.
 * The other is the package rule a board is most likely to break: no card is
 * glass.
 */

interface Task extends BoardCardItem {
  owner: string;
}

const COLUMNS: BoardColumn<Task>[] = [
  {
    id: 'todo',
    title: 'To do',
    cards: [
      { id: 'brief', label: 'Write the brief', owner: 'D' },
      { id: 'quote', label: 'Send the quote', owner: 'A' },
      { id: 'call', label: 'Call the yard', owner: 'D' },
    ],
  },
  {
    id: 'review',
    title: 'Review',
    cards: [{ id: 'invoice', label: 'Check the invoice', owner: 'A' }],
  },
  { id: 'done', title: 'Done', cards: [] },
];

interface HarnessProps {
  columns?: BoardColumn<Task>[];
  moves?: BoardMove[];
  /** Apply each move, the way an application would. On by default. */
  apply?: boolean;
  withMenu?: boolean;
}

function Harness({
  columns: initial = COLUMNS,
  moves,
  apply = true,
  withMenu = false,
}: HarnessProps) {
  const [columns, setColumns] = useState<readonly BoardColumn<Task>[]>(initial);
  return (
    <Board
      aria-label="Tasks"
      columns={columns}
      renderCard={(card) => (
        <span>
          {card.label} · {card.owner}
        </span>
      )}
      onMove={(move) => {
        moves?.push(move);
        if (apply) setColumns((current) => applyBoardMove(current, move));
      }}
      renderCardMenu={
        withMenu ? (card) => <MenuItem>Archive {card.label}</MenuItem> : undefined
      }
    />
  );
}

const column = (title: string) => screen.getByRole('region', { name: title });
const cardsOf = (title: string) => within(column(title)).getAllByRole('listitem');
const listOf = (title: string) => within(column(title)).getByRole('list');
const card = (label: string) =>
  screen.getByRole('button', { name: `${label} actions` }).closest('li') as HTMLLIElement;
const trigger = (label: string) =>
  screen.getByRole('button', { name: `${label} actions` });

/** Radix moves focus and dispatches `onSelect` off the key, not on it. */
const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** Open a card's menu and choose one item by name. */
async function choose(label: string, item: string) {
  fireEvent.pointerDown(trigger(label), { button: 0, ctrlKey: false, pointerType: 'mouse' });
  const menuItem = await screen.findByRole('menuitem', { name: item });
  fireEvent.click(menuItem);
  await tick();
}

const announcement = () =>
  document.querySelector('[aria-live="polite"]')?.textContent ?? '';

describe('Board', () => {
  describe('structure', () => {
    test('columns are labelled regions of list items, with the count and the slots', () => {
      render(
        <Harness
          columns={[
            {
              ...COLUMNS[0],
              header: <button type="button">Filter</button>,
              footer: <button type="button">Add a task</button>,
            },
            COLUMNS[1],
            COLUMNS[2],
          ]}
        />,
      );

      expect(screen.getByRole('region', { name: 'Tasks' })).toBeTruthy();
      expect(cardsOf('To do')).toHaveLength(3);
      expect(cardsOf('Review')).toHaveLength(1);
      expect(within(column('Done')).queryAllByRole('listitem')).toHaveLength(0);
      expect(within(column('To do')).getByText('3')).toBeTruthy();
      expect(within(column('To do')).getByRole('button', { name: 'Filter' })).toBeTruthy();
      expect(within(column('To do')).getByRole('button', { name: 'Add a task' })).toBeTruthy();
      expect(within(column('Review')).queryByRole('button', { name: 'Filter' })).toBeNull();
    });

    test('the consumer draws the card; the board draws its menu trigger beside it', () => {
      render(<Harness />);

      expect(within(card('Write the brief')).getByText('Write the brief · D')).toBeTruthy();
      expect(trigger('Write the brief').getAttribute('aria-haspopup')).toBe('menu');
    });

    test('the column header and the card read the density scale; no height is written', () => {
      render(<Harness />);

      const header = column('To do').querySelector('header') as HTMLElement;
      expect(header.className).toContain('h-(--size-row)');
      expect(card('Write the brief').className).toContain('min-h-(--size-row)');
      for (const el of [header, card('Write the brief')]) {
        expect(el.className).not.toMatch(/(^|\s)h-\d/);
      }
    });
  });

  describe('cards are not glass', () => {
    test('no card, and nothing inside one, carries `glass` or `glass-strong`', () => {
      render(<Harness />);

      const glass = /(^|\s)glass(-strong)?(\s|$)/;
      const cards = screen.getAllByRole('listitem');
      expect(cards.length).toBe(4);
      for (const item of cards) {
        expect(item.className).not.toMatch(glass);
        for (const el of item.querySelectorAll<HTMLElement>('*')) {
          expect(el.className).not.toMatch(glass);
        }
      }
      // The card's surface is `Card raised`'s: a fill and a hairline.
      expect(card('Write the brief').className).toContain('bg-raised');
      expect(card('Write the brief').className).toContain('border-line');
    });
  });

  describe('the keyboard path', () => {
    test('the menu offers up, down, top, bottom and one item per other column', async () => {
      render(<Harness withMenu />);

      fireEvent.pointerDown(trigger('Send the quote'), { button: 0, pointerType: 'mouse' });
      const menu = await screen.findByRole('menu');
      const names = within(menu)
        .getAllByRole('menuitem')
        .map((item) => item.textContent);
      expect(names).toEqual([
        'Move up',
        'Move down',
        'Move to top',
        'Move to bottom',
        'Move to Review',
        'Move to Done',
        'Archive Send the quote',
      ]);
      expect(within(menu).getByText('Move to')).toBeTruthy();
    });

    test('the edges are disabled: the first card cannot go up, the last cannot go down', async () => {
      render(<Harness />);

      fireEvent.pointerDown(trigger('Write the brief'), { button: 0, pointerType: 'mouse' });
      let menu = await screen.findByRole('menu');
      expect(
        within(menu).getByRole('menuitem', { name: 'Move up' }).getAttribute('aria-disabled'),
      ).toBe('true');
      expect(
        within(menu).getByRole('menuitem', { name: 'Move to top' }).getAttribute('aria-disabled'),
      ).toBe('true');
      expect(
        within(menu).getByRole('menuitem', { name: 'Move down' }).getAttribute('aria-disabled'),
      ).toBeNull();
      fireEvent.keyDown(menu, { key: 'Escape' });
      await tick();

      fireEvent.pointerDown(trigger('Call the yard'), { button: 0, pointerType: 'mouse' });
      menu = await screen.findByRole('menu');
      expect(
        within(menu).getByRole('menuitem', { name: 'Move down' }).getAttribute('aria-disabled'),
      ).toBe('true');
      expect(
        within(menu).getByRole('menuitem', { name: 'Move to bottom' }).getAttribute('aria-disabled'),
      ).toBe('true');
    });

    test('Move down reorders within the column and reports the landing index', async () => {
      const moves: BoardMove[] = [];
      render(<Harness moves={moves} />);

      await choose('Write the brief', 'Move down');

      expect(moves).toEqual([
        { id: 'brief', fromColumnId: 'todo', toColumnId: 'todo', index: 1 },
      ]);
      expect(cardsOf('To do').map((li) => li.textContent)).toEqual([
        'Send the quote · A',
        'Write the brief · D',
        'Call the yard · D',
      ]);
    });

    test('Move to top and Move to bottom go to the ends', async () => {
      const moves: BoardMove[] = [];
      render(<Harness moves={moves} />);

      await choose('Call the yard', 'Move to top');
      await choose('Write the brief', 'Move to bottom');

      expect(moves).toEqual([
        { id: 'call', fromColumnId: 'todo', toColumnId: 'todo', index: 0 },
        { id: 'brief', fromColumnId: 'todo', toColumnId: 'todo', index: 2 },
      ]);
    });

    test('Move to <column> appends to that column, an empty one included', async () => {
      const moves: BoardMove[] = [];
      render(<Harness moves={moves} />);

      await choose('Send the quote', 'Move to Review');
      await choose('Write the brief', 'Move to Done');

      expect(moves).toEqual([
        { id: 'quote', fromColumnId: 'todo', toColumnId: 'review', index: 1 },
        { id: 'brief', fromColumnId: 'todo', toColumnId: 'done', index: 0 },
      ]);
      expect(cardsOf('Review').map((li) => li.textContent)).toEqual([
        'Check the invoice · A',
        'Send the quote · A',
      ]);
      expect(cardsOf('Done')).toHaveLength(1);
      expect(cardsOf('To do')).toHaveLength(1);
    });

    test('the result is announced, with the position in the column it landed in', async () => {
      render(<Harness />);

      expect(announcement()).toBe('');
      await choose('Send the quote', 'Move to Review');
      expect(announcement()).toBe('Send the quote moved to Review, 2 of 2');

      await choose('Call the yard', 'Move up');
      expect(announcement()).toBe('Call the yard moved to To do, 1 of 2');
    });

    test('focus follows the card into its new column', async () => {
      render(<Harness />);

      await choose('Send the quote', 'Move to Review');
      await tick();

      const moved = trigger('Send the quote');
      expect(column('Review').contains(moved)).toBe(true);
      expect(document.activeElement).toBe(moved);
    });

    test('the consumer may decline: an unapplied move leaves the board as it was', async () => {
      const moves: BoardMove[] = [];
      render(<Harness moves={moves} apply={false} />);

      await choose('Send the quote', 'Move to Review');
      expect(moves).toHaveLength(1);
      expect(cardsOf('To do')).toHaveLength(3);
      expect(cardsOf('Review')).toHaveLength(1);
    });
  });

  describe('the drag path', () => {
    /** happy-dom lays nothing out; the card states its own box for the pointer test. */
    const box = (el: Element, top: number, height: number) => {
      (el as HTMLElement).getBoundingClientRect = () =>
        ({ top, height, bottom: top + height, left: 0, right: 0, width: 0, x: 0, y: top }) as DOMRect;
    };

    /**
     * happy-dom has no `DragEvent`, and the `Event` Testing Library falls back
     * to carries no `clientY`. The drag events are mouse events in every
     * browser, so a `MouseEvent` of the right name is what the card reads.
     */
    const dragEvent = (type: string, clientY: number) =>
      new MouseEvent(type, { bubbles: true, cancelable: true, clientY });
    const drag = (from: Element, to: Element, clientY: number) => {
      fireEvent(from, dragEvent('dragstart', 0));
      fireEvent(to, dragEvent('dragover', clientY));
      fireEvent(to, dragEvent('drop', clientY));
      fireEvent(from, dragEvent('dragend', 0));
    };

    test('cards are draggable', () => {
      render(<Harness />);
      for (const item of screen.getAllByRole('listitem')) {
        expect(item.getAttribute('draggable')).toBe('true');
      }
    });

    test('a drop lands before or after the card by pointer half, and the index is the landing one', () => {
      const moves: BoardMove[] = [];
      render(<Harness moves={moves} />);

      // Lower half of Call the yard: after it, and Write the brief vacates
      // index 0 first — so 2, not 3.
      box(card('Call the yard'), 100, 40);
      drag(card('Write the brief'), card('Call the yard'), 130);
      expect(moves).toEqual([
        { id: 'brief', fromColumnId: 'todo', toColumnId: 'todo', index: 2 },
      ]);

      // Upper half of Send the quote, now first: before it.
      box(card('Send the quote'), 100, 40);
      drag(card('Write the brief'), card('Send the quote'), 105);
      expect(moves[1]).toEqual({ id: 'brief', fromColumnId: 'todo', toColumnId: 'todo', index: 0 });
    });

    test('a drop on a card in another column lands beside it', () => {
      const moves: BoardMove[] = [];
      render(<Harness moves={moves} />);

      box(card('Check the invoice'), 100, 40);
      drag(card('Send the quote'), card('Check the invoice'), 105);
      expect(moves).toEqual([
        { id: 'quote', fromColumnId: 'todo', toColumnId: 'review', index: 0 },
      ]);
      expect(cardsOf('Review').map((li) => li.textContent)).toEqual([
        'Send the quote · A',
        'Check the invoice · A',
      ]);
    });

    test('a drop on a column body lands at its end — which is how an empty column is reached', () => {
      const moves: BoardMove[] = [];
      render(<Harness moves={moves} />);

      drag(card('Write the brief'), listOf('Done'), 0);
      drag(card('Send the quote'), listOf('Review'), 0);
      expect(moves).toEqual([
        { id: 'brief', fromColumnId: 'todo', toColumnId: 'done', index: 0 },
        { id: 'quote', fromColumnId: 'todo', toColumnId: 'review', index: 1 },
      ]);
    });

    test('over the gap between two cards, the column reads the slot the lower card would', () => {
      const moves: BoardMove[] = [];
      render(<Harness moves={moves} />);

      box(card('Write the brief'), 100, 40);
      box(card('Send the quote'), 148, 40);
      box(card('Call the yard'), 196, 40);
      // In the gap under Send the quote: before Call the yard, index 2 raw,
      // and the dragged card is in another column so nothing is vacated.
      drag(card('Check the invoice'), listOf('To do'), 192);
      expect(moves).toEqual([
        { id: 'invoice', fromColumnId: 'review', toColumnId: 'todo', index: 2 },
      ]);
    });

    test('a drop that changes nothing is not reported', () => {
      const moves: BoardMove[] = [];
      render(<Harness moves={moves} />);

      // After Write the brief is where Send the quote already is.
      box(card('Write the brief'), 100, 40);
      drag(card('Send the quote'), card('Write the brief'), 130);
      // Onto itself.
      drag(card('Send the quote'), card('Send the quote'), 130);
      // The end of its own column, from the end of its own column — below
      // every card that has stated a box.
      drag(card('Call the yard'), listOf('To do'), 500);
      expect(moves).toEqual([]);
    });

    test('the marker is drawn at the slot under the pointer and goes with the drag', () => {
      render(<Harness />);
      const markerIn = (el: Element) => el.querySelector('[aria-hidden="true"].bg-ink');

      box(card('Send the quote'), 100, 40);
      fireEvent(card('Write the brief'), dragEvent('dragstart', 0));
      fireEvent(card('Send the quote'), dragEvent('dragover', 105));
      expect(markerIn(card('Send the quote'))).not.toBeNull();

      fireEvent(card('Send the quote'), dragEvent('dragover', 130));
      expect(markerIn(card('Send the quote'))).toBeNull();
      expect(markerIn(card('Call the yard'))).not.toBeNull();

      fireEvent(listOf('Done'), dragEvent('dragover', 0));
      expect(markerIn(card('Call the yard'))).toBeNull();
      expect(listOf('Done').querySelector(':scope > li[aria-hidden="true"]')).not.toBeNull();
      expect(column('Done').className).toContain('bg-hover');

      fireEvent(card('Write the brief'), dragEvent('dragend', 0));
      expect(listOf('Done').querySelector(':scope > li[aria-hidden="true"]')).toBeNull();
      expect(column('Done').className).not.toContain('bg-hover');
    });

    test('a drop from nowhere — no drag started here — is ignored', () => {
      const moves: BoardMove[] = [];
      render(<Harness moves={moves} />);

      fireEvent(listOf('Done'), dragEvent('drop', 0));
      fireEvent(card('Send the quote'), dragEvent('drop', 0));
      expect(moves).toEqual([]);
    });
  });

  describe('one reducer, two inputs', () => {
    test('Move down and a drop after the next card report the same move', async () => {
      const byKeyboard: BoardMove[] = [];
      const byPointer: BoardMove[] = [];

      const { unmount } = render(<Harness moves={byKeyboard} apply={false} />);
      await choose('Write the brief', 'Move down');
      unmount();

      render(<Harness moves={byPointer} apply={false} />);
      const target = card('Send the quote');
      (target as HTMLElement).getBoundingClientRect = () =>
        ({ top: 100, height: 40, bottom: 140, left: 0, right: 0, width: 0, x: 0, y: 100 }) as DOMRect;
      fireEvent(card('Write the brief'), new MouseEvent('dragstart', { bubbles: true, cancelable: true }));
      fireEvent(target, new MouseEvent('dragover', { bubbles: true, cancelable: true, clientY: 130 }));
      fireEvent(target, new MouseEvent('drop', { bubbles: true, cancelable: true, clientY: 130 }));

      expect(byKeyboard).toHaveLength(1);
      expect(byPointer).toEqual(byKeyboard);
    });

    test('Move to <column> and a drop on that column report the same move', async () => {
      const byKeyboard: BoardMove[] = [];
      const byPointer: BoardMove[] = [];

      const { unmount } = render(<Harness moves={byKeyboard} apply={false} />);
      await choose('Send the quote', 'Move to Review');
      unmount();

      render(<Harness moves={byPointer} apply={false} />);
      fireEvent(card('Send the quote'), new MouseEvent('dragstart', { bubbles: true, cancelable: true }));
      fireEvent(listOf('Review'), new MouseEvent('dragover', { bubbles: true, cancelable: true }));
      fireEvent(listOf('Review'), new MouseEvent('drop', { bubbles: true, cancelable: true }));

      expect(byKeyboard).toEqual([
        { id: 'quote', fromColumnId: 'todo', toColumnId: 'review', index: 1 },
      ]);
      expect(byPointer).toEqual(byKeyboard);
    });

    test('both paths announce the same sentence', async () => {
      const { unmount } = render(<Harness />);
      await choose('Send the quote', 'Move to Review');
      const spoken = announcement();
      unmount();

      render(<Harness />);
      fireEvent(card('Send the quote'), new MouseEvent('dragstart', { bubbles: true, cancelable: true }));
      fireEvent(listOf('Review'), new MouseEvent('dragover', { bubbles: true, cancelable: true }));
      fireEvent(listOf('Review'), new MouseEvent('drop', { bubbles: true, cancelable: true }));
      expect(announcement()).toBe(spoken);
      expect(spoken).toBe('Send the quote moved to Review, 2 of 2');
    });

    describe('resolveBoardMove', () => {
      test('a drop and a command that mean the same thing resolve to the same move', () => {
        const down = resolveBoardMove(COLUMNS, {
          kind: 'command',
          id: 'brief',
          command: 'down',
        });
        const dropAfterNext = resolveBoardMove(COLUMNS, {
          kind: 'drop',
          id: 'brief',
          columnId: 'todo',
          index: 2,
        });
        expect(down).toEqual({ id: 'brief', fromColumnId: 'todo', toColumnId: 'todo', index: 1 });
        expect(dropAfterNext).toEqual(down);

        const toDone = resolveBoardMove(COLUMNS, {
          kind: 'command',
          id: 'call',
          command: { toColumnId: 'done' },
        });
        const dropOnDone = resolveBoardMove(COLUMNS, {
          kind: 'drop',
          id: 'call',
          columnId: 'done',
          index: 0,
        });
        expect(toDone).toEqual({ id: 'call', fromColumnId: 'todo', toColumnId: 'done', index: 0 });
        expect(dropOnDone).toEqual(toDone);
      });

      test('a move that changes nothing is null, from either input', () => {
        expect(
          resolveBoardMove(COLUMNS, { kind: 'command', id: 'brief', command: 'up' }),
        ).toBeNull();
        expect(
          resolveBoardMove(COLUMNS, { kind: 'command', id: 'brief', command: 'top' }),
        ).toBeNull();
        expect(
          resolveBoardMove(COLUMNS, { kind: 'command', id: 'call', command: 'down' }),
        ).toBeNull();
        expect(
          resolveBoardMove(COLUMNS, { kind: 'command', id: 'call', command: 'bottom' }),
        ).toBeNull();
        expect(
          resolveBoardMove(COLUMNS, {
            kind: 'command',
            id: 'call',
            command: { toColumnId: 'todo' },
          }),
        ).toBeNull();
        // Before itself, after itself, and the slot it already vacates into.
        expect(
          resolveBoardMove(COLUMNS, { kind: 'drop', id: 'quote', columnId: 'todo', index: 1 }),
        ).toBeNull();
        expect(
          resolveBoardMove(COLUMNS, { kind: 'drop', id: 'quote', columnId: 'todo', index: 2 }),
        ).toBeNull();
      });

      test('an unknown card or column is null; a drop index is clamped to the column', () => {
        expect(
          resolveBoardMove(COLUMNS, { kind: 'command', id: 'ghost', command: 'down' }),
        ).toBeNull();
        expect(
          resolveBoardMove(COLUMNS, {
            kind: 'command',
            id: 'brief',
            command: { toColumnId: 'ghost' },
          }),
        ).toBeNull();
        expect(
          resolveBoardMove(COLUMNS, { kind: 'drop', id: 'brief', columnId: 'ghost', index: 0 }),
        ).toBeNull();
        expect(
          resolveBoardMove(COLUMNS, { kind: 'drop', id: 'brief', columnId: 'review', index: 99 }),
        ).toEqual({ id: 'brief', fromColumnId: 'todo', toColumnId: 'review', index: 1 });
      });
    });
  });

  describe('applyBoardMove', () => {
    test('remove-then-insert, touching only the two columns', () => {
      const next = applyBoardMove(COLUMNS, {
        id: 'quote',
        fromColumnId: 'todo',
        toColumnId: 'review',
        index: 0,
      });
      expect(next[0].cards.map((c) => c.id)).toEqual(['brief', 'call']);
      expect(next[1].cards.map((c) => c.id)).toEqual(['quote', 'invoice']);
      expect(next[2]).toBe(COLUMNS[2]);
      expect(next).not.toBe(COLUMNS);
      expect(COLUMNS[0].cards).toHaveLength(3);
    });

    test('within a column the index is the landing one, as the move says', () => {
      const next = applyBoardMove(COLUMNS, {
        id: 'brief',
        fromColumnId: 'todo',
        toColumnId: 'todo',
        index: 2,
      });
      expect(next[0].cards.map((c) => c.id)).toEqual(['quote', 'call', 'brief']);
    });

    test('a move naming a card or column that is not there returns the same array', () => {
      expect(
        applyBoardMove(COLUMNS, { id: 'ghost', fromColumnId: 'todo', toColumnId: 'done', index: 0 }),
      ).toBe(COLUMNS);
      expect(
        applyBoardMove(COLUMNS, { id: 'brief', fromColumnId: 'review', toColumnId: 'done', index: 0 }),
      ).toBe(COLUMNS);
      expect(
        applyBoardMove(COLUMNS, { id: 'brief', fromColumnId: 'todo', toColumnId: 'ghost', index: 0 }),
      ).toBe(COLUMNS);
    });
  });
});
