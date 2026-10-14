'use client';

import { SlidersHorizontal, X } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { cn } from '../lib/cn';
import { Button } from '../primitives/button';
import { Chip } from '../primitives/chip';
import { ScrollHintRow } from '../primitives/scroll-hint-row';
import { SheetContent, SheetRoot } from '../primitives/sheet';

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
 *
 * #130 — two optional additions, and with neither set the bar renders as it
 * always has. AgentDock had four filter models across its pages; these make
 * the fifth unnecessary rather than adding to the count.
 *
 * `activeFilters` is a row of removable chips under the bar, plus "Clear
 * all": what is filtering this list, readable at a glance and undoable one at
 * a time. The application still owns what each filter means; the bar only
 * draws the label it is handed and calls `onRemove`.
 *
 * `collapseBelow` folds `filters` into one "Filters (n)" button below that
 * breakpoint, which opens a bottom `Sheet` holding them. The breakpoint is CSS
 * (`hidden sm:flex` and its mirror), not a media-query hook, so the server
 * render already matches the client and nothing flashes. The inline filters
 * stay mounted while hidden; the sheet's copy mounts only while it is open.
 */
export interface ToolbarFilter {
  key: string;
  label: string;
  onRemove: () => void;
}

export interface ToolbarProps {
  /** A `SegmentedControl` of the views the caller offers, or nothing. */
  views?: ReactNode;
  /** The filter area — chips, a search field, a menu trigger. */
  filters?: ReactNode;
  /** The trailing action area. Stays reachable; never scrolls with the rest. */
  actions?: ReactNode;
  className?: string;
  'aria-label'?: string;
  /** #130 — the filters in force, drawn as removable chips under the bar. */
  activeFilters?: ToolbarFilter[];
  /** Draws "Clear all" after the chips. Omit to offer only one-by-one removal. */
  onClearAll?: () => void;
  /** "Clear all" by default. */
  clearAllLabel?: string;
  /** #130 — below this breakpoint `filters` fold into one button and a bottom sheet. */
  collapseBelow?: 'sm' | 'md';
  /** The collapsed button's label and the sheet's title. "Filters" by default. */
  filtersLabel?: string;
  /** The "(n)" on the collapsed button. Defaults to `activeFilters.length`; 0 shows none. */
  activeCount?: number;
}

/** Static class names, so Tailwind sees every one of them. */
const COLLAPSE = {
  sm: { inline: 'hidden sm:flex', button: 'sm:hidden' },
  md: { inline: 'hidden md:flex', button: 'md:hidden' },
} as const;

export function Toolbar({
  views,
  filters,
  actions,
  className,
  activeFilters,
  onClearAll,
  clearAllLabel = 'Clear all',
  collapseBelow,
  filtersLabel = 'Filters',
  activeCount,
  ...rest
}: ToolbarProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const collapse = filters && collapseBelow ? COLLAPSE[collapseBelow] : null;
  const count = activeCount ?? activeFilters?.length ?? 0;
  const chips = activeFilters && activeFilters.length > 0 ? activeFilters : null;

  // Without chips the bar stays the root element and takes `className` and the
  // label, as it always did; with them, the column around both does.
  const root = { className, ...rest };
  const bar = (
    <div
      className={cn('flex min-w-0 items-center gap-3', !chips && root.className)}
      {...(chips ? null : rest)}
    >
      {views || filters ? (
        <div className="min-w-0 flex-1">
          <ScrollHintRow className="flex items-center gap-3 overflow-x-auto scrollbar-hide">
            {views ? <div className="shrink-0">{views}</div> : null}
            {filters ? (
              <div className={cn('flex shrink-0 items-center gap-2', collapse?.inline)}>
                {filters}
              </div>
            ) : null}
            {collapse ? (
              <Button
                size="sm"
                aria-haspopup="dialog"
                aria-expanded={sheetOpen}
                onClick={() => setSheetOpen(true)}
                className={cn('shrink-0', collapse.button)}
              >
                <SlidersHorizontal size={14} aria-hidden="true" />
                {count > 0 ? `${filtersLabel} (${count})` : filtersLabel}
              </Button>
            ) : null}
          </ScrollHintRow>
        </div>
      ) : null}
      {actions ? (
        <div className="ml-auto flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );

  const sheet = collapse ? (
    <SheetRoot open={sheetOpen} onOpenChange={setSheetOpen}>
      <SheetContent title={filtersLabel} side="bottom">
        <div className="flex flex-col gap-3">{filters}</div>
      </SheetContent>
    </SheetRoot>
  ) : null;

  if (!chips) {
    return (
      <>
        {bar}
        {sheet}
      </>
    );
  }

  return (
    <div className={cn('flex min-w-0 flex-col gap-2', root.className)} {...rest}>
      {bar}
      <div className="flex flex-wrap items-center gap-2">
        <ul aria-label="Active filters" className="flex flex-wrap items-center gap-2">
          {chips.map((filter) => (
            <li key={filter.key}>
              <Chip className="pr-1">
                {filter.label}
                <button
                  type="button"
                  aria-label={`Remove ${filter.label}`}
                  onClick={filter.onRemove}
                  className="lit -my-1 inline-flex size-5 items-center justify-center rounded-full text-ink-3 hover:bg-hover hover:text-ink"
                >
                  <X size={12} aria-hidden="true" />
                </button>
              </Chip>
            </li>
          ))}
        </ul>
        {onClearAll ? (
          <Button variant="ghost" size="sm" onClick={onClearAll}>
            {clearAllLabel}
          </Button>
        ) : null}
      </div>
      {sheet}
    </div>
  );
}
