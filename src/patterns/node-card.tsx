'use client';

import { EllipsisVertical, type LucideIcon } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { tv, type VariantProps } from 'tailwind-variants';
import { cn } from '../lib/cn';
import { Button } from '../primitives/button';
import type { ContextMenuAction } from '../primitives/context-menu';
import {
  MenuContent,
  MenuItem,
  MenuRoot,
  MenuTrigger,
} from '../primitives/menu';
import { Progress } from '../primitives/progress';
import { type Status, StatusPill, statusTone } from '../primitives/status-pill';

/**
 * #94 — a card for a thing that runs: an agent, a job, a service, a branch.
 *
 * An icon tile, a title, a `StatusPill`, a description, a row of counters, a
 * tagged `code` line (`worktree: feature/ui`), an optional progress bar and a
 * footer slot — the reference puts a one-line `PromptInput` there. It is the
 * card `FlowGraph`'s `renderNode` is meant to draw, and it stands on its own in
 * a grid or a side panel just as well. Nothing in it knows what an agent is.
 *
 * **Content, not glass.** It is the content surface (`--color-content` with a
 * hairline), drawn here rather than through `Card` for one reason: the status
 * rim *replaces* the hairline's colour and the glow *replaces* its lift, and
 * `surface-content` sets both as one utility that a class cannot partly
 * override. The menu is glass, because it is a menu.
 *
 * **The status is a rim and a glow, from `statusTone`.** The same mapping the
 * pill, a tab's dot and a graph node read — a card never picks its own colour
 * for a state. `glow={false}` keeps the rim and drops the glow, for a dense
 * grid. **Selection is the accent**: a 2px accent ring, the one place the
 * accent may go on a card.
 *
 * **The tile's colour is an identity, not a state.** `color` takes the
 * categorical series (`series-1` … `series-6`) — telling things apart is
 * exactly what they are for — or a status tone. It never takes the accent.
 *
 * **Pressable only when asked.** With `onSelect` the title becomes a button
 * whose hit area is stretched over the whole card; the menu, the footer and
 * anything else interactive sit above that layer, so a click on the prompt box
 * types into it rather than selecting the card.
 */
export type NodeCardColor =
  | 'series-1'
  | 'series-2'
  | 'series-3'
  | 'series-4'
  | 'series-5'
  | 'series-6'
  | 'ok'
  | 'warn'
  | 'danger'
  | 'info'
  | 'neutral';

/** Spelled out in full so Tailwind's scan finds every one. */
const TILE: Record<NodeCardColor, string> = {
  'series-1':
    'text-series-1 bg-[color-mix(in_oklab,var(--color-series-1)_18%,transparent)]',
  'series-2':
    'text-series-2 bg-[color-mix(in_oklab,var(--color-series-2)_18%,transparent)]',
  'series-3':
    'text-series-3 bg-[color-mix(in_oklab,var(--color-series-3)_18%,transparent)]',
  'series-4':
    'text-series-4 bg-[color-mix(in_oklab,var(--color-series-4)_18%,transparent)]',
  'series-5':
    'text-series-5 bg-[color-mix(in_oklab,var(--color-series-5)_18%,transparent)]',
  'series-6':
    'text-series-6 bg-[color-mix(in_oklab,var(--color-series-6)_18%,transparent)]',
  ok: 'text-ok bg-ok/14',
  warn: 'text-warn bg-warn/14',
  danger: 'text-danger bg-danger/14',
  info: 'text-info bg-info-soft',
  neutral: 'text-ink-2 bg-hover',
};

/** `Progress` speaks `Badge`'s four tones; a status maps onto them. */
const PROGRESS_TONE = {
  ok: 'ok',
  warn: 'warn',
  danger: 'danger',
  info: 'neutral',
  neutral: 'neutral',
} as const;

export interface NodeCardMeta {
  id?: string;
  icon: LucideIcon;
  /** What is drawn: "12", "4", "67%". */
  value: ReactNode;
  /** What it counts, for a reader and the tooltip: "agents", "worktrees". */
  label: string;
}

export interface NodeCardTag {
  /** The key, drawn quietly: "worktree". */
  label: string;
  /** The value, in mono: "feature/ui". */
  value: string;
  icon?: LucideIcon;
}

const card = tv({
  slots: {
    root: [
      'group/node-card relative flex min-w-0 flex-col rounded-surface border bg-content text-ink',
      'transition-[border-color,box-shadow] duration-(--dur-fast)',
    ],
    tile: 'flex shrink-0 items-center justify-center rounded-control',
    title: 'min-w-0 truncate font-semibold',
    body: 'text-ink-2',
  },
  variants: {
    size: {
      compact: {
        root: 'gap-2 p-3',
        tile: 'size-8',
        title: 'text-[13px] leading-5',
        body: 'line-clamp-2 text-xs',
      },
      regular: {
        root: 'gap-3 p-4',
        tile: 'size-10',
        title: 'text-section',
        body: 'text-[13px] leading-5',
      },
    },
  },
  defaultVariants: { size: 'regular' },
});

export interface NodeCardProps
  extends Omit<ComponentProps<'article'>, 'title' | 'className' | 'children'>,
    VariantProps<typeof card> {
  title: string;
  icon?: LucideIcon;
  /** The icon tile's colour: an identity, not a state. Default `neutral`. */
  color?: NodeCardColor;
  status?: Status;
  /** Replaces the status's English label. */
  statusLabel?: string;
  /** The status's glow around the card. On by default; the rim stays either way. */
  glow?: boolean;
  description?: ReactNode;
  meta?: readonly NodeCardMeta[];
  tag?: NodeCardTag;
  /** A bar under the meta. `label` is the human text, as `Progress` requires. */
  progress?: { value: number; max?: number; label: string; hint?: string };
  /** Under everything: a one-line `PromptInput`, a button row. */
  footer?: ReactNode;
  /** The header's ⋮ menu. The same list `RowActions` and `ContextMenuContent` take. */
  actions?: readonly ContextMenuAction[];
  /** The menu trigger's accessible name. Default "Actions for <title>". */
  actionsLabel?: string;
  /** Before the menu in the header: a collapse chevron, a pin. */
  headerExtra?: ReactNode;
  selected?: boolean;
  /** Makes the card pressable: the title becomes the button. */
  onSelect?: () => void;
  /** The title's heading level. Default 3. */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  className?: string;
}

/** Interactive content sits above the stretched hit area of a pressable card. */
const ABOVE = 'relative z-[1]';

export function NodeCard({
  title,
  icon: Icon,
  color = 'neutral',
  status,
  statusLabel,
  glow = true,
  description,
  meta,
  tag,
  progress,
  footer,
  actions,
  actionsLabel,
  headerExtra,
  selected = false,
  onSelect,
  headingLevel = 3,
  size,
  className,
  ...props
}: NodeCardProps) {
  const s = card({ size });
  const tone = status ? statusTone(status) : null;
  const compact = size === 'compact';
  const Heading = `h${headingLevel}` as const;
  const TagIcon = tag?.icon;

  return (
    <article
      data-node-card
      data-node-status={status}
      data-selected={selected || undefined}
      className={cn(
        s.root(),
        tone ? tone.rim : 'border-line',
        tone && glow && tone.glow
          ? tone.glow
          : 'shadow-[0_1px_2px_var(--glass-shadow-clear)]',
        selected && 'ring-2 ring-accent',
        onSelect && 'hover:border-line-strong',
        className,
      )}
      {...props}
    >
      <header className="flex min-w-0 items-start gap-3">
        {Icon ? (
          <span
            data-node-tile={color}
            aria-hidden="true"
            className={cn(s.tile(), TILE[color])}
          >
            <Icon size={compact ? 16 : 20} />
          </span>
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Heading className={cn(s.title())}>
            {onSelect ? (
              <button
                type="button"
                onClick={onSelect}
                aria-pressed={selected}
                className="max-w-full truncate text-left after:absolute after:inset-0 after:rounded-surface after:content-['']"
              >
                {title}
              </button>
            ) : (
              title
            )}
          </Heading>
          {status ? (
            <StatusPill
              status={status}
              label={statusLabel}
              size="sm"
              className="self-start"
            />
          ) : null}
        </div>
        {headerExtra || actions?.length ? (
          <div className={cn(ABOVE, '-mt-1 -mr-1 flex shrink-0 items-center')}>
            {headerExtra}
            {actions?.length ? (
              <MenuRoot>
                <MenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon
                    aria-label={actionsLabel ?? `Actions for ${title}`}
                    className="h-7"
                  >
                    <EllipsisVertical size={16} aria-hidden="true" />
                  </Button>
                </MenuTrigger>
                <MenuContent align="end">
                  {actions.map((action) => {
                    const ActionIcon = action.icon;
                    return (
                      <MenuItem
                        key={action.id}
                        tone={action.tone}
                        disabled={action.disabled}
                        onSelect={action.onSelect}
                      >
                        <ActionIcon size={16} aria-hidden="true" />
                        {action.label}
                      </MenuItem>
                    );
                  })}
                </MenuContent>
              </MenuRoot>
            ) : null}
          </div>
        ) : null}
      </header>

      {description ? <p className={s.body()}>{description}</p> : null}

      {meta?.length ? (
        <ul
          data-node-meta
          className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-2"
        >
          {meta.map((item) => {
            const MetaIcon = item.icon;
            return (
              <li
                key={item.id ?? item.label}
                title={item.label}
                className="inline-flex items-center gap-1.5 tabular-nums"
              >
                <MetaIcon size={14} aria-hidden="true" className="text-ink-3" />
                {item.value}
                <span className="sr-only"> {item.label}</span>
              </li>
            );
          })}
        </ul>
      ) : null}

      {tag ? (
        <p data-node-tag className="flex min-w-0 items-center gap-1.5 text-xs">
          {TagIcon ? (
            <TagIcon
              size={14}
              aria-hidden="true"
              className="shrink-0 text-ink-3"
            />
          ) : null}
          <span className="shrink-0 text-ink-3">{tag.label}:</span>
          <code
            className="min-w-0 truncate font-mono text-ink-2"
            title={tag.value}
          >
            {tag.value}
          </code>
        </p>
      ) : null}

      {progress ? (
        <Progress
          value={progress.value}
          max={progress.max}
          label={progress.label}
          hint={progress.hint}
          tone={tone ? PROGRESS_TONE[tone.tone] : 'neutral'}
        />
      ) : null}

      {footer ? <div className={cn(ABOVE, 'min-w-0')}>{footer}</div> : null}
    </article>
  );
}
