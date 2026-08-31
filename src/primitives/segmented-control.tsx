'use client';

import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
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
 */
interface SegmentedControlProps {
  children: ReactNode;
  className?: string;
  'aria-label'?: string;
}

export function SegmentedControl({ children, className, ...props }: SegmentedControlProps) {
  return (
    <ul className={cn('flex gap-1 rounded-control bg-surface p-1', className)} {...props}>
      {children}
    </ul>
  );
}

interface SegmentedControlItemProps {
  active: boolean;
  layoutId: string;
  children: ReactNode;
}

export function SegmentedControlItem({ active, layoutId, children }: SegmentedControlItemProps) {
  const reduced = useReducedMotion();
  return (
    <li className="relative min-w-0 flex-1">
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
    </li>
  );
}
