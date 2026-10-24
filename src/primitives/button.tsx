import type { ComponentProps, ReactNode } from 'react';
import { tv, type VariantProps } from '../lib/tv';
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
 * **The primary action is the accent.** It used to be white, for Luna Watch:
 * a media centre whose screens were other people's artwork, where a coloured
 * button competed with the poster it launched. #93 reverses that for a
 * workspace with no artwork, where a black primary read as a grey template.
 * It is `--color-accent` with `--color-on-accent` on it, and the hover mixes
 * a little of the label colour in rather than reaching for a second hue.
 * Under the workspace profile (#168) the primary is ink, as it is on
 * `maint/v0.8`: ink is white in dark and near-black in light, and the hover is
 * ink at 90% (BUG-20260930-001), which keeps the label above 13:1.
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
       *  #168 — ink under the workspace profile (see the note above). */
      solid: [
        'bg-accent text-on-accent hover:bg-[color-mix(in_oklab,var(--color-accent)_88%,var(--color-on-accent))]',
        'workspace:bg-ink workspace:text-ground workspace:hover:bg-ink/90',
      ],
      /** Everything alongside the primary. Needs content behind it to read.
       *  FEAT-20261013-002 (W238), #168 — at the flat material the glass scrim
       *  is `--color-raised`, which is also a card, so on a card this button
       *  had no fill and read as an outline, and on the page as a grey fill:
       *  one variant, two looks. Under the workspace profile at the flat
       *  material it is a tint of ink with a hairline ring, the same on both. */
      glass: [
        'glass glass-control text-ink glass-hover',
        'workspace:in-data-[material=flat]:bg-ink/[0.06] workspace:in-data-[material=flat]:ring-1',
        'workspace:in-data-[material=flat]:ring-inset workspace:in-data-[material=flat]:ring-line-strong',
        'workspace:in-data-[material=flat]:hover:bg-ink/[0.10]',
      ],
      /** Tertiary: toolbars, close buttons, anything that should recede. */
      ghost: 'text-ink-2 hover:text-ink hover:bg-hover',
      /** Destructive. Tinted rather than filled, so it warns without shouting.
       *  BUG-20260930-001, #168 — under the workspace profile the label is
       *  ink, not `danger`. A tint in the label's own hue eats the label's
       *  contrast: in light `text-danger` on it reads 3.4:1 at rest and 3.0:1
       *  on hover. The tint and the border say "destructive"; the label only
       *  has to be read. */
      danger: 'bg-danger/12 text-danger workspace:text-ink border border-danger/30 hover:bg-danger/20',
      /** Text that acts like a link, for `<a>` and Next `<Link>` through
       *  `buttonClassName`.
       *  FEAT-20261013-002 (W238), #168 — the accent's text colour, the one
       *  gated at 4.5:1 for links (#93). Size never reaches it (compound
       *  variant below). Text is not material, so the pointer highlight is
       *  hidden. */
      link: 'text-accent-ink font-medium underline-offset-4 hover:underline',
    },
    size: {
      // `--size-control-sm` is the rung below the control token: 32px — the
      // `h-8` it was — everywhere but the workspace profile, which keeps `sm`
      // under its 32px `md` at 28 (BUG-20260930-001, SYS-15). There the
      // radius is two thirds of the control's rather than 4px less, so it
      // scales with the corner instead of vanishing.
      sm: 'h-(--size-control-sm) px-3 text-xs rounded-[calc(var(--radius-control)-4px)] workspace:rounded-[calc(var(--radius-control)*2/3)]',
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
  compoundVariants: [{ variant: 'link', class: 'h-auto px-0 rounded-sm before:hidden' }],
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
