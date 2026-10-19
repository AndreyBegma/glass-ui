'use client';

import { motion, useReducedMotion } from 'motion/react';
import { createContext, type ReactNode, useContext, useRef } from 'react';
import { useScrollIntoRow } from '../hooks/use-scroll-into-row';
import { cn } from '../lib/cn';
import { ScrollHintRow } from './scroll-hint-row';

/**
 * FEAT-20260830-492 — the travelling capsule, as a primitive rather than a
 * fourth hand-rolled copy of it.
 *
 * `settings-tabs.tsx`, the bottom bar and the search result list all built
 * the same shape by hand: `flex bg-surface rounded-control p-1`, one
 * `motion.span` with a shared `layoutId` mounted inside whichever item is
 * selected. This is that shell and that item, so the next one-of-many
 * selection costs a render prop instead of a fourth copy.
 *
 * The interactive element — a `Link` for route-driven tabs, a `button` for
 * in-page state — is left to the caller as `children`, because a primitive
 * in `ui/` importing the app's routed `Link` would point the dependency the
 * wrong way.
 *
 * FEAT-20260902-004 — issue #11 item 3 (`u3-shell`, 2026-09-02): the default
 * `<ul>` is right for a stand-alone control but wrong nested inside
 * `role="menu"` — a `<ul>`'s own implicit list role sits between the menu and
 * `menuitemradio` children, which breaks the ownership `role="menu"`
 * requires. `role` is a passthrough for exactly that case: given one, the
 * wrapper drops from `<ul>` to a `<div>` carrying it, so the children read as
 * direct descendants of whatever owns them (`menu.tsx`'s `MenuRadioGroup`).
 * `SegmentedControlItem` follows the wrapper down that same passthrough — a
 * `<div>` wrapper renders `<div>` items rather than an orphan `<li>` with no
 * `<ul>` around it (issue #13).
 *
 * FEAT-20260916-612 — `variant="glass"`: the same control made of the
 * header's material, for a switch that sits on the page beside a glass
 * header rather than inside an opaque panel. The shell is the `glass`
 * utility as a pill — the header is `rounded-full`, and "like the header"
 * is a pill — and the travelling capsule is `bg-hover`, the lift the
 * bottom capsule and an active header section already use on glass.
 * Measured before it was chosen: `bg-raised` (the `surface` capsule) sits
 * within 1/255 of the glass composite at idle and vanishes, and reads as a
 * dark recess over a bright poster; `bg-hover` samples ten points above it.
 *
 * The glass variant is a row and is not built for `flex-wrap`: two rows of
 * items inside a pill would put their corners outside its curve. It carries
 * a `backdrop-filter`, so it must not sit inside another glass surface —
 * one blur per stack.
 *
 * BUG-20260916-613 — `variant="on-glass"`: the opaque well, placed *inside*
 * a glass panel. `surface`'s fills are the flat ground's lifts — `surface`
 * is +7/255 over `ground`, `raised` +7 over that — and on a glass composite
 * (22–23/255 in the dark theme, and it does not darken under any backdrop)
 * they land 6/255 *below* the panel and read as a hole. The measured answer
 * is the header's own capsule turned inside out: the shell is a `line`
 * hairline with no fill, so it is never below the panel it sits on, and
 * the travelling capsule is `bg-hover` — +22 over the shell at idle and
 * over the brightest poster alike, on `glass` and on `glass-strong`
 * (`surface`'s pill is +8). The ink-tinted tokens move toward ink from
 * whatever is under them, which is what makes one recipe serve both
 * materials and both themes. Unlike `glass` it keeps `rounded-control`,
 * wraps, and carries no `backdrop-filter` — it is what goes inside a
 * glass surface, not a second one.
 *
 * FEAT-20260919-624 — `glass` is the default, and `surface` is gone. The
 * opaque well was the look every switch that never named a variant still
 * had — the title page's source and film/trailer switches, the settings
 * tabs, a person's filmography, collections, the English switches — beside
 * a header whose capsule had become the pill. Two variants that would render
 * identical strings under different names is a lie the next reader has to
 * unlearn, so `surface` is folded into `glass`: still accepted, deprecated,
 * normalised on the way in, and it renders exactly what the default renders.
 * `on-glass` is untouched — it is the one that carries no `backdrop-filter`,
 * and that is why it exists.
 *
 * #93 — a segment is never narrower than its label. The item was `min-w-0
 * flex-1`, which let a row of four labels in a 240 px column shrink each
 * slice below its text: "Mentions" ran into "Archived" and "Unread" was cut.
 * It is now `min-w-max flex-1`, so a segment grows to fit its label and
 * still shares any width left over. The glass pill is `min-w-max` too: its
 * items no longer stick out past its right edge, where the rim and the
 * shadow stopped short of the last segment. A pill wider than its column
 * now overflows the column, which is the parent's to scroll, rather than
 * clipping a label. `on-glass` wraps, so its shell takes no minimum.
 *
 * #93 — the selection is the accent: the travelling capsule is
 * `bg-accent-soft` and the active item's text `text-accent-ink`, which a
 * child that sets no colour of its own inherits.
 *
 * #130 — `size="sm"`: a control that sits in a toolbar beside a `Select`.
 * The UX review found the switch a few pixels taller than the field next to
 * it, because the shell's height was its padding plus whatever the caller's
 * button happened to be. `sm` fixes the shell at `--size-control` (28px under
 * the desk profile, where it equals `--size-field`, so it is flush with a
 * `Select`) with a 2px inset, and makes each item a flex box so the caller's
 * button stretches to the height instead of choosing one. Under the sofa
 * profile `--size-control` is 40px — `Button md`'s height — while a field is
 * 44px; the issue names the control token, and a toolbar's buttons are what
 * the switch lines up with there. A child under `sm` must not carry its own
 * `min-h` (a tap-sized `min-h-(--size-tap)` would overflow the shell); it
 * stays on `md`. `md` is the default, and its strings are unchanged.
 *
 * #168 — maint/v0.8's sizing, scrolling and wrapping (FEAT-20261013-005,
 * BUG-20261013-001, FEAT-20261013-709), in develop's look:
 *
 * - `overflow="scroll"`: a control wider than its row scrolls inside
 *   `ScrollHintRow` instead of spilling into the parent. The scroller is
 *   `ScrollHintRow`'s inner div — what it measures — and carries the shell;
 *   the list inside is `w-max min-w-full`, so it is as wide as its items and
 *   the overflow lands on the scroller. The active item brings itself into
 *   view (`useScrollIntoRow`), and a label never wraps. `spill`, the default,
 *   renders exactly what it did.
 * - `wrap`: the row breaks between items onto a second line instead; a label
 *   never does. It wins over `overflow`.
 * - `full`: equal shares of the row, never below a label. That is already
 *   develop's default width, so outside the workspace profile `full` changes
 *   nothing. Under the profile a control without `full` is as wide as its
 *   labels — maint's default: a two-word control is not 672px wide.
 *
 * Scrolling and wrapping draw the shell `rounded-control`, `glass` included:
 * two rows inside a pill put their corners outside its curve, and a fade over
 * a pill's round end paints a square corner onto the page. The fade is
 * `from-raised`, the glass scrim at the flat material.
 */
type SegmentedControlVariant = 'glass' | 'on-glass';

type SegmentedControlSize = 'sm' | 'md';

/**
 * @deprecated FEAT-20260919-624 — `surface` is `glass`; the opaque well is
 * gone. Pass nothing. The name is accepted so that a consumer written
 * against v0.18 keeps compiling and renders the pill; it goes in the next
 * major.
 */
type DeprecatedSegmentedControlVariant = 'surface';

interface SegmentedControlProps {
  children: ReactNode;
  className?: string;
  'aria-label'?: string;
  /** Renders a `<div>` in this role instead of the default `<ul>`. */
  role?: string;
  /**
   * `glass` (default) is the header's material as a pill; `on-glass` is the
   * hairline well for a control inside a glass panel. `surface` is accepted
   * as the old name for the default.
   */
  variant?: SegmentedControlVariant | DeprecatedSegmentedControlVariant;
  /**
   * #130 — `md` (default) is the shell's padding around the caller's
   * button; `sm` pins the shell to `--size-control`, so it lines up with a
   * `Select` in a desk toolbar.
   */
  size?: SegmentedControlSize;
  /**
   * #168 — stretch to the row, in equal shares, never below a label's width.
   * Develop's default already does; under the workspace profile the default
   * is the width of the labels, and `full` is how a control asks for the row.
   */
  full?: boolean;
  /**
   * #168 — `spill` (default) lets a control wider than its row overflow into
   * the parent, which is the parent's to scroll. `scroll` scrolls it inside
   * its own shell, with a fade on the side that has more.
   */
  overflow?: SegmentedControlOverflow;
  /**
   * #168 — wrap onto a second line instead of scrolling. The row breaks
   * between items; a label never does. With `full`, `full` decides the width.
   */
  wrap?: boolean;
}

type SegmentedControlOverflow = 'spill' | 'scroll';

/** How the row lays out: develop's spill, or maint's scroll or wrap. */
type SegmentedControlMode = SegmentedControlOverflow | 'wrap';

interface SegmentedControlShape {
  /** The wrapper is a `<div>` in a role, so the items are `<div>`s too. */
  listless: boolean;
  variant: SegmentedControlVariant;
  size: SegmentedControlSize;
  full: boolean;
  mode: SegmentedControlMode;
}

const SegmentedControlContext = createContext<SegmentedControlShape>({
  listless: false,
  variant: 'glass',
  size: 'md',
  full: false,
  mode: 'spill',
});

const WRAPPER_CLASSES: Record<SegmentedControlVariant, string> = {
  glass: 'flex min-w-max gap-1 rounded-full glass p-1',
  'on-glass': 'flex gap-1 rounded-control border border-line p-1',
};

const CAPSULE_CLASSES: Record<SegmentedControlVariant, string> = {
  glass: 'absolute inset-0 rounded-full bg-accent-soft',
  'on-glass':
    'absolute inset-0 rounded-[calc(var(--radius-control)-4px)] bg-accent-soft',
};

/** #130 — the `sm` shell: control height, a 2px inset in place of 4px. */
const SM_WRAPPER_CLASSES = 'h-(--size-control) p-0.5';

/** #130 — the inset is 2px, so the `on-glass` capsule's radius steps in by 2. */
const SM_CAPSULE_CLASSES: Record<SegmentedControlVariant, string> = {
  glass: CAPSULE_CLASSES.glass,
  'on-glass':
    'absolute inset-0 rounded-[calc(var(--radius-control)-2px)] bg-accent-soft',
};

/** #168 — the shell as a box around a list, for `scroll` and `wrap`: the
 *  list carries the flex row, and the corner is the control's. */
const BOX_CLASSES: Record<SegmentedControlVariant, string> = {
  glass: 'rounded-control glass p-1',
  'on-glass': 'rounded-control border border-line p-1',
};

/** The capsule inside a `rounded-control` box: 4px in, as `on-glass`'s is. */
const BOX_CAPSULE_CLASSES = CAPSULE_CLASSES['on-glass'];

/** Under the workspace profile, a control without `full` is as wide as its
 *  labels; with it, or outside the profile, it fills the row. */
const LABEL_WIDTH = 'workspace:w-fit workspace:max-w-full';

/** The one place the old name is spelt: everything past it knows two variants. */
function resolveVariant(
  variant: SegmentedControlVariant | DeprecatedSegmentedControlVariant,
): SegmentedControlVariant {
  return variant === 'surface' ? 'glass' : variant;
}

export function SegmentedControl({
  children,
  className,
  role,
  variant: requested = 'glass',
  size = 'md',
  full = false,
  overflow = 'spill',
  wrap = false,
  ...props
}: SegmentedControlProps) {
  const Wrapper = role ? 'div' : 'ul';
  const variant = resolveVariant(requested);
  const mode: SegmentedControlMode = wrap ? 'wrap' : overflow;
  const shape = { listless: !!role, variant, size, full, mode };

  if (mode === 'spill') {
    return (
      <SegmentedControlContext.Provider value={shape}>
        <Wrapper
          role={role}
          className={cn(
            WRAPPER_CLASSES[variant],
            size === 'sm' && SM_WRAPPER_CLASSES,
            !full && LABEL_WIDTH,
            className,
          )}
          {...props}
        >
          {children}
        </Wrapper>
      </SegmentedControlContext.Provider>
    );
  }

  const box = cn(
    BOX_CLASSES[variant],
    size === 'sm' && (mode === 'wrap' ? 'min-h-(--size-control) p-0.5' : SM_WRAPPER_CLASSES),
    full ? 'w-full' : LABEL_WIDTH,
    className,
  );
  const list = (
    <Wrapper
      role={role}
      className={mode === 'wrap' ? 'flex flex-wrap gap-1' : 'flex w-max min-w-full gap-1'}
      {...props}
    >
      {children}
    </Wrapper>
  );
  return (
    <SegmentedControlContext.Provider value={shape}>
      {mode === 'wrap' ? (
        <div className={box}>{list}</div>
      ) : (
        <ScrollHintRow
          edgeClassName="from-raised"
          className={cn('scrollbar-hide relative overflow-x-auto', box)}
        >
          {list}
        </ScrollHintRow>
      )}
    </SegmentedControlContext.Provider>
  );
}

interface SegmentedControlItemProps {
  active: boolean;
  layoutId: string;
  children: ReactNode;
  /**
   * BUG-20260916-607 — merged after the item's own `relative min-w-max
   * flex-1`, the way `TabsItem` takes one (BUG-20260914-578). Since #93 a
   * label is kept whole by default; `flex-none` still opts an item out of
   * sharing the spare width.
   */
  className?: string;
}

export function SegmentedControlItem({
  active,
  layoutId,
  children,
  className,
}: SegmentedControlItemProps) {
  const reduced = useReducedMotion();
  const { listless, variant, size, full, mode } = useContext(SegmentedControlContext);
  const ref = useRef<HTMLLIElement & HTMLDivElement>(null);
  // The row is the scroller only in `scroll`; elsewhere the item's
  // `offsetParent` is some unrelated ancestor, and there is nothing to bring
  // into view.
  useScrollIntoRow(ref, active && mode === 'scroll');
  const Item = listless ? 'div' : 'li';
  const boxed = mode !== 'spill';
  return (
    <Item
      ref={ref}
      className={cn(
        'relative min-w-max flex-1',
        size === 'sm' && 'flex',
        !full && 'workspace:flex-none',
        boxed && '[&>*]:whitespace-nowrap',
        active && 'text-accent-ink',
        className,
      )}
    >
      {active ? (
        <motion.span
          layoutId={layoutId}
          className={
            boxed && variant === 'glass'
              ? size === 'sm'
                ? SM_CAPSULE_CLASSES['on-glass']
                : BOX_CAPSULE_CLASSES
              : size === 'sm'
                ? SM_CAPSULE_CLASSES[variant]
                : CAPSULE_CLASSES[variant]
          }
          transition={
            reduced
              ? { duration: 0 }
              : { type: 'spring', stiffness: 420, damping: 34, mass: 0.9 }
          }
        />
      ) : null}
      {children}
    </Item>
  );
}
