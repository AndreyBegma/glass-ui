'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../lib/cn';
import { Button } from './button';
import { Select } from './field';

/**
 * v0.38.0 wave, Pagination and CursorPagination.
 *
 * Two forms for two kinds of API. `Pagination` is for a list whose page count
 * is known: numbered buttons, an optional page-size select and a "1–25 of 312"
 * summary. `CursorPagination` is for GitHub- and Woodpecker-shaped cursors,
 * where there are no page numbers to show, only previous and next.
 *
 * Both are controlled: the page, the page size and the loading state are facts
 * about the data and belong to the caller. Nothing is held here. The keyboard
 * map is the browser's own, as the APG pagination pattern is a nav of plain
 * buttons: Tab between them, Enter or Space to press. Ellipses are text, not
 * controls, so Tab skips them.
 *
 * Below the tablet breakpoint the numbered row gives way to "‹ Page 3 of 12 ›".
 * Both are in the DOM and CSS picks one (`tablet:`), so there is no
 * `matchMedia` and no flash on the server.
 */

export interface PaginationLabels {
  /** The nav's accessible name. Default "Pagination". */
  nav: string;
  /** Default "Previous page". */
  previous: string;
  /** Default "Next page". */
  next: string;
  /** A page button's accessible name. Default "Page N". */
  page: (page: number) => string;
  /** The compact form. Default "Page N of M". */
  pageOf: (page: number, pageCount: number) => string;
  /** The summary when `total` is known. Default "1–25 of 312". */
  range: (from: number, to: number, total: number) => string;
  /** The page-size select's accessible name. Default "Rows per page". */
  pageSize: string;
  /** One option of the page-size select. Default "25 / page". */
  pageSizeOption: (size: number) => string;
}

const DEFAULT_LABELS: PaginationLabels = {
  nav: 'Pagination',
  previous: 'Previous page',
  next: 'Next page',
  page: (page) => `Page ${page}`,
  pageOf: (page, pageCount) => `Page ${page} of ${pageCount}`,
  range: (from, to, total) => `${from}–${to} of ${total}`,
  pageSize: 'Rows per page',
  pageSizeOption: (size) => `${size} / page`,
};

export type PageRangeItem = number | 'ellipsis-start' | 'ellipsis-end';

const range = (from: number, to: number): number[] =>
  Array.from({ length: Math.max(to - from + 1, 0) }, (_, i) => from + i);

const whole = (n: number, floor: number) =>
  Number.isFinite(n) ? Math.max(Math.floor(n), floor) : floor;

/**
 * The pages to draw, in order, with `'ellipsis-start'` / `'ellipsis-end'`
 * where a run is skipped. `boundaryCount` pages stay at each end and
 * `siblingCount` pages stay either side of `page`.
 *
 * The length is constant while the page moves, so the control does not change
 * width under the pointer, and a gap of exactly one page shows that page
 * rather than an ellipsis standing in for it.
 */
export function pageRange(
  page: number,
  pageCount: number,
  siblingCount = 1,
  boundaryCount = 1,
): PageRangeItem[] {
  const count = whole(pageCount, 0);
  if (count === 0) return [];
  const sibling = whole(siblingCount, 0);
  const boundary = whole(boundaryCount, 0);
  const current = Math.min(Math.max(whole(page, 1), 1), count);

  const startPages = range(1, Math.min(boundary, count));
  const endPages = range(Math.max(count - boundary + 1, boundary + 1), count);

  const siblingsStart = Math.max(
    Math.min(current - sibling, count - boundary - sibling * 2 - 1),
    boundary + 2,
  );
  const siblingsEnd = Math.min(
    Math.max(current + sibling, boundary + sibling * 2 + 2),
    endPages.length > 0 ? (endPages[0] as number) - 2 : count - 1,
  );

  const before: PageRangeItem[] =
    siblingsStart > boundary + 2
      ? ['ellipsis-start']
      : boundary + 1 < count - boundary
        ? [boundary + 1]
        : [];
  const after: PageRangeItem[] =
    siblingsEnd < count - boundary - 1
      ? ['ellipsis-end']
      : count - boundary > boundary
        ? [count - boundary]
        : [];

  return [
    ...startPages,
    ...before,
    ...range(siblingsStart, siblingsEnd),
    ...after,
    ...endPages,
  ];
}

export type PaginationProps = {
  /** The current page, 1-based. */
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  /** Pages shown either side of the current one. Default 1. */
  siblingCount?: number;
  /** Pages kept at each end. Default 1. */
  boundaryCount?: number;
  pageSize?: number;
  /** With `onPageSizeChange`, adds the page-size select. */
  pageSizeOptions?: number[];
  onPageSizeChange?: (pageSize: number) => void;
  /** Rows in all. With `pageSize`, adds the "1–25 of 312" summary. */
  total?: number;
  labels?: Partial<PaginationLabels>;
  className?: string;
};

export type CursorPaginationProps = {
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  /** A request is in flight: both buttons are disabled until it lands. */
  loading?: boolean;
  summary?: ReactNode;
  labels?: Partial<Pick<PaginationLabels, 'nav' | 'previous' | 'next'>>;
  className?: string;
};

const NAV = 'flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-2 tabular-nums';

function Step({
  direction,
  label,
  disabled,
  onClick,
}: {
  direction: 'previous' | 'next';
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = direction === 'previous' ? ChevronLeft : ChevronRight;
  return (
    <Button
      variant="ghost"
      size="sm"
      icon
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon aria-hidden className="size-4" />
    </Button>
  );
}

export function Pagination({
  page,
  pageCount,
  onPageChange,
  siblingCount = 1,
  boundaryCount = 1,
  pageSize,
  pageSizeOptions,
  onPageSizeChange,
  total,
  labels: labelsProp,
  className,
}: PaginationProps) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp };
  const count = whole(pageCount, 1);
  const current = Math.min(Math.max(whole(page, 1), 1), count);
  const items = pageRange(current, count, siblingCount, boundaryCount);

  const showSummary = total !== undefined && pageSize !== undefined && total > 0;
  const from = showSummary ? (current - 1) * (pageSize as number) + 1 : 0;
  const to = showSummary ? Math.min(current * (pageSize as number), total as number) : 0;
  const showSize = pageSizeOptions !== undefined && onPageSizeChange !== undefined;

  return (
    <nav aria-label={labels.nav} className={cn(NAV, className)}>
      {showSummary && (
        <span aria-live="polite" className="text-ink-3">
          {labels.range(from, to, total as number)}
        </span>
      )}
      {showSize && (
        <Select
          aria-label={labels.pageSize}
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.currentTarget.value))}
          className="w-auto"
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {labels.pageSizeOption(size)}
            </option>
          ))}
        </Select>
      )}
      <ul className="m-0 flex list-none items-center gap-1 p-0">
        <li>
          <Step
            direction="previous"
            label={labels.previous}
            disabled={current <= 1}
            onClick={() => onPageChange(current - 1)}
          />
        </li>
        {/* Narrow: "‹ Page 3 of 12 ›". From the tablet breakpoint up the
            numbered items replace it. One previous and one next serve both. */}
        <li className="px-2 tablet:hidden">{labels.pageOf(current, count)}</li>
        {items.map((item) =>
          typeof item === 'number' ? (
            <li key={item} className="hidden tablet:block">
              <Button
                variant={item === current ? 'solid' : 'ghost'}
                size="sm"
                aria-label={labels.page(item)}
                aria-current={item === current ? 'page' : undefined}
                onClick={() => onPageChange(item)}
                className="min-w-(--size-control-sm)"
              >
                {item}
              </Button>
            </li>
          ) : (
            <li
              key={item}
              aria-hidden
              className="hidden px-1 text-ink-3 select-none tablet:block"
            >
              …
            </li>
          ),
        )}
        <li>
          <Step
            direction="next"
            label={labels.next}
            disabled={current >= count}
            onClick={() => onPageChange(current + 1)}
          />
        </li>
      </ul>
    </nav>
  );
}

export function CursorPagination({
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
  loading = false,
  summary,
  labels: labelsProp,
  className,
}: CursorPaginationProps) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp };
  return (
    <nav
      aria-label={labels.nav}
      aria-busy={loading || undefined}
      className={cn(NAV, className)}
    >
      <div className="flex items-center gap-1">
        <Step
          direction="previous"
          label={labels.previous}
          disabled={loading || !hasPrevious}
          onClick={onPrevious}
        />
        <Step
          direction="next"
          label={labels.next}
          disabled={loading || !hasNext}
          onClick={onNext}
        />
      </div>
      {summary !== undefined && <span aria-live="polite">{summary}</span>}
    </nav>
  );
}
