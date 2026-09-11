'use client';

import { Ellipsis } from 'lucide-react';
import {
  type DragEvent,
  type ReactNode,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { cn } from '../lib/cn';
import { Button } from '../primitives/button';
import {
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuRoot,
  MenuSeparator,
  MenuTrigger,
} from '../primitives/menu';
import { RowActions, rowActionsHost } from './row-actions';

/**
 * FEAT-20260911-003 — the board. `V3` decisions 4 and 5, `E-104`.
 *
 * Columns, a scrollable stack of cards in each, a header slot and a footer
 * slot per column, and a card that moves between columns and within one.
 * Denitsa needs it in Tasks, Projects and the documents queue, and nothing in
 * either product was ever a board before.
 *
 * **One reducer, two inputs.** Every move — a pointer dropping a card, or a
 * person choosing "Move down" from the card's menu — is an intent handed to
 * `resolveBoardMove`, and that pure function is the only place a `BoardMove`
 * is made. The drag layer produces `{ kind: 'drop' }` with the raw slot under
 * the pointer; the menu produces `{ kind: 'command' }`; both are normalised
 * there (a card moving down its own column vacates a slot above the target; a
 * move that changes nothing is `null`) and both reach the consumer through
 * the same `commit`, which calls `onMove` and writes the announcement. The
 * test file asserts the two paths produce deep-equal moves from the same
 * starting state, which is the acceptance criterion `V3` names as the one a
 * board drops.
 *
 * **The keyboard path is the card's menu, and it is not drag.** Each card
 * carries a `RowActions` cluster with one `MenuTrigger` — in the DOM and the
 * tab order at all times, revealed for the eye on hover, focus-within and a
 * coarse pointer by the rule `RowActions` already enforces. The menu offers
 * up, down, top, bottom and one item per other column. Nothing in it reads
 * the drag state, and a board with no pointer at all is fully operable.
 *
 * **The result is announced, and focus follows the card.** An
 * `aria-live="polite"` region reads `labels.moved` after every committed move,
 * whichever input produced it. A card that changes column is a remounted
 * node, so Radix's own focus-return would land on nothing; the moved card's
 * trigger is re-focused by id in a layout effect after the consumer's new
 * `columns` arrive.
 *
 * **Cards are not glass.** The card is `Card raised`'s surface — `bg-raised`
 * on a `border-line` hairline — and the variant is not a prop. The package's
 * rule is that chrome is glass and cards, grid items and rows are not, and a
 * column of translucent cards is the screenshot everybody wants and the
 * frame rate nobody does. The one glass thing here is the card's menu,
 * because it is a menu. A test walks every card and everything inside it.
 *
 * **It holds no state that is a fact about the data.** `columns` is
 * controlled and `onMove` reports; the consumer applies the move (or
 * declines it — a server may say no). `applyBoardMove` is the remove-then-
 * insert a consumer would otherwise write three times. What is kept here is
 * the drag in flight, the last announcement, and which card should take
 * focus on the next render — facts about this render, not about the board.
 *
 * **Sizing reads the density scale.** The column header is `--size-row`
 * tall and a card is at least that; nothing writes a height, so the desk
 * profile moves the whole board from 40 to 32 without this file knowing
 * (`V1` decision 5).
 */
export interface BoardCardItem {
  id: string;
  /**
   * The card's name for a reader and for the announcement. `renderCard`
   * draws the card; this is what the menu trigger and the live region say.
   */
  label: string;
}

export interface BoardColumn<T extends BoardCardItem = BoardCardItem> {
  id: string;
  title: string;
  cards: readonly T[];
  /** The per-column header slot, drawn after the title and the count. */
  header?: ReactNode;
  /** The per-column footer slot, drawn under the stack — an "Add" row, a total. */
  footer?: ReactNode;
}

/**
 * Where a card went. `index` is the position the card takes among
 * `toColumnId`'s cards **after** it has been removed from where it was —
 * `TreeReorder`'s convention — so a consumer applies it as remove-then-insert
 * with no arithmetic of its own, and a move that changes nothing is never
 * reported. `applyBoardMove` is that remove-then-insert.
 */
export interface BoardMove {
  id: string;
  fromColumnId: string;
  toColumnId: string;
  index: number;
}

/** What the card's menu can ask for. */
export type BoardMoveCommand =
  | 'up'
  | 'down'
  | 'top'
  | 'bottom'
  | { toColumnId: string };

/**
 * The two inputs. A drop carries the raw slot under the pointer — before or
 * after a card, or the end of a column — as the drag layer read it, with no
 * adjustment; a command carries what the menu item said. The reducer is where
 * they become one thing.
 */
export type BoardMoveIntent =
  | { kind: 'drop'; id: string; columnId: string; index: number }
  | { kind: 'command'; id: string; command: BoardMoveCommand };

export interface BoardLabels {
  /** The card menu trigger's accessible name. */
  actions: (card: BoardCardItem) => string;
  moveUp: string;
  moveDown: string;
  moveToTop: string;
  moveToBottom: string;
  /** The heading over the per-column items. */
  moveTo: string;
  /** One item per other column. */
  moveToColumn: (column: BoardColumn) => string;
  /**
   * The live region's sentence after a move. `position` is 1-based and
   * `count` is the column's size once the card is in it.
   */
  moved: (
    card: BoardCardItem,
    column: BoardColumn,
    position: number,
    count: number,
  ) => string;
}

/**
 * English, and only for the package's own tests and demo. Denitsa's consumers
 * speak `uk`, `ru` and `en` (`U5`) and pass every one of these; the defaults
 * exist so the *shape* of the announcement — "{card} moved to {column}, {n}
 * of {count}" — is visible in one place, not so a screen can ship the English
 * by omission.
 */
const DEFAULT_LABELS: BoardLabels = {
  actions: (card) => `${card.label} actions`,
  moveUp: 'Move up',
  moveDown: 'Move down',
  moveToTop: 'Move to top',
  moveToBottom: 'Move to bottom',
  moveTo: 'Move to',
  moveToColumn: (column) => `Move to ${column.title}`,
  moved: (card, column, position, count) =>
    `${card.label} moved to ${column.title}, ${position} of ${count}`,
};

export interface BoardProps<T extends BoardCardItem> {
  /** Controlled. Which card is in which column is a fact about the person's data. */
  columns: readonly BoardColumn<T>[];
  renderCard: (card: T, column: BoardColumn<T>) => ReactNode;
  /** Every move, from either input, once. */
  onMove: (move: BoardMove) => void;
  /**
   * The consumer's own items for the card menu — `MenuItem`s, drawn after the
   * move actions behind a separator. The board renders whatever it is handed.
   */
  renderCardMenu?: (card: T, column: BoardColumn<T>) => ReactNode;
  labels?: Partial<BoardLabels>;
  'aria-label': string;
  className?: string;
}

interface Located<T extends BoardCardItem> {
  card: T;
  column: BoardColumn<T>;
  /** 0-based, among the column's cards. */
  index: number;
}

function locate<T extends BoardCardItem>(
  columns: readonly BoardColumn<T>[],
  id: string,
): Located<T> | null {
  for (const column of columns) {
    const index = column.cards.findIndex((card) => card.id === id);
    if (index !== -1) return { card: column.cards[index], column, index };
  }
  return null;
}

/**
 * The reducer. Both inputs come through here and nowhere else.
 *
 * A drop's index is the raw slot the pointer was over, counted with the
 * dragged card still in place; a card moving down its own column vacates a
 * slot above the target, so the index it lands on is one less. A command is
 * already relative to the column as it is. Either way the answer is `null`
 * when the card would end where it began, and the consumer never hears
 * about it.
 */
export function resolveBoardMove<T extends BoardCardItem>(
  columns: readonly BoardColumn<T>[],
  intent: BoardMoveIntent,
): BoardMove | null {
  const source = locate(columns, intent.id);
  if (!source) return null;
  const from = source.column;

  let to: BoardColumn<T> | undefined;
  let index: number;

  if (intent.kind === 'drop') {
    to = columns.find((column) => column.id === intent.columnId);
    if (!to) return null;
    index = Math.max(0, Math.min(intent.index, to.cards.length));
    if (to.id === from.id && source.index < index) index -= 1;
  } else {
    const { command } = intent;
    if (typeof command === 'object') {
      to = columns.find((column) => column.id === command.toColumnId);
      if (!to || to.id === from.id) return null;
      index = to.cards.length;
    } else {
      to = from;
      const last = from.cards.length - 1;
      index =
        command === 'up'
          ? source.index - 1
          : command === 'down'
            ? source.index + 1
            : command === 'top'
              ? 0
              : last;
      if (index < 0 || index > last) return null;
    }
  }

  if (to.id === from.id && index === source.index) return null;
  return { id: intent.id, fromColumnId: from.id, toColumnId: to.id, index };
}

/**
 * Remove-then-insert, for the consumer's own state. Returns the same array
 * when the move names a card or a column that is not there; otherwise a new
 * array in which only the touched columns are new objects.
 */
export function applyBoardMove<T extends BoardCardItem>(
  columns: readonly BoardColumn<T>[],
  move: BoardMove,
): readonly BoardColumn<T>[] {
  const source = locate(columns, move.id);
  if (!source || source.column.id !== move.fromColumnId) return columns;
  if (!columns.some((column) => column.id === move.toColumnId)) return columns;

  return columns.map((column) => {
    const isFrom = column.id === move.fromColumnId;
    const isTo = column.id === move.toColumnId;
    if (!isFrom && !isTo) return column;
    const cards = isFrom
      ? column.cards.filter((card) => card.id !== move.id)
      : [...column.cards];
    if (isTo) {
      const at = Math.max(0, Math.min(move.index, cards.length));
      cards.splice(at, 0, source.card);
    }
    return { ...column, cards };
  });
}

function domSafe(id: string): string {
  return id.replace(/[^\w-]/g, '_');
}

/** The slot under the pointer: before the card at `index`, or the column's end. */
interface DropSlot {
  columnId: string;
  index: number;
}

export function Board<T extends BoardCardItem>({
  columns,
  renderCard,
  onMove,
  renderCardMenu,
  labels: givenLabels,
  'aria-label': ariaLabel,
  className,
}: BoardProps<T>) {
  const uid = useId();
  const labels: BoardLabels = { ...DEFAULT_LABELS, ...givenLabels };

  const [announcement, setAnnouncement] = useState('');
  const triggerEls = useRef(new Map<string, HTMLButtonElement>());
  /** The card whose trigger takes focus once the consumer's new columns render. */
  const pendingFocus = useRef<string | null>(null);

  useLayoutEffect(() => {
    const id = pendingFocus.current;
    if (id === null) return;
    const trigger = triggerEls.current.get(id);
    if (!trigger || document.activeElement === trigger) return;
    pendingFocus.current = null;
    trigger.focus();
  });

  /**
   * The one exit. `columns` is what the consumer has today, so the
   * announcement counts the target column as it will be once the card is in
   * it — the same arithmetic `applyBoardMove` does, spoken.
   */
  const commit = (intent: BoardMoveIntent, focus: boolean) => {
    const move = resolveBoardMove(columns, intent);
    if (!move) return;
    const source = locate(columns, move.id);
    const target = columns.find((column) => column.id === move.toColumnId);
    if (!source || !target) return;
    const count =
      move.toColumnId === move.fromColumnId
        ? target.cards.length
        : target.cards.length + 1;
    setAnnouncement(labels.moved(source.card, target, move.index + 1, count));
    if (focus) pendingFocus.current = move.id;
    onMove(move);
  };

  /*
   * Drag. The browser's own drag-and-drop on the card element, as `Tree` does
   * it: no pointer capture, no measured layout, no library. Handlers stop
   * propagation so a consumer's own drop zone around the board never hears a
   * card being moved inside it. A card's `dragover` stops before the column's,
   * so the column body only ever hears the pointer over its own padding and
   * its empty space — which is how an empty column is a target at all.
   */
  const dragId = useRef<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [drop, setDrop] = useState<DropSlot | null>(null);

  const setSlot = (slot: DropSlot) =>
    setDrop((current) =>
      current?.columnId === slot.columnId && current.index === slot.index
        ? current
        : slot,
    );

  const cardSlot = (
    columnId: string,
    index: number,
    event: DragEvent<HTMLElement>,
  ): DropSlot => {
    const rect = event.currentTarget.getBoundingClientRect();
    // A zero-height rect is a layout the browser has not done — a headless
    // DOM — and "after" is the reading that changes nothing by accident.
    const before = rect.height > 0 && event.clientY < rect.top + rect.height / 2;
    return { columnId, index: before ? index : index + 1 };
  };

  const onDragStart = (id: string, event: DragEvent<HTMLLIElement>) => {
    event.stopPropagation();
    dragId.current = id;
    setDragging(id);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', id);
    }
  };

  const onCardDragOver = (
    columnId: string,
    id: string,
    index: number,
    event: DragEvent<HTMLLIElement>,
  ) => {
    event.stopPropagation();
    // Not calling `preventDefault` is how an element says "not here".
    if (dragId.current === null || dragId.current === id) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    setSlot(cardSlot(columnId, index, event));
  };

  /**
   * The column body hears the pointer over its padding and its gaps, and
   * over the whole of an empty column. The slot is the first card whose
   * midpoint is below the pointer, else the end — so crossing the gap
   * between two cards reads as the same slot the lower card's upper half
   * does, and the marker does not jump to the bottom on the way.
   */
  const columnSlot = (
    columnId: string,
    event: DragEvent<HTMLUListElement>,
  ): DropSlot => {
    const cards = event.currentTarget.querySelectorAll<HTMLElement>(
      ':scope > [data-board-card]',
    );
    let index = cards.length;
    for (let i = 0; i < cards.length; i++) {
      const rect = cards[i].getBoundingClientRect();
      if (rect.height > 0 && event.clientY < rect.top + rect.height / 2) {
        index = i;
        break;
      }
    }
    return { columnId, index };
  };

  const onColumnDragOver = (
    columnId: string,
    event: DragEvent<HTMLUListElement>,
  ) => {
    event.stopPropagation();
    if (dragId.current === null) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    setSlot(columnSlot(columnId, event));
  };

  const clearDrag = () => {
    dragId.current = null;
    setDragging(null);
    setDrop(null);
  };

  const onDragEnd = (event: DragEvent<HTMLLIElement>) => {
    event.stopPropagation();
    clearDrag();
  };

  const finishDrop = (slot: DropSlot, event: DragEvent<HTMLElement>) => {
    event.stopPropagation();
    event.preventDefault();
    const id = dragId.current;
    clearDrag();
    if (id === null) return;
    commit({ kind: 'drop', id, columnId: slot.columnId, index: slot.index }, false);
  };

  const onCardDrop = (
    columnId: string,
    id: string,
    index: number,
    event: DragEvent<HTMLLIElement>,
  ) => {
    if (dragId.current === id) {
      event.stopPropagation();
      event.preventDefault();
      clearDrag();
      return;
    }
    finishDrop(cardSlot(columnId, index, event), event);
  };

  return (
    <section
      aria-label={ariaLabel}
      className={cn(
        'flex min-h-0 items-stretch gap-3 overflow-x-auto',
        dragging !== null && 'select-none',
        className,
      )}
    >
      {columns.map((column) => {
        const headingId = `${uid}-${domSafe(column.id)}-title`;
        /** The slot under the pointer, if it is in this column. */
        const slot = drop?.columnId === column.id ? drop : null;
        return (
          <section
            key={column.id}
            aria-labelledby={headingId}
            className={cn(
              'flex w-(--board-column,18rem) shrink-0 flex-col rounded-surface border border-line bg-surface',
              'motion-safe:transition-colors duration-(--dur-fast)',
              slot !== null && 'bg-hover',
            )}
          >
            <header className="flex h-(--size-row) shrink-0 items-center gap-2 px-3">
              <h3
                id={headingId}
                className="min-w-0 truncate text-sm font-semibold text-ink"
              >
                {column.title}
              </h3>
              <span className="text-xs text-ink-3 tabular-nums">
                {column.cards.length}
              </span>
              {column.header ? (
                <div className="ms-auto flex shrink-0 items-center gap-1">
                  {column.header}
                </div>
              ) : null}
            </header>

            <ul
              className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2"
              onDragOver={(e) => onColumnDragOver(column.id, e)}
              onDrop={(e) => finishDrop(columnSlot(column.id, e), e)}
            >
              {column.cards.map((card, index) => {
                const last = column.cards.length - 1;
                const other = columns.filter((c) => c.id !== column.id);
                return (
                  <li
                    key={card.id}
                    data-board-card=""
                    draggable
                    onDragStart={(e) => onDragStart(card.id, e)}
                    onDragOver={(e) => onCardDragOver(column.id, card.id, index, e)}
                    onDragEnd={onDragEnd}
                    onDrop={(e) => onCardDrop(column.id, card.id, index, e)}
                    className={cn(
                      // `Card raised pad="sm"`'s surface, on an `li` — the
                      // variant is not offered, see the header.
                      'rounded-surface border border-line bg-raised p-3',
                      rowActionsHost,
                      'relative flex min-h-(--size-row) cursor-grab items-start gap-2 active:cursor-grabbing',
                      dragging === card.id && 'opacity-50',
                    )}
                  >
                    {slot?.index === index ? (
                      <span
                        aria-hidden="true"
                        className="-top-[5px] pointer-events-none absolute inset-x-1 h-0.5 rounded-full bg-ink"
                      />
                    ) : null}

                    <div className="min-w-0 flex-1">{renderCard(card, column)}</div>

                    <RowActions className="-me-1 -mt-1">
                      <MenuRoot>
                        <MenuTrigger asChild>
                          <Button
                            ref={(el) => {
                              if (el) triggerEls.current.set(card.id, el);
                              else triggerEls.current.delete(card.id);
                            }}
                            variant="ghost"
                            size="sm"
                            icon
                            aria-label={labels.actions(card)}
                          >
                            <Ellipsis size={16} aria-hidden="true" />
                          </Button>
                        </MenuTrigger>
                        <MenuContent align="end">
                          <MenuItem
                            disabled={index === 0}
                            onSelect={() =>
                              commit({ kind: 'command', id: card.id, command: 'up' }, true)
                            }
                          >
                            {labels.moveUp}
                          </MenuItem>
                          <MenuItem
                            disabled={index === last}
                            onSelect={() =>
                              commit({ kind: 'command', id: card.id, command: 'down' }, true)
                            }
                          >
                            {labels.moveDown}
                          </MenuItem>
                          <MenuItem
                            disabled={index === 0}
                            onSelect={() =>
                              commit({ kind: 'command', id: card.id, command: 'top' }, true)
                            }
                          >
                            {labels.moveToTop}
                          </MenuItem>
                          <MenuItem
                            disabled={index === last}
                            onSelect={() =>
                              commit({ kind: 'command', id: card.id, command: 'bottom' }, true)
                            }
                          >
                            {labels.moveToBottom}
                          </MenuItem>
                          {other.length > 0 ? (
                            <>
                              <MenuSeparator />
                              <MenuLabel>{labels.moveTo}</MenuLabel>
                              {other.map((target) => (
                                <MenuItem
                                  key={target.id}
                                  onSelect={() =>
                                    commit(
                                      {
                                        kind: 'command',
                                        id: card.id,
                                        command: { toColumnId: target.id },
                                      },
                                      true,
                                    )
                                  }
                                >
                                  {labels.moveToColumn(target)}
                                </MenuItem>
                              ))}
                            </>
                          ) : null}
                          {renderCardMenu ? (
                            <>
                              <MenuSeparator />
                              {renderCardMenu(card, column)}
                            </>
                          ) : null}
                        </MenuContent>
                      </MenuRoot>
                    </RowActions>
                  </li>
                );
              })}
              {slot?.index === column.cards.length ? (
                <li
                  aria-hidden="true"
                  className="pointer-events-none h-0.5 shrink-0 rounded-full bg-ink"
                />
              ) : null}
            </ul>

            {column.footer ? (
              <footer className="flex min-h-(--size-row) shrink-0 items-center px-3 py-1">
                {column.footer}
              </footer>
            ) : null}
          </section>
        );
      })}

      {/* Read after every committed move, whichever input produced it. */}
      <p aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </p>
    </section>
  );
}
