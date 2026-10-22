'use client';

import * as RadixHoverCard from '@radix-ui/react-hover-card';
import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';
import '../primitives/motion.css';

/**
 * v0.38.0 wave, HoverCard — a rich preview of what a link points at: a user, a
 * commit, an issue. A tooltip is too small for it and a popover opens on click.
 *
 * **Never the only route to the information.** The card opens on hover and on
 * keyboard focus of its trigger, but a screen reader and a touch screen get
 * neither: Radix ignores touch pointers, so a tap navigates. The trigger must
 * therefore be a link to the same thing the card previews, and the card holds
 * nothing the page behind that link does not.
 *
 * It is not a dialog and takes no focus, so there is no title to demand and no
 * `labels`: every string in it is the consumer's children.
 *
 * The surface, radius and motion are `PopoverContent`'s, so the two read as the
 * same floating layer. Nothing inside is glass — the layer has already
 * flattened what is behind it.
 */
export type HoverCardProps = {
  /** ms before the card opens. Default 500. */
  openDelay?: number;
  /** ms before it closes after the pointer leaves. Default 150. */
  closeDelay?: number;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ComponentProps<typeof RadixHoverCard.Root>['children'];
};

export function HoverCard({
  openDelay = 500,
  closeDelay = 150,
  ...props
}: HoverCardProps) {
  return (
    <RadixHoverCard.Root
      openDelay={openDelay}
      closeDelay={closeDelay}
      {...props}
    />
  );
}

export const HoverCardTrigger = RadixHoverCard.Trigger;

export type HoverCardContentProps = Omit<
  ComponentProps<typeof RadixHoverCard.Content>,
  'className'
> & {
  className?: string;
  /** Where the card is portalled to; as `PopoverContent`. */
  container?: ComponentProps<typeof RadixHoverCard.Portal>['container'];
};

export function HoverCardContent({
  className,
  container,
  side = 'bottom',
  align = 'center',
  sideOffset = 8,
  collisionPadding = 12,
  ...props
}: HoverCardContentProps) {
  return (
    <RadixHoverCard.Portal container={container}>
      <RadixHoverCard.Content
        side={side}
        align={align}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={cn(
          'glass-strong z-overlay w-[min(20rem,calc(100vw-2rem))] rounded-surface p-4',
          'text-ink text-sm',
          // Same keyframes and asymmetry as `PopoverContent`: in grows out of
          // the trigger, out is faster. `motion-safe:` keeps both still under
          // reduced motion.
          'origin-[var(--radix-hover-card-content-transform-origin)]',
          'motion-safe:data-[state=open]:animate-[lunaPopIn_var(--dur-fast)_var(--ease-out-expo)]',
          'motion-safe:data-[state=closed]:animate-[lunaPopOut_100ms_ease-out]',
          className,
        )}
        {...props}
      />
    </RadixHoverCard.Portal>
  );
}
