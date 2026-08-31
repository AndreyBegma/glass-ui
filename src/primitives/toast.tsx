'use client';

import { Toaster as SonnerToaster, toast } from 'sonner';

/**
 * FEAT-20260823-362 — somewhere for a message to go.
 *
 * The app had no toast at all; every "saved", "failed" and "added to your
 * list" was either an inline flash or nothing. sonner is the one library the
 * design system takes on for behaviour it would be a mistake to rebuild:
 * stacking, swipe to dismiss, pause on hover, and — the one that matters on a
 * television — a live region that screen readers announce.
 *
 * Mount this as a *sibling* of `#main-content` in the locale layout, never
 * inside it. Radix's `aria-hidden` pass, when a dialog opens, skips any subtree
 * that contains a live region, and a toaster inside the main content would
 * keep the whole page announced behind the dialog.
 *
 * `closeButton` is on because a toast that can only be waited out is a problem
 * on a television, where the remote has no swipe. `duration` is longer than the
 * library's default for the same reason: six seconds is what a person across
 * the room needs to read a line.
 *
 * FEAT-20260827-438 — a second instance, for achievements only. Owner's
 * decision 3: an unlock arrives top-right, every other message keeps
 * bottom-right. sonner routes by `toasterId`, so the page mounts this twice —
 * once bare, once as `<Toaster toasterId="achievements" position="top-right" />`
 * — and `toast(…, { toasterId })` picks the corner. Everything else about the
 * two is the same material.
 *
 * FEAT-20260830-493 — and it gets out of the bottom bar's way.
 *
 * A toast is `z-transient` (80) and the floating bar is `z-chrome` (40), so
 * every "added to your list" on a phone landed on top of the bar and the search
 * circle — over the controls, at the one moment somebody is most likely to
 * press one. The fix is the offset rather than the stacking order: the toast
 * *should* be above the bar, it simply should not be in the same place.
 *
 * 6.5rem is the bar's own height plus the gap it keeps from the edge, and the
 * safe-area inset is added rather than assumed because the bar reads the same
 * one.
 */
export const ACHIEVEMENTS_TOASTER = 'achievements';

/** The bottom bar's height, its clearance, and whatever the notch takes. */
const ABOVE_THE_BAR = 'calc(6.5rem + env(safe-area-inset-bottom))';

export function Toaster({
  toasterId,
  position = 'bottom-right',
}: {
  toasterId?: string;
  position?: 'bottom-right' | 'top-right';
} = {}) {
  return (
    <SonnerToaster
      // sonner names the instance `id` on the host and `toasterId` on a toast.
      id={toasterId}
      position={position}
      closeButton
      duration={6000}
      // sonner's own "mobile" is a hard-coded `max-width: 600px`, and the
      // floating bar runs all the way to `lg` — so this alone leaves a 768px
      // tablet's toasts sitting on the bar. `mobileOffset` covers the phone;
      // the class below covers the rest of the band.
      mobileOffset={{ bottom: ABOVE_THE_BAR }}
      // `!` because sonner writes `--offset-bottom` as an inline style on this
      // element, and an inline style beats an ordinary class. `max-lg` because
      // above it there is no bottom bar to clear.
      // Written out rather than interpolated: Tailwind reads this file as
      // text and cannot see a class it has to evaluate. Underscores are the
      // arbitrary-value spelling of the spaces in the `calc`.
      className="max-lg:[--offset-bottom:calc(6.5rem_+_env(safe-area-inset-bottom))]!"
      // Sonner's own theming assumes CSS variables it defines; pointing those
      // at ours keeps it inside the token layer rather than beside it.
      toastOptions={{
        classNames: {
          toast: 'glass-strong !rounded-surface !border-line !text-ink !font-sans',
          description: '!text-ink-2',
          actionButton: '!bg-ink !text-ground !rounded-control',
          cancelButton: '!bg-hover !text-ink !rounded-control',
          error: '!text-danger',
          success: '!text-ok',
        },
      }}
    />
  );
}

export { toast };
