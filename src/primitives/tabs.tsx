'use client';

import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

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
 */
interface TabsProps {
  children: ReactNode;
  className?: string;
  'aria-label'?: string;
}

export function Tabs({ children, className, ...props }: TabsProps) {
  return (
    <ul className={cn('flex gap-1 rounded-control bg-surface p-1', className)} {...props}>
      {children}
    </ul>
  );
}

interface TabsItemProps {
  current: boolean;
  layoutId: string;
  children: ReactNode;
}

export function TabsItem({ current, layoutId, children }: TabsItemProps) {
  const reduced = useReducedMotion();
  return (
    <li className="relative min-w-0 flex-1">
      {current ? (
        <motion.span
          layoutId={layoutId}
          className="absolute inset-0 rounded-[calc(var(--radius-control)-4px)] bg-raised"
          transition={
            reduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34, mass: 0.9 }
          }
        />
      ) : null}
      {children}
    </li>
  );
}
