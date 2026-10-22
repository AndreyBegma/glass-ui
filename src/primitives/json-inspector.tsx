'use client';

import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

/**
 * v0.38.0 wave, JsonInspector. Scaffold stub: the final prop types and a
 * placeholder box. The tree, expansion and copy are its slot's.
 */
export type JsonInspectorLabels = Record<string, string>;

export type JsonInspectorProps = {
  value: unknown;
  /** Expanded paths, like `$.items[3].id`. */
  expanded?: ReadonlySet<string>;
  defaultExpandDepth?: number;
  onExpandedChange?: (expanded: ReadonlySet<string>) => void;
  rootLabel?: ReactNode;
  sortKeys?: boolean;
  /** Longer strings truncate with an expand control. */
  maxStringLength?: number;
  /** Copy value / copy path per row. */
  copyable?: boolean;
  labels?: Partial<JsonInspectorLabels>;
  className?: string;
};

export function JsonInspector({ rootLabel, className }: JsonInspectorProps) {
  return <div className={cn('font-mono', className)}>{rootLabel}</div>;
}
