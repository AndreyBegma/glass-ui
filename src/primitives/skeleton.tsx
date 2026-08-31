import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';

/**
 * FEAT-20260831-003 — the shape of what is coming, while it is coming.
 *
 * This is not invented. Luna Watch already had four of these — the home page,
 * the film page, the series page, the anime detail — and every one of them is
 * built the same way: blocks of `bg-raised`, rounded, pulsing under
 * `motion-safe`, with each region's animation offset from the last. What was
 * missing was the block itself, so each of the four spelled it out by hand.
 *
 * **Why a skeleton rather than a spinner.** A spinner says only "wait"; a
 * skeleton says "wait, and here is the shape of what arrives", which stops the
 * page reflowing under the reader when it does. Denitsa reached the same
 * conclusion from the other direction — `section-gate.tsx` argues against
 * spinners in as many words — and then had no component to reach for, so it
 * grew 57 hand-written `Loading…` strings instead.
 *
 * `motion-safe:` and not a media query around it: somebody who asked their
 * system for less motion gets the block without the pulse, which still says
 * "something belongs here" and is the whole of what the pulse adds.
 *
 * **A skeleton is a rectangle, not a component library.** Compose them — a
 * heading is a short one, a poster row is five wide ones. The moment this grows
 * variants for "text", "avatar" and "card" it has started guessing at layouts
 * it cannot see.
 */
type SkeletonProps = Omit<ComponentProps<'div'>, 'className'> & {
  className?: string;
  /**
   * Milliseconds to offset the pulse by. Regions that stagger read as a page
   * arriving; regions that pulse in unison read as one flashing rectangle.
   */
  delay?: number;
};

export function Skeleton({ className, delay, style, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('bg-raised rounded-control motion-safe:animate-pulse', className)}
      style={delay ? { animationDelay: `${delay}ms`, ...style } : style}
      {...props}
    />
  );
}
