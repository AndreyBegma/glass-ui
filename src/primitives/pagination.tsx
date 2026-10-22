'use client';

import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

/**
 * v0.38.0 wave, Pagination and CursorPagination. Scaffold stub: the final prop
 * types and placeholder navs. The page range, keys and page-size control are
 * its slot's.
 */
export type PaginationLabels = Record<string, string>;

export type PaginationProps = {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
  boundaryCount?: number;
  pageSize?: number;
  pageSizeOptions?: number[];
  onPageSizeChange?: (pageSize: number) => void;
  total?: number;
  labels?: Partial<PaginationLabels>;
  className?: string;
};

export type CursorPaginationProps = {
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  loading?: boolean;
  summary?: ReactNode;
  labels?: Partial<PaginationLabels>;
  className?: string;
};

export function Pagination({ page, pageCount, className }: PaginationProps) {
  return (
    <nav aria-label="Pagination" className={cn('tabular-nums', className)}>
      {page} / {pageCount}
    </nav>
  );
}

export function CursorPagination({
  summary,
  className,
}: CursorPaginationProps) {
  return (
    <nav aria-label="Pagination" className={cn(className)}>
      {summary}
    </nav>
  );
}
