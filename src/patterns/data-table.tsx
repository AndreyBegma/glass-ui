'use client';

import * as RadixMenu from '@radix-ui/react-dropdown-menu';
import { ArrowDown, ArrowUp, Check, ChevronsUpDown, Columns3 } from 'lucide-react';
import {
  type ChangeEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type UIEvent,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { cn } from '../lib/cn';
import { Button } from '../primitives/button';
import { Checkbox } from '../primitives/checkbox';
import { MENU_RADIO_ITEM_CLASS, MenuContent, MenuRoot, MenuTrigger } from '../primitives/menu';
import { Skeleton } from '../primitives/skeleton';
import { Table, TableCell, TableHead, TableRow } from '../primitives/table';
import { EmptyState } from './empty-state';

/**
 * FEAT-20260930-067 — DataTable, the desk's list of things.
 *
 * **`<table>` semantics, not `role="grid"` (D6).** It is built on `Table`,
 * `TableHead`, `TableRow` and `TableCell`, so a reader hears a table with
 * headers. A sortable header carries `aria-sort`; a windowed table carries
 * `aria-rowcount` and each rendered row its `aria-rowindex`, so the rows that
 * are not in the DOM are still counted.
 *
 * **Facts about the data are controlled (D2).** Sort, selection and hidden
 * columns arrive as props with an `on…Change`. The component never reorders
 * `rows` — `sortRows` is exported for a consumer that sorts on the client.
 * Kept inside: which row has the roving tab stop, and the anchor a
 * Shift+click extends a range from — both facts about this render.
 *
 * **Windowing is hand-rolled and fixed-height (D5).** Every row is exactly
 * `rowHeight` pixels, so the window is arithmetic over `scrollTop`: the rows
 * above and below it are two spacer rows of the right height. That is what
 * keeps the package at two runtime dependencies; variable heights are out of
 * scope. The spacers have no cells, so a reader has nothing to announce in
 * them, and the real rows' `aria-rowindex` is what places them; Biome reads
 * every `tr` as interactive and refuses `aria-hidden` on one. The header sits inside the same scroll container, so `scrollTop`
 * over-counts by the header's height — the window starts at most one row
 * early, which `overscan` already covers.
 *
 * **`rowHeight` defaults from the density.** 36 px under `data-scale="desk"`,
 * 44 px elsewhere — and 44 on a coarse pointer even at the desk, because the
 * selection cell is the row's touch target and a finger is the same size at
 * either distance. Read once in a layout effect, since the attribute lives on
 * an ancestor the component does not own.
 *
 * **Rows are solid (D3).** The only glass is the Columns menu, through `Menu`.
 * `Menu` has no checkbox item, so its Radix `CheckboxItem` is composed here
 * wearing the exported `MENU_RADIO_ITEM_CLASS` — a shared `MenuCheckboxItem`
 * is a follow-up for `menu.tsx`, not a copy in this file.
 */
export type Column<Row> = {
  id: string;
  header: ReactNode;
  cell: (row: Row) => ReactNode;
  sortable?: boolean;
  align?: 'start' | 'end';
  width?: string;
  hideable?: boolean;
};

export type DataTableSort = {
  columnId: string;
  direction: 'asc' | 'desc';
};

export type DataTableProps<Row> = {
  rows: Row[];
  getRowId: (row: Row) => string;
  columns: Column<Row>[];
  sort?: DataTableSort | null;
  onSortChange?: (sort: DataTableSort | null) => void;
  selection?: ReadonlySet<string>;
  onSelectionChange?: (selection: ReadonlySet<string>) => void;
  hiddenColumns?: ReadonlySet<string>;
  onHiddenColumnsChange?: (hidden: ReadonlySet<string>) => void;
  virtualize?: boolean;
  /** Pixels. Default from the density: 36 desk, 44 elsewhere. */
  rowHeight?: number;
  overscan?: number;
  /** Height of the scroll container, in pixels. */
  height?: number;
  /** Default true. */
  stickyHeader?: boolean;
  onRowActivate?: (row: Row) => void;
  emptyState?: ReactNode;
  loading?: boolean;
  className?: string;
};

const DESK_ROW_HEIGHT = 36;
const ROW_HEIGHT = 44;
/** The scroll container's height when `virtualize` is on and `height` is not given. */
const VIRTUAL_HEIGHT = 480;
const OVERSCAN = 6;
const SKELETON_ROWS = 5;

const collator = new Intl.Collator('en', { numeric: true });

/** Rank of a value's type: numbers, then strings, then anything else. */
function rank(value: unknown): number {
  if (typeof value === 'number' || typeof value === 'boolean' || value instanceof Date) return 0;
  if (typeof value === 'string') return 1;
  return 2;
}

function isMissing(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    (typeof value === 'number' && Number.isNaN(value)) ||
    (value instanceof Date && Number.isNaN(value.getTime()))
  );
}

function compareValues(a: unknown, b: unknown): number {
  const ra = rank(a);
  const rb = rank(b);
  if (ra !== rb) return ra - rb;
  if (ra === 0) return Number(a) - Number(b);
  if (ra === 1) return collator.compare(a as string, b as string);
  return collator.compare(String(a), String(b));
}

/**
 * Client-side sorting for a consumer that wants it; the component itself never
 * reorders data. Returns a new array.
 *
 * Deterministic by construction: missing values (`null`, `undefined`, `NaN`,
 * an invalid `Date`) go last in **both** directions, numbers compare
 * numerically, strings through a fixed-locale numeric collator (so `item 2`
 * precedes `item 10` on every machine), mixed types order number < string <
 * other, and ties keep their input order. A `null` sort, an unknown column or
 * a column that is not `sortable` returns the rows in input order.
 */
export function sortRows<Row>(
  rows: Row[],
  columns: Column<Row>[],
  sort: DataTableSort | null | undefined,
  getValue: (row: Row, columnId: string) => unknown,
): Row[] {
  if (!sort) return [...rows];
  const column = columns.find((c) => c.id === sort.columnId);
  if (!column?.sortable) return [...rows];
  const sign = sort.direction === 'desc' ? -1 : 1;
  return rows
    .map((row, index) => ({ row, index, value: getValue(row, column.id) }))
    .sort((a, b) => {
      const ma = isMissing(a.value);
      const mb = isMissing(b.value);
      if (ma || mb) return ma === mb ? a.index - b.index : ma ? 1 : -1;
      return sign * compareValues(a.value, b.value) || a.index - b.index;
    })
    .map((entry) => entry.row);
}

/** not sorted → asc → desc → not sorted. */
function nextSort(sort: DataTableSort | null | undefined, columnId: string): DataTableSort | null {
  if (sort?.columnId !== columnId) return { columnId, direction: 'asc' };
  return sort.direction === 'asc' ? { columnId, direction: 'desc' } : null;
}

/**
 * The density's row height — see the header. `matchMedia` is guarded: a
 * headless DOM without it is a fine pointer.
 */
function useDensityRowHeight(ref: { current: HTMLElement | null }): number {
  const [height, setHeight] = useState(ROW_HEIGHT);
  useLayoutEffect(() => {
    const desk = ref.current?.closest('[data-scale="desk"]') != null;
    const coarse =
      typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
    setHeight(desk && !coarse ? DESK_ROW_HEIGHT : ROW_HEIGHT);
  }, [ref]);
  return height;
}

/**
 * The `Button` touch target: an invisible 44 px pseudo-element on a coarse
 * pointer, gone on a fine one. Only on controls that can host it — a pseudo-
 * element inside a `<button>` takes the button's click.
 */
const TAP_TARGET = [
  'relative',
  "after:absolute after:inset-x-0 after:top-1/2 after:h-(--size-tap) after:-translate-y-1/2 after:content-['']",
  '[@media(pointer:fine)]:after:hidden',
].join(' ');

/**
 * The selection column. A checkbox is 16 px and an `<input>` cannot host a
 * pseudo-element, so the whole 44 px-wide cell is the target: a click on it
 * toggles the row, and on a coarse pointer the row is 44 px tall.
 */
const SELECT_CELL = 'w-11 min-w-11 px-0 text-center';

function ariaSort(sort: DataTableSort | null | undefined, column: Column<unknown>) {
  if (!column.sortable) return undefined;
  if (sort?.columnId !== column.id) return 'none' as const;
  return sort.direction === 'asc' ? ('ascending' as const) : ('descending' as const);
}

export function DataTable<Row>({
  rows,
  getRowId,
  columns,
  sort,
  onSortChange,
  selection,
  onSelectionChange,
  hiddenColumns,
  onHiddenColumnsChange,
  virtualize = false,
  rowHeight: rowHeightProp,
  overscan = OVERSCAN,
  height,
  stickyHeader = true,
  onRowActivate,
  emptyState,
  loading = false,
  className,
}: DataTableProps<Row>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const densityRowHeight = useDensityRowHeight(scrollRef);
  const rowHeight = rowHeightProp ?? densityRowHeight;

  const [scrollTop, setScrollTop] = useState(0);
  const [focusIndex, setFocusIndex] = useState(0);
  const pendingFocus = useRef<number | null>(null);
  const anchor = useRef<number | null>(null);

  const visibleColumns = useMemo(
    () => (hiddenColumns ? columns.filter((c) => !hiddenColumns.has(c.id)) : columns),
    [columns, hiddenColumns],
  );
  const hideable = columns.filter((c) => c.hideable);
  const ids = useMemo(() => rows.map(getRowId), [rows, getRowId]);

  const selectable = selection !== undefined;
  const activatable = onRowActivate !== undefined;
  const selectedCount = selectable ? ids.filter((id) => selection.has(id)).length : 0;
  const allSelected = ids.length > 0 && selectedCount === ids.length;
  const someSelected = selectedCount > 0 && !allSelected;
  const columnCount = visibleColumns.length + (selectable ? 1 : 0);

  const viewport = height ?? (virtualize ? VIRTUAL_HEIGHT : undefined);
  let start = 0;
  let end = rows.length;
  if (virtualize) {
    const span = viewport ?? VIRTUAL_HEIGHT;
    start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    end = Math.min(rows.length, Math.ceil((scrollTop + span) / rowHeight) + overscan);
  }

  const lastIndex = rows.length - 1;
  const clampedFocus = Math.min(focusIndex, Math.max(lastIndex, 0));
  // The roving stop must exist in the DOM: if the remembered row was windowed
  // out, the first rendered row holds it until focus comes back in.
  const tabStop = clampedFocus >= start && clampedFocus < end ? clampedFocus : start;

  // Focus moves after the render that put the target row in the window.
  useEffect(() => {
    const index = pendingFocus.current;
    if (index === null) return;
    pendingFocus.current = null;
    scrollRef.current?.querySelector<HTMLElement>(`tr[data-row-index="${index}"]`)?.focus();
  });

  function moveFocus(index: number) {
    const next = Math.max(0, Math.min(index, lastIndex));
    setFocusIndex(next);
    pendingFocus.current = next;
    const el = scrollRef.current;
    if (!virtualize || !el) return;
    const span = viewport ?? VIRTUAL_HEIGHT;
    const top = next * rowHeight;
    // `top` is measured from the body; the sticky header covers one row of
    // the viewport, so a row is in view between `scrollTop` and
    // `scrollTop + span - 2 * rowHeight`.
    let target = scrollTop;
    if (top < scrollTop) target = top;
    else if (top > scrollTop + span - 2 * rowHeight) target = top - span + 2 * rowHeight;
    if (target !== scrollTop) {
      el.scrollTop = target;
      setScrollTop(target);
    }
  }

  function toggleRow(index: number, extend: boolean) {
    if (!selection || !onSelectionChange) return;
    const id = ids[index];
    const checked = !selection.has(id);
    const next = new Set(selection);
    const from = extend && anchor.current !== null ? Math.min(anchor.current, index) : index;
    const to = extend && anchor.current !== null ? Math.max(anchor.current, index) : index;
    for (let i = from; i <= to; i++) {
      if (checked) next.add(ids[i]);
      else next.delete(ids[i]);
    }
    anchor.current = index;
    onSelectionChange(next);
  }

  function toggleAll() {
    if (!selection || !onSelectionChange) return;
    const next = new Set(selection);
    for (const id of ids) {
      if (allSelected) next.delete(id);
      else next.add(id);
    }
    anchor.current = null;
    onSelectionChange(next);
  }

  function toggleColumn(id: string, visible: boolean) {
    if (!onHiddenColumnsChange) return;
    const next = new Set(hiddenColumns);
    if (visible) next.delete(id);
    else next.add(id);
    onHiddenColumnsChange(next);
  }

  function onRowKeyDown(event: KeyboardEvent<HTMLTableRowElement>, index: number, row: Row) {
    if (event.target !== event.currentTarget) return;
    const moves: Record<string, number> = {
      ArrowDown: index + 1,
      ArrowUp: index - 1,
      Home: 0,
      End: lastIndex,
    };
    if (event.key in moves) {
      event.preventDefault();
      moveFocus(moves[event.key]);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      onRowActivate?.(row);
    } else if (event.key === ' ' && selectable) {
      event.preventDefault();
      toggleRow(index, event.shiftKey);
    }
  }

  function onSelectCellClick(event: MouseEvent<HTMLTableCellElement>, index: number) {
    // The cell is the touch target; the row must not also activate.
    event.stopPropagation();
    if (event.target instanceof HTMLInputElement) return;
    toggleRow(index, event.shiftKey);
  }

  const headerCell = cn(
    'h-(--size-row) whitespace-nowrap bg-surface py-0',
    stickyHeader && 'sticky top-0 z-raised shadow-[inset_0_-1px_0_var(--color-line)]',
  );

  const body = (() => {
    if (loading) {
      return Array.from({ length: SKELETON_ROWS }, (_, i) => (
        <TableRow
          // biome-ignore lint/suspicious/noArrayIndexKey: placeholders have no identity
          key={i}
          aria-hidden="true"
          data-skeleton=""
          className="hover:bg-transparent"
          style={{ height: rowHeight }}
        >
          {selectable ? (
            <TableCell className={SELECT_CELL}>
              <Skeleton className="mx-auto size-4" delay={i * 80} />
            </TableCell>
          ) : null}
          {visibleColumns.map((column) => (
            <TableCell key={column.id} className="py-0">
              <Skeleton className="h-3 w-2/3" delay={i * 80} />
            </TableCell>
          ))}
        </TableRow>
      ));
    }
    if (rows.length === 0) {
      return (
        <tr>
          <td colSpan={columnCount}>{emptyState ?? <EmptyState title="No rows" />}</td>
        </tr>
      );
    }
    const rendered: ReactNode[] = [];
    if (start > 0) {
      rendered.push(
        <tr key="__before" data-spacer="" style={{ height: start * rowHeight }} />,
      );
    }
    for (let index = start; index < end; index++) {
      const row = rows[index];
      const id = ids[index];
      const selected = selectable && selection.has(id);
      rendered.push(
        <TableRow
          key={id}
          data-row-index={index}
          aria-rowindex={virtualize ? index + 2 : undefined}
          aria-selected={selectable ? selected : undefined}
          tabIndex={activatable ? (index === tabStop ? 0 : -1) : undefined}
          onFocus={activatable ? () => setFocusIndex(index) : undefined}
          onKeyDown={activatable ? (event) => onRowKeyDown(event, index, row) : undefined}
          onClick={onRowActivate ? () => onRowActivate(row) : undefined}
          className={cn(
            'bg-surface text-ink',
            selected && 'bg-hover',
            activatable && 'cursor-pointer',
          )}
          style={{ height: rowHeight }}
        >
          {selectable ? (
            <TableCell
              className={cn(SELECT_CELL, 'cursor-pointer py-0')}
              onClick={(event) => onSelectCellClick(event, index)}
            >
              <span className="inline-flex justify-center [&_label]:hidden">
                <Checkbox
                  aria-label="Select row"
                  checked={selected}
                  disabled={!onSelectionChange}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    toggleRow(index, (event.nativeEvent as unknown as globalThis.MouseEvent).shiftKey === true)
                  }
                />
              </span>
            </TableCell>
          ) : null}
          {visibleColumns.map((column) => (
            <TableCell
              key={column.id}
              className={cn(
                'overflow-hidden text-ellipsis whitespace-nowrap py-0',
                column.align === 'end' && 'text-right',
              )}
            >
              {column.cell(row)}
            </TableCell>
          ))}
        </TableRow>,
      );
    }
    if (end < rows.length) {
      rendered.push(
        <tr
          key="__after"
          data-spacer=""
          style={{ height: (rows.length - end) * rowHeight }}
        />,
      );
    }
    return rendered;
  })();

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {onHiddenColumnsChange && hideable.length > 0 ? (
        <div className="flex justify-end">
          <MenuRoot>
            <MenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <Columns3 aria-hidden="true" className="size-3.5" />
                Columns
              </Button>
            </MenuTrigger>
            <MenuContent align="end">
              {hideable.map((column) => (
                <RadixMenu.CheckboxItem
                  key={column.id}
                  checked={!hiddenColumns?.has(column.id)}
                  onCheckedChange={(visible) => toggleColumn(column.id, visible === true)}
                  // Keep the menu open: hiding three columns is three picks.
                  onSelect={(event) => event.preventDefault()}
                  className={MENU_RADIO_ITEM_CLASS}
                >
                  <span className="inline-flex size-4 items-center justify-center">
                    <RadixMenu.ItemIndicator>
                      <Check aria-hidden="true" className="size-3.5" />
                    </RadixMenu.ItemIndicator>
                  </span>
                  {column.header}
                </RadixMenu.CheckboxItem>
              ))}
            </MenuContent>
          </MenuRoot>
        </div>
      ) : null}
      <div
        ref={scrollRef}
        data-data-table=""
        className="relative overflow-auto rounded-surface border border-line bg-surface"
        style={viewport !== undefined ? { height: viewport } : undefined}
        onScroll={(event: UIEvent<HTMLDivElement>) => setScrollTop(event.currentTarget.scrollTop)}
      >
        <Table
          aria-busy={loading || undefined}
          aria-rowcount={virtualize && !loading ? rows.length + 1 : undefined}
          className={cn(virtualize && 'table-fixed')}
        >
          <TableHead>
            <tr aria-rowindex={virtualize ? 1 : undefined}>
              {selectable ? (
                <TableCell head className={cn(headerCell, SELECT_CELL)}>
                  <span className="inline-flex justify-center [&_label]:hidden">
                    <Checkbox
                      aria-label="Select all rows"
                      checked={allSelected}
                      indeterminate={someSelected}
                      disabled={!onSelectionChange || loading || rows.length === 0}
                      onChange={toggleAll}
                    />
                  </span>
                </TableCell>
              ) : null}
              {visibleColumns.map((column) => {
                const sorted = sort?.columnId === column.id ? sort.direction : null;
                const Icon = sorted === 'asc' ? ArrowUp : sorted === 'desc' ? ArrowDown : ChevronsUpDown;
                return (
                  <TableCell
                    key={column.id}
                    head
                    scope="col"
                    aria-sort={ariaSort(sort, column as Column<unknown>)}
                    className={cn(headerCell, column.align === 'end' && 'text-right')}
                    style={column.width ? { width: column.width } : undefined}
                  >
                    {column.sortable && onSortChange ? (
                      <button
                        type="button"
                        onClick={() => onSortChange(nextSort(sort, column.id))}
                        className={cn(
                          TAP_TARGET,
                          'inline-flex items-center gap-1 rounded-control font-medium',
                          'transition-colors duration-(--dur-fast) hover:text-ink',
                          sorted && 'text-ink',
                          column.align === 'end' && 'flex-row-reverse',
                        )}
                      >
                        {column.header}
                        <Icon
                          aria-hidden="true"
                          className={cn('size-3.5', !sorted && 'text-ink-4')}
                        />
                      </button>
                    ) : (
                      column.header
                    )}
                  </TableCell>
                );
              })}
            </tr>
          </TableHead>
          <tbody>{body}</tbody>
        </Table>
      </div>
    </div>
  );
}
