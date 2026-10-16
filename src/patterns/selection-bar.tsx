'use client';

import type { LucideIcon } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { KeyboardEvent, ReactNode } from 'react';
import { cn } from '../lib/cn';
import { Badge } from '../primitives/badge';
import { Button } from '../primitives/button';
import { SPRINGS } from '../primitives/springs';

/**
 * #157 — the floating bar a multi-select raises: "3 selected", Clear, and the
 * bulk actions that apply to what is selected.
 *
 * AgentDock's Board needs it (C-87) and may only use glass-ui components, so
 * the bar lives here. **It holds no state about the selection.** Which items
 * are selected, how many each action applies to, what an action does — all the
 * application's; the bar draws the count it is handed and calls back. That is
 * the contract `Toolbar` and `BottomCapsule` keep.
 *
 * **Shown only while `count > 0`.** At zero the component renders `null`, not a
 * hidden bar: there is nothing for a screen reader or a tab stop to find.
 * It enters and leaves on the `arrive` spring, rising from below; under
 * `prefers-reduced-motion` it fades and nothing moves, because a JavaScript
 * animation is invisible to the CSS rule in `base.css` and is honoured here.
 *
 * **An action that applies to none is disabled.** `count` is how many of the
 * selection the action can act on and `of` how many are selected, drawn as a
 * badge: "Move to Completed · 40 of 42". `count={0}` disables the action, so
 * the application does not repeat that rule at every call site.
 *
 * **Keyboard.** The bar is a `role="toolbar"`: arrows (and Home / End) move
 * focus between its enabled buttons, wrapping. Tab order stays native — every
 * button is a tab stop — so nothing is hidden from a user who never learns the
 * arrows. Escape, with focus inside the bar, calls `onClear`. "N selected" is
 * a polite live region, so a screen reader hears the count change; only the
 * count is live, not the action badges, which would read as a flood when one
 * more card is selected.
 *
 * **Narrow widths.** The actions wrap onto a second row rather than hiding in
 * an overflow menu: every action stays one tap away, and the bar is at most
 * two rows tall. It is capped to the width of its container.
 *
 * **Placement.** `anchor="viewport"` (default) is `fixed` to the bottom centre
 * of the window; `anchor="container"` is `absolute` inside the nearest
 * positioned ancestor, for a Board that scrolls inside a panel. `bottomOffset`
 * lifts it clear of other floating UI (a `BottomCapsule`, a toast region). The
 * safe-area inset is always added.
 */
export interface SelectionBarAction {
  id: string;
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  /** How many of the selection this action applies to. `0` disables it. */
  count?: number;
  /** How many are selected. With `count`, the badge reads "count of of-total". */
  of?: number;
  /** `'danger'` for a destructive action. `'glass'` by default. */
  tone?: 'glass' | 'danger';
  disabled?: boolean;
}

export interface SelectionBarProps {
  /** How many are selected. The bar renders only while this is above zero. */
  count: number;
  /** Clear button and Escape. Make the selection empty. */
  onClear: () => void;
  actions?: SelectionBarAction[];
  /** Replaces "N selected". Sits inside the live region. */
  label?: (count: number) => ReactNode;
  /** "Clear" by default. */
  clearLabel?: string;
  /** The toolbar's accessible name. "Selection actions" by default. */
  'aria-label'?: string;
  /** `'viewport'` (default) is `fixed`; `'container'` is `absolute`. */
  anchor?: 'viewport' | 'container';
  /** Pixels between the bar and the bottom edge, on top of the safe-area inset. 16 by default. */
  bottomOffset?: number;
  className?: string;
}

const FOCUSABLE = 'button:not(:disabled)';

/** Arrow / Home / End across the enabled buttons, wrapping at both ends. */
function rove(event: KeyboardEvent<HTMLDivElement>) {
  const buttons = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE),
  );
  const at = buttons.indexOf(document.activeElement as HTMLElement);
  if (buttons.length === 0 || at === -1) return;
  const last = buttons.length - 1;
  let next: number;
  switch (event.key) {
    case 'ArrowRight':
    case 'ArrowDown':
      next = at === last ? 0 : at + 1;
      break;
    case 'ArrowLeft':
    case 'ArrowUp':
      next = at === 0 ? last : at - 1;
      break;
    case 'Home':
      next = 0;
      break;
    case 'End':
      next = last;
      break;
    default:
      return;
  }
  event.preventDefault();
  buttons[next]?.focus();
}

export function SelectionBar({
  count,
  onClear,
  actions,
  label,
  clearLabel = 'Clear',
  'aria-label': ariaLabel = 'Selection actions',
  anchor = 'viewport',
  bottomOffset = 16,
  className,
}: SelectionBarProps) {
  const reduced = useReducedMotion();
  // Reduced motion keeps the fade and drops the travel: no `y`, so no transform.
  const hidden = reduced ? { opacity: 0 } : { opacity: 0, y: 16 };
  const shown = reduced ? { opacity: 1 } : { opacity: 1, y: 0 };

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClear();
      return;
    }
    rove(event);
  }

  return (
    <AnimatePresence>
      {count > 0 ? (
        <div
          key="selection-bar"
          className={cn(
            'z-chrome pointer-events-none inset-x-0 flex justify-center px-3',
            anchor === 'viewport' ? 'fixed' : 'absolute',
          )}
          style={{
            bottom: `calc(${bottomOffset}px + env(safe-area-inset-bottom))`,
          }}
        >
          <motion.div
            role="toolbar"
            aria-label={ariaLabel}
            onKeyDown={onKeyDown}
            initial={hidden}
            animate={shown}
            exit={hidden}
            transition={reduced ? SPRINGS.reduced : SPRINGS.arrive}
            className={cn(
              'glass-strong pointer-events-auto flex max-w-full min-w-0 flex-wrap items-center',
              'gap-x-3 gap-y-2 rounded-3xl px-3 py-2 text-ink',
              className,
            )}
          >
            <div className="flex shrink-0 items-center gap-2">
              <span
                aria-live="polite"
                aria-atomic="true"
                className="px-1 text-sm font-semibold"
              >
                {label ? label(count) : `${count} selected`}
              </span>
              <Button variant="ghost" size="sm" onClick={onClear}>
                {clearLabel}
              </Button>
            </div>
            {actions && actions.length > 0 ? (
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                {actions.map((action) => {
                  const Icon = action.icon;
                  const counted = typeof action.count === 'number';
                  return (
                    <Button
                      key={action.id}
                      size="sm"
                      variant={action.tone ?? 'glass'}
                      onClick={action.onSelect}
                      disabled={action.disabled || action.count === 0}
                    >
                      {Icon ? <Icon size={14} aria-hidden="true" /> : null}
                      {action.label}
                      {counted ? (
                        <Badge
                          size="md"
                          label={
                            typeof action.of === 'number'
                              ? `${action.count} of ${action.of}`
                              : String(action.count)
                          }
                        />
                      ) : null}
                    </Button>
                  );
                })}
              </div>
            ) : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
