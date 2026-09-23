'use client';

import { Ellipsis, GripVertical } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../lib/cn';
import { Button } from '../primitives/button';
import {
  MenuContent,
  MenuItem,
  MenuRoot,
  MenuSeparator,
  MenuTrigger,
} from '../primitives/menu';
import { RowActions } from './row-actions';
import type { WidgetGridLabels } from './widget-grid';
import type { WidgetGridItem, WidgetMoveCommand } from './widget-grid-reducer';

/**
 * FEAT-20260923-003 — the bar an item wears in arrange mode (`W1` decision 4).
 *
 * The grip, the item's name and its menu. `WidgetGrid` owns every state it
 * reflects and every handler it calls, so this file draws and never decides:
 *
 * - The grip's pointer handlers are the grid's.
 * - The menu's items send commands and steps back to the grid, and the grid
 *   hands them to the reducer.
 * - The trigger's element goes back through `triggerRef`, so that focus can
 *   follow a moved item.
 *
 * **The grip is not in the tab order.** The keyboard path is the menu
 * (`V3` decision 4). A focusable grip that does nothing on Enter is a stop
 * that goes nowhere. The grip keeps its name for a reader that walks the page.
 * It is the only element with `touch-action: none`, so a swipe that starts
 * anywhere else scrolls.
 */
export interface WidgetGridChromeProps {
  item: WidgetGridItem;
  labels: WidgetGridLabels;
  first: boolean;
  last: boolean;
  /** `null` when the grid is not resizable: no Wider, no Narrower. */
  resize: { canWiden: boolean; canNarrow: boolean } | null;
  /** The item is the drag's placeholder: the bar keeps its space and draws nothing. */
  placeholder: boolean;
  grip: Pick<
    ComponentProps<'button'>,
    'onPointerDown' | 'onPointerMove' | 'onPointerUp' | 'onPointerCancel'
  >;
  triggerRef: (el: HTMLButtonElement | null) => void;
  onMove: (command: WidgetMoveCommand) => void;
  onResize: (delta: 1 | -1) => void;
  /** The consumer's own `MenuItem`s, behind a separator. */
  menu?: ReactNode;
}

export function WidgetGridChrome({
  item,
  labels,
  first,
  last,
  resize,
  placeholder,
  grip,
  triggerRef,
  onMove,
  onResize,
  menu,
}: WidgetGridChromeProps) {
  const moves = [
    ['up', labels.moveUp, first],
    ['down', labels.moveDown, last],
    ['top', labels.moveToTop, first],
    ['bottom', labels.moveToBottom, last],
  ] as const;

  return (
    <div
      className={cn('flex min-h-(--size-row) items-center gap-1', placeholder && 'invisible')}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label={labels.dragHandle(item)}
        {...grip}
        className={cn(
          'inline-flex size-(--size-row) shrink-0 items-center justify-center rounded-control text-ink-3',
          'cursor-grab touch-none hover:bg-hover active:cursor-grabbing pointer-coarse:size-11',
        )}
      >
        <GripVertical size={16} aria-hidden="true" />
      </button>
      <span className="min-w-0 flex-1 text-sm font-medium text-ink">{item.label}</span>
      <RowActions selected>
        <MenuRoot>
          <MenuTrigger asChild>
            <Button
              ref={triggerRef}
              variant="ghost"
              size="sm"
              icon
              aria-label={labels.actions(item)}
              className="pointer-coarse:size-11"
            >
              <Ellipsis size={16} aria-hidden="true" />
            </Button>
          </MenuTrigger>
          <MenuContent align="end">
            {moves.map(([command, text, disabled]) => (
              <MenuItem key={command} disabled={disabled} onSelect={() => onMove(command)}>
                {text}
              </MenuItem>
            ))}
            {resize ? (
              <>
                <MenuSeparator />
                <MenuItem disabled={!resize.canWiden} onSelect={() => onResize(1)}>
                  {labels.wider}
                </MenuItem>
                <MenuItem disabled={!resize.canNarrow} onSelect={() => onResize(-1)}>
                  {labels.narrower}
                </MenuItem>
              </>
            ) : null}
            {menu ? (
              <>
                <MenuSeparator />
                {menu}
              </>
            ) : null}
          </MenuContent>
        </MenuRoot>
      </RowActions>
    </div>
  );
}
