import type { ReactNode } from 'react';
import { cn } from '../lib/cn';
import { ScrollHintRow } from '../primitives/scroll-hint-row';

/**
 * FEAT-20260911-003 — the bar above a collection. `E-104`, `V3` decision 1.
 *
 * Three slots and no more: `views` (a `SegmentedControl` of the views the
 * caller offers), `filters`, and `actions`. **`Toolbar` holds no state about
 * the collection** — what a view *means*, which filters are active, what the
 * trailing action does are all the application's. This is layout and slots,
 * the same contract `BottomCapsule` and `NavRail` already keep for the shell:
 * the pattern draws the chrome, the consumer draws the meaning.
 *
 * `views` and `filters` sit inside `ScrollHintRow` — the horizontal overflow
 * affordance this package already has — so a narrow toolbar scrolls sideways
 * with a fade at whichever edge still has content. `actions` sits outside it,
 * deliberately: a trailing action that scrolled away with the filters would be
 * unreachable at 390px, and it is the one thing on this bar a person always
 * needs to get to.
 *
 * `ScrollHintRow` applies the `className` it is given to its own *inner*
 * scrolling element, not to the wrapper it renders around it — so `flex-1
 * min-w-0` said there never reaches the flex item `Toolbar`'s own row
 * actually lays out, and the row would grow to fit its content instead of
 * clipping it. The extra `min-w-0 flex-1` wrapper below is what carries that
 * constraint into this flex context instead.
 */
export interface ToolbarProps {
  /** A `SegmentedControl` of the views the caller offers, or nothing. */
  views?: ReactNode;
  /** The filter area — chips, a search field, a menu trigger. */
  filters?: ReactNode;
  /** The trailing action area. Stays reachable; never scrolls with the rest. */
  actions?: ReactNode;
  className?: string;
  'aria-label'?: string;
}

export function Toolbar({ views, filters, actions, className, ...rest }: ToolbarProps) {
  return (
    <div className={cn('flex min-w-0 items-center gap-3', className)} {...rest}>
      {views || filters ? (
        <div className="min-w-0 flex-1">
          <ScrollHintRow className="flex items-center gap-3 overflow-x-auto scrollbar-hide">
            {views ? <div className="shrink-0">{views}</div> : null}
            {filters ? (
              <div className="flex shrink-0 items-center gap-2">{filters}</div>
            ) : null}
          </ScrollHintRow>
        </div>
      ) : null}
      {actions ? (
        <div className="ml-auto flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
