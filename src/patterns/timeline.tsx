import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

/**
 * FEAT-20260930-070 — Timeline. Scaffold stub: the final prop types and a
 * flat `ol`. Day grouping, item kinds, the "N new" pill and load-more are
 * i70-feed's.
 */
export type TimelineItem = {
  id: string;
  at: string | Date;
  icon?: ReactNode;
  tone?: 'neutral' | 'ok' | 'warn' | 'danger';
  actor?: { name: string; avatar?: string };
  title: ReactNode;
  meta?: ReactNode;
  /** A link when set; a button when `onSelect` is set; plain otherwise. */
  href?: string;
  onSelect?: () => void;
};

export type TimelineProps = {
  items: TimelineItem[];
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  /** Default `HH:mm`. */
  formatTime?: (d: Date) => string;
  empty?: ReactNode;
  newCount?: number;
  onShowNew?: () => void;
  className?: string;
};

export function Timeline({ items, className }: TimelineProps) {
  return (
    <ol className={cn('flex flex-col', className)}>
      {items.map((item) => (
        <li key={item.id}>{item.title}</li>
      ))}
    </ol>
  );
}
