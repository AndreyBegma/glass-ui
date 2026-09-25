'use client';

import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { cn } from '../lib/cn';
import { rowActionsHost } from './row-actions';
import { WidgetGridChrome } from './widget-grid-chrome';
import {
  applyWidgetMove,
  resolveWidgetMove,
  resolveWidgetResize,
  spanBounds,
  type WidgetGridItem,
  type WidgetMoveIntent,
  type WidgetResize,
  type WidgetResizeIntent,
  type WidgetMove,
} from './widget-grid-reducer';

export {
  applyWidgetMove,
  resolveWidgetMove,
  resolveWidgetResize,
  type WidgetGridItem,
  type WidgetMove,
  type WidgetMoveCommand,
  type WidgetMoveIntent,
  type WidgetResize,
  type WidgetResizeIntent,
} from './widget-grid-reducer';

/**
 * FEAT-20260923-003 — the widget grid. `W1` decision 5, after `V3`'s `Board`.
 *
 * A grid of items the person reorders and makes wider or narrower. Denitsa's
 * Today is its first consumer. The grid holds no fact about the widgets, and
 * nothing in either product resized a grid item before it.
 *
 * **Width is what resizes, and height follows content.** The grid is
 * `repeat(columns, minmax(0, 1fr))` with `align-items: start`, and an item
 * spans `min(span, columns)`. Nothing writes a height and nothing scrolls
 * inside an item, because a scrollbar inside a card at 390 is a truncation.
 * There is no `dense` packing: reading order is layout order, so the keyboard
 * and a screen reader walk the page that is on screen. `columns` is the
 * consumer's breakpoint. The stored `span` never changes because the viewport
 * did.
 *
 * **One reducer per axis, two inputs each.** The reducers and their bounds
 * are `widget-grid-reducer.ts`, and this file re-exports them. Here, each
 * input becomes an intent, and a move or a resize goes out through one
 * `commit`. That `commit` calls the consumer and writes the `aria-live`
 * sentence. The test file asserts that the two paths are deep-equal from the
 * same state.
 *
 * **Arrange mode is where the controls are.** Outside it an item is its
 * content and nothing else, so a missed tap never reorders the page. Inside
 * it the content is `inert` and dimmed, and three controls appear:
 *
 * - the grip, which is the only element with `touch-action: none`, so a swipe
 *   that starts on the body still scrolls;
 * - the menu, which is the keyboard path (`V3` decision 4). It is not drag;
 * - the trailing-edge separator, which is `SidePanel`'s window splitter
 *   stepped in columns.
 *
 * Hit areas are `--size-row` at the desk and 44px on a coarse pointer. The
 * grip and the menu are drawn by `widget-grid-chrome.tsx`. This file holds
 * their state.
 *
 * **A drag moves no DOM node.** Pointer capture is lost when its target is
 * removed from the document, and React reorders keyed children by moving
 * them. So the preview is drawn with CSS `order`: the dragged item becomes a
 * placeholder at the slot, and the DOM changes only when the consumer
 * applies the move. The slot is read against the item boxes measured when
 * the drag began, so the preview's own reflow cannot move the target under
 * the pointer.
 *
 * **Grid items are not glass.** In arrange mode an item is `Card raised`'s
 * surface. The menu is glass, because it is a menu.
 */
export interface WidgetGridLabels {
  /** The menu trigger's accessible name. Focus returns to it after a move. */
  actions: (item: WidgetGridItem) => string;
  dragHandle: (item: WidgetGridItem) => string;
  resizeHandle: (item: WidgetGridItem) => string;
  moveUp: string;
  moveDown: string;
  moveToTop: string;
  moveToBottom: string;
  wider: string;
  narrower: string;
  /** `position` is 1-based. */
  moved: (item: WidgetGridItem, position: number, count: number) => string;
  resized: (item: WidgetGridItem, span: number) => string;
}

/**
 * English, for the package's tests and demo. Denitsa passes every label in
 * `uk`, `ru` and `en` (`U5`). The defaults show the sentences' shape.
 */
const DEFAULT_LABELS: WidgetGridLabels = {
  actions: (item) => `${item.label} actions`,
  dragHandle: (item) => `Move ${item.label}`,
  resizeHandle: (item) => `Resize ${item.label}`,
  moveUp: 'Move up',
  moveDown: 'Move down',
  moveToTop: 'Move to top',
  moveToBottom: 'Move to bottom',
  wider: 'Wider',
  narrower: 'Narrower',
  moved: (item, position, count) => `${item.label} moved to position ${position} of ${count}`,
  resized: (item, span) =>
    `${item.label} is now ${span} ${span === 1 ? 'column' : 'columns'} wide`,
};

export interface WidgetGridProps<T extends WidgetGridItem> {
  /** Controlled, in order. What is on the page is the consumer's fact. */
  items: readonly T[];
  /** The consumer's breakpoint. */
  columns: 1 | 2 | 3 | 4;
  arranging: boolean;
  /** `false` on the phone: no separator, no Wider or Narrower. */
  resizable: boolean;
  renderItem: (item: T) => ReactNode;
  /** The consumer's own `MenuItem`s, after the grid's, behind a separator. */
  renderItemMenu?: (item: T) => ReactNode;
  onMove: (move: WidgetMove) => void;
  onResize: (resize: WidgetResize) => void;
  labels?: Partial<WidgetGridLabels>;
  'aria-label': string;
  className?: string;
}

interface ItemBox {
  id: string;
  rect: DOMRect;
}

interface MoveDrag {
  id: string;
  boxes: ItemBox[];
  rtl: boolean;
}

interface ResizeDrag {
  id: string;
  startX: number;
  startWidth: number;
  /** One column plus one gap: the distance a span of one more adds. */
  step: number;
  gap: number;
  sign: 1 | -1;
}

/**
 * The raw slot under the pointer: before the first item the pointer is above,
 * or level with and before the middle of. Otherwise the end. Items are in
 * reading order, so that first item is the one the pointer precedes.
 */
function slotAt(drag: MoveDrag, items: readonly WidgetGridItem[], x: number, y: number) {
  for (let index = 0; index < items.length; index++) {
    const id = items[index].id;
    if (id === drag.id) continue;
    const rect = drag.boxes.find((b) => b.id === id)?.rect;
    if (!rect) continue;
    if (y < rect.top) return index;
    const middle = rect.left + rect.width / 2;
    if (y <= rect.bottom && (drag.rtl ? x > middle : x < middle)) return index;
  }
  return items.length;
}

export function WidgetGrid<T extends WidgetGridItem>({
  items,
  columns,
  arranging,
  resizable,
  renderItem,
  renderItemMenu,
  onMove,
  onResize,
  labels: givenLabels,
  'aria-label': ariaLabel,
  className,
}: WidgetGridProps<T>) {
  const labels: WidgetGridLabels = { ...DEFAULT_LABELS, ...givenLabels };
  const listRef = useRef<HTMLUListElement>(null);
  const [announcement, setAnnouncement] = useState('');

  const triggerEls = useRef(new Map<string, HTMLButtonElement>());
  const pendingFocus = useRef<string | null>(null);
  useLayoutEffect(() => {
    const id = pendingFocus.current;
    if (id === null) return;
    const trigger = triggerEls.current.get(id);
    if (!trigger || document.activeElement === trigger) return;
    pendingFocus.current = null;
    trigger.focus();
  });

  const commitMove = (intent: WidgetMoveIntent, focus: boolean) => {
    const move = resolveWidgetMove(items, intent);
    const item = items.find((candidate) => candidate.id === intent.id);
    if (!move || !item) return;
    setAnnouncement(labels.moved(item, move.index + 1, items.length));
    if (focus) pendingFocus.current = move.id;
    onMove(move);
  };

  const commitResize = (intent: WidgetResizeIntent) => {
    const resize = resolveWidgetResize(items, columns, intent);
    const item = items.find((candidate) => candidate.id === intent.id);
    if (!resize || !item) return;
    setAnnouncement(labels.resized(item, resize.span));
    onResize(resize);
  };

  /* Reordering by pointer: the grip, with pointer capture. */
  const moveDrag = useRef<MoveDrag | null>(null);
  const [dragging, setDragging] = useState<{ id: string; slot: number } | null>(null);

  const endMoveDrag = () => {
    moveDrag.current = null;
    setDragging(null);
  };

  // Escape abandons a drag in flight. Leaving arrange mode is the consumer's.
  const isDragging = dragging !== null;
  useEffect(() => {
    if (!isDragging) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      moveDrag.current = null;
      setDragging(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isDragging]);

  const onGripDown = (id: string, event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 || !listRef.current) return;
    event.preventDefault();
    const boxes = Array.from(
      listRef.current.querySelectorAll<HTMLElement>(':scope > [data-widget-id]'),
      (el) => ({ id: el.dataset.widgetId ?? '', rect: el.getBoundingClientRect() }),
    );
    const rtl = getComputedStyle(listRef.current).direction === 'rtl';
    moveDrag.current = { id, boxes, rtl };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDragging({ id, slot: items.findIndex((item) => item.id === id) });
  };

  const onGripMove = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = moveDrag.current;
    if (!drag) return;
    const slot = slotAt(drag, items, event.clientX, event.clientY);
    setDragging((current) => (current?.slot === slot ? current : { id: drag.id, slot }));
  };

  const onGripUp = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = moveDrag.current;
    if (!drag) return;
    const slot = slotAt(drag, items, event.clientX, event.clientY);
    endMoveDrag();
    commitMove({ kind: 'drop', id: drag.id, index: slot }, false);
  };

  /* Resizing by pointer: the separator, snapped to the grid's own columns. */
  const resizeDrag = useRef<ResizeDrag | null>(null);
  const [resizing, setResizing] = useState<WidgetResize | null>(null);

  const snap = (drag: ResizeDrag, x: number) =>
    (drag.startWidth + drag.sign * (x - drag.startX) + drag.gap) / drag.step;

  const onSeparatorDown = (id: string, event: PointerEvent<HTMLDivElement>) => {
    const list = listRef.current;
    const itemEl = event.currentTarget.closest('li');
    if (event.button !== 0 || !list || !itemEl) return;
    const style = getComputedStyle(list);
    const gap = Number.parseFloat(style.columnGap) || 0;
    const step = (list.getBoundingClientRect().width + gap) / columns;
    if (step <= 0) return;
    resizeDrag.current = {
      id,
      startX: event.clientX,
      startWidth: itemEl.getBoundingClientRect().width,
      step,
      gap,
      sign: style.direction === 'rtl' ? -1 : 1,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const onSeparatorMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = resizeDrag.current;
    if (!drag) return;
    const resize = resolveWidgetResize(items, columns, {
      kind: 'set',
      id: drag.id,
      span: snap(drag, event.clientX),
    });
    setResizing(resize);
  };

  const onSeparatorCancel = () => {
    resizeDrag.current = null;
    setResizing(null);
  };

  const onSeparatorUp = (event: PointerEvent<HTMLDivElement>) => {
    const drag = resizeDrag.current;
    if (!drag) return;
    onSeparatorCancel();
    commitResize({ kind: 'set', id: drag.id, span: snap(drag, event.clientX) });
  };

  const onSeparatorKey = (item: T, event: KeyboardEvent<HTMLDivElement>) => {
    const { min, max } = spanBounds(item, columns);
    const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
    const widen = rtl ? 'ArrowLeft' : 'ArrowRight';
    const narrow = rtl ? 'ArrowRight' : 'ArrowLeft';
    let intent: WidgetResizeIntent;
    if (event.key === widen) intent = { kind: 'step', id: item.id, delta: 1 };
    else if (event.key === narrow) intent = { kind: 'step', id: item.id, delta: -1 };
    else if (event.key === 'Home') intent = { kind: 'set', id: item.id, span: min };
    else if (event.key === 'End') intent = { kind: 'set', id: item.id, span: max };
    else return;
    event.preventDefault();
    commitResize(intent);
  };

  /** The order drawn: the preview while a drag is in flight, else the items'. */
  const preview = dragging
    ? resolveWidgetMove(items, { kind: 'drop', id: dragging.id, index: dragging.slot })
    : null;
  const drawnOrder = preview ? applyWidgetMove(items, preview) : items;

  return (
    <section aria-label={ariaLabel} className={className}>
      <ul
        ref={listRef}
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        className={cn('grid items-start gap-3', dragging !== null && 'select-none')}
      >
        {items.map((item, index) => {
          const shown = resizing?.id === item.id ? { ...item, span: resizing.span } : item;
          const { min, max, drawn } = spanBounds(shown, columns);
          const isPlaceholder = dragging?.id === item.id;
          const style: CSSProperties = { gridColumn: `span ${drawn} / span ${drawn}` };
          if (preview) style.order = drawnOrder.indexOf(item);
          return (
            <li
              key={item.id}
              data-widget-id={item.id}
              data-placeholder={isPlaceholder ? 'true' : undefined}
              style={style}
              className={cn(
                'relative min-w-0',
                arranging && [
                  'flex flex-col gap-1 rounded-surface border border-line bg-raised p-1.5',
                  rowActionsHost,
                ],
                isPlaceholder && 'border-dashed bg-hover',
              )}
            >
              {arranging ? (
                <WidgetGridChrome
                  item={item}
                  labels={labels}
                  first={index === 0}
                  last={index === items.length - 1}
                  resize={resizable ? { canWiden: drawn < max, canNarrow: drawn > min } : null}
                  placeholder={isPlaceholder}
                  grip={{
                    onPointerDown: (event) => onGripDown(item.id, event),
                    onPointerMove: onGripMove,
                    onPointerUp: onGripUp,
                    onPointerCancel: endMoveDrag,
                  }}
                  triggerRef={(el) => {
                    if (el) triggerEls.current.set(item.id, el);
                    else triggerEls.current.delete(item.id);
                  }}
                  onMove={(command) => commitMove({ kind: 'command', id: item.id, command }, true)}
                  onResize={(delta) => commitResize({ kind: 'step', id: item.id, delta })}
                  menu={renderItemMenu?.(item)}
                />
              ) : null}

              <div
                inert={arranging}
                className={cn(
                  'min-w-0',
                  arranging && 'select-none opacity-60',
                  isPlaceholder && 'invisible',
                  'motion-safe:transition-opacity motion-safe:duration-(--dur-fast)',
                )}
              >
                {renderItem(item)}
              </div>

              {arranging && resizable ? (
                // biome-ignore lint/a11y/useSemanticElements: a separator that is dragged has no element; the role is the correct one, as in `SidePanel`
                <div
                  role="separator"
                  aria-orientation="vertical"
                  aria-label={labels.resizeHandle(item)}
                  aria-valuenow={drawn}
                  aria-valuemin={min}
                  aria-valuemax={max}
                  tabIndex={0}
                  onPointerDown={(event) => onSeparatorDown(item.id, event)}
                  onPointerMove={onSeparatorMove}
                  onPointerUp={onSeparatorUp}
                  onPointerCancel={onSeparatorCancel}
                  onKeyDown={(event) => onSeparatorKey(item, event)}
                  className={cn(
                    'absolute inset-y-0 end-0 z-raised w-3 cursor-col-resize touch-none rounded-full pointer-coarse:w-11',
                    'motion-safe:transition-colors duration-(--dur-fast) hover:bg-hover focus-visible:bg-hover',
                    resizing?.id === item.id && 'bg-hover',
                  )}
                />
              ) : null}
            </li>
          );
        })}
      </ul>

      {/* Read after every committed move or resize, whichever input produced it. */}
      <p aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </p>
    </section>
  );
}
