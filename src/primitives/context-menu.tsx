'use client';

import * as RadixContextMenu from '@radix-ui/react-context-menu';
import type { LucideIcon } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { useInputModality } from '../hooks/use-input-modality';
import { cn } from '../lib/cn';
import {
  MENU_CONTENT_CLASS,
  MENU_ITEM_CLASS,
  MENU_LABEL_CLASS,
  MENU_RADIO_ITEM_CLASS,
  MENU_SEPARATOR_CLASS,
} from './menu';
import './motion.css';

/**
 * FEAT-20260911-002 — the right-click menu, on `Menu`'s parts (`V2` decision 6).
 *
 * `Menu` is trigger-driven: a control opens it, and a list of commands hangs
 * off that control. A row in a tree or a table has no control to hang a list
 * off — the row *is* the thing, and the list of what can be done to it opens
 * where the pointer is. Radix keeps the two as separate packages over one
 * `react-menu` core, and this file is the second package styled as the first,
 * **so that a right-click menu and a dropdown menu cannot drift apart.**
 *
 * Which is why every class string here is imported from `menu.tsx` and none
 * is written down twice. There is nothing to compare and nothing to keep in
 * step: restyle `MenuItem` and this restyles with it.
 *
 * **Every action here is also reachable without a right-click.** That is the
 * acceptance criterion, and it is structural rather than a review note:
 * `ContextMenuContent` takes the same `actions` list `RowActions` takes, so a
 * row built from one list offers exactly the same commands under the pointer
 * as it does in its hover cluster. A consumer that composes `ContextMenuItem`s
 * by hand keeps the obligation by hand.
 *
 * Shift+F10 and the Menu key fire the same `contextmenu` event a right-click
 * does, so a keyboard opens this from a focused trigger with nothing added
 * here. Long-press opens it on touch, which Radix also handles.
 *
 * Non-modal by default for `MenuRoot`'s reason: Radix's `modal` locks the
 * page's scroll, and that lock is the mark `base.css` reads to push the page
 * back behind a sheet. A menu under the pointer is not a sheet.
 */
export function ContextMenuRoot({
  modal = false,
  ...props
}: ComponentProps<typeof RadixContextMenu.Root>) {
  return <RadixContextMenu.Root modal={modal} {...props} />;
}

export const ContextMenuTrigger = RadixContextMenu.Trigger;

/**
 * One command on a row, in the shape both renderers read. `RowActions` draws
 * it as an icon button with a `Tooltip`; `ContextMenuContent` draws it as a
 * `ContextMenuItem`. Declared here rather than in `row-actions.tsx` because
 * primitives do not import patterns, and `RowActions` re-exports it.
 */
export interface ContextMenuAction {
  id: string;
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  tone?: 'default' | 'danger';
  disabled?: boolean;
}

type ContextMenuContentProps = Omit<
  ComponentProps<typeof RadixContextMenu.Content>,
  'className'
> & {
  className?: string;
  /**
   * The row's commands, drawn before `children`. The same list `RowActions`
   * takes — see the note above.
   */
  actions?: readonly ContextMenuAction[];
  /**
   * Where the menu is portalled to. As `MenuContent`: the default is
   * `document.body`, and the one place that is wrong is inside a fullscreen
   * element, which is the only thing the compositor draws.
   */
  container?: ComponentProps<typeof RadixContextMenu.Portal>['container'];
};

export function ContextMenuContent({
  className,
  actions,
  container,
  children,
  onPointerMove,
  onKeyDown,
  ...props
}: ContextMenuContentProps) {
  // BUG-20260919-625 — the same Radix core roves focus on hover here too;
  // see `MenuContent` and `hooks/use-input-modality.ts`.
  const inputModality = useInputModality({ onPointerMove, onKeyDown });
  return (
    <RadixContextMenu.Portal container={container}>
      <RadixContextMenu.Content
        {...inputModality}
        className={cn(
          MENU_CONTENT_CLASS,
          // It grows out of where the pointer was, which Radix has already
          // measured — the same variable `MenuContent` reads, under the
          // context menu's own name.
          'origin-[var(--radix-context-menu-content-transform-origin)]',
          'data-[state=open]:animate-[lunaPopIn_var(--dur-fast)_var(--ease-out-expo)]',
          'data-[state=closed]:animate-[lunaPopOut_100ms_ease-out]',
          className,
        )}
        {...props}
      >
        {actions?.map((action) => {
          const Icon = action.icon;
          return (
            <ContextMenuItem
              key={action.id}
              tone={action.tone}
              disabled={action.disabled}
              onSelect={action.onSelect}
            >
              <Icon size={16} aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">{action.label}</span>
            </ContextMenuItem>
          );
        })}
        {children}
      </RadixContextMenu.Content>
    </RadixContextMenu.Portal>
  );
}

type ContextMenuItemProps = Omit<
  ComponentProps<typeof RadixContextMenu.Item>,
  'className'
> & {
  className?: string;
  tone?: 'default' | 'danger';
};

export function ContextMenuItem({
  className,
  tone = 'default',
  ...props
}: ContextMenuItemProps) {
  return (
    <RadixContextMenu.Item
      className={cn(MENU_ITEM_CLASS[tone], className)}
      {...props}
    />
  );
}

export function ContextMenuSeparator({ className }: { className?: string }) {
  return (
    <RadixContextMenu.Separator className={cn(MENU_SEPARATOR_CLASS, className)} />
  );
}

export const ContextMenuRadioGroup = RadixContextMenu.RadioGroup;

type ContextMenuRadioItemProps = Omit<
  ComponentProps<typeof RadixContextMenu.RadioItem>,
  'className'
> & {
  className?: string;
};

export function ContextMenuRadioItem({
  className,
  ...props
}: ContextMenuRadioItemProps) {
  return (
    <RadixContextMenu.RadioItem
      className={cn(MENU_RADIO_ITEM_CLASS, className)}
      {...props}
    />
  );
}

type ContextMenuLabelProps = Omit<
  ComponentProps<typeof RadixContextMenu.Label>,
  'className'
> & {
  className?: string;
  children?: ReactNode;
};

export function ContextMenuLabel({ className, ...props }: ContextMenuLabelProps) {
  return (
    <RadixContextMenu.Label
      className={cn(MENU_LABEL_CLASS, className)}
      {...props}
    />
  );
}
