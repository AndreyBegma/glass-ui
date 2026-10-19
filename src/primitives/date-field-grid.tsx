'use client';

import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
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

/** Six rows of seven, starting on the `weekStartsOn` day on or before the 1st. */
function monthWeeks(active: string, weekStartsOn: 0 | 1): string[][] {
  const first = `${active.slice(0, 8)}01`;
  const start = addDays(first, -((weekdayOf(first) - weekStartsOn + 7) % 7));
  return Array.from({ length: 6 }, (_, week) =>
    Array.from({ length: 7 }, (_, day) => addDays(start, week * 7 + day)),
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

  const month = active.slice(0, 7);
  const previous = addMonths(active, -1);
  const next = addMonths(active, 1);

  function pick(day: string) {
    if (isWithin(day, min, max)) onPick(day);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTableElement>) {
    const weekday = (weekdayOf(active) - weekStartsOn + 7) % 7;
    const move =
      MOVES[event.key] ??
      (event.key === 'Home' ? () => addDays(active, -weekday) : undefined) ??
      (event.key === 'End' ? () => addDays(active, 6 - weekday) : undefined);

    if (move) {
      event.preventDefault();
      focusActive.current = true;
      setActive(move(active, event.shiftKey));
    } else if (event.key === 'Enter' || event.key === ' ') {
      // Prevented so the button's own synthesized click does not pick twice.
      event.preventDefault();
      pick(active);
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
      <table
        ref={gridRef}
        // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: the WAI-ARIA date picker's grid is a table with `role="grid"`; the table keeps the rows and column heads a reader walks
        role="grid"
        aria-label={formatMonthTitle(active, locale)}
        onKeyDown={onKeyDown}
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
          {monthWeeks(active, weekStartsOn).map((week) => (
            <tr key={week[0]}>
              {week.map((day) => {
                const chosen = day === value;
                const outside = !isWithin(day, min, max);
                return (
                  // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: a cell of the grid above is a gridcell
                  // biome-ignore lint/a11y/useFocusableInteractive: the day's button inside the cell is what takes focus, by roving `tabIndex`
                  <td key={day} role="gridcell" aria-selected={chosen} className="p-0">
                    <button
                      type="button"
                      data-day={day}
                      tabIndex={day === active ? 0 : -1}
                      aria-label={formatFullDay(day, locale)}
                      aria-current={day === today ? 'date' : undefined}
                      aria-disabled={outside || undefined}
                      onClick={() => pick(day)}
                      className={cn(
                        'size-9 rounded-control text-sm tabular-nums',
                        'transition-[background-color,color] duration-(--dur-fast)',
                        day.slice(0, 7) === month ? 'text-ink' : 'text-ink-3',
                        chosen ? 'bg-ink text-ground' : 'hover:bg-hover',
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
    </div>
  );
}
