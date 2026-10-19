import type { ComponentProps } from 'react';
import { tv, type VariantProps } from 'tailwind-variants';
import { cn } from '../lib/cn';
import { type Hue, hueClasses } from '../lib/hue';

/**
 * FEAT-20260823-362 — a panel.
 *
 * The app writes `bg-surface` with a raw white-alpha hairline and
 * `rounded-xl p-4` in eight places verbatim and something within a shade of
 * it in dozens more. This is that, with the shades taken from the token
 * layer.
 *
 * #93 — the default is `content`: the content surface (`surface-content` in
 * `material.css`), near-opaque paper with a hairline and no grey fill. A card
 * is content, and content is read; the glass material is for chrome. `raised`
 * and `surface` stay for an application that wants the old flat grey panel.
 *
 * `glass` is offered but is not the default, and that is on purpose. The
 * material only reads when there is something behind it. Reach for `glass`
 * when the card floats over artwork or over the canvas as chrome — the resume
 * banner over a paused film, the quality menu over the player.
 *
 * Never on a grid item. Fifty blurred surfaces in a catalogue is both the
 * cheap-looking version of this effect and the one that costs the television
 * its frame rate.
 *
 * FEAT-20260930-004 (SYS-04), #168 — under the workspace profile `raised`
 * reads `card` and `card-line`. In dark they are `raised` and the desk's
 * hairline; in light `raised` is darker than the white ground and the card
 * read as sunken, so the workspace card is the ground's white with an edge
 * measured to lift it as far as dark's does — the numbers are in
 * `tokens.css`. Still flat: no shadow (`E-104`). Outside the profile it is
 * `raised` on `line`, as before.
 */
const card = tv({
  base: 'rounded-surface',
  variants: {
    variant: {
      /** Near-opaque paper with a hairline: the content surface (#93). */
      content: 'surface-content',
      raised: 'bg-raised border border-line workspace:bg-card workspace:border-card-line',
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
    variant: 'content',
    pad: 'md',
  },
});

/*
 * #109 — a card with an identity hue. The hue is the border and a soft glow,
 * so the surface is drawn here as its parts: `surface-content` sets the
 * border and the shadow as one utility that a class cannot partly override
 * (the reason `NodeCard` draws its own, too). The fill is each variant's. On
 * `glass` the hue is the border only: the material's own shadows are its
 * edge, and a glow would replace them.
 */
const HUED_SURFACE = {
  content: 'border bg-content',
  raised: 'border bg-raised workspace:bg-card',
  surface: 'border bg-surface',
  glass: 'glass border',
  plain: 'border',
} as const;

type CardProps = Omit<ComponentProps<'div'>, 'className'> &
  VariantProps<typeof card> & {
    /** #109 — an identity hue: the border and a soft glow. */
    hue?: Hue;
    className?: string;
  };

export function Card({ variant, pad, hue, className, ...props }: CardProps) {
  if (hue) {
    const surface = variant ?? 'content';
    const hued = hueClasses(hue);
    return (
      <div
        data-hue={hue}
        className={cn(
          card({ variant: 'plain', pad }),
          HUED_SURFACE[surface],
          hued.rim,
          surface === 'glass' ? null : hued.glow,
          className,
        )}
        {...props}
      />
    );
  }
  return <div className={cn(card({ variant, pad }), className)} {...props} />;
}
