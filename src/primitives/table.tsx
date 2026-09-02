import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';
import { ScrollHintRow } from './scroll-hint-row';

/**
 * FEAT-20260902-004 — a real table, the tokens' shapes.
 *
 * `preference-matrix.tsx:151-290` is a real grid with column headers and
 * per-cell toggles, wrapped for narrow viewports at `preference-matrix.tsx:151`
 * — the same wrapper this file reaches for via the `scroll` prop.
 *
 * `tabular-nums` is not redeclared here: `base.css` already puts
 * `font-variant-numeric: tabular-nums` on every `table`, so a real `<table>`
 * gets it for free the moment it renders through this component.
 */
type TableProps = Omit<ComponentProps<'table'>, 'className'> & {
  className?: string;
  /** Wraps the table in `ScrollHintRow` — for a matrix wider than its column. */
  scroll?: boolean;
};

export function Table({ scroll = false, className, children, ...props }: TableProps) {
  const table = (
    <table className={cn('w-full border-collapse text-sm', className)} {...props}>
      {children}
    </table>
  );
  return scroll ? (
    <ScrollHintRow className="scrollbar-hide overflow-x-auto">{table}</ScrollHintRow>
  ) : (
    table
  );
}

type TableHeadProps = Omit<ComponentProps<'thead'>, 'className'> & { className?: string };

export function TableHead({ className, ...props }: TableHeadProps) {
  return (
    <thead
      className={cn('border-b border-line text-left text-xs font-medium text-ink-3', className)}
      {...props}
    />
  );
}

type TableRowProps = Omit<ComponentProps<'tr'>, 'className'> & { className?: string };

export function TableRow({ className, ...props }: TableRowProps) {
  return (
    <tr
      className={cn(
        'border-b border-line transition-colors duration-(--dur-fast) last:border-0 hover:bg-hover',
        className,
      )}
      {...props}
    />
  );
}

type TableCellProps = Omit<ComponentProps<'td'>, 'className'> & {
  className?: string;
  /** Renders `<th>` — for the cells of a `TableHead`'s row. */
  head?: boolean;
};

export function TableCell({ head = false, className, ...props }: TableCellProps) {
  const Comp = head ? 'th' : 'td';
  return <Comp className={cn('px-3 py-2.5 align-middle', className)} {...props} />;
}
