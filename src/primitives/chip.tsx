import type { ComponentProps } from 'react';
import { tv, type VariantProps } from 'tailwind-variants';
import { cn } from '../lib/cn';

/**
 * FEAT-20260823-362 — the small labelled pill, in its two jobs.
 *
 * `Chip` is a genre tag, a filter, a quality marker: something the eye should
 * be able to skip. `Chip` with a `tone` is a status: "Done", "Failed",
 * "Ongoing" — something the eye should stop on.
 *
 * Those two jobs are why the semantic tones exist as tokens rather than as
 * colours picked per site. Before this the app said success in both `green` and
 * `emerald`, danger in both `red` and `rose`, and warning in both `amber` and
 * `yellow`, because each screen chose independently and nothing was written
 * down.
 *
 * A rule that no component can enforce and that the review has to: **a badge is
 * only worth drawing when it distinguishes this item from its neighbours.** The
 * anime catalogue currently shows "Ongoing" and "1080p" on all fifty cards at
 * once, which is fifty badges carrying zero bits of information and a great
 * deal of visual noise. If every item has it, it belongs in the section
 * heading, not on the item.
 */
const chip = tv({
  base: [
    'inline-flex items-center gap-1.5 whitespace-nowrap',
    'font-medium leading-none',
  ],
  variants: {
    tone: {
      /** The default: present, ignorable. Genres, counts, quality. */
      neutral: 'bg-hover text-ink-2',
      /** Reads over artwork, for the few badges that sit on a poster. No blur — a badge on a poster is not chrome. */
      overlay: 'bg-black/55 text-ink',
      ok: 'bg-ok/14 text-ok',
      warn: 'bg-warn/14 text-warn',
      danger: 'bg-danger/14 text-danger',
      /** Selected state for a filter the user has switched on. */
      selected: 'bg-ink text-ground',
    },
    size: {
      sm: 'h-5 px-1.5 text-[10px] rounded-[calc(var(--radius-control)-6px)]',
      md: 'h-7 px-2.5 text-xs rounded-[calc(var(--radius-control)-4px)]',
      lg: 'h-9 px-3.5 text-sm rounded-control',
    },
  },
  defaultVariants: {
    tone: 'neutral',
    size: 'md',
  },
});

type ChipProps = Omit<ComponentProps<'span'>, 'className'> &
  VariantProps<typeof chip> & { className?: string };

export function Chip({ tone, size, className, ...props }: ChipProps) {
  return <span className={cn(chip({ tone, size }), className)} {...props} />;
}

/**
 * The same pill as a control, for filters and mood selectors. Separate from
 * `Button` because a filter chip is a toggle with a selected state, not an
 * action, and giving it `Button`'s hover and focus treatment made rows of them
 * look like rows of primary actions.
 */
type ChipButtonProps = Omit<ComponentProps<'button'>, 'className'> &
  VariantProps<typeof chip> & { className?: string; selected?: boolean };

export function ChipButton({
  tone,
  size = 'lg',
  selected = false,
  className,
  type = 'button',
  ...props
}: ChipButtonProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cn(
        'lit',
        chip({ tone: selected ? 'selected' : (tone ?? 'neutral'), size }),
        'transition-colors duration-(--dur-fast)',
        !selected && 'hover:bg-hover hover:text-ink',
        className,
      )}
      {...props}
    />
  );
}
