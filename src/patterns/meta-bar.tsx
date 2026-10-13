import type { LucideIcon } from 'lucide-react';
import { type ComponentProps, Fragment, type ReactNode } from 'react';
import { cn } from '../lib/cn';
import { type Status, StatusPill, statusTone } from '../primitives/status-pill';
import { NODE_TILE, type NodeCardColor } from './node-card-tile';

/**
 * #94 — the header of a page or of one thing on it: "Agent Fleet · Running ·
 * 12 Agents / 4 Worktrees / 3 Running / 1 Blocked", with its buttons on the
 * right.
 *
 * An icon tile, a title, a `StatusPill`, a line of counters and an actions
 * slot. It is the header a `NodeCard` would have if the card were the whole
 * page, so the tile takes the same colours — an identity from the series or
 * a status tone, never the accent — and the pill is the same pill.
 *
 * **The counters are a sentence, not a table.** Each is "value label" in one
 * run of text, and the slashes between them are drawn but hidden from a
 * reader: "12 Agents, 4 Worktrees" is what is read, not "12 Agents slash".
 * `tone` on a counter colours its value in a status's hue ("1 Blocked" in
 * danger) — the label still says what it is, so colour is never alone.
 *
 * **The title is the page's heading** — `h1` by default; `headingLevel` moves
 * it down when the bar heads a panel instead. The actions slot is the
 * caller's: a primary `Button`, icon buttons, a view `Menu`. On a narrow
 * screen the actions wrap under the title rather than squeezing it.
 */
export interface MetaBarCounter {
  id?: string;
  /** "12" — drawn with tabular figures. */
  value: ReactNode;
  /** "Agents". */
  label: string;
  /** Colours the value in a status's hue; the label stays neutral. */
  tone?: Status;
}

export interface MetaBarProps
  extends Omit<ComponentProps<'header'>, 'title' | 'className' | 'children'> {
  title: ReactNode;
  icon?: LucideIcon;
  /** The tile's colour, as `NodeCard`'s. Default `neutral`. */
  color?: NodeCardColor;
  status?: Status;
  statusLabel?: string;
  /** A line under the title, before the counters. */
  description?: ReactNode;
  counters?: readonly MetaBarCounter[];
  /** Right-hand side: a primary button, icon buttons, a view menu. */
  actions?: ReactNode;
  /** Default 1: the bar heads the page. */
  headingLevel?: 1 | 2 | 3 | 4;
  className?: string;
}

export function MetaBar({
  title,
  icon: Icon,
  color = 'neutral',
  status,
  statusLabel,
  description,
  counters,
  actions,
  headingLevel = 1,
  className,
  ...props
}: MetaBarProps) {
  const Heading = `h${headingLevel}` as const;
  return (
    <header
      data-meta-bar
      className={cn(
        'flex min-w-0 flex-wrap items-center gap-x-6 gap-y-3',
        className,
      )}
      {...props}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {Icon ? (
          <span
            data-meta-tile={color}
            aria-hidden="true"
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-control',
              NODE_TILE[color],
            )}
          >
            <Icon size={20} />
          </span>
        ) : null}
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <Heading className="min-w-0 truncate text-heading text-ink">
              {title}
            </Heading>
            {status ? (
              <StatusPill status={status} label={statusLabel} size="sm" />
            ) : null}
          </div>
          {description ? (
            <p className="text-[13px] leading-5 text-ink-2">{description}</p>
          ) : null}
          {counters?.length ? (
            <p
              data-meta-counters
              className="flex flex-wrap items-center gap-x-2 text-xs text-ink-2"
            >
              {counters.map((counter, index) => (
                <Fragment key={counter.id ?? counter.label}>
                  {index > 0 ? (
                    <span
                      aria-hidden="true"
                      data-meta-separator
                      className="text-ink-3"
                    >
                      /
                    </span>
                  ) : null}
                  <span data-meta-counter className="whitespace-nowrap">
                    <span
                      className={cn(
                        'font-semibold tabular-nums',
                        counter.tone
                          ? statusTone(counter.tone).text
                          : 'text-ink',
                      )}
                    >
                      {counter.value}
                    </span>{' '}
                    {counter.label}
                  </span>
                </Fragment>
              ))}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? (
        <div
          data-meta-actions
          className="flex shrink-0 flex-wrap items-center gap-2"
        >
          {actions}
        </div>
      ) : null}
    </header>
  );
}
