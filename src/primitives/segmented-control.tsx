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
 */
interface SegmentedControlProps {
  children: ReactNode;
  className?: string;
  'aria-label'?: string;
  /** Renders a `<div>` in this role instead of the default `<ul>`. */
  role?: string;
  /**
   * Stretch to the row, in equal shares — never below a label's width. The
   * default is the width of the labels: a two-word control is not 672px wide.
   */
  full?: boolean;
}

interface SegmentedControlContextValue {
  listless: boolean;
  full: boolean;
}

const SegmentedControlContext = createContext<SegmentedControlContextValue>({
  listless: false,
  full: false,
});

/**
 * FEAT-20261013-005 (W241) — a control sizes to its labels and scrolls when it
 * is wider than its row, exactly as `Tabs` does: `ScrollHintRow` fades the
 * side with more, the bar is hidden, and the active item brings itself into
 * view (`useScrollIntoRow`). A label never wraps (`[&>*]:whitespace-nowrap` on
 * the item) and an item never shrinks below it (no `min-w-0`).
 */
export function SegmentedControl({
  children,
  className,
  role,
  full = false,
  ...props
}: SegmentedControlProps) {
  const Wrapper = role ? 'div' : 'ul';
  return (
    <SegmentedControlContext.Provider value={{ listless: !!role, full }}>
      {/* BUG-20261013-001 — the scroller is `ScrollHintRow`'s inner div (what it
          measures); the list inside is `w-max min-w-full`, so it is as wide as
          its items and the overflow lands on the scroller. */}
      <ScrollHintRow
        edgeClassName="from-surface"
        className={cn(
          'scrollbar-hide relative overflow-x-auto rounded-control bg-surface p-1',
          full ? 'w-full' : 'w-fit max-w-full',
          className,
        )}
      >
        <Wrapper role={role} className="flex w-max min-w-full gap-1" {...props}>
          {children}
        </Wrapper>
      </ScrollHintRow>
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
  const { listless, full } = useContext(SegmentedControlContext);
  const ref = useRef<HTMLLIElement & HTMLDivElement>(null);
  useScrollIntoRow(ref, active);
  const Item = listless ? 'div' : 'li';
  return (
    <Item
      ref={ref}
      className={cn('relative [&>*]:whitespace-nowrap', full ? 'min-w-fit flex-1' : 'flex-none')}
    >
      {active ? (
        <motion.span
          layoutId={layoutId}
          className="absolute inset-0 rounded-[calc(var(--radius-control)*2/3)] bg-raised"
          transition={
            reduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34, mass: 0.9 }
          }
        />
      ) : null}
      {children}
    </Item>
  );
}
