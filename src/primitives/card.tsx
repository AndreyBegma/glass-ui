import type { ComponentProps } from 'react';
import { tv, type VariantProps } from 'tailwind-variants';
import { cn } from '../lib/cn';

/**
 * FEAT-20260823-362 — a panel.
 *
 * The app writes `bg-surface` with a raw white-alpha hairline and
 * `rounded-xl p-4` in eight places verbatim and something within a shade of
 * it in dozens more. This is that, with the shades taken from the token
 * layer.
 *
 * `glass` is offered but is not the default, and that is on purpose. The
 * material only reads when there is content behind it, and a card usually sits
 * on the flat ground where it would be invisible. Reach for `glass` when the
 * card floats over artwork — the resume banner over a paused film, the quality
 * menu over the player — and for `raised` everywhere else.
 *
 * Never on a grid item. Fifty blurred surfaces in a catalogue is both the
 * cheap-looking version of this effect and the one that costs the television
 * its frame rate.
 */
const card = tv({
  base: 'rounded-surface',
  variants: {
    variant: {
      raised: 'bg-raised border border-line',
      surface: 'bg-surface border border-line',
      glass: 'glass',
      /** No fill at all — for grouping without drawing a second box. */
      plain: '',
    },
    pad: {
      none: '',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
    },
  },
  defaultVariants: {
    variant: 'raised',
    pad: 'md',
  },
});

type CardProps = Omit<ComponentProps<'div'>, 'className'> &
  VariantProps<typeof card> & { className?: string };

export function Card({ variant, pad, className, ...props }: CardProps) {
  return <div className={cn(card({ variant, pad }), className)} {...props} />;
}
