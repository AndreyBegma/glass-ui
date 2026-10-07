import type { ReactNode } from 'react';
import { cn } from '../lib/cn';
import { Skeleton } from '../primitives/skeleton';

/**
 * FEAT-20260930-067 — StatTile: one number, its label, how it moved, and a
 * trend slot.
 *
 * A solid raised surface (`Card raised`'s), never glass — tiles tile, and glass
 * stacked on glass is mud. It is pressable only when `href` or `onClick` is
 * given; then the whole tile is the link or button.
 *
 * **Delta colour is the sentiment, not the direction.** Cost going up is bad,
 * merges going up is good. It is never colour alone: an arrow plus the text.
 *
 * Values are `ReactNode`: formatting numbers and currency is the consumer's.
 * `loading` swaps value, delta and hint for skeletons of the same line
 * heights, so a grid of tiles does not jump when the data arrives.
 */
export type StatTileDelta = {
  value: ReactNode;
  direction: 'up' | 'down' | 'flat';
  sentiment: 'good' | 'bad' | 'neutral';
};

export type StatTileProps = {
  label: string;
  value: ReactNode;
  delta?: StatTileDelta;
  hint?: ReactNode;
  loading?: boolean;
  href?: string;
  onClick?: () => void;
  /** The trend slot, usually a Sparkline. */
  children?: ReactNode;
  className?: string;
};

const SENTIMENT = {
  good: 'text-ok',
  bad: 'text-danger',
  neutral: 'text-ink-3',
} as const;

const DIRECTION_LABEL = {
  up: 'Up',
  down: 'Down',
  flat: 'Unchanged',
} as const;

const ARROW = {
  up: 'M8 13V3M3.5 7.5 8 3l4.5 4.5',
  down: 'M8 3v10M3.5 8.5 8 13l4.5-4.5',
  flat: 'M3 8h10',
} as const;

function DeltaIcon({ direction }: { direction: StatTileDelta['direction'] }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      width={12}
      height={12}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      data-direction={direction}
    >
      <path d={ARROW[direction]} />
    </svg>
  );
}

const SURFACE = 'rounded-surface bg-raised border border-line tabular-nums';

export function StatTile({
  label,
  value,
  delta,
  hint,
  loading = false,
  href,
  onClick,
  children,
  className,
}: StatTileProps) {
  const body = (
    <>
      <div className="text-ink-3 text-xs">{label}</div>
      {loading ? (
        <>
          <Skeleton data-stat-skeleton="value" className="mt-1 h-7 w-24" />
          <Skeleton data-stat-skeleton="delta" className="mt-1 h-4 w-16" />
        </>
      ) : (
        <>
          <div className="text-ink mt-1 h-7 text-2xl leading-7 font-semibold">{value}</div>
          {delta ? (
            <div
              data-sentiment={delta.sentiment}
              className={cn(
                'mt-1 flex h-4 items-center gap-1 text-xs leading-4',
                SENTIMENT[delta.sentiment],
              )}
            >
              <DeltaIcon direction={delta.direction} />
              <span className="sr-only">{DIRECTION_LABEL[delta.direction]}</span>
              <span>{delta.value}</span>
            </div>
          ) : null}
        </>
      )}
      {hint && !loading ? <div className="text-ink-3 mt-1 text-xs">{hint}</div> : null}
      {children ? <div className="mt-2">{children}</div> : null}
    </>
  );

  const padding = 'block p-3 text-start';

  if (href) {
    return (
      <a
        href={href}
        className={cn(
          SURFACE,
          padding,
          'relative min-h-(--size-tap) transition-colors duration-(--dur-fast) hover:bg-hover',
          className,
        )}
      >
        {body}
      </a>
    );
  }
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-busy={loading || undefined}
        className={cn(
          SURFACE,
          padding,
          'relative w-full min-h-(--size-tap) transition-colors duration-(--dur-fast) hover:bg-hover',
          className,
        )}
      >
        {body}
      </button>
    );
  }
  return (
    <div aria-busy={loading || undefined} className={cn(SURFACE, padding, className)}>
      {body}
    </div>
  );
}
