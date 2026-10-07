import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

/**
 * FEAT-20260930-067 — TraceTree. Scaffold stub: the final prop types and an
 * empty treegrid. Rows, waterfall bars and the keyboard contract are
 * i67-trace's.
 */
export type TraceNodeKind = 'turn' | 'llm' | 'tool' | 'agent' | 'other';

export type TraceNode = {
  id: string;
  label: ReactNode;
  kind: TraceNodeKind;
  start: number;
  /** Absent while running; extends to "now", which the caller passes via the root's `end`. */
  end?: number;
  meta?: ReactNode;
  totals?: ReactNode;
  status?: 'ok' | 'error' | 'running';
  children?: TraceNode[];
};

export type TraceTreeLabels = {
  expand?: string;
  collapse?: string;
  meta?: string;
  totals?: string;
  timeline?: string;
};

export type TraceTreeProps = {
  nodes: TraceNode[];
  expanded: ReadonlySet<string>;
  onExpandedChange: (expanded: ReadonlySet<string>) => void;
  selected?: string;
  onSelect?: (id: string) => void;
  columns?: { meta?: boolean; totals?: boolean };
  labels?: TraceTreeLabels;
  className?: string;
};

export function TraceTree({ className }: TraceTreeProps) {
  return <div role="treegrid" className={cn(className)} />;
}
