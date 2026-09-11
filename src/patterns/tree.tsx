'use client';

import { ChevronRight, type LucideIcon } from 'lucide-react';
import {
  type DragEvent,
  Fragment,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { cn } from '../lib/cn';

/**
 * FEAT-20260911-002 — the content tree. `V2` decision 3, `E-104`.
 *
 * Denitsa's navigation was a taxonomy; a workspace is a tree of the person's
 * own things, and a tree is the one navigation shape whose keyboard behaviour
 * is a specification rather than an opinion. This is the WAI-ARIA `tree`
 * pattern, as written, and the test file beside it is the contract: arrows move
 * and expand, Home/End jump, type-ahead moves the roving stop, `*` opens the
 * siblings, Enter activates — and the whole tree is **one tab stop**.
 *
 * **Roving `tabIndex`, not `aria-activedescendant`.** Exactly one `treeitem`
 * carries `tabIndex=0` — the last row that had focus, else the selected row,
 * else the first — and every other carries `-1`. Focus really moves, so the
 * focused row gets `base.css`'s ring with nothing written here, and a reader
 * hears the row it lands on rather than a change of attribute on a container.
 *
 * **The row is the treeitem; the group is its sibling.** A parent `treeitem`
 * that wrapped its own subtree would draw the focus ring around every
 * descendant at once, and would name itself from all of their text. So the row
 * `div` carries the role, `aria-owns` binds it to the `role="group"` beside
 * it (the APG's own navigation-tree shape), and `aria-labelledby` points at
 * the label alone. Nothing nests in the DOM: a subtree is a sibling, and the
 * indent is a padding read off `aria-level`.
 *
 * **It holds no state that is a fact about the data.** Expansion and selection
 * are controlled, the same rule every shell pattern follows: which rows are
 * open and which one is current are facts about routing and about the
 * person's document, and only the consumer can persist them. The one thing
 * kept here is which row last had focus, which is a fact about this render.
 *
 * **Reorder is off by default, and the keyboard layer cannot tell.** Drag is
 * the browser's own drag-and-drop on the row element, gated by
 * `enableReorder`; nothing in the key handling reads that flag, and the test
 * file runs the arrow contract a second time with it on to prove it. That is
 * `V2`'s risk paragraph answered structurally rather than by care.
 *
 * **Virtualisation is not here.** Considered in `V2` and deferred; a tree that
 * needs it is a later row, not a prop on this one.
 */
export interface TreeItem {
  /**
   * Also used to build the row's DOM ids — characters outside `[\w-]` are
   * replaced so `aria-labelledby` and `aria-owns` can carry it.
   */
  id: string;
  label: string;
  icon?: LucideIcon;
  /** Present, even empty, means the row is a parent and draws a chevron. */
  children?: TreeItem[];
  /** Rendered through `link`. Omit for a row that selects rather than navigates. */
  href?: string;
}

/**
 * How a consumer's anchor gets into a tree row.
 *
 * The same contract as `NavLinkRender` (`nav-link.ts`) with one prop more:
 * an anchor inside a `treeitem` must carry `tabIndex={-1}`, or every row with
 * an `href` is a second tab stop and the tree stops being one. A consumer's
 * existing `NavLinkRender` function satisfies this type unchanged **as long as
 * it spreads its rest props onto the anchor** — `({ href, className, children,
 * ...rest }) => <a href={href} className={className} {...rest}>` — which is
 * what the two navigation patterns' consumers already do. One that names its
 * props and drops the rest compiles and silently gives the row two stops.
 *
 * Declared here rather than by widening `NavLinkRender`: that file belongs to
 * the shell patterns and was live in another slot the hour this was written.
 * Folding the one prop back into it is a follow-up after both merge.
 */
export type TreeLinkRender = (props: {
  href: string;
  className: string;
  tabIndex: -1;
  /** Set on the selected row's anchor. */
  'aria-current'?: 'page';
  children: ReactNode;
}) => ReactNode;

/**
 * Where a dragged row was dropped. `index` is the position the row takes among
 * `parentId`'s children **after** it has been removed from where it was — so a
 * consumer applies it as remove-then-insert with no arithmetic of its own, and
 * a drop that changes nothing is never reported.
 */
export interface TreeReorder {
  id: string;
  /** `null` for the root level. */
  parentId: string | null;
  index: number;
}

export interface TreeProps {
  items: TreeItem[];
  /** Controlled. The ids of the rows whose children are shown. */
  expandedIds: readonly string[];
  onExpandedChange: (ids: string[]) => void;
  /** Controlled. A selection is a fact about the person's document, not the tree. */
  selectedId: string | null;
  /** Enter, Space and a click on the row. Enter on an `href` row also follows the anchor. */
  onSelectedChange: (id: string) => void;
  /** Required by every item that carries an `href`. */
  link?: TreeLinkRender;
  /**
   * The per-row slot, drawn at the row's trailing edge. `RowActions` is what a
   * consumer puts here; the tree renders whatever it is handed and does not
   * know what it is. See `useActionsTabScope` for what it does to the slot's
   * tab order, which is the one thing it has to know.
   */
  renderActions?: (item: TreeItem) => ReactNode;
  /**
   * Drag a row to reorder it among its siblings, or to before/after a row
   * elsewhere in the tree. Off by default so that turning it on is a decision:
   * `V2` names the drag layer as where tree implementations break the keyboard
   * contract, and a layer nobody asked for is a layer nobody tested against.
   */
  enableReorder?: boolean;
  onReorder?: (move: TreeReorder) => void;
  'aria-label': string;
  className?: string;
}

/** One visible row, in document order, with what the keyboard needs to know. */
interface Row {
  item: TreeItem;
  /** 1-based, `aria-level`. */
  depth: number;
  parentId: string | null;
  /** 0-based position among its siblings. */
  index: number;
  setSize: number;
  hasChildren: boolean;
  expanded: boolean;
}

/**
 * The tree, flattened to the rows a person can see — which is the list every
 * key operates on: Down is "the next one", Right on an open parent is also
 * "the next one", Left on a child is "the nearest above with a smaller depth".
 * `parentOf` covers the whole tree, visible or not, because a drop target's
 * ancestry has to be checked against a dragged subtree that is partly closed.
 */
function flatten(
  items: TreeItem[],
  expanded: ReadonlySet<string>,
): { rows: Row[]; parentOf: Map<string, string | null> } {
  const rows: Row[] = [];
  const parentOf = new Map<string, string | null>();

  const walk = (list: TreeItem[], depth: number, parentId: string | null) => {
    list.forEach((item, index) => {
      parentOf.set(item.id, parentId);
      const hasChildren = item.children !== undefined;
      const isOpen = hasChildren && expanded.has(item.id);
      rows.push({
        item,
        depth,
        parentId,
        index,
        setSize: list.length,
        hasChildren,
        expanded: isOpen,
      });
      if (isOpen && item.children) walk(item.children, depth + 1, item.id);
    });
  };

  walk(items, 1, null);
  return { rows, parentOf };
}

function domSafe(id: string): string {
  return id.replace(/[^\w-]/g, '_');
}

/** What the browser would put in the tab order inside a row's actions slot. */
const FOCUSABLE =
  'a[href], button, input, select, textarea, [tabindex], [data-tree-tabindex]';

/**
 * The roving stop covers the actions slot.
 *
 * `RowActions` keeps its buttons in the DOM at all times — revealing is a
 * visual state, never a DOM state — which is right, and which means a tree of
 * forty rows with two actions each has eighty buttons in the tab order after
 * its one `treeitem`. So after every render, every focusable descendant of a
 * row's slot is given `tabIndex=-1` **except in the row that holds the stop**.
 * Tab from the focused row goes to that row's actions and then out of the
 * tree; a reader still finds every button in browse mode, because `tabIndex`
 * is not `aria-hidden`.
 *
 * The original value is parked in `data-tree-tabindex` so a row that gains
 * the stop gets its buttons back exactly as the slot rendered them. This is
 * a walk over children the tree did not render, and it is the price of "one
 * tab stop" and "actions always in the accessibility tree" both being true.
 */
function useActionsTabScope(
  rowEls: RefObject<Map<string, HTMLDivElement>>,
  tabStopId: string | null,
) {
  useEffect(() => {
    for (const [id, row] of rowEls.current) {
      const slot = row.querySelector(':scope > [data-tree-actions]');
      if (!slot) continue;
      const holdsStop = id === tabStopId;
      for (const el of slot.querySelectorAll<HTMLElement>(FOCUSABLE)) {
        const parked = el.dataset.treeTabindex;
        if (holdsStop) {
          if (parked === undefined) continue;
          if (parked === '') el.removeAttribute('tabindex');
          else el.setAttribute('tabindex', parked);
          delete el.dataset.treeTabindex;
        } else if (parked === undefined) {
          el.dataset.treeTabindex = el.getAttribute('tabindex') ?? '';
          el.setAttribute('tabindex', '-1');
        }
      }
    }
  });
}

/** APG: a type-ahead buffer is a single word typed quickly. */
const TYPEAHEAD_RESET_MS = 500;

export function Tree({
  items,
  expandedIds,
  onExpandedChange,
  selectedId,
  onSelectedChange,
  link,
  renderActions,
  enableReorder = false,
  onReorder,
  'aria-label': ariaLabel,
  className,
}: TreeProps) {
  const uid = useId();
  const expanded = useMemo(() => new Set(expandedIds), [expandedIds]);
  const { rows, parentOf } = useMemo(
    () => flatten(items, expanded),
    [items, expanded],
  );
  const rowById = useMemo(
    () => new Map(rows.map((row) => [row.item.id, row])),
    [rows],
  );

  /**
   * The last row that had focus. Kept so that leaving the tree and coming
   * back lands where the person was, which is what the pattern asks for and
   * what a rail of `tabIndex=0` links gives for free. Not the selection: a
   * person walks the tree with the arrows precisely because they have not
   * selected anything yet.
   */
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const rowEls = useRef(new Map<string, HTMLDivElement>());

  const visible = (id: string | null) => id !== null && rowById.has(id);
  const tabStopId = visible(focusedId)
    ? focusedId
    : visible(selectedId)
      ? selectedId
      : (rows[0]?.item.id ?? null);

  useActionsTabScope(rowEls, tabStopId);

  const moveTo = useCallback((id: string) => {
    setFocusedId(id);
    rowEls.current.get(id)?.focus();
  }, []);

  const setOpen = useCallback(
    (id: string, open: boolean) => {
      if (open === expanded.has(id)) return;
      onExpandedChange(
        open ? [...expandedIds, id] : expandedIds.filter((x) => x !== id),
      );
    },
    [expanded, expandedIds, onExpandedChange],
  );

  /**
   * Enter on an `href` row follows the anchor the consumer rendered, so the
   * consumer's router runs and the tree never learns what a router is. The
   * anchor is looked up inside this row's own box — `:scope >` — so an open
   * parent does not click its first child's link. That click bubbles back up
   * to the row, which would select a second time; `following` is how the
   * row's click handler tells the echo from a pointer.
   */
  const following = useRef(false);
  const activate = useCallback(
    (row: Row, follow: boolean) => {
      onSelectedChange(row.item.id);
      if (!follow || !row.item.href) return;
      const anchor = rowEls.current
        .get(row.item.id)
        ?.querySelector<HTMLAnchorElement>(':scope > span > a[href]');
      if (!anchor) return;
      following.current = true;
      try {
        anchor.click();
      } finally {
        following.current = false;
      }
    },
    [onSelectedChange],
  );

  const typeahead = useRef<{
    buffer: string;
    timer: ReturnType<typeof setTimeout> | undefined;
  }>({ buffer: '', timer: undefined });
  useEffect(() => () => clearTimeout(typeahead.current.timer), []);

  /**
   * APG: one character searches forward from the row after the current one,
   * wrapping; the same character again keeps cycling through the rows that
   * start with it; a longer string is a prefix and searches from the current
   * row, so typing "ca" while on "Calendar" stays put rather than skipping to
   * the next match.
   */
  const onTypeahead = (fromIndex: number, char: string) => {
    const state = typeahead.current;
    clearTimeout(state.timer);
    state.buffer += char.toLowerCase();
    state.timer = setTimeout(() => {
      state.buffer = '';
    }, TYPEAHEAD_RESET_MS);

    const { buffer } = state;
    const repeated =
      buffer.length > 1 && [...buffer].every((c) => c === buffer[0]);
    const needle = repeated ? buffer[0] : buffer;
    const start = repeated || buffer.length === 1 ? fromIndex + 1 : fromIndex;

    for (let k = 0; k < rows.length; k++) {
      const row = rows[(start + k) % rows.length];
      if (row.item.label.toLowerCase().startsWith(needle)) {
        moveTo(row.item.id);
        return;
      }
    }
  };

  const onRowKeyDown = (row: Row, event: KeyboardEvent<HTMLDivElement>) => {
    // Keys from inside the actions slot belong to whatever they were pressed
    // on — a menu trigger's Enter is the menu's, not a selection.
    if (event.target !== event.currentTarget || event.defaultPrevented) return;

    const index = rows.findIndex((r) => r.item.id === row.item.id);
    const { key } = event;
    let handled = true;

    if (key === 'ArrowDown') {
      const next = rows[index + 1];
      if (next) moveTo(next.item.id);
    } else if (key === 'ArrowUp') {
      const prev = rows[index - 1];
      if (prev) moveTo(prev.item.id);
    } else if (key === 'ArrowRight') {
      if (!row.hasChildren) {
        // A leaf: the pattern says nothing happens, and nothing does.
      } else if (!row.expanded) {
        setOpen(row.item.id, true);
      } else {
        const first = rows[index + 1];
        if (first && first.parentId === row.item.id) moveTo(first.item.id);
      }
    } else if (key === 'ArrowLeft') {
      if (row.hasChildren && row.expanded) {
        setOpen(row.item.id, false);
      } else if (row.parentId !== null) {
        moveTo(row.parentId);
      }
    } else if (key === 'Home') {
      const first = rows[0];
      if (first) moveTo(first.item.id);
    } else if (key === 'End') {
      const last = rows[rows.length - 1];
      if (last) moveTo(last.item.id);
    } else if (key === 'Enter') {
      activate(row, true);
    } else if (key === ' ') {
      activate(row, false);
    } else if (key === '*') {
      // Open every parent among this row's siblings — the row included.
      const siblings = rows
        .filter((r) => r.parentId === row.parentId && r.hasChildren)
        .map((r) => r.item.id);
      const merged = new Set([...expandedIds, ...siblings]);
      if (merged.size !== expanded.size) onExpandedChange([...merged]);
    } else if (
      key.length === 1 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      onTypeahead(index, key);
    } else {
      handled = false;
    }

    if (handled) event.preventDefault();
  };

  const onRowClick = (row: Row, event: MouseEvent<HTMLDivElement>) => {
    if (following.current) return;
    const target = event.target as Element;
    // A click inside the slot is the slot's — a menu trigger, a delete — and
    // must not also select the row it sits in.
    if (target.closest('[data-tree-actions]')) return;
    // The chevron toggles and does not select: a person opening a folder to
    // see what is in it has not chosen the folder.
    if (target.closest('[data-tree-chevron]')) {
      setOpen(row.item.id, !row.expanded);
      moveTo(row.item.id);
      return;
    }
    moveTo(row.item.id);
    onSelectedChange(row.item.id);
  };

  /*
   * Drag. The browser's own drag-and-drop, on the row element, and nothing
   * else: no pointer capture, no measured layout, no library. The handlers
   * stop propagation so a consumer's own drop zone around the tree never
   * hears a row being moved inside it.
   */
  const dragId = useRef<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [drop, setDrop] = useState<{
    id: string;
    position: 'before' | 'after';
  } | null>(null);

  const isDescendant = (id: string, ancestorId: string) => {
    let cursor = parentOf.get(id) ?? null;
    while (cursor !== null) {
      if (cursor === ancestorId) return true;
      cursor = parentOf.get(cursor) ?? null;
    }
    return false;
  };

  const dropPosition = (
    event: DragEvent<HTMLDivElement>,
  ): 'before' | 'after' => {
    const rect = event.currentTarget.getBoundingClientRect();
    // A zero-height rect is a layout the browser has not done — a headless
    // DOM — and "after" is the reading that changes nothing by accident.
    return rect.height > 0 && event.clientY < rect.top + rect.height / 2
      ? 'before'
      : 'after';
  };

  /** Not onto itself, and not into its own subtree — a folder cannot contain itself. */
  const canDrop = (sourceId: string | null, targetId: string) =>
    sourceId !== null &&
    sourceId !== targetId &&
    !isDescendant(targetId, sourceId);

  const onDragStart = (row: Row, event: DragEvent<HTMLDivElement>) => {
    event.stopPropagation();
    dragId.current = row.item.id;
    setDragging(row.item.id);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', row.item.id);
    }
  };

  const onDragOver = (row: Row, event: DragEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (!canDrop(dragId.current, row.item.id)) return;
    // Not calling `preventDefault` is how a row says "not here".
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    const position = dropPosition(event);
    setDrop((current) =>
      current?.id === row.item.id && current.position === position
        ? current
        : { id: row.item.id, position },
    );
  };

  const onDragEnd = (event: DragEvent<HTMLDivElement>) => {
    event.stopPropagation();
    dragId.current = null;
    setDragging(null);
    setDrop(null);
  };

  const onDrop = (target: Row, event: DragEvent<HTMLDivElement>) => {
    event.stopPropagation();
    event.preventDefault();
    const sourceId = dragId.current;
    dragId.current = null;
    setDragging(null);
    setDrop(null);
    if (sourceId === null || !canDrop(sourceId, target.item.id)) return;

    const position = dropPosition(event);
    const source = rowById.get(sourceId);
    let index = position === 'before' ? target.index : target.index + 1;
    // The index is where the row lands once it has left where it was: a row
    // moving down its own sibling list vacates a slot above the target.
    if (source && source.parentId === target.parentId && source.index < index) {
      index -= 1;
    }
    if (
      source &&
      source.parentId === target.parentId &&
      source.index === index
    ) {
      return;
    }
    onReorder?.({ id: sourceId, parentId: target.parentId, index });
  };

  const groupIdOf = (parentId: string) => `${uid}-${domSafe(parentId)}-group`;

  /**
   * Rows nested as the data is, so the groups fall out of the recursion.
   *
   * `div`s rather than `ul`/`li`: the roles replace the list semantics either
   * way, and a `treeitem` here is a row followed by its group as a sibling
   * (see the header), which an `li` would have to wrap in a `role="none"`
   * for nothing.
   */
  const renderLevel = (list: TreeItem[], parentId: string | null): ReactNode =>
    parentId === null ? (
      <div
        role="tree"
        aria-label={ariaLabel}
        className={cn('flex flex-col gap-px', className)}
      >
        {list.map((item) => renderRow(item))}
      </div>
    ) : (
      // `role="group"` is what a tree's own subtree is called — the APG's
      // shape — and a `fieldset` inside a tree is not the same thing.
      // biome-ignore lint/a11y/useSemanticElements: a `fieldset` inside a tree is not the same thing.
      <div role="group" id={groupIdOf(parentId)} className="contents">
        {list.map((item) => renderRow(item))}
      </div>
    );

  const renderRow = (item: TreeItem) => {
    const row = rowById.get(item.id);
    if (!row) return null;
    const Icon = item.icon;
    const selected = item.id === selectedId;
    const labelId = `${uid}-${domSafe(item.id)}-label`;
    const groupId = row.expanded ? groupIdOf(item.id) : undefined;
    const labelClassName = 'block min-w-0 truncate';

    return (
      <Fragment key={item.id}>
        <div
          ref={(el) => {
            if (el) rowEls.current.set(item.id, el);
            else rowEls.current.delete(item.id);
          }}
          role="treeitem"
          id={`${uid}-${domSafe(item.id)}`}
          aria-labelledby={labelId}
          aria-level={row.depth}
          aria-setsize={row.setSize}
          aria-posinset={row.index + 1}
          aria-expanded={row.hasChildren ? row.expanded : undefined}
          aria-selected={selected}
          aria-owns={groupId}
          tabIndex={item.id === tabStopId ? 0 : -1}
          draggable={enableReorder || undefined}
          onFocus={(event) => {
            if (event.target === event.currentTarget) setFocusedId(item.id);
          }}
          onKeyDown={(event) => onRowKeyDown(row, event)}
          onClick={(event) => onRowClick(row, event)}
          onDragStart={enableReorder ? (e) => onDragStart(row, e) : undefined}
          onDragOver={enableReorder ? (e) => onDragOver(row, e) : undefined}
          onDragEnd={enableReorder ? onDragEnd : undefined}
          onDrop={enableReorder ? (e) => onDrop(row, e) : undefined}
          style={{
            paddingInlineStart: `calc(${row.depth - 1} * 1rem + 0.25rem)`,
          }}
          className={cn(
            // `--size-nav` is what a tree row is: the desk profile takes it
            // from 40 to 28 and nothing here has to know (`V1` decision 5).
            'relative flex h-(--size-nav) select-none items-center gap-1.5 rounded-control pe-1.5 text-sm',
            'motion-safe:transition-colors duration-(--dur-fast)',
            // `--color-accent-soft` is the selection tint and it exists only
            // under `data-scale="desk"`. On the sofa a selection is what
            // `NavRail`'s active capsule already is — the hover fill — so the
            // fallback is the same place drawn the way that profile draws it,
            // not a fifth use of the accent (`V2` correction 3).
            selected
              ? 'bg-[var(--color-accent-soft,var(--color-hover))] text-ink'
              : 'text-ink-2 hover:bg-hover',
            enableReorder && 'cursor-grab active:cursor-grabbing',
            dragging === item.id && 'opacity-50',
          )}
        >
          {drop?.id === item.id ? (
            <span
              aria-hidden="true"
              className={cn(
                'pointer-events-none absolute inset-x-1 h-0.5 rounded-full bg-ink',
                drop.position === 'before' ? '-top-px' : '-bottom-px',
              )}
            />
          ) : null}

          {/*
            The chevron is a pointer affordance and nothing else: the keyboard
            path is Left and Right on the row, so it is hidden from the tree
            and has no handler of its own — the row's click reads it by the
            data attribute. A leaf keeps the space so labels line up.
          */}
          <span
            data-tree-chevron={row.hasChildren ? '' : undefined}
            aria-hidden="true"
            className={cn(
              'flex size-5 shrink-0 items-center justify-center rounded-control text-ink-3',
              row.hasChildren && 'hover:bg-hover hover:text-ink',
            )}
          >
            {row.hasChildren ? (
              <ChevronRight
                size={14}
                className={cn(
                  'motion-safe:transition-transform duration-(--dur-fast)',
                  row.expanded && 'rotate-90',
                )}
              />
            ) : null}
          </span>

          {Icon ? (
            <Icon size={16} aria-hidden="true" className="shrink-0" />
          ) : null}

          <span id={labelId} className="min-w-0 flex-1 truncate">
            {item.href && link ? (
              link({
                href: item.href,
                className: labelClassName,
                tabIndex: -1,
                'aria-current': selected ? 'page' : undefined,
                children: item.label,
              })
            ) : (
              <span className={labelClassName}>{item.label}</span>
            )}
          </span>

          {renderActions ? (
            <div
              data-tree-actions=""
              className="ms-auto flex shrink-0 items-center"
            >
              {renderActions(item)}
            </div>
          ) : null}
        </div>

        {row.expanded && item.children && item.children.length > 0
          ? renderLevel(item.children, item.id)
          : null}
      </Fragment>
    );
  };

  return renderLevel(items, null);
}
