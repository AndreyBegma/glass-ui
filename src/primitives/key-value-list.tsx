import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

/**
 * FEAT-20260930-067 — KeyValueList. Scaffold stub: the final prop types and
 * the `dl/dt/dd` skeleton. Columns, copy and truncation are i67-small's.
 */
export type KeyValueItem = {
  key: string;
  label: ReactNode;
  value: ReactNode;
  copyValue?: string;
};

export type KeyValueListProps = {
  items: KeyValueItem[];
  columns?: 1 | 2;
  dense?: boolean;
  className?: string;
};

export function KeyValueList({
  items,
  columns = 1,
  dense = false,
  className,
}: KeyValueListProps) {
  return (
    <dl
      data-columns={columns}
      data-dense={dense ? '' : undefined}
      className={cn('tabular-nums', className)}
    >
      {items.map((item) => (
        <div key={item.key}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
