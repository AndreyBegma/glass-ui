'use client';

import { type KeyboardEvent, type Ref, useEffect, useRef, useState } from 'react';
import { cn } from '../lib/cn';
import { PeriodSwitcher } from '../patterns/period-switcher';
import {
  addDays,
  addMonths,
  clampDay,
  formatFullDay,
  formatMonthTitle,
  isIsoDay,
  isWithin,
  weekdayNames,
  weekdayOf,
} from './date-text';

/**
 * FEAT-20261013-006 (W242) — `DateField`'s month grid, the WAI-ARIA date
 * picker's grid: `role="grid"`, six weeks of seven days, one day in the tab
 * order at a time (roving `tabIndex`).
 *
 * Arrows move a day, PageUp and PageDown a month (with Shift, a year), Home
 * and End to the week's ends from `weekStartsOn`, Enter or Space picks. Escape
 * is Radix's: the popover closes and focus goes back to the calendar button.
 *
 * A day outside `min`/`max` is `aria-disabled`, not `disabled`: the keyboard
 * still walks through it, as the pattern asks, and picking it does nothing.
 * The month arrows move the shown month without taking focus off the arrow.
 *
 * #180 — the table itself is `MonthGrid` and the key moves are `moveDay`, so
 * `DateRangePicker` draws its one or two months from the same calendar.
 */
export interface DateFieldGridProps {
  value: string;
  locale: string;
  today: string;
  min?: string;
  max?: string;
  weekStartsOn: 0 | 1;
  onPick: (day: string) => void;
  previousMonthLabel?: string;
  nextMonthLabel?: string;
}

const MOVES: Record<string, (day: string, shift: boolean) => string> = {
  ArrowLeft: (day) => addDays(day, -1),
  ArrowRight: (day) => addDays(day, 1),
  ArrowUp: (day) => addDays(day, -7),
  ArrowDown: (day) => addDays(day, 7),
  PageUp: (day, shift) => addMonths(day, shift ? -12 : -1),
  PageDown: (day, shift) => addMonths(day, shift ? 12 : 1),
};

/**
 * Where a key moves the active day, or `null` when the key is not a move:
 * arrows, PageUp/PageDown (Shift: a year), Home/End to the week's ends.
 */
export function moveDay(
  key: string,
  day: string,
  shift: boolean,
  weekStartsOn: 0 | 1,
): string | null {
  const weekday = (weekdayOf(day) - weekStartsOn + 7) % 7;
  if (key === 'Home') return addDays(day, -weekday);
  if (key === 'End') return addDays(day, 6 - weekday);
  return MOVES[key]?.(day, shift) ?? null;
}

/** Six rows of seven, starting on the `weekStartsOn` day on or before the 1st. */
function monthWeeks(month: string, weekStartsOn: 0 | 1): string[][] {
  const first = `${month}-01`;
  const start = addDays(first, -((weekdayOf(first) - weekStartsOn + 7) % 7));
  return Array.from({ length: 6 }, (_, week) =>
    Array.from({ length: 7 }, (_, day) => addDays(start, week * 7 + day)),
  );
}

/**
 * How a day is selected: `chosen` is the picked day (or a range's end), filled
 * with ink; `between` is a day inside a range, tinted; `null` is not selected.
 * Both selected states carry `aria-selected`, so colour is not the only signal.
 */
export type MonthGridDayState = 'chosen' | 'between' | null;

export interface MonthGridProps {
  /** `YYYY-MM`. */
  month: string;
  /** The one day in the tab order. A day of another month leaves none here. */
  active: string;
  locale: string;
  today: string;
  min?: string;
  max?: string;
  weekStartsOn: 0 | 1;
  dayState: (day: string) => MonthGridDayState;
  /** A click on a day inside `min`/`max`. */
  onPick: (day: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLTableElement>) => void;
  /** The pointer over a day, and `null` when it leaves the grid. */
  onHover?: (day: string | null) => void;
  /** Default true. False leaves the neighbouring months' days as blank cells. */
  showOutsideDays?: boolean;
  gridRef?: Ref<HTMLTableElement>;
}

export function MonthGrid({
  month,
  active,
  locale,
  today,
  min,
  max,
  weekStartsOn,
  dayState,
  onPick,
  onKeyDown,
  onHover,
  showOutsideDays = true,
  gridRef,
}: MonthGridProps) {
  const title = formatMonthTitle(`${month}-01`, locale);
  return (
    <table
      ref={gridRef}
      // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: the WAI-ARIA date picker's grid is a table with `role="grid"`; the table keeps the rows and column heads a reader walks
      role="grid"
      aria-label={title}
      onKeyDown={onKeyDown}
      onMouseLeave={onHover ? () => onHover(null) : undefined}
      className="border-separate border-spacing-0.5"
    >
      <thead>
        <tr>
          {weekdayNames(locale, weekStartsOn).map(({ narrow, long }) => (
            <th
              key={long}
              scope="col"
              abbr={long}
              aria-label={long}
              className="text-ink-3 size-9 text-center text-xs font-medium"
            >
              {narrow}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {monthWeeks(month, weekStartsOn).map((week) => (
          <tr key={week[0]}>
            {week.map((day) => {
              const inMonth = day.slice(0, 7) === month;
              if (!inMonth && !showOutsideDays) {
                // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: a cell of the grid above is a gridcell
                // biome-ignore lint/a11y/useFocusableInteractive: an empty cell holds no day to focus
                return <td key={day} role="gridcell" className="p-0" />;
              }
              const state = dayState(day);
              const chosen = state === 'chosen';
              const outside = !isWithin(day, min, max);
              return (
                // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: a cell of the grid above is a gridcell
                // biome-ignore lint/a11y/useFocusableInteractive: the day's button inside the cell is what takes focus, by roving `tabIndex`
                <td key={day} role="gridcell" aria-selected={state !== null} className="p-0">
                  <button
                    type="button"
                    data-day={day}
                    tabIndex={day === active ? 0 : -1}
                    aria-label={formatFullDay(day, locale)}
                    aria-current={day === today ? 'date' : undefined}
                    aria-disabled={outside || undefined}
                    onClick={() => {
                      if (!outside) onPick(day);
                    }}
                    onMouseEnter={onHover ? () => onHover(day) : undefined}
                    className={cn(
                      'size-9 rounded-control text-sm tabular-nums',
                      'transition-[background-color,color] duration-(--dur-fast)',
                      inMonth ? 'text-ink' : 'text-ink-3',
                      chosen ? 'bg-ink text-ground' : 'hover:bg-hover',
                      state === 'between' && 'bg-accent-soft',
                      day === today && !chosen && 'ring-1 ring-ink/50 ring-inset',
                      outside && 'cursor-default opacity-40 hover:bg-transparent',
                    )}
                  >
                    {Number(day.slice(8))}
                  </button>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function DateFieldGrid({
  value,
  locale,
  today,
  min,
  max,
  weekStartsOn,
  onPick,
  previousMonthLabel,
  nextMonthLabel,
}: DateFieldGridProps) {
  const [active, setActive] = useState(() => clampDay(isIsoDay(value) ? value : today, min, max));
  const gridRef = useRef<HTMLTableElement>(null);
  // The grid takes focus when it opens and when a key moves the day; a click
  // on a month arrow moves the month and leaves focus on the arrow.
  const focusActive = useRef(true);

  useEffect(() => {
    if (!focusActive.current) return;
    focusActive.current = false;
    gridRef.current?.querySelector<HTMLElement>(`[data-day="${active}"]`)?.focus();
  }, [active]);

  const previous = addMonths(active, -1);
  const next = addMonths(active, 1);

  function onKeyDown(event: KeyboardEvent<HTMLTableElement>) {
    const moved = moveDay(event.key, active, event.shiftKey, weekStartsOn);
    if (moved) {
      event.preventDefault();
      focusActive.current = true;
      setActive(moved);
    } else if (event.key === 'Enter' || event.key === ' ') {
      // Prevented so the button's own synthesized click does not pick twice.
      event.preventDefault();
      if (isWithin(active, min, max)) onPick(active);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <PeriodSwitcher
        label={formatMonthTitle(active, locale)}
        onPrevious={() => setActive(previous)}
        onNext={() => setActive(next)}
        previousLabel={previousMonthLabel ?? formatMonthTitle(previous, locale)}
        nextLabel={nextMonthLabel ?? formatMonthTitle(next, locale)}
      />
      <MonthGrid
        gridRef={gridRef}
        month={active.slice(0, 7)}
        active={active}
        locale={locale}
        today={today}
        min={min}
        max={max}
        weekStartsOn={weekStartsOn}
        dayState={(day) => (day === value ? 'chosen' : null)}
        onPick={onPick}
        onKeyDown={onKeyDown}
      />
    </div>
  );
}
