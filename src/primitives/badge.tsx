import type { ComponentProps } from 'react';
import { tv, type VariantProps } from 'tailwind-variants';
import { cn } from '../lib/cn';
import { type Hue, hueClasses } from '../lib/hue';

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
 *
 * FEAT-20260924-679 — `label`, for a short value that is not a count: a
 * player's "1.5×" pinned to its speed icon. It is shown as given. The 99+ cap
 * is for counts, and a label is not one. `tone="ink"` is the primary's own
 * pair (`bg-ink text-ground`). It is for a badge that sits on glass over a
 * picture, where the 10 % `neutral` wash has nothing solid behind it to be
 * seen against.
 *
 * #130 — three additive axes, none of which moves a badge that does not ask.
 *
 * `size="md"` is a 12 px sentence-case label, for a badge that carries a word
 * (a process state) rather than a count; `normal-case` so a parent's
 * `uppercase` does not reach in. `sm`, the default, is today's 18 px badge.
 *
 * `shape="square"` (with `hue`) is the identity swatch. A project's hue dot
 * was the same circle as a status dot, so a red project read as an error; the
 * round dot stays the mark for status and identity is square.
 *
 * And the count badge on `ok` / `warn` / `danger` is a solid fill with
 * `text-ground` on it. The 10 px count on a 14 % tint measured 3.86:1 in
 * light, and a tint cannot be darkened without it stopping being a tint.
 * Solid fill and ground ink clear 4.5:1 in both themes (pinned in
 * `badge.test.tsx`). `neutral` and `ink` counts already passed and keep their
 * look, and a `label` keeps the tint — it is not the notification-sized case.
 */
const badge = tv({
  base: 'inline-flex items-center justify-center whitespace-nowrap font-semibold leading-none tabular-nums',
  variants: {
    tone: {
      neutral: 'bg-hover text-ink-2',
      ink: 'bg-ink text-ground',
      ok: 'bg-ok/14 text-ok',
      warn: 'bg-warn/14 text-warn',
      danger: 'bg-danger/14 text-danger',
    },
    dot: {
      true: 'size-2.5 rounded-full p-0',
      false: 'rounded-full',
    },
    size: {
      sm: '',
      md: '',
    },
    /** A count on a solid fill; see the note above. Set from `count`, not by callers. */
    solid: {
      true: '',
      false: '',
    },
  },
  compoundVariants: [
    { tone: 'ok', dot: true, class: 'bg-ok' },
    { tone: 'warn', dot: true, class: 'bg-warn' },
    { tone: 'danger', dot: true, class: 'bg-danger' },
    { dot: false, size: 'sm', class: 'h-[18px] min-w-[18px] px-1 text-[10px]' },
    { dot: false, size: 'md', class: 'h-5 min-w-5 px-1.5 text-xs normal-case' },
    { tone: 'ok', dot: false, solid: true, class: 'bg-ok text-ground' },
    { tone: 'warn', dot: false, solid: true, class: 'bg-warn text-ground' },
    { tone: 'danger', dot: false, solid: true, class: 'bg-danger text-ground' },
  ],
  defaultVariants: {
    tone: 'neutral',
    dot: false,
    size: 'sm',
    solid: false,
  },
});

type BadgeProps = Omit<ComponentProps<'span'>, 'className' | 'children'> &
  Pick<VariantProps<typeof badge>, 'tone' | 'dot' | 'size'> & {
    className?: string;
    /** Capped at "99+" — a count bubble is a glance, not a precise readout. */
    count?: number;
    /** A short value that is not a count, shown as given. `count` wins when both are passed. */
    label?: string;
    /**
     * #109 — an identity hue instead of a tone: the hue's tint with its ink,
     * or its solid mark as a dot. Wins over `tone`.
     */
    hue?: Hue;
    /**
     * #130 — with `hue`: `'square'` is the identity swatch, drawn solid and
     * without text whether or not `dot` is set. Unset (or `'dot'`), `hue`
     * behaves exactly as it did.
     */
    shape?: 'dot' | 'square';
  };

export function Badge({
  tone,
  dot = false,
  size,
  count,
  label,
  hue,
  shape,
  className,
  ...props
}: BadgeProps) {
  const display =
    typeof count === 'number' ? (count > 99 ? '99+' : String(count)) : (label ?? null);
  const hued = hue ? hueClasses(hue) : null;
  const square = hued !== null && shape === 'square';
  const swatch = dot || square;
  return (
    <span
      data-hue={hue}
      data-shape={square ? 'square' : undefined}
      className={cn(
        badge({ tone, dot: swatch, size, solid: typeof count === 'number' }),
        hued && (swatch ? hued.dot : hued.soft),
        square && 'rounded-[3px]',
        className,
      )}
      {...props}
    >
      {swatch ? null : display}
    </span>
  );
}
