'use client';

import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../lib/cn';
import { Badge } from '../primitives/badge';

/**
 * #161 — the round button that opens something floating: a
 * `FloatingWindow`, a chat, a help panel. It sits in the bottom-right corner
 * of the viewport, over the page, and carries an optional badge.
 *
 * **It stays clear of the phone's `BottomCapsule`.** Below `lg` — where a
 * consumer draws the capsule — the button rises above the capsule's band
 * (6 rem plus the safe area, the capsule's own spacer), so the two never
 * overlap. A screen with no capsule passes `clearCapsule={false}` and the
 * button sits 16 px from the bottom at every width.
 *
 * **The name is `label`, and the badge is part of it.** `label` is drawn as
 * screen-reader text and the badge as visible text after it, so "Assistant"
 * with a badge of 3 is announced "Assistant 3"; `badgeLabel` replaces the
 * spoken part when a bare number says too little ("3 unread").
 *
 * `expanded` is `aria-expanded`, and draws the accent tint while what the
 * button opens is open — the pressed look of the design's launcher.
 */
export interface LauncherProps
  extends Omit<ComponentProps<'button'>, 'children' | 'aria-label' | 'type'> {
  /** The button's accessible name. */
  label: string;
  /** The icon. Decorative: give it `aria-hidden`. */
  icon: ReactNode;
  /** A count (capped at 99+) or a short label in the corner. Nothing is drawn while unset or `0`. */
  badge?: number | string;
  /** What a screen reader says for the badge instead of its text. */
  badgeLabel?: string;
  badgeTone?: 'neutral' | 'ink' | 'ok' | 'warn' | 'danger';
  /** Whether what the launcher opens is open. */
  expanded?: boolean;
  /** Rise above the phone `BottomCapsule` below `lg`. On by default. */
  clearCapsule?: boolean;
}

export function Launcher({
  label,
  icon,
  badge,
  badgeLabel,
  badgeTone = 'danger',
  expanded,
  clearCapsule = true,
  className,
  ...props
}: LauncherProps) {
  const hasBadge = badge !== undefined && badge !== 0 && badge !== '';
  return (
    <button
      type="button"
      aria-expanded={expanded}
      className={cn(
        'glass-strong fixed right-4 z-chrome grid size-12 place-items-center rounded-full text-accent-ink',
        'motion-safe:transition-colors duration-(--dur-fast) hover:bg-hover',
        'aria-expanded:bg-accent-soft',
        clearCapsule
          ? 'bottom-[calc(6rem+env(safe-area-inset-bottom))] lg:right-6 lg:bottom-6'
          : 'bottom-[calc(1rem+env(safe-area-inset-bottom))] lg:right-6 lg:bottom-6',
        className,
      )}
      {...props}
    >
      <span className="sr-only">{label}</span>
      {icon}
      {hasBadge ? (
        <>
          {badgeLabel ? <span className="sr-only">{badgeLabel}</span> : null}
          <Badge
            tone={badgeTone}
            aria-hidden={badgeLabel ? true : undefined}
            data-launcher-badge=""
            className="absolute -right-1 -top-1 h-[18px] min-w-[18px] px-1 text-[10px]"
            {...(typeof badge === 'number'
              ? { count: badge }
              : { label: badge })}
          />
        </>
      ) : null}
    </button>
  );
}
