'use client';

import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

/**
 * v0.38.0 wave, DiffView. Scaffold stub: the final prop types and a placeholder
 * box. The diff, the two modes and the header are its slot's.
 */
export type DiffViewLabels = Record<string, string>;

export type DiffViewProps = {
  oldText: string;
  newText: string;
  /** A unified diff; when given, `oldText` / `newText` are ignored. */
  patch?: string;
  mode?: 'unified' | 'split';
  defaultMode?: 'unified' | 'split';
  onModeChange?: (mode: 'unified' | 'split') => void;
  fileName?: ReactNode;
  /** Header label only, no highlighting. */
  language?: string;
  /** Unchanged lines kept around a hunk. Default 3. */
  context?: number;
  wrap?: boolean;
  maxHeight?: number;
  labels?: Partial<DiffViewLabels>;
  className?: string;
};

export function DiffView({ fileName, className }: DiffViewProps) {
  return (
    <div
      className={cn('rounded-surface bg-raised border border-line', className)}
    >
      {fileName}
    </div>
  );
}
