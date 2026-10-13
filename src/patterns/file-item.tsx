'use client';

import { File as FileIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../lib/cn';
import { progressFill } from '../primitives/progress';
import { Skeleton } from '../primitives/skeleton';
import { rowActionsHost } from './row-actions';

/**
 * #110 — one file, being uploaded or done.
 *
 * The row `useFileUpload`'s items are drawn as, though it takes plain props and
 * knows nothing about the hook: a name, a size, a bar while it moves, a line of
 * error text when it fails, and two slots — `meta` on the right (FilesDrop puts
 * a countdown ring there) and `actions` after it (`RowActions`, or anything
 * shaped like it; the row wears `rowActionsHost`, so a `RowActions` inside it
 * reveals on hover and focus as it does in any other row).
 *
 * **Not glass.** It is a row, and rows are content (README, "The rules"): a
 * list of forty uploads on forty blurred panels is the thing that rule exists
 * to stop.
 *
 * **The bar is `Progress`'s.** Same track, same `tone` fills — `neutral`
 * while it moves — and a real `role="progressbar"` with `aria-valuenow` in
 * percent. With `progress` omitted while uploading the bar is indeterminate:
 * still a progressbar, with no value, which is what ARIA says an unknown
 * amount is. Done, failed and canceled rows have no bar.
 *
 * **The thumbnail.** A `thumbnailUrl` is drawn as a decorative image (the name
 * beside it is the text). An image without one yet gets a `Skeleton` — the
 * object URL is a frame away, and the shape should not jump when it lands.
 * Anything else gets a file glyph, because a pulse that never resolves is not
 * a loading state.
 *
 * `'use client'` because `rowActionsHost` comes from a client module, and
 * a server component importing a constant from one gets a reference, not the
 * string.
 *
 * The size is formatted with `Intl` in the reader's locale — a unit, not
 * copy. Every other string (`errorText`, whatever goes in the slots) is the
 * application's.
 */

export type FileItemStatus = 'uploading' | 'done' | 'error' | 'canceled';

export interface FileItemProps {
  name: string;
  size: number;
  mime?: string;
  thumbnailUrl?: string;
  /** 0..1. Omitted while uploading is indeterminate. */
  progress?: number;
  status: FileItemStatus;
  /** Right-aligned, before the actions: a countdown, a link, a badge. */
  meta?: ReactNode;
  /** `RowActions`, or anything shaped like it. */
  actions?: ReactNode;
  errorText?: string;
  className?: string;
}

const UNITS = ['byte', 'kilobyte', 'megabyte', 'gigabyte', 'terabyte'] as const;

/** `1536` -> `1.5 kB`, in the reader's locale. */
export function formatBytes(bytes: number, locale?: string): string {
  let value = Math.max(0, bytes);
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: UNITS[unit],
    unitDisplay: 'short',
    maximumFractionDigits: unit === 0 || value >= 10 ? 0 : 1,
  }).format(value);
}

function Thumbnail({ url, mime }: { url?: string; mime?: string }) {
  const box = 'size-10 shrink-0 rounded-control';
  if (url)
    return (
      <img src={url} alt="" className={cn(box, 'object-cover bg-raised')} />
    );
  if (mime?.startsWith('image/')) return <Skeleton className={box} />;
  return (
    <div
      aria-hidden="true"
      className={cn(box, 'grid place-items-center bg-raised text-ink-3')}
    >
      <FileIcon size={18} />
    </div>
  );
}

export function FileItem({
  name,
  size,
  mime,
  thumbnailUrl,
  progress,
  status,
  meta,
  actions,
  errorText,
  className,
}: FileItemProps) {
  const pct =
    progress === undefined
      ? undefined
      : Math.round(Math.min(1, Math.max(0, progress)) * 100);

  return (
    <div
      data-status={status}
      className={cn(
        rowActionsHost,
        'flex min-h-(--size-row) items-center gap-3 px-3 py-2',
        status === 'canceled' && 'opacity-60',
        className,
      )}
    >
      <Thumbnail url={thumbnailUrl} mime={mime} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="truncate text-body text-ink">{name}</span>
          <span className="shrink-0 text-label text-ink-3 tabular-nums">
            {formatBytes(size)}
          </span>
        </div>
        {status === 'uploading' ? (
          <div
            role="progressbar"
            aria-label={name}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            className="h-1.5 w-full overflow-hidden rounded-full bg-hover"
          >
            <div
              className={cn(
                progressFill({ tone: 'neutral' }),
                pct === undefined && 'w-1/3 motion-safe:animate-pulse',
              )}
              style={pct === undefined ? undefined : { width: `${pct}%` }}
            />
          </div>
        ) : null}
        {status === 'error' && errorText ? (
          <span role="alert" className="text-label text-danger">
            {errorText}
          </span>
        ) : null}
      </div>
      {meta ? <div className="flex shrink-0 items-center">{meta}</div> : null}
      {actions}
    </div>
  );
}
