import type { ComponentProps } from 'react';
import { tv, type VariantProps } from 'tailwind-variants';
import { cn } from '../lib/cn';

/**
 * FEAT-20260902-004 — an overlay, not a filter.
 *
 * `notification-bell.tsx:110-113` and the status dot at `sidebar.tsx:64-67`
 * both hand-roll a small circle pinned to the corner of another control.
 * `Chip` is a pressable filter with a selected state; a count or a status dot
 * is neither pressable nor a filter, which is why it is not `Chip` wearing a
 * `size="sm"`.
 *
 * Positioning is the caller's: this renders in flow, and a caller pins it
 * with `className` (`absolute -top-1 -right-1`, as the bell and the sidebar
 * both need) rather than the primitive guessing where "the corner" is.
 *
 * The `dot` variant paints the solid semantic token, not the counting badge's
 * 14 % tint — issue #11 item 2 (`u3-shell`, 2026-09-02): a status dot at
 * `size-2.5` on a 14 % wash is very nearly invisible. The counting badge
 * keeps the tint; it carries a number, so it does not depend on colour alone
 * to be seen.
 */
const badge = tv({
  base: 'inline-flex items-center justify-center whitespace-nowrap font-semibold leading-none tabular-nums',
  variants: {
    tone: {
      neutral: 'bg-hover text-ink-2',
      ok: 'bg-ok/14 text-ok',
      warn: 'bg-warn/14 text-warn',
      danger: 'bg-danger/14 text-danger',
    },
    dot: {
      true: 'size-2.5 rounded-full p-0',
      false: 'h-[18px] min-w-[18px] rounded-full px-1 text-[10px]',
    },
  },
  compoundVariants: [
    { tone: 'ok', dot: true, class: 'bg-ok' },
    { tone: 'warn', dot: true, class: 'bg-warn' },
    { tone: 'danger', dot: true, class: 'bg-danger' },
  ],
  defaultVariants: {
    tone: 'neutral',
    dot: false,
  },
});

type BadgeProps = Omit<ComponentProps<'span'>, 'className' | 'children'> &
  VariantProps<typeof badge> & {
    className?: string;
    /** Capped at "99+" — a count bubble is a glance, not a precise readout. */
    count?: number;
  };

export function Badge({ tone, dot = false, count, className, ...props }: BadgeProps) {
  const display = typeof count === 'number' ? (count > 99 ? '99+' : String(count)) : null;
  return (
    <span className={cn(badge({ tone, dot }), className)} {...props}>
      {dot ? null : display}
    </span>
  );
}
