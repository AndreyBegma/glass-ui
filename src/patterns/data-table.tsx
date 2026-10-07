import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

/**
 * FEAT-20260930-067 — DataTable. Scaffold stub: the final prop types, a
 * pass-through `sortRows` and a bare table. Sorting, selection, hidden
 * columns, windowing and states are i67-datatable's.
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

/**
 * Client-side sorting for a consumer that wants it; the component itself never
 * reorders data. Returns a new array. Stub: returns the rows unchanged.
 */
export function sortRows<Row>(
  rows: Row[],
  _columns: Column<Row>[],
  _sort: DataTableSort | null | undefined,
  _getValue: (row: Row, columnId: string) => unknown,
): Row[] {
  return [...rows];
}

export function DataTable<Row>({
  rows,
  getRowId,
  columns,
  className,
}: DataTableProps<Row>) {
  return (
    <table className={cn('tabular-nums', className)}>
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c.id}>{c.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={getRowId(row)}>
            {columns.map((c) => (
              <td key={c.id}>{c.cell(row)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
