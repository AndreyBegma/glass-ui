'use client';

import { useReducedMotion } from 'motion/react';
import { useId } from 'react';
import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

/**
 * FEAT-20260902-004 — an inline panel, not a modal wearing the name.
 *
 * `assign-dialog.tsx:62-78`, `share-dialog.tsx:63-77` and
 * `recurrence-dialog.tsx:47` are named "dialog" and are deliberately not one
 * — `kind-review.tsx:21`: "Deliberately not a modal." Mapping them onto
 * `DialogContent` would change stated product behaviour, so this is the
 * primitive that keeps it: no `Portal`, no focus trap, no scroll lock — the
 * page underneath never moves and never goes inert.
 *
 * The height animation is a CSS grid trick (`0fr` → `1fr` on
 * `grid-template-rows`) rather than a measured `scrollHeight`, so it needs no
 * `ResizeObserver` and still animates correctly when the panel's own content
 * changes height while open — a validation error appearing inside it, say.
 * `useReducedMotion` collapses the transition to instant rather than skipping
 * it via a media query, so a script-driven duration override is possible too.
 */
interface DisclosureProps {
  trigger: ReactNode;
  children: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
  triggerClassName?: string;
}

export function Disclosure({
  trigger,
  children,
  open,
  onOpenChange,
  className,
  triggerClassName,
}: DisclosureProps) {
  const reduced = useReducedMotion();
  const panelId = useId();

  return (
    <div className={cn('rounded-surface border border-line bg-surface', className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => onOpenChange(!open)}
        className={cn(
          'flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-ink',
          triggerClassName,
        )}
      >
        {trigger}
      </button>
      <div
        id={panelId}
        className="grid ease-out transition-[grid-template-rows]"
        style={{
          gridTemplateRows: open ? '1fr' : '0fr',
          transitionDuration: reduced ? '0ms' : 'var(--dur-base)',
        }}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4">{children}</div>
        </div>
      </div>
    </div>
  );
}
