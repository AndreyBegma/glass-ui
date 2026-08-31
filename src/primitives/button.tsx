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
 * **The primary action is white, not coloured.** Luna shows other people's
 * artwork, and every poster on screen is already fighting for attention. An
 * accent-coloured button competes with the content it is meant to launch, which
 * is why Apple TV, Netflix and Plex all land on a neutral primary. The violet
 * that used to be here was also the single loudest tell that nobody had chosen
 * a palette.
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
    "after:absolute after:left-0 after:top-1/2 after:h-11 after:w-full after:-translate-y-1/2 after:content-['']",
    '[@media(pointer:fine)]:after:hidden',
  ],
  variants: {
    variant: {
      /** The one action a screen most wants you to take. One per screen. */
      solid: 'bg-ink text-ground hover:bg-white',
      /** Everything alongside the primary. Needs content behind it to read. */
      glass: 'glass text-ink hover:bg-hover',
      /** Tertiary: toolbars, close buttons, anything that should recede. */
      ghost: 'text-ink-2 hover:text-ink hover:bg-hover',
      /** Destructive. Tinted rather than filled, so it warns without shouting. */
      danger: 'bg-danger/12 text-danger border border-danger/30 hover:bg-danger/20',
    },
    size: {
      sm: 'h-8 px-3 text-xs rounded-[calc(var(--radius-control)-4px)]',
      md: 'h-10 px-4 text-sm rounded-control',
      lg: 'h-12 px-6 text-base rounded-control',
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
