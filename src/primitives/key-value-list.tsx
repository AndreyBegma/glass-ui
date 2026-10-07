'use client';

import { Check, Copy } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../lib/cn';
import { Button } from './button';
import { useCopy } from './code-block-copy';
import { Tooltip } from './tooltip';

/**
 * FEAT-20260930-067 — a `<dl>` of facts about one thing: a session's model,
 * its cwd, its cost. Values are `ReactNode` and never formatted here — copy,
 * currency and durations are the consumer's (D9).
 *
 * Two columns collapse to one below the `sm` breakpoint. `copyValue` adds a
 * small copy button beside the value (D10, inline "Copied", no toast). A long
 * value truncates, and when it is a plain string or number the full text is in
 * a `Tooltip`; a `ReactNode` value is truncated without one, since a tooltip
 * is text-only.
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

function CopyButton({ text, label }: { text: string; label: string }) {
  const { copied, copy } = useCopy(text);
  return (
    <Button
      variant="ghost"
      size="sm"
      icon
      aria-label={copied ? 'Copied' : `Copy ${label}`}
      onClick={copy}
      className="size-6 shrink-0"
    >
      {copied ? (
        <>
          <Check aria-hidden="true" className="size-3.5" />
          <span className="sr-only">Copied</span>
        </>
      ) : (
        <Copy aria-hidden="true" className="size-3.5" />
      )}
    </Button>
  );
}

function Value({ value }: { value: ReactNode }) {
  const text =
    typeof value === 'string' || typeof value === 'number'
      ? String(value)
      : null;
  const span = (
    <span
      className="block min-w-0 truncate"
      // A truncated span is only keyboard-reachable if it is focusable, and
      // the tooltip opens on focus.
      tabIndex={text === null ? undefined : 0}
    >
      {value}
    </span>
  );
  return text === null ? span : <Tooltip content={text}>{span}</Tooltip>;
}

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
      className={cn(
        'grid tabular-nums text-sm',
        columns === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1',
        dense ? 'gap-x-4 gap-y-1' : 'gap-x-6 gap-y-2.5',
        className,
      )}
    >
      {items.map((item) => (
        <div
          key={item.key}
          className="grid min-w-0 grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-center gap-3"
        >
          <dt className="truncate text-ink-3">{item.label}</dt>
          <dd className="m-0 flex min-w-0 items-center gap-1 text-ink">
            <Value value={item.value} />
            {item.copyValue === undefined ? null : (
              <CopyButton
                text={item.copyValue}
                label={typeof item.label === 'string' ? item.label : item.key}
              />
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
