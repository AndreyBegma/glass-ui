import type { ComponentProps } from 'react';
import { tv, type VariantProps } from 'tailwind-variants';
import { cn } from '../lib/cn';

/**
 * #94 — the state of a running thing, as a pill: a dot and a word.
 *
 * `Chip` with a tone says "Done" or "Failed" about a record. This says what a
 * process is doing *now* — running, waiting, paused, blocked — and the same
 * seven states have to read identically on a pill, a card's rim, a tab's dot
 * and a graph node. So the mapping is not a variant table private to this
 * file: it is `statusTone`, exported, and every surface that shows a status
 * reads its classes from there rather than choosing a colour of its own.
 *
 * Four semantic hues for seven states, which is the point rather than a
 * shortage. `running` and `done` are both `ok` — nothing is wrong with either
 * — and differ in the dot: `running` pulses. `blocked` and `error` are both
 * `danger`. `waiting` is `info`, the sky blue #94 added so that a waiting
 * process stops looking exactly like an idle one; `idle` is the quiet ink.
 * The accent is in none of them: an accent is not a semantic.
 *
 * Colour is never the only signal. The label is always drawn, and
 * `data-status` is on the element for a test or a consumer's selector.
 */
export type Status =
  | 'running'
  | 'waiting'
  | 'paused'
  | 'blocked'
  | 'done'
  | 'error'
  | 'idle';

export const STATUSES: readonly Status[] = [
  'running',
  'waiting',
  'paused',
  'blocked',
  'done',
  'error',
  'idle',
];

export interface StatusToneClasses {
  /** The semantic family the status belongs to. */
  tone: 'ok' | 'warn' | 'danger' | 'info' | 'neutral';
  /** Text in the tone: the pill's label, AA on every surface and on `soft`. */
  text: string;
  /** The tint behind a pill or an icon tile. */
  soft: string;
  /** A solid dot. */
  dot: string;
  /** A 1px rim for a card or a node — use with `border`. */
  rim: string;
  /** A subtle outer glow in the tone; empty for `idle`, which does not glow. */
  glow: string;
  /** The dot pulses (`running` only), off under reduced motion. */
  pulse: boolean;
  /** The English default label. */
  label: string;
}

/*
 * Every class below is spelled out in full: Tailwind finds utilities by
 * scanning source text, so a class assembled from a tone name at run time is a
 * class that is never generated.
 */
const OK = {
  tone: 'ok',
  text: 'text-ok',
  soft: 'bg-ok/14',
  dot: 'bg-ok',
  rim: 'border-ok/45',
  glow: 'shadow-[0_0_24px_-6px_color-mix(in_oklab,var(--color-ok)_45%,transparent)]',
} as const;

const DANGER = {
  tone: 'danger',
  text: 'text-danger',
  soft: 'bg-danger/14',
  dot: 'bg-danger',
  rim: 'border-danger/50',
  glow: 'shadow-[0_0_24px_-6px_color-mix(in_oklab,var(--color-danger)_45%,transparent)]',
} as const;

const TONES: Record<Status, StatusToneClasses> = {
  running: { ...OK, pulse: true, label: 'Running' },
  done: { ...OK, pulse: false, label: 'Done' },
  waiting: {
    tone: 'info',
    text: 'text-info',
    soft: 'bg-info-soft',
    dot: 'bg-info',
    rim: 'border-info/45',
    glow: 'shadow-[0_0_24px_-6px_color-mix(in_oklab,var(--color-info)_45%,transparent)]',
    pulse: false,
    label: 'Waiting',
  },
  paused: {
    tone: 'warn',
    text: 'text-warn',
    soft: 'bg-warn/14',
    dot: 'bg-warn',
    rim: 'border-warn/45',
    glow: 'shadow-[0_0_24px_-6px_color-mix(in_oklab,var(--color-warn)_40%,transparent)]',
    pulse: false,
    label: 'Paused',
  },
  blocked: { ...DANGER, pulse: false, label: 'Blocked' },
  error: { ...DANGER, pulse: false, label: 'Error' },
  idle: {
    tone: 'neutral',
    text: 'text-ink-2',
    soft: 'bg-hover',
    dot: 'bg-ink-3',
    rim: 'border-line-strong',
    glow: '',
    pulse: false,
    label: 'Idle',
  },
};

/** The classes every surface that shows `status` should read. */
export function statusTone(status: Status): StatusToneClasses {
  return TONES[status];
}

const pill = tv({
  base: 'inline-flex shrink-0 items-center whitespace-nowrap rounded-full font-medium leading-none',
  variants: {
    size: {
      sm: 'h-5 gap-1.5 px-2 text-[11px]',
      md: 'h-6 gap-2 px-2.5 text-xs',
    },
  },
  defaultVariants: { size: 'md' },
});

type StatusDotProps = {
  status: Status;
  className?: string;
};

/** The dot on its own, for a tab or a list row where the label is elsewhere. */
export function StatusDot({ status, className }: StatusDotProps) {
  const tone = statusTone(status);
  return (
    <span
      aria-hidden="true"
      data-status-dot={status}
      className={cn('relative inline-flex size-2 shrink-0', className)}
    >
      {tone.pulse ? (
        <span
          data-status-pulse
          className={cn(
            'absolute inset-0 rounded-full opacity-60 motion-safe:animate-ping',
            tone.dot,
          )}
        />
      ) : null}
      <span className={cn('relative size-full rounded-full', tone.dot)} />
    </span>
  );
}

type StatusPillProps = Omit<ComponentProps<'span'>, 'className' | 'children'> &
  VariantProps<typeof pill> & {
    status: Status;
    /** Replaces the English default — `statusTone(status).label`. */
    label?: string;
    /** A subtle outer glow in the tone. Off by default: most pills sit in lists. */
    glow?: boolean;
    className?: string;
  };

export function StatusPill({
  status,
  label,
  glow = false,
  size,
  className,
  ...props
}: StatusPillProps) {
  const tone = statusTone(status);
  return (
    <span
      data-status={status}
      className={cn(
        pill({ size }),
        tone.soft,
        tone.text,
        glow && tone.glow,
        className,
      )}
      {...props}
    >
      <StatusDot
        status={status}
        className={size === 'sm' ? 'size-1.5' : undefined}
      />
      {label ?? tone.label}
    </span>
  );
}
