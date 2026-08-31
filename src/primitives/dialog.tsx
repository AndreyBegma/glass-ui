'use client';

import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from './button';
import { cn } from '../lib/cn';
import './motion.css';

/**
 * FEAT-20260823-362 — the modal, on Radix rather than by hand.
 *
 * The app has four hand-rolled overlays — `confirm-modal`,
 * `season-picker-modal`, `movie-chat-modal` and `filter-sheet` — and between
 * them they implement Escape twice, a click-outside backdrop four times, and
 * focus trapping never. Opening the season picker with a keyboard and pressing
 * Tab walks straight out of the dialog and into the page behind it, which on a
 * television means the highlight vanishes somewhere off screen with no way back
 * except the remote's back button.
 *
 * Radix brings the parts that are tedious and easy to get subtly wrong: the
 * focus trap, focus restoration to whatever opened the dialog, `aria-modal`,
 * scroll locking, and Escape. What is left here is what it looks like.
 *
 * A title is required rather than optional. A dialog with no accessible name is
 * announced as "dialog" and nothing else; where a design genuinely has no
 * visible heading, pass `hideTitle` and the text still reaches the screen
 * reader.
 */
/**
 * Only the root is re-exported. Every dialog in Luna is opened by the parent's
 * own state — `{confirming && <ConfirmModal … />}` — rather than by a trigger
 * inside the dialog's own tree, so `Trigger` and `Close` would be exports
 * nothing imports. Add them back at the call site that needs one.
 */
export const DialogRoot = RadixDialog.Root;

interface DialogProps {
  title: string;
  /** Keeps the accessible name but does not draw it. */
  hideTitle?: boolean;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  /** Hides the corner close button, for a dialog that must be answered. */
  dismissible?: boolean;
}

export function DialogContent({
  title,
  hideTitle = false,
  description,
  children,
  footer,
  className,
  dismissible = true,
}: DialogProps) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay
        className={cn(
          'fixed inset-0 z-overlay bg-black/55 backdrop-blur-sm',
          'data-[state=open]:animate-[lunaFadeIn_var(--dur-base)_ease-out]',
          'data-[state=closed]:animate-[lunaFadeOut_var(--dur-fast)_ease-out]',
        )}
      />
      <RadixDialog.Content
        className={cn(
          'glass-strong fixed left-1/2 top-1/2 z-overlay w-[min(32rem,calc(100vw-2rem))]',
          '-translate-x-1/2 -translate-y-1/2 rounded-sheet p-6',
          'max-h-[calc(100dvh-2rem)] overflow-y-auto',
          // FEAT-20260830-490 — it arrives and it leaves.
          //
          // Radix keeps a closing element mounted for as long as a CSS
          // animation is running on it, which is the whole reason this needs no
          // `forceMount` and no `AnimatePresence`: the `data-state` attribute
          // is the switch, and the exit is a real exit rather than an unmount
          // dressed as one.
          //
          // `transform-origin` stays at the centre. A dialog is not anchored to
          // anything — it is in the middle of the screen because it is the only
          // thing being asked about — and scaling it from a trigger it does not
          // have is the popover rule applied where it does not hold.
          //
          // The exit is faster than the entrance and travels less far. The
          // entrance is the user's decision arriving; the exit is the system
          // getting out of the way, and a slow one reads as the interface
          // thinking about it.
          'data-[state=open]:animate-[lunaDialogIn_var(--dur-base)_cubic-bezier(0.23,1,0.32,1)]',
          'data-[state=closed]:animate-[lunaDialogOut_var(--dur-fast)_cubic-bezier(0.23,1,0.32,1)]',
          className,
        )}
        onOpenAutoFocus={(e) => {
          // Radix focuses the first tabbable node, which in a confirmation
          // dialog is usually the destructive button. Focus the panel instead:
          // the reader still hears the title, and nothing is one Enter away.
          e.preventDefault();
          (e.currentTarget as HTMLElement).focus();
        }}
        tabIndex={-1}
      >
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            {hideTitle ? (
              <RadixDialog.Title className="sr-only">{title}</RadixDialog.Title>
            ) : (
              <RadixDialog.Title className="text-lg font-bold text-ink">
                {title}
              </RadixDialog.Title>
            )}
            {description ? (
              <RadixDialog.Description className="mt-1.5 text-sm text-ink-2">
                {description}
              </RadixDialog.Description>
            ) : null}
          </div>
          {dismissible ? (
            <RadixDialog.Close asChild>
              <Button variant="ghost" size="sm" icon aria-label="Close">
                <X className="size-4" aria-hidden="true" />
              </Button>
            </RadixDialog.Close>
          ) : null}
        </div>

        {children ? (
          <div className={cn(hideTitle && !description ? '' : 'mt-4')}>{children}</div>
        ) : null}

        {footer ? <div className="mt-6 flex justify-end gap-2">{footer}</div> : null}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}
