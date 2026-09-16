'use client';

import { motion, useReducedMotion } from 'motion/react';
import { createContext, type ReactNode, useContext } from 'react';
import { cn } from '../lib/cn';

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
 * `surface` is the default and renders the strings it always did, to the
 * byte; the test holds that.
 */
type SegmentedControlVariant = 'surface' | 'glass' | 'on-glass';

interface SegmentedControlProps {
  children: ReactNode;
  className?: string;
  'aria-label'?: string;
  /** Renders a `<div>` in this role instead of the default `<ul>`. */
  role?: string;
  /**
   * `surface` (default) is the opaque well; `glass` is the header's material
   * as a pill; `on-glass` is the well for a control inside a glass panel.
   */
  variant?: SegmentedControlVariant;
}

interface SegmentedControlShape {
  /** The wrapper is a `<div>` in a role, so the items are `<div>`s too. */
  listless: boolean;
  variant: SegmentedControlVariant;
}

const SegmentedControlContext = createContext<SegmentedControlShape>({
  listless: false,
  variant: 'surface',
});

const WRAPPER_CLASSES: Record<SegmentedControlVariant, string> = {
  surface: 'flex gap-1 rounded-control bg-surface p-1',
  glass: 'flex gap-1 rounded-full glass p-1',
  'on-glass': 'flex gap-1 rounded-control border border-line p-1',
};

const CAPSULE_CLASSES: Record<SegmentedControlVariant, string> = {
  surface:
    'absolute inset-0 rounded-[calc(var(--radius-control)-4px)] bg-raised',
  glass: 'absolute inset-0 rounded-full bg-hover',
  'on-glass':
    'absolute inset-0 rounded-[calc(var(--radius-control)-4px)] bg-hover',
};

export function SegmentedControl({
  children,
  className,
  role,
  variant = 'surface',
  ...props
}: SegmentedControlProps) {
  const Wrapper = role ? 'div' : 'ul';
  return (
    <SegmentedControlContext.Provider value={{ listless: !!role, variant }}>
      <Wrapper
        role={role}
        className={cn(WRAPPER_CLASSES[variant], className)}
        {...props}
      >
        {children}
      </Wrapper>
    </SegmentedControlContext.Provider>
  );
}

interface SegmentedControlItemProps {
  active: boolean;
  layoutId: string;
  children: ReactNode;
  /**
   * BUG-20260916-607 — merged after the item's own `relative min-w-0 flex-1`,
   * the way `TabsItem` takes one (BUG-20260914-578). `flex-none
   * whitespace-nowrap` is the opt-out for a row whose width nobody set: the
   * items keep their labels whole instead of collapsing to the narrowest
   * width `min-w-0` allows.
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
  const { listless, variant } = useContext(SegmentedControlContext);
  const Item = listless ? 'div' : 'li';
  return (
    <Item className={cn('relative min-w-0 flex-1', className)}>
      {active ? (
        <motion.span
          layoutId={layoutId}
          className={CAPSULE_CLASSES[variant]}
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
