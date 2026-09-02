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
 */
interface SegmentedControlProps {
  children: ReactNode;
  className?: string;
  'aria-label'?: string;
  /** Renders a `<div>` in this role instead of the default `<ul>`. */
  role?: string;
}

const SegmentedControlContext = createContext(false);

export function SegmentedControl({
  children,
  className,
  role,
  ...props
}: SegmentedControlProps) {
  const Wrapper = role ? 'div' : 'ul';
  return (
    <SegmentedControlContext.Provider value={!!role}>
      <Wrapper
        role={role}
        className={cn('flex gap-1 rounded-control bg-surface p-1', className)}
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
}

export function SegmentedControlItem({ active, layoutId, children }: SegmentedControlItemProps) {
  const reduced = useReducedMotion();
  const listless = useContext(SegmentedControlContext);
  const Item = listless ? 'div' : 'li';
  return (
    <Item className="relative min-w-0 flex-1">
      {active ? (
        <motion.span
          layoutId={layoutId}
          className="absolute inset-0 rounded-[calc(var(--radius-control)-4px)] bg-raised"
          transition={
            reduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34, mass: 0.9 }
          }
        />
      ) : null}
      {children}
    </Item>
  );
}
