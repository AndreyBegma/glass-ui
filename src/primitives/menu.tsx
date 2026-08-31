'use client';

import * as RadixMenu from '@radix-ui/react-dropdown-menu';
import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';
import './motion.css';

/**
 * FEAT-20260823-362 — the dropdown menu.
 *
 * `page-nav.tsx` builds the avatar menu by hand: a `useState`, a `useEffect`
 * listening for Escape, a ref, and a click-outside handler. It is a hundred
 * lines that Radix does in a component, and it still lacks the parts that are
 * easy to forget — arrow-key roving between items, type-ahead, returning focus
 * to the avatar on close, and `aria-expanded` on the trigger. On a television,
 * where the only input is a four-way pad, arrow-key roving is not a nicety.
 *
 * The same primitive covers the Browse popup in the bottom bar and the quality
 * and audio-track menus in the player, all three of which are hand-rolled
 * today in three different ways.
 */
/**
 * FEAT-20260823-364 — non-modal, deliberately.
 *
 * Radix menus are modal by default, which means they lock the page's scroll,
 * and locking the scroll marks the body — the same mark FEAT-20260823-364's
 * depth rule reads to push the page back behind a sheet. So opening the Browse
 * dropdown made the whole site shrink, which is a thing that should happen when
 * a surface takes the screen over and not when a small list opens under the
 * control that owns it.
 *
 * Non-modal is also the more honest description of what these are. A dropdown
 * is attached to its trigger; it does not take the page away, and the page
 * behind it does not need to be made inert or unscrollable. Radix still handles
 * dismissal, focus return and arrow-key movement without the modal flag — the
 * flag only buys the scroll lock and hiding the rest of the document from
 * assistive technology, neither of which a navigation menu wants.
 *
 * A caller that genuinely needs modal behaviour can still pass `modal`.
 */
export function MenuRoot({
  modal = false,
  ...props
}: ComponentProps<typeof RadixMenu.Root>) {
  return <RadixMenu.Root modal={modal} {...props} />;
}
export const MenuTrigger = RadixMenu.Trigger;

type MenuContentProps = Omit<
  ComponentProps<typeof RadixMenu.Content>,
  'className'
> & {
  className?: string;
  /**
   * FEAT-20260830-490, at FEAT-489's request — where the menu is portalled to.
   *
   * The default is `document.body`, and that is the right answer everywhere
   * except one place: the player's own menus while the player is fullscreen.
   * `requestFullscreen()` is called on the player container, and the fullscreen
   * element is the only thing the compositor draws — a menu portalled to the
   * body is still in the document, still focusable, and completely invisible.
   * Pass the fullscreen element and the menu comes with it.
   */
  container?: ComponentProps<typeof RadixMenu.Portal>['container'];
};

export function MenuContent({
  className,
  sideOffset = 8,
  container,
  ...props
}: MenuContentProps) {
  return (
    <RadixMenu.Portal container={container}>
      <RadixMenu.Content
        sideOffset={sideOffset}
        className={cn(
          'glass-strong z-overlay min-w-52 overflow-hidden rounded-surface p-1.5',
          // FEAT-20260830-490 — it grows out of the control that opened it.
          //
          // Radix already measures where the trigger is relative to the menu
          // and writes it to `--radix-dropdown-menu-content-transform-origin`;
          // nothing was reading it, so every menu in the app scaled from its own
          // centre, which says the list came from the middle of the screen
          // rather than from the tab under it. Measured on the bottom bar's
          // Browse menu: `104px 93.5px`, and `animation-name: none`.
          //
          // Faster than the dialog in both directions. A dropdown is opened and
          // dismissed tens of times in a session, and the durations that make a
          // modal feel considered make a menu feel slow.
          'origin-[var(--radix-dropdown-menu-content-transform-origin)]',
          'data-[state=open]:animate-[lunaPopIn_var(--dur-fast)_cubic-bezier(0.23,1,0.32,1)]',
          'data-[state=closed]:animate-[lunaPopOut_100ms_ease-out]',
          className,
        )}
        {...props}
      />
    </RadixMenu.Portal>
  );
}

type MenuItemProps = Omit<ComponentProps<typeof RadixMenu.Item>, 'className'> & {
  className?: string;
  tone?: 'default' | 'danger';
};

export function MenuItem({ className, tone = 'default', ...props }: MenuItemProps) {
  return (
    <RadixMenu.Item
      className={cn(
        'lit flex cursor-default select-none items-center gap-2.5 rounded-control px-3 py-2.5 text-sm',
        'outline-none transition-colors duration-(--dur-fast)',
        // Radix marks the item under the pointer *and* the item the keyboard is
        // on with the same attribute, so one rule covers both and the mouse and
        // the remote never disagree about what is selected.
        tone === 'danger'
          ? 'text-danger data-highlighted:bg-danger/15'
          : 'text-ink-2 data-highlighted:bg-hover data-highlighted:text-ink',
        'data-disabled:opacity-40 data-disabled:pointer-events-none',
        className,
      )}
      {...props}
    />
  );
}

export function MenuSeparator({ className }: { className?: string }) {
  return <RadixMenu.Separator className={cn('my-1.5 h-px bg-hover', className)} />;
}

type MenuLabelProps = Omit<ComponentProps<typeof RadixMenu.Label>, 'className'> & {
  className?: string;
};

export function MenuLabel({ className, ...props }: MenuLabelProps) {
  return (
    <RadixMenu.Label
      className={cn('px-3 pb-1 pt-2 text-[11px] uppercase tracking-wider text-ink-3', className)}
      {...props}
    />
  );
}
