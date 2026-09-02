'use client';

import * as RadixTooltip from '@radix-ui/react-tooltip';
import type { ReactNode } from 'react';
import { cn } from '../lib/cn';
import './motion.css';

/**
 * FEAT-20260902-004 — a name for a control, not a second surface.
 *
 * Native `title=` is Denitsa's tooltip today, everywhere — it does not open
 * on keyboard focus and its timing is the browser's own. `NavRail`'s
 * collapsed state (`U1` decision 3) is the sharpest need: an icon-only rail
 * item has no visible label at all without one.
 *
 * `content` is a `string`, not `children` — Radix's own docs warn against a
 * focusable element inside tooltip content, and text-only is how this stays
 * true rather than relying on every call site to remember it.
 *
 * `@radix-ui/react-tooltip` is a new peer dependency, `>=1.1.0` to match the
 * range this package already uses for `@radix-ui/react-dialog` and
 * `@radix-ui/react-dropdown-menu`.
 *
 * Wraps its own `Provider` per instance rather than asking every consumer to
 * mount one at the root — Radix's `Root` throws without one, and a rail of
 * a dozen independent tooltips has no shared `skipDelayDuration` to coordinate
 * anyway. A screen that genuinely wants tooltips to hand off to each other
 * without re-waiting the delay can still mount its own `Provider` higher up;
 * Radix nests them without conflict.
 */
interface TooltipProps {
  content: string;
  children: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  delayDuration?: number;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Tooltip({
  content,
  children,
  side = 'top',
  delayDuration = 300,
  open,
  defaultOpen,
  onOpenChange,
}: TooltipProps) {
  return (
    <RadixTooltip.Provider delayDuration={delayDuration}>
      <RadixTooltip.Root open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            side={side}
            sideOffset={8}
            className={cn(
              'glass-strong z-overlay rounded-control px-2.5 py-1.5 text-xs text-ink',
              'data-[state=delayed-open]:animate-[lunaPopIn_var(--dur-fast)_cubic-bezier(0.23,1,0.32,1)]',
            )}
          >
            {content}
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}
