'use client';

import { motion, useReducedMotion } from 'motion/react';
import { type ReactNode, useLayoutEffect, useRef } from 'react';
import { cn } from '../lib/cn';
import { ScrollHintRow } from './scroll-hint-row';

/**
 * FEAT-20260902-004 — navigation, not selection.
 *
 * `SegmentedControl` is `aria-pressed`: a switch that redraws the same region
 * under a different filter. `Tabs` is `aria-current="page"`: each item is a
 * real destination — Denitsa's `task-filters.tsx` is the named consumer, and
 * `U4`'s mapping table draws the line between the two on exactly this axis.
 * Same travelling capsule as `SegmentedControl`, because a selection that
 * lands on a link should look like one that lands on a button; only the ARIA
 * differs, because what happens on click does.
 *
 * The interactive element — the consumer's `Link` — is left to the caller as
 * `children`, exactly as `SegmentedControl` leaves it: a primitive in `ui/`
 * importing a router's `Link` would point the dependency the wrong way. That
 * also means `aria-current="page"` is the caller's own anchor's attribute,
 * not this component's — `current` only drives the capsule.
 *
 * FEAT-20260930-004 (SYS-16, TASKS-1) — a row that does not fit scrolls, and
 * says so. At 390 the Tasks tabs were clipped mid-word with nothing to tell a
 * reader there was more. Now each item is at least its content's width
 * (`min-w-fit`), so the row overflows instead of squeezing; the row scrolls
 * with its bar hidden; `ScrollHintRow` fades the side that has more; and the
 * current item scrolls itself into view, so a deep link to the fifth tab does
 * not open on a row showing the first three. Where there is room, `flex-1`
 * still shares it out equally, and nothing changes.
 */
interface TabsProps {
  children: ReactNode;
  className?: string;
  'aria-label'?: string;
}

export function Tabs({ children, className, ...props }: TabsProps) {
  return (
    <ScrollHintRow edgeClassName="from-surface">
      <ul
        className={cn(
          'scrollbar-hide relative flex gap-1 overflow-x-auto rounded-control bg-surface p-1',
          className,
        )}
        {...props}
      >
        {children}
      </ul>
    </ScrollHintRow>
  );
}

interface TabsItemProps {
  current: boolean;
  layoutId: string;
  children: ReactNode;
  className?: string;
}

export function TabsItem({ current, layoutId, children, className }: TabsItemProps) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLLIElement>(null);

  // The row's own `scrollLeft`, not `scrollIntoView`: that one also scrolls
  // every ancestor, and a tab row below the fold would drag the page down to
  // it on load. Centred, so the tabs either side of the current one show too.
  // The `ul` is `relative`, which makes it the item's `offsetParent`.
  useLayoutEffect(() => {
    const item = ref.current;
    const row = item?.parentElement;
    if (!current || !item || !row || row.scrollWidth <= row.clientWidth) return;
    row.scrollLeft = item.offsetLeft - (row.clientWidth - item.offsetWidth) / 2;
  }, [current]);

  return (
    <li ref={ref} className={cn('relative min-w-fit flex-1', className)}>
      {current ? (
        <motion.span
          layoutId={layoutId}
          className="absolute inset-0 rounded-[calc(var(--radius-control)*2/3)] bg-raised"
          transition={
            reduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34, mass: 0.9 }
          }
        />
      ) : null}
      {children}
    </li>
  );
}
