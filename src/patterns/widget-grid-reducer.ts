/**
 * FEAT-20260923-003 — the widget grid's reducers (`W1` decision 5).
 *
 * Pure, with no React in them, so they are their own module. `WidgetGrid`
 * re-exports every name here, and a consumer imports from
 * `glass-ui/widget-grid` and never from this file.
 *
 * **One reducer per axis, two inputs each.**
 * - A grip drag is a `drop` intent with the raw slot under the pointer. A
 *   menu item is a `command` intent. `resolveWidgetMove` is the only place a
 *   `WidgetMove` is made.
 * - A separator drag is a `set` intent. The separator's keys and *Wider* /
 *   *Narrower* are `step` intents. `resolveWidgetResize` is the only place a
 *   `WidgetResize` is made.
 * - Either answer is `null` when nothing would change, and the consumer never
 *   hears about it.
 *
 * **The resize bounds are the drawn ones**: `min(minSpan, columns)` to
 * `columns`, stepping from the drawn span `min(span, columns)`. At four
 * columns that is exactly `minSpan` to 4. At two columns, a step that would
 * change nothing on screen is not offered, and a pointer measured against two
 * columns can reach every value the keyboard can (a `W1` correction).
 */
export interface WidgetGridItem {
  id: string;
  /** The widget's name for the controls' accessible names and the announcements. */
  label: string;
  /** 1–4, in columns. Drawn as `min(span, columns)`. */
  span: number;
  /** The narrowest the person may make it. Defaults to 1. */
  minSpan?: number;
}

/**
 * `index` is the item's position **after** it has been removed from where it
 * was (`Board`'s and `TreeReorder`'s convention). A move that changes nothing
 * is never reported.
 */
export interface WidgetMove {
  id: string;
  index: number;
}

export interface WidgetResize {
  id: string;
  span: number;
}

export type WidgetMoveCommand = 'up' | 'down' | 'top' | 'bottom';

/** The drop's index is the raw slot, counted with the dragged item still in place. */
export type WidgetMoveIntent =
  | { kind: 'drop'; id: string; index: number }
  | { kind: 'command'; id: string; command: WidgetMoveCommand };

export type WidgetResizeIntent =
  | { kind: 'set'; id: string; span: number }
  | { kind: 'step'; id: string; delta: 1 | -1 };

/** An item's resize bounds and drawn span at `columns`. */
export function spanBounds(item: WidgetGridItem, columns: number) {
  const max = columns;
  const min = Math.max(1, Math.min(item.minSpan ?? 1, max));
  const drawn = Math.max(min, Math.min(item.span, max));
  return { min, max, drawn };
}

/** The move reducer. Both inputs come through here and nowhere else. */
export function resolveWidgetMove(
  items: readonly WidgetGridItem[],
  intent: WidgetMoveIntent,
): WidgetMove | null {
  const from = items.findIndex((item) => item.id === intent.id);
  if (from === -1) return null;
  const last = items.length - 1;
  let index: number;
  if (intent.kind === 'drop') {
    index = Math.max(0, Math.min(intent.index, items.length));
    if (from < index) index -= 1;
  } else {
    const { command } = intent;
    index =
      command === 'up' ? from - 1 : command === 'down' ? from + 1 : command === 'top' ? 0 : last;
    if (index < 0 || index > last) return null;
  }
  return index === from ? null : { id: intent.id, index };
}

/** Remove-then-insert, for the consumer's state. The same array if the id is not there. */
export function applyWidgetMove<T extends WidgetGridItem>(
  items: readonly T[],
  move: WidgetMove,
): readonly T[] {
  const from = items.findIndex((item) => item.id === move.id);
  if (from === -1) return items;
  const next = items.filter((item) => item.id !== move.id);
  next.splice(Math.max(0, Math.min(move.index, next.length)), 0, items[from]);
  return next;
}

/**
 * The resize reducer. It clamps to the drawn bounds and returns `null` when
 * the drawn span would not change. So an item stored at 4 and drawn at 2 is
 * never reported as resized to 2.
 */
export function resolveWidgetResize(
  items: readonly WidgetGridItem[],
  columns: number,
  intent: WidgetResizeIntent,
): WidgetResize | null {
  const item = items.find((candidate) => candidate.id === intent.id);
  if (!item) return null;
  const { min, max, drawn } = spanBounds(item, columns);
  const wanted = intent.kind === 'set' ? intent.span : drawn + intent.delta;
  const span = Math.max(min, Math.min(Math.round(wanted), max));
  return span === drawn ? null : { id: item.id, span };
}
