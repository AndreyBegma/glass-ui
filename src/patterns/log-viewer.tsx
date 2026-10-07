import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

/**
 * FEAT-20260930-070 — LogViewer. Scaffold stub: the final prop types and a
 * `role="log"` box. ANSI, virtualization, follow-tail, search and copy are
 * i70-log's.
 */
export type LogLine = {
  id: string | number;
  text: string;
  level?: 'info' | 'warn' | 'error' | 'debug';
  ts?: string;
};

export type LogViewerProps = {
  /** Append-only by convention; the consumer owns the stream. */
  lines: LogLine[];
  follow?: boolean;
  onFollowChange?: (follow: boolean) => void;
  wrap?: boolean;
  defaultWrap?: boolean;
  onWrapChange?: (wrap: boolean) => void;
  query?: string;
  onQueryChange?: (query: string) => void;
  /** Default 20 000 unwrapped; 5 000 when `wrap` is on. */
  maxLines?: number;
  /** Fixed line height in px, for virtualization. */
  lineHeight?: number;
  showLineNumbers?: boolean;
  emptyState?: ReactNode;
  /** Extra actions beside the wrap toggle, copy and search. */
  toolbar?: ReactNode;
  /** Accessible name of the log region. */
  label: string;
  className?: string;
};

export function LogViewer({ lines, label, className }: LogViewerProps) {
  return (
    <div
      role="log"
      aria-live="off"
      aria-label={label}
      className={cn('font-mono tabular-nums rounded-surface bg-raised border border-line', className)}
    >
      {lines.map((line) => (
        <div key={line.id}>{line.text}</div>
      ))}
    </div>
  );
}
