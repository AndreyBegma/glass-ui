'use client';

import { motion, useReducedMotion } from 'motion/react';
import { type ReactNode, useRef } from 'react';
import { useScrollIntoRow } from '../hooks/use-scroll-into-row';
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
    // BUG-20261013-001 — `ScrollHintRow`'s inner div is the scroller, because
    // that is the element it measures and listens to. The list inside is
    // `w-max min-w-full`: as wide as its tabs, never narrower than the row, so
    // the overflow lands on the scroller and the fades can see it.
    <ScrollHintRow
      edgeClassName="from-surface"
      className={cn(
        'scrollbar-hide relative overflow-x-auto rounded-control bg-surface p-1',
        className,
      )}
    >
      <ul className="flex w-max min-w-full gap-1" {...props}>
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
  useScrollIntoRow(ref, current);

  return (
    <li ref={ref} className={cn('relative min-w-fit flex-1 [&>*]:whitespace-nowrap', className)}>
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
