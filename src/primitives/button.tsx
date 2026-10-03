import type { ComponentProps, ReactNode } from 'react';
import { tv, type VariantProps } from 'tailwind-variants';
import { cn } from '../lib/cn';

/**
 * FEAT-20260823-362 — the button, of which the app has 282 written by hand.
 *
 * Not one of them agreed with another. Counted across `apps/web/src`, the
 * padding alone came in fifteen combinations, the corner in five radii, and the
 * primary action was `bg-violet-600` on one screen and `bg-white text-black` on
 * the next. This replaces all of it with four variants and three sizes.
 *
 * Three decisions worth knowing before adding a fifth variant:
 *
 * **The primary action is ink, not coloured.** Luna shows other people's
 * artwork, and every poster on screen is already fighting for attention. An
 * accent-coloured button competes with the content it is meant to launch, which
 * is why Apple TV, Netflix and Plex all land on a neutral primary. The violet
 * that used to be here was also the single loudest tell that nobody had chosen
 * a palette. Ink is white in dark and near-black in light, and the desk profile
 * does not change that: the accent is not the primary's fill (SYS-02).
 *
 * **The focus ring is not defined here.** `globals.css` puts a 3px white
 * outline on `:focus-visible` globally, sized to be legible across a room on a
 * television. Every hand-written button in the app fought that with its own
 * ``, which made the ring
 * thinner exactly where it needed to be thickest. Primitives leave it alone.
 *
 * **Hit area and visual size are separate.** A toolbar button that is 32px tall
 * is right on a laptop and unusable with a thumb, and the usual fix — forcing
 * every control to 44px — makes dense toolbars look like a phone keyboard. The
 * `after:` pseudo-element below extends the *touch* target to 44px without
 * changing a pixel of what is drawn, and disappears entirely on a fine pointer.
 * It is at least 44px wide as well as tall, centred on the button, so an icon
 * button drawn at the desk's 28px is still 44 by 44 under a thumb
 * (BUG-20260930-001, SYS-14).
 */
const button = tv({
  base: [
    // FEAT-20260823-364 — `lit` is where the material's response lives: a
    // highlight under the pointer, and a press that takes the weight. One
    // utility, so every control in the app answers the same way instead of
    // each one inventing a hover colour.
    'lit',
    'relative inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'font-semibold select-none',
    'transition-[background-color,border-color,color,opacity] duration-(--dur-fast)',
    'disabled:opacity-40 disabled:pointer-events-none',
    // The touch target, invisible and pointer-coarse only. See the note above.
    "after:absolute after:left-1/2 after:top-1/2 after:h-(--size-tap) after:w-full after:min-w-(--size-tap) after:-translate-x-1/2 after:-translate-y-1/2 after:content-['']",
    '[@media(pointer:fine)]:after:hidden',
  ],
  variants: {
    variant: {
      /** The one action a screen most wants you to take. One per screen.
       *  BUG-20260930-001 — the hover was `bg-white`, which in light is the
       *  label's own colour: the label vanished under the pointer. Ink at 90%
       *  moves the fill a step toward whatever is behind it and keeps the
       *  label above 13:1 over any backdrop, in both themes.
       *
       *  FEAT-20260930-004 (SYS-03) — disabled, it is the hover fill with a
       *  quiet label, not a 40% ink slab. The slab was the loudest thing on a
       *  form that could not be submitted. The label is `ink-2`, not the
       *  `ink-3` U7 proposed: `ink-3` measured 2.89–2.98:1 on the sofa's
       *  light `canvas`, `raised` and `surface`, under the 3:1 floor.
       *  `ink-2` clears it everywhere and stays far under the live primary
       *  (`button.spec.ts`). Rarely needed: a primary stays enabled and
       *  validates on submit (README). */
      solid:
        'bg-ink text-ground hover:bg-ink/90 disabled:bg-hover disabled:text-ink-2 disabled:opacity-100',
      /** Everything alongside the primary. Needs content behind it to read. */
      glass: 'glass text-ink glass-hover',
      /** Tertiary: toolbars, close buttons, anything that should recede. */
      ghost: 'text-ink-2 hover:text-ink hover:bg-hover',
      /** Destructive. Tinted rather than filled, so it warns without shouting.
       *  BUG-20260930-001 — the label is ink, not `danger`. A tint in the
       *  label's own hue eats the label's contrast: in light `text-danger` on
       *  it read 3.4:1 at rest and 3.0:1 on hover. The tint and the border say
       *  "destructive"; the label only has to be read. */
      danger: 'bg-danger/12 text-ink border border-danger/30 hover:bg-danger/20',
    },
    size: {
      // `--size-control-sm` is the rung below the control token, so `sm` stays
      // under `md` at the desk (24 against 28) where it used to be 32 against
      // 28. The radius is two thirds of the control's rather than 4px less, so
      // it scales with the corner instead of vanishing at the desk's 6px:
      // 8px on the sofa as before, 4px at the desk rather than 2.
      sm: 'h-(--size-control-sm) px-3 text-xs rounded-[calc(var(--radius-control)*2/3)]',
      md: 'h-(--size-control) px-4 text-sm rounded-control',
      // One documented step above `md`: the control token plus 8px, the sofa
      // rung's 40 -> 48 kept as a formula rather than a second literal.
      lg: 'h-[calc(var(--size-control)+8px)] px-6 text-base rounded-control',
    },
    /** Square, for a button whose whole label is its icon. */
    icon: {
      true: 'px-0 aspect-square',
    },
    full: {
      true: 'w-full',
    },
  },
  defaultVariants: {
    variant: 'glass',
    size: 'md',
  },
});

type ButtonVariants = VariantProps<typeof button>;

interface ButtonProps
  extends Omit<ComponentProps<'button'>, 'className'>,
    ButtonVariants {
  className?: string;
  children?: ReactNode;
}

export function Button({
  variant,
  size,
  icon,
  full,
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(button({ variant, size, icon, full }), className)}
      {...props}
    />
  );
}

/**
 * The same styling applied to a link, for the several places where a control
 * that looks like a button has to be a real anchor — "Browse catalogue" on the
 * empty watchlist, "Back to catalogue" on a missing title. Rendering those as
 * buttons broke opening them in a new tab, and rendering them as bare links
 * lost them among the body text.
 */
export function buttonClassName(variants: ButtonVariants & { className?: string } = {}) {
  const { className, ...rest } = variants;
  return cn(button(rest), className);
}
