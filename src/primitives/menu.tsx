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

/**
 * FEAT-20260911-002 — the styling, named, so `ContextMenu` can wear it.
 *
 * Radix ships the dropdown menu and the context menu as two packages over one
 * `react-menu` core, and `context-menu.tsx` is the second styled as the first.
 * The strings live here and are imported there — not copied — because a copy
 * is two menus that agree today, and `V2` decision 6 says a right-click menu
 * and a dropdown menu must not be able to drift apart. The components below
 * are unchanged; they read the same strings they always did.
 *
 * `MENU_CONTENT_CLASS` leaves out the transform-origin and the two animations,
 * which are the same idea under two variable names (`--radix-dropdown-menu-…`
 * and `--radix-context-menu-…`) and are written at each call site beside the
 * variable they read.
 */
export const MENU_CONTENT_CLASS =
  'glass-strong z-overlay min-w-52 overflow-hidden rounded-surface p-1.5';

const MENU_ITEM_BASE_CLASS = [
  // `h-(--size-row)` with `items-center` centres the line box rather than
  // pinning it with padding, so the row still centres when the desk rung
  // takes the token to 32px.
  'lit flex h-(--size-row) cursor-default select-none items-center gap-2.5 rounded-control px-3 text-sm',
  'outline-none transition-colors duration-(--dur-fast)',
].join(' ');

export const MENU_ITEM_CLASS: Record<'default' | 'danger', string> = {
  default: [
    MENU_ITEM_BASE_CLASS,
    'text-ink-2 data-highlighted:bg-hover data-highlighted:text-ink',
    'data-disabled:opacity-40 data-disabled:pointer-events-none',
  ].join(' '),
  danger: [
    MENU_ITEM_BASE_CLASS,
    'text-danger data-highlighted:bg-danger/15',
    'data-disabled:opacity-40 data-disabled:pointer-events-none',
  ].join(' '),
};

export const MENU_RADIO_ITEM_CLASS = [
  MENU_ITEM_BASE_CLASS,
  'text-ink-2 data-highlighted:bg-hover data-highlighted:text-ink',
  'data-[state=checked]:text-ink',
  'data-disabled:opacity-40 data-disabled:pointer-events-none',
].join(' ');

export const MENU_SEPARATOR_CLASS = 'my-1.5 h-px bg-hover';

export const MENU_LABEL_CLASS =
  'px-3 pb-1 pt-2 text-[11px] uppercase tracking-wider text-ink-3';

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
          MENU_CONTENT_CLASS,
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
      // Radix marks the item under the pointer *and* the item the keyboard is
      // on with the same attribute, so one rule covers both and the mouse and
      // the remote never disagree about what is selected.
      className={cn(MENU_ITEM_CLASS[tone], className)}
      {...props}
    />
  );
}

export function MenuSeparator({ className }: { className?: string }) {
  return <RadixMenu.Separator className={cn(MENU_SEPARATOR_CLASS, className)} />;
}

/**
 * FEAT-20260902-004 — a one-of-many row, first-class, from issue #11 item 3
 * (`u3-shell`, 2026-09-02).
 *
 * A `SegmentedControl` with hand-rolled `role="menuitemradio"` and
 * `aria-checked` was Denitsa's consumer-side fix, and it did not work: Radix's
 * roving focus and arrow-key handling inside `[role="menu"]` walk its own
 * Collection, which only elements registered through Radix's `RadioGroup` /
 * `RadioItem` join. A plain `button` wearing the right ARIA attributes reads
 * correctly to a screen reader and is still invisible to Tab and the arrows.
 * `MenuRadioGroup` / `MenuRadioItem` are that `RadioGroup` / `RadioItem`,
 * styled like `MenuItem` — `aria-checked` and the roving both come from
 * Radix, not from here.
 */
export const MenuRadioGroup = RadixMenu.RadioGroup;

type MenuRadioItemProps = Omit<
  ComponentProps<typeof RadixMenu.RadioItem>,
  'className'
> & {
  className?: string;
};

export function MenuRadioItem({ className, ...props }: MenuRadioItemProps) {
  return (
    <RadixMenu.RadioItem
      className={cn(MENU_RADIO_ITEM_CLASS, className)}
      {...props}
    />
  );
}

type MenuLabelProps = Omit<ComponentProps<typeof RadixMenu.Label>, 'className'> & {
  className?: string;
};

export function MenuLabel({ className, ...props }: MenuLabelProps) {
  return (
    <RadixMenu.Label
      className={cn(MENU_LABEL_CLASS, className)}
      {...props}
    />
  );
}
