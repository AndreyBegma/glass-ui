'use client';

import * as RadixPopover from '@radix-ui/react-popover';
import { type ComponentProps, type ReactNode, useId } from 'react';
import { cn } from '../lib/cn';
import '../primitives/motion.css';

/**
 * FEAT-20260902-004 — a panel anchored to the control that opened it.
 *
 * `E-92`: the shell's parts are the package's, and this is the part neither
 * product had. Denitsa's notification bell is a hand-rolled popover — a
 * `useState`, a click-outside listener, no focus management and no accessible
 * name — which is the same hundred lines `MenuRoot` replaced for the account
 * menu, written a second time because a menu was the wrong shape for it.
 *
 * **A popover is not a menu.** A menu is a list of commands, and Radix's menu
 * gives it roving focus, type-ahead and `role="menuitem"` — all of which are
 * wrong for a panel containing a heading, five notifications, a "mark all read"
 * button and an empty state. This is the container for the case where the
 * content has structure of its own. If the content is a list of commands, use
 * `MenuContent`; the two are not interchangeable and the accessibility tree is
 * where the difference shows.
 *
 * **Not modal, by default.** This is `MenuRoot`'s reasoning and it applies
 * unchanged: Radix's `modal` locks the page's scroll, and locking the scroll
 * marks the body — the same mark `base.css` reads to push the page back behind
 * a sheet. A notification panel is not a sheet, and a page that shrinks when
 * the bell is clicked is the bug that produced that rule.
 *
 * What `modal={false}` actually gives, since the words "focus trap" get used
 * loosely: focus moves into the panel when it opens, Escape closes it, a click
 * outside closes it, and focus returns to the trigger on close. What it does
 * not give is Tab being fenced inside the panel, and the rest of the document
 * being hidden from a screen reader. For a panel hanging off a bell, both of
 * those are the wrong behaviour rather than a missing one — the reader should
 * be able to walk out of the notifications and back into the page.
 *
 * A caller that genuinely needs the fence passes `modal` and accepts the scroll
 * lock that comes with it. Radix offers no third setting: `trapFocus` is not
 * public on `Popover.Content`, so the two are one switch.
 */
export function PopoverRoot({
  modal = false,
  ...props
}: ComponentProps<typeof RadixPopover.Root>) {
  return <RadixPopover.Root modal={modal} {...props} />;
}

export const PopoverTrigger = RadixPopover.Trigger;

/**
 * For a panel that is positioned against something other than the control that
 * opens it — a bell in a toolbar whose panel should align to the toolbar's
 * edge. Rarely needed; re-exported rather than reimplemented.
 */
export const PopoverAnchor = RadixPopover.Anchor;

export type PopoverContentProps = Omit<
  ComponentProps<typeof RadixPopover.Content>,
  'className' | 'children'
> & {
  /**
   * Required, not optional. `role="dialog"` with no accessible name is
   * announced as "dialog" and nothing else — the same reason `DialogContent`
   * demands one. Radix's popover ships no `Title` part, so the name is wired
   * here with a generated id.
   */
  title: string;
  /** Keeps the name for a reader but does not draw the heading. */
  hideTitle?: boolean;
  description?: string;
  /**
   * Sits on the heading row, opposite the title: "mark all read", a settings
   * cog, a link out. A footer is for what closes or commits the panel; this is
   * for what acts on what is in it.
   */
  headerAction?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  /**
   * Where the panel is portalled to. As `MenuContent` — the default is
   * `document.body`, and the one place that is wrong is inside a fullscreen
   * element, which is the only thing the compositor draws.
   */
  container?: ComponentProps<typeof RadixPopover.Portal>['container'];
};

export function PopoverContent({
  title,
  hideTitle = false,
  description,
  headerAction,
  children,
  footer,
  className,
  container,
  sideOffset = 8,
  collisionPadding = 12,
  ...props
}: PopoverContentProps) {
  const titleId = useId();
  const descriptionId = useId();

  return (
    <RadixPopover.Portal container={container}>
      <RadixPopover.Content
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={cn(
          'glass-strong z-overlay w-[min(22rem,calc(100vw-2rem))] rounded-surface',
          'max-h-[min(28rem,calc(100dvh-4rem))] overflow-y-auto',
          // It grows out of the control that opened it, for the reason
          // `MenuContent` gives: Radix has already measured where the trigger
          // is, and a panel that scales from its own centre says it came from
          // the middle of the screen rather than from the bell.
          //
          // The same pair of keyframes as the menu, and the same asymmetry —
          // out is faster and travels less far than in. A popover is opened and
          // dismissed many times in a session; the durations that make a modal
          // feel considered make this feel slow.
          'origin-[var(--radix-popover-content-transform-origin)]',
          'data-[state=open]:animate-[lunaPopIn_var(--dur-fast)_cubic-bezier(0.23,1,0.32,1)]',
          'data-[state=closed]:animate-[lunaPopOut_100ms_ease-out]',
          className,
        )}
        {...props}
      >
        <div className="flex items-start gap-3 px-4 pt-4">
          <div className="min-w-0 flex-1">
            <h2
              id={titleId}
              className={cn(
                hideTitle ? 'sr-only' : 'text-ink text-sm font-semibold',
              )}
            >
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="text-ink-2 mt-1 text-xs">
                {description}
              </p>
            ) : null}
          </div>
          {headerAction ? (
            <div className="shrink-0">{headerAction}</div>
          ) : null}
        </div>

        {/*
            Nothing inside here is glass. The panel has already flattened what
            is behind it, so a second blur has nothing left to refract and comes
            out as a film — and the material's own rule puts glass on chrome
            rather than on the rows inside it.
          */}
        <div className={cn('px-4 pb-4', hideTitle && !description ? '' : 'mt-3')}>
          {children}
        </div>

        {footer ? (
          <div className="border-line border-t px-4 py-3">{footer}</div>
        ) : null}
      </RadixPopover.Content>
    </RadixPopover.Portal>
  );
}
