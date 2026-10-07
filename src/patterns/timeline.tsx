import type { ReactNode } from 'react';
import { cn } from '../lib/cn';
import { Avatar } from '../primitives/avatar';

/**
 * FEAT-20260930-070 — Timeline: an activity feed grouped by local calendar day.
 *
 * Each day is a `section` with an `h3` header ("Today", "Yesterday" or a date)
 * over an `ol` of items. `aria-level` on the header is configurable through
 * `dayHeadingLevel` so the feed slots under whatever heading the page has.
 *
 * An item is a link when `href` is set, a button when `onSelect` is set, plain
 * otherwise. Items are solid raised surfaces, never glass (D3). Tone is a dot
 * plus the optional icon, and the tone is also spelled in visually hidden text,
 * so colour is never the only signal.
 *
 * Controlled: the consumer owns `items` and `newCount`. Load-more is a button,
 * not infinite scroll; a consumer may observe it. Copy is the consumer's — the
 * "Load more" and "N new" labels are overridable via `loadMoreLabel` and
 * `newLabel` (#67 D9).
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
  /** `aria-level` of the day headers. Default 3. */
  dayHeadingLevel?: number;
  /** Default "Load more". */
  loadMoreLabel?: string;
  /** Label for the new-items pill, given the count. Default "N new". */
  newLabel?: (count: number) => string;
  className?: string;
};

const DOT = {
  neutral: 'bg-ink-3',
  ok: 'bg-ok',
  warn: 'bg-warn',
  danger: 'bg-danger',
} as const;

const TONE_TEXT = {
  neutral: 'text-ink-3',
  ok: 'text-ok',
  warn: 'text-warn',
  danger: 'text-danger',
} as const;

const TONE_NAME = { neutral: '', ok: 'OK', warn: 'Warning', danger: 'Error' } as const;

const pad = (n: number) => String(n).padStart(2, '0');
const defaultFormatTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function dayLabel(d: Date, now: Date): string {
  if (dayKey(d) === dayKey(now)) return 'Today';
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (dayKey(d) === dayKey(yesterday)) return 'Yesterday';
  return d.toLocaleDateString(undefined, {
    year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

type Group = { key: string; date: Date; items: { item: TimelineItem; at: Date }[] };

function group(items: TimelineItem[]): Group[] {
  const groups: Group[] = [];
  for (const item of items) {
    const at = item.at instanceof Date ? item.at : new Date(item.at);
    const key = dayKey(at);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push({ item, at });
    else groups.push({ key, date: at, items: [{ item, at }] });
  }
  return groups;
}

const ROW =
  'flex w-full min-h-(--size-row) items-start gap-3 rounded-control px-2 py-2 text-start pointer-coarse:min-h-(--size-tap)';
const PRESSABLE = 'cursor-pointer hover:bg-hover';

function ItemBody({
  item,
  at,
  formatTime,
}: {
  item: TimelineItem;
  at: Date;
  formatTime: (d: Date) => string;
}) {
  const tone = item.tone ?? 'neutral';
  return (
    <>
      <span className="mt-1.5 flex shrink-0 items-center gap-1.5">
        <span data-dot aria-hidden="true" className={cn('size-2 rounded-full', DOT[tone])} />
        {item.icon ? (
          <span aria-hidden="true" className={cn('inline-flex', TONE_TEXT[tone])}>
            {item.icon}
          </span>
        ) : null}
      </span>
      {item.actor ? (
        <Avatar size="sm" name={item.actor.name} image={item.actor.avatar} alt={item.actor.name} />
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block text-sm text-ink">
          {TONE_NAME[tone] ? <span className="sr-only">{TONE_NAME[tone]}: </span> : null}
          {item.title}
        </span>
        {item.meta ? <span className="block text-xs text-ink-3">{item.meta}</span> : null}
      </span>
      <time
        dateTime={at.toISOString()}
        className="shrink-0 pt-0.5 text-xs text-ink-3 tabular-nums"
      >
        {formatTime(at)}
      </time>
    </>
  );
}

export function Timeline({
  items,
  hasMore,
  loadingMore,
  onLoadMore,
  formatTime = defaultFormatTime,
  empty,
  newCount,
  onShowNew,
  dayHeadingLevel = 3,
  loadMoreLabel = 'Load more',
  newLabel = (n) => `${n} new`,
  className,
}: TimelineProps) {
  const now = new Date();
  const groups = group(items);
  return (
    <div data-timeline className={cn('flex flex-col gap-4', className)}>
      {newCount && newCount > 0 ? (
        <button
          type="button"
          onClick={onShowNew}
          aria-live="polite"
          className="self-center rounded-full bg-ink px-3 py-1 text-xs font-semibold text-ground pointer-coarse:min-h-(--size-tap)"
        >
          {newLabel(newCount)}
        </button>
      ) : null}
      {items.length === 0 ? (
        <div data-timeline-empty>{empty}</div>
      ) : (
        groups.map((g) => (
          <section key={g.key} data-day={g.key}>
            <h3
              aria-level={dayHeadingLevel}
              className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-ink-3"
            >
              {dayLabel(g.date, now)}
            </h3>
            <ol className="flex flex-col">
              {g.items.map(({ item, at }) => (
                <li key={item.id} className="rounded-control bg-raised">
                  {item.href ? (
                    <a href={item.href} className={cn(ROW, PRESSABLE)}>
                      <ItemBody item={item} at={at} formatTime={formatTime} />
                    </a>
                  ) : item.onSelect ? (
                    <button type="button" onClick={item.onSelect} className={cn(ROW, PRESSABLE)}>
                      <ItemBody item={item} at={at} formatTime={formatTime} />
                    </button>
                  ) : (
                    <div className={ROW}>
                      <ItemBody item={item} at={at} formatTime={formatTime} />
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </section>
        ))
      )}
      {hasMore ? (
        <button
          type="button"
          disabled={loadingMore}
          aria-busy={loadingMore || undefined}
          onClick={onLoadMore}
          className="self-center rounded-control border border-line px-3 py-1.5 text-sm text-ink hover:bg-hover disabled:opacity-50 pointer-coarse:min-h-(--size-tap)"
        >
          {loadMoreLabel}
        </button>
      ) : null}
    </div>
  );
}
