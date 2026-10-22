'use client';

import * as RadixHoverCard from '@radix-ui/react-hover-card';
import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';

/**
 * v0.38.0 wave, HoverCard. Scaffold stub: the final prop types over Radix's
 * parts. The delays, the glass layer and its styling contract are its slot's.
 */
export type HoverCardProps = {
  /** Default 500. */
  openDelay?: number;
  /** Default 150. */
  closeDelay?: number;
  open?: boolean;
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

export type HoverCardContentProps = {
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  className?: string;
  children?: ComponentProps<typeof RadixHoverCard.Content>['children'];
};

export function HoverCardContent({
  className,
  ...props
}: HoverCardContentProps) {
  return <RadixHoverCard.Content className={cn(className)} {...props} />;
}
