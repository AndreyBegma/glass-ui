import { afterEach, describe, expect, test } from 'bun:test';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { type Column, DataTable, type DataTableSort, sortRows } from './data-table';

/**
 * FEAT-20260930-067 — DataTable's acceptance bullets, one `test` each.
 *
 * The component is controlled, so most tests mount it inside a small harness
 * that owns the state the way a consumer would, and assert on what reaches the
 * DOM — the attribute a reader hears, not the setter that was called.
 */

afterEach(cleanup);

type Agent = { id: string; name: string; cost: number | null; status: string };

const AGENTS: Agent[] = [
  { id: 'a', name: 'atlas', cost: 3, status: 'ok' },
  { id: 'b', name: 'borealis', cost: null, status: 'error' },
  { id: 'c', name: 'compass', cost: 12, status: 'ok' },
  { id: 'd', name: 'delta', cost: 1, status: 'running' },
  { id: 'e', name: 'ember', cost: 7, status: 'ok' },
];

const COLUMNS: Column<Agent>[] = [
  { id: 'name', header: 'Name', cell: (r) => r.name, sortable: true },
  { id: 'cost', header: 'Cost', cell: (r) => r.cost ?? '—', sortable: true, align: 'end', hideable: true },
  { id: 'status', header: 'Status', cell: (r) => r.status, hideable: true },
];

const getRowId = (r: Agent) => r.id;

/** Rows of the body, minus spacer and placeholder rows. */
function bodyRows(container: HTMLElement = document.body) {
  return [...container.querySelectorAll<HTMLTableRowElement>('tbody tr[data-row-index]')];
}

function rowCheckbox(name: string) {
  const row = screen.getByText(name).closest('tr') as HTMLElement;
  return within(row).getByRole('checkbox', { name: 'Select row' }) as HTMLInputElement;
}

function headerCheckbox() {
  return screen.getByRole('checkbox', { name: 'Select all rows' }) as HTMLInputElement;
}

function Selectable({
  initial = [],
  onRowActivate,
}: {
  initial?: string[];
  onRowActivate?: (row: Agent) => void;
}) {
  const [selection, setSelection] = useState<ReadonlySet<string>>(new Set(initial));
  return (
    <DataTable
      rows={AGENTS}
      getRowId={getRowId}
      columns={COLUMNS}
      selection={selection}
      onSelectionChange={setSelection}
      onRowActivate={onRowActivate}
    />
  );
}

describe('DataTable', () => {
  test('clicking a sortable header calls onSortChange asc → desc → null and sets aria-sort', () => {
    const calls: (DataTableSort | null)[] = [];
    function Harness() {
      const [sort, setSort] = useState<DataTableSort | null>(null);
      return (
        <DataTable
          rows={AGENTS}
          getRowId={getRowId}
          columns={COLUMNS}
          sort={sort}
          onSortChange={(next) => {
            calls.push(next);
            setSort(next);
          }}
        />
      );
    }
    render(<Harness />);
    const name = () => screen.getByRole('columnheader', { name: /Name/ });
    const status = screen.getByRole('columnheader', { name: 'Status' });

    expect(name().getAttribute('aria-sort')).toBe('none');
    // Not sortable: no `aria-sort`, and no button to press.
    expect(status.hasAttribute('aria-sort')).toBe(false);
    expect(within(status).queryByRole('button')).toBeNull();

    const button = within(name()).getByRole('button');
    fireEvent.click(button);
    expect(name().getAttribute('aria-sort')).toBe('ascending');
    fireEvent.click(button);
    expect(name().getAttribute('aria-sort')).toBe('descending');
    fireEvent.click(button);
    expect(name().getAttribute('aria-sort')).toBe('none');

    expect(calls).toEqual([
      { columnId: 'name', direction: 'asc' },
      { columnId: 'name', direction: 'desc' },
      null,
    ]);
  });

  test('sorting another column starts it at asc, and the component never reorders rows', () => {
    const calls: (DataTableSort | null)[] = [];
    render(
      <DataTable
        rows={AGENTS}
        getRowId={getRowId}
        columns={COLUMNS}
        sort={{ columnId: 'name', direction: 'desc' }}
        onSortChange={(next) => calls.push(next)}
      />,
    );
    fireEvent.click(within(screen.getByRole('columnheader', { name: /Cost/ })).getByRole('button'));
    expect(calls).toEqual([{ columnId: 'cost', direction: 'asc' }]);
    expect(bodyRows().map((r) => r.cells[0].textContent)).toEqual(AGENTS.map((a) => a.name));
  });

  test('header checkbox is indeterminate for partial selection', () => {
    render(<Selectable initial={['a', 'c']} />);
    expect(headerCheckbox().indeterminate).toBe(true);
    expect(headerCheckbox().checked).toBe(false);

    // Partial → all.
    fireEvent.click(headerCheckbox());
    expect(headerCheckbox().indeterminate).toBe(false);
    expect(headerCheckbox().checked).toBe(true);
    expect(AGENTS.every((a) => rowCheckbox(a.name).checked)).toBe(true);

    // All → none.
    fireEvent.click(headerCheckbox());
    expect(headerCheckbox().checked).toBe(false);
    expect(headerCheckbox().indeterminate).toBe(false);
    expect(AGENTS.some((a) => rowCheckbox(a.name).checked)).toBe(false);
  });

  test('the header checkbox keeps selected ids that are not among the rows', () => {
    const seen: ReadonlySet<string>[] = [];
    render(
      <DataTable
        rows={AGENTS}
        getRowId={getRowId}
        columns={COLUMNS}
        selection={new Set(['elsewhere'])}
        onSelectionChange={(next) => seen.push(next)}
      />,
    );
    fireEvent.click(headerCheckbox());
    expect([...seen[0]].sort()).toEqual(['a', 'b', 'c', 'd', 'e', 'elsewhere']);
  });

  test('Shift+click selects a range', () => {
    render(<Selectable />);
    fireEvent.click(rowCheckbox('borealis'));
    fireEvent.click(rowCheckbox('ember'), { shiftKey: true });
    expect(AGENTS.map((a) => rowCheckbox(a.name).checked)).toEqual([false, true, true, true, true]);

    // A Shift+click on a selected row clears the range from the anchor (ember)
    // to it, both ends included.
    fireEvent.click(rowCheckbox('compass'), { shiftKey: true });
    expect(AGENTS.map((a) => rowCheckbox(a.name).checked)).toEqual([false, true, false, false, false]);
  });

  test('the selection cell is the target: a click beside the checkbox toggles it', () => {
    const activated: string[] = [];
    render(<Selectable onRowActivate={(r) => activated.push(r.id)} />);
    const cell = rowCheckbox('atlas').closest('td') as HTMLElement;
    fireEvent.click(cell);
    expect(rowCheckbox('atlas').checked).toBe(true);
    // Selecting is not activating.
    fireEvent.click(rowCheckbox('atlas'));
    expect(activated).toEqual([]);
  });

  test("Space toggles the focused row's checkbox", () => {
    render(<Selectable onRowActivate={() => {}} />);
    const row = screen.getByText('compass').closest('tr') as HTMLElement;
    act(() => row.focus());
    fireEvent.keyDown(row, { key: ' ' });
    expect(rowCheckbox('compass').checked).toBe(true);
    expect(row.getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(row, { key: ' ' });
    expect(rowCheckbox('compass').checked).toBe(false);
  });

  test('hidden columns disappear from header and cells', () => {
    function Harness() {
      const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set(['cost']));
      return (
        <>
          <button type="button" onClick={() => setHidden(new Set(['status']))}>
            swap
          </button>
          <DataTable
            rows={AGENTS}
            getRowId={getRowId}
            columns={COLUMNS}
            hiddenColumns={hidden}
            onHiddenColumnsChange={setHidden}
          />
        </>
      );
    }
    render(<Harness />);
    const headers = () => screen.getAllByRole('columnheader').map((h) => h.textContent);
    expect(headers()).toEqual(['Name', 'Status']);
    expect(bodyRows().every((r) => r.cells.length === 2)).toBe(true);
    expect(screen.queryByText('12')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'swap' }));
    expect(headers()).toEqual(['Name', 'Cost']);
    expect(screen.getByText('12')).toBeTruthy();
    expect(screen.queryByText('running')).toBeNull();
  });

  test('non-hideable columns are not listed in the Columns menu', async () => {
    const seen: ReadonlySet<string>[] = [];
    render(
      <DataTable
        rows={AGENTS}
        getRowId={getRowId}
        columns={COLUMNS}
        hiddenColumns={new Set(['status'])}
        onHiddenColumnsChange={(next) => seen.push(next)}
      />,
    );
    const trigger = screen.getByRole('button', { name: 'Columns' });
    fireEvent.keyDown(trigger, { key: 'Enter' });

    const items = await screen.findAllByRole('menuitemcheckbox');
    expect(items.map((i) => i.textContent)).toEqual(['Cost', 'Status']);
    expect(items.map((i) => i.getAttribute('aria-checked'))).toEqual(['true', 'false']);

    fireEvent.click(items[0]);
    expect([...seen[0]].sort()).toEqual(['cost', 'status']);
  });

  test('without onHiddenColumnsChange, or with nothing hideable, there is no Columns menu', () => {
    const { unmount } = render(<DataTable rows={AGENTS} getRowId={getRowId} columns={COLUMNS} />);
    expect(screen.queryByRole('button', { name: 'Columns' })).toBeNull();
    unmount();

    render(
      <DataTable
        rows={AGENTS}
        getRowId={getRowId}
        columns={COLUMNS.map((c) => ({ ...c, hideable: false }))}
        onHiddenColumnsChange={() => {}}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Columns' })).toBeNull();
  });

  test('loading shows skeleton rows; empty shows emptyState', () => {
    const { container, rerender } = render(
      <DataTable rows={AGENTS} getRowId={getRowId} columns={COLUMNS} rowHeight={40} loading />,
    );
    const table = screen.getByRole('table');
    expect(table.getAttribute('aria-busy')).toBe('true');
    const placeholders = container.querySelectorAll<HTMLElement>('tbody tr[data-skeleton]');
    expect(placeholders.length).toBe(5);
    // Same height as a real row, so the table does not jump when data lands.
    expect([...placeholders].every((r) => r.style.height === '40px')).toBe(true);
    expect(screen.queryByText('atlas')).toBeNull();

    rerender(<DataTable rows={[]} getRowId={getRowId} columns={COLUMNS} />);
    expect(screen.getByText('No rows')).toBeTruthy();
    expect(screen.getByRole('table').hasAttribute('aria-busy')).toBe(false);
    const cell = screen.getByText('No rows').closest('td') as HTMLTableCellElement;
    expect(cell.colSpan).toBe(3);

    rerender(
      <DataTable rows={[]} getRowId={getRowId} columns={COLUMNS} emptyState={<p>No agents yet</p>} />,
    );
    expect(screen.getByText('No agents yet')).toBeTruthy();
    expect(screen.queryByText('No rows')).toBeNull();
  });

  test('rows are focusable only when onRowActivate is set; Enter and click activate', () => {
    const { unmount } = render(<DataTable rows={AGENTS} getRowId={getRowId} columns={COLUMNS} />);
    expect(bodyRows().some((r) => r.hasAttribute('tabindex'))).toBe(false);
    unmount();

    const activated: string[] = [];
    render(
      <DataTable
        rows={AGENTS}
        getRowId={getRowId}
        columns={COLUMNS}
        onRowActivate={(r) => activated.push(r.id)}
      />,
    );
    const rows = bodyRows();
    // One tab stop.
    expect(rows.map((r) => r.tabIndex)).toEqual([0, -1, -1, -1, -1]);

    act(() => rows[0].focus());
    fireEvent.keyDown(rows[0], { key: 'ArrowDown' });
    expect(document.activeElement).toBe(bodyRows()[1]);
    fireEvent.keyDown(bodyRows()[1], { key: 'End' });
    expect(document.activeElement).toBe(bodyRows()[4]);
    fireEvent.keyDown(bodyRows()[4], { key: 'ArrowDown' });
    expect(document.activeElement).toBe(bodyRows()[4]);
    fireEvent.keyDown(bodyRows()[4], { key: 'Home' });
    expect(document.activeElement).toBe(bodyRows()[0]);
    fireEvent.keyDown(bodyRows()[0], { key: 'ArrowUp' });
    expect(document.activeElement).toBe(bodyRows()[0]);
    // The stop follows focus.
    fireEvent.keyDown(bodyRows()[0], { key: 'ArrowDown' });
    expect(bodyRows().map((r) => r.tabIndex)).toEqual([-1, 0, -1, -1, -1]);

    fireEvent.keyDown(bodyRows()[1], { key: 'Enter' });
    fireEvent.click(screen.getByText('ember'));
    expect(activated).toEqual(['b', 'e']);
  });

  test('10 000 rows with virtualize keep fewer than 100 tr in the DOM', () => {
    const many = Array.from({ length: 10_000 }, (_, i) => ({
      id: `r${i}`,
      name: `row ${i}`,
      cost: i,
      status: 'ok',
    }));
    const { container } = render(
      <DataTable rows={many} getRowId={getRowId} columns={COLUMNS} virtualize />,
    );
    expect(container.querySelectorAll('tr').length).toBeLessThan(100);
    const table = screen.getByRole('table');
    expect(table.getAttribute('aria-rowcount')).toBe('10001');
    expect(bodyRows(container)[0].getAttribute('aria-rowindex')).toBe('2');
    // The rows that are not rendered are still there, as height.
    const after = container.querySelector<HTMLElement>('tbody tr[data-spacer]:last-child');
    const rendered = bodyRows(container).length;
    expect(after?.style.height).toBe(`${(10_000 - rendered) * 44}px`);
  });

  test('scrolling renders the right aria-rowindex', () => {
    const many = Array.from({ length: 10_000 }, (_, i) => ({
      id: `r${i}`,
      name: `row ${i}`,
      cost: i,
      status: 'ok',
    }));
    const { container } = render(
      <DataTable
        rows={many}
        getRowId={getRowId}
        columns={COLUMNS}
        virtualize
        rowHeight={40}
        overscan={4}
        height={400}
      />,
    );
    const scroller = container.querySelector('[data-data-table]') as HTMLElement;
    act(() => {
      scroller.scrollTop = 200_000;
      fireEvent.scroll(scroller);
    });
    const rows = bodyRows(container);
    // Row 5000 is at the top of the viewport; four rows of overscan above it.
    expect(rows[0].getAttribute('aria-rowindex')).toBe(String(4996 + 2));
    expect(rows[0].textContent).toContain('row 4996');
    // 400 / 40 = 10 visible, plus overscan on both sides.
    expect(rows.at(-1)?.getAttribute('aria-rowindex')).toBe(String(5014 + 1));
    expect(container.querySelectorAll('tr').length).toBeLessThan(100);
    const before = container.querySelector<HTMLElement>('tbody tr[data-spacer]:first-child');
    expect(before?.style.height).toBe(`${4996 * 40}px`);
  });

  test('End on a virtualized table scrolls the last row in and focuses it', () => {
    const many = Array.from({ length: 1_000 }, (_, i) => ({
      id: `r${i}`,
      name: `row ${i}`,
      cost: i,
      status: 'ok',
    }));
    const { container } = render(
      <DataTable
        rows={many}
        getRowId={getRowId}
        columns={COLUMNS}
        virtualize
        rowHeight={40}
        height={400}
        onRowActivate={() => {}}
      />,
    );
    const first = bodyRows(container)[0];
    act(() => first.focus());
    act(() => {
      fireEvent.keyDown(first, { key: 'End' });
    });
    const focused = document.activeElement as HTMLElement;
    expect(focused.getAttribute('aria-rowindex')).toBe('1001');
    expect(focused.getAttribute('tabindex')).toBe('0');
  });

  test('renders under data-theme light, dark and data-material flat', () => {
    for (const attrs of [
      { 'data-theme': 'light' },
      { 'data-theme': 'dark' },
      { 'data-material': 'flat' },
    ]) {
      const { container, unmount } = render(
        <div {...attrs}>
          <Selectable initial={['a']} onRowActivate={() => {}} />
        </div>,
      );
      const scroller = container.querySelector('[data-data-table]') as HTMLElement;
      // Solid, token-built surfaces; glass is the menu's alone (D3).
      expect(scroller.className).toContain('bg-surface');
      expect(scroller.className).toContain('border-line');
      expect(container.querySelector('[class*="glass"]')).toBeNull();
      const [selected, ...rest] = bodyRows(container);
      for (const row of rest) {
        expect(row.className).toContain('bg-surface');
        expect(row.className).toContain('text-ink');
      }
      // The selected row trades the surface for the hover token, not a colour.
      expect(selected.className).toContain('bg-hover');
      expect(selected.className).not.toContain('bg-surface');
      unmount();
    }
  });

  test('the header is sticky inside its own scroll container unless turned off', () => {
    const { container, rerender } = render(
      <DataTable rows={AGENTS} getRowId={getRowId} columns={COLUMNS} height={200} />,
    );
    const scroller = container.querySelector('[data-data-table]') as HTMLElement;
    expect(scroller.className).toContain('overflow-auto');
    expect(scroller.style.height).toBe('200px');
    expect(screen.getAllByRole('columnheader').every((h) => h.className.includes('sticky'))).toBe(true);

    rerender(<DataTable rows={AGENTS} getRowId={getRowId} columns={COLUMNS} stickyHeader={false} />);
    expect(screen.getAllByRole('columnheader').some((h) => h.className.includes('sticky'))).toBe(false);
  });

  test('rowHeight defaults to 36 at the desk and 44 elsewhere', () => {
    const { unmount } = render(<DataTable rows={AGENTS} getRowId={getRowId} columns={COLUMNS} />);
    expect(bodyRows()[0].style.height).toBe('44px');
    unmount();

    render(
      <div data-scale="desk">
        <DataTable rows={AGENTS} getRowId={getRowId} columns={COLUMNS} />
      </div>,
    );
    expect(bodyRows()[0].style.height).toBe('36px');
  });

  test('touch targets are at least 44px on a coarse pointer', () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query === '(pointer: coarse)',
      media: query,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;
    try {
      render(
        <div data-scale="desk">
          <DataTable
            rows={AGENTS}
            getRowId={getRowId}
            columns={COLUMNS}
            selection={new Set()}
            onSelectionChange={() => {}}
            sort={null}
            onSortChange={() => {}}
            hiddenColumns={new Set()}
            onHiddenColumnsChange={() => {}}
          />
        </div>,
      );
      // A coarse pointer keeps the 44 px row even at the desk…
      expect(bodyRows()[0].style.height).toBe('44px');
      // …and the 44 px-wide selection cell is the checkbox's target.
      const cell = rowCheckbox('atlas').closest('td') as HTMLElement;
      expect(cell.className).toContain('w-11');
      // Sort buttons and the Columns trigger carry the `--size-tap` hit area.
      const sortButton = within(screen.getByRole('columnheader', { name: /Name/ })).getByRole('button');
      expect(sortButton.className).toContain('after:h-(--size-tap)');
      expect(sortButton.className).toContain('[@media(pointer:fine)]:after:hidden');
      expect(screen.getByRole('button', { name: 'Columns' }).className).toContain(
        'after:h-(--size-tap)',
      );
    } finally {
      window.matchMedia = original;
    }
  });
});

describe('sortRows', () => {
  const rows = [
    { id: '1', n: 10, s: 'item 10' },
    { id: '2', n: null, s: null },
    { id: '3', n: 2, s: 'item 2' },
    { id: '4', n: Number.NaN, s: 'Apple' },
    { id: '5', n: 2, s: 'banana' },
    { id: '6', n: -1, s: undefined },
  ];
  type R = (typeof rows)[number];
  const cols: Column<R>[] = [
    { id: 'n', header: 'N', cell: (r) => r.n, sortable: true },
    { id: 's', header: 'S', cell: (r) => r.s, sortable: true },
    { id: 'id', header: 'Id', cell: (r) => r.id },
  ];
  const value = (r: R, id: string) => r[id as keyof R];
  const ids = (out: R[]) => out.map((r) => r.id);

  test('sorts numbers, strings and nulls deterministically', () => {
    // Numbers numerically; ties keep input order; null and NaN last.
    expect(ids(sortRows(rows, cols, { columnId: 'n', direction: 'asc' }, value))).toEqual([
      '6', '3', '5', '1', '2', '4',
    ]);
    // Descending flips the order, not the missing values, and ties stay stable.
    expect(ids(sortRows(rows, cols, { columnId: 'n', direction: 'desc' }, value))).toEqual([
      '1', '3', '5', '6', '2', '4',
    ]);
    // Strings with a numeric collator, case-insensitive enough that `Apple` and
    // `banana` sit together; null and undefined last.
    expect(ids(sortRows(rows, cols, { columnId: 's', direction: 'asc' }, value))).toEqual([
      '4', '5', '3', '1', '2', '6',
    ]);
    expect(ids(sortRows(rows, cols, { columnId: 's', direction: 'desc' }, value))).toEqual([
      '1', '3', '5', '4', '2', '6',
    ]);
    // The same input always gives the same output.
    const once = ids(sortRows(rows, cols, { columnId: 's', direction: 'asc' }, value));
    expect(ids(sortRows([...rows], cols, { columnId: 's', direction: 'asc' }, value))).toEqual(once);
  });

  test('mixed types order number < string; dates by time', () => {
    const mixed = [
      { id: 'a', v: 'x' as unknown },
      { id: 'b', v: 5 },
      { id: 'c', v: new Date(2000, 0, 1) },
      { id: 'd', v: new Date(1990, 0, 1) },
    ];
    const c: Column<(typeof mixed)[number]>[] = [{ id: 'v', header: 'V', cell: () => null, sortable: true }];
    const out = sortRows(mixed, c, { columnId: 'v', direction: 'asc' }, (r) => r.v);
    expect(out.map((r) => r.id)).toEqual(['b', 'd', 'c', 'a']);
  });

  test('a null sort, an unknown column or a non-sortable one returns a copy in input order', () => {
    for (const sort of [null, undefined, { columnId: 'nope', direction: 'asc' as const }, { columnId: 'id', direction: 'desc' as const }]) {
      const out = sortRows(rows, cols, sort, value);
      expect(out).not.toBe(rows);
      expect(ids(out)).toEqual(ids(rows));
    }
  });

  test('never mutates its input', () => {
    const copy = [...rows];
    sortRows(rows, cols, { columnId: 'n', direction: 'desc' }, value);
    expect(rows).toEqual(copy);
  });
});
