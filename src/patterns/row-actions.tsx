'use client';

import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../lib/cn';
import { Button } from '../primitives/button';
import type { ContextMenuAction } from '../primitives/context-menu';
import { Tooltip } from '../primitives/tooltip';

/**
 * FEAT-20260911-002 — a row's affordances, revealed when the row is attended
 * to (`V2` decision 5).
 *
 * Every row affordance in Denitsa is permanently visible today: a pin, an
 * edit, a delete, on every row of every list, forty rows deep. That is not
 * clutter by accident — there was nothing to reveal them *with*. This is it.
 *
 * **Revealing is a visual state, never a DOM state.** The cluster is
 * `opacity-0` and becomes `opacity-100`; it is never `hidden`, `invisible`,
 * `sr-only` or `aria-hidden`. So the buttons are in the accessibility tree at
 * all times, a reader lists them whether or not a pointer is anywhere near,
 * and Tab lands on them — at which point `focus-within` reveals them for the
 * eye as well. The test asserts the tree, not the class list, because the tree
 * is the contract.
 *
 * **Four things reveal it**, and the last is the one that matters:
 *
 *   - the pointer over the row (`group-hover`);
 *   - keyboard focus anywhere in the row (`group-focus-within`);
 *   - the row being selected — the `selected` prop, or `aria-selected="true"`
 *     on the row, which a tree or a listbox row already carries;
 *   - **a coarse pointer** (`pointer-coarse`). A phone has no hover, so a
 *     hover-only affordance on a phone is an affordance that does not exist.
 *     On touch the cluster is simply always drawn.
 *
 * **The row is the consumer's element; it wears `rowActionsHost`.** The cluster
 * cannot select its own parent, so the scope is a named Tailwind group on the
 * row — named, so a consumer's own `group` on an ancestor does not open every
 * cluster on the page at once. A row is a `<tr>`, an `<li>`, a `<div>` with
 * `role="treeitem"`; the pattern does not care which, and does not draw it.
 *
 * `actions` is the same list `ContextMenuContent` takes, drawn as icon buttons
 * with their label in a `Tooltip`. One list, two renderers: that is how every
 * right-click command is guaranteed a visible affordance (decision 6). Anything
 * that is not a plain command — a menu trigger, a toggle — comes in through
 * `children`.
 */
export type RowAction = ContextMenuAction;

/** The class the row wears, so the cluster inside it knows when the row is attended to. */
export const rowActionsHost = 'group/row-actions';

export interface RowActionsProps extends Omit<ComponentProps<'div'>, 'className' | 'children'> {
  actions?: readonly RowAction[];
  /** Always revealed. For a row whose selection is not expressed as `aria-selected`. */
  selected?: boolean;
  children?: ReactNode;
  className?: string;
}

export function RowActions({
  actions,
  selected = false,
  children,
  className,
  ...props
}: RowActionsProps) {
  return (
    <div
      data-row-actions=""
      data-selected={selected ? 'true' : undefined}
      className={cn(
        'flex shrink-0 items-center gap-0.5',
        'opacity-0 motion-safe:transition-opacity motion-safe:duration-(--dur-fast)',
        'group-hover/row-actions:opacity-100',
        'group-focus-within/row-actions:opacity-100',
        'group-aria-selected/row-actions:opacity-100',
        'pointer-coarse:opacity-100',
        selected && 'opacity-100',
        className,
      )}
      {...props}
    >
      {actions?.map((action) => {
        const Icon = action.icon;
        return (
          <Tooltip key={action.id} content={action.label}>
            <Button
              variant="ghost"
              size="sm"
              icon
              aria-label={action.label}
              disabled={action.disabled}
              onClick={action.onSelect}
              className={cn(action.tone === 'danger' && 'text-danger hover:text-danger')}
            >
              <Icon size={16} aria-hidden="true" />
            </Button>
          </Tooltip>
        );
      })}
      {children}
    </div>
  );
}
