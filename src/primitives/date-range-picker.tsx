'use client';

import { Calendar } from 'lucide-react';
import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import { useBreakpoint } from '../hooks/use-breakpoint';
import { cn } from '../lib/cn';
import { PopoverContent, PopoverRoot, PopoverTrigger } from '../patterns/popover';
import { PeriodSwitcher } from '../patterns/period-switcher';
import { MonthGrid, type MonthGridDayState, moveDay } from './date-field-grid';
import {
  dayOf,
  defaultPresets,
  documentLocale,
  formatRangeText,
  ordered,
  rangeDays,
  rangeFits,
  sameRange,
  toRange,
  windowFor,
} from './date-range-picker-model';
import { addMonths, clampDay, formatMonthTitle, isWithin, todayIsoDay } from './date-text';
import { fieldClassName } from './field-class-name';
import type { FieldTone } from './field';

/**
 * #180 — an arbitrary from–to range, for log and analytics filters, which
 * `PeriodSwitcher` (one fixed period) and `DateField` (one day) cannot pick.
 *
 * **The trigger** is a field-family button (`fieldClassName`, `tone`) showing
 * the range in `Intl`'s own range format, in the document's language.
 * **The popover** is the glass `PopoverContent` with the presets beside one or
 * two months — two from the tablet edge up, one below it, and one whenever
 * `months={1}`. The months are `DateFieldGrid`'s `MonthGrid`, not a second
 * calendar; the neighbouring months' days are left blank, so two months side
 * by side never show one day twice.
 *
 * **Picking.** The first day picked is the start; the pointer, or the focused
 * day, previews the range; the second day picked is the end, and the range is
 * committed and the popover closes. A day before the start starts again from
 * there. Escape drops a pending start and keeps the popover open; with nothing
 * pending it is Radix's — the popover closes.
 *
 * **Keyboard** is the WAI-ARIA date grid's, one roving tab stop across both
 * months: arrows a day, PageUp/PageDown a month (Shift, a year), Home/End the
 * week's ends, Enter or Space picks. A polite live region says what happened.
 *
 * The value is a `Date` pair at local midnight; inside, a day is
 * `date-text.ts`'s `YYYY-MM-DD` (`date-range-picker-model.ts` converts).
 * Controlled when `value` is given, uncontrolled from `defaultValue` when not.
 */
export type DateRange = {
  /** Local midnight. */
  start: Date;
  /** Inclusive, local midnight. */
  end: Date;
};

export type DateRangePreset = {
  id: string;
  label: string;
  range: () => DateRange;
};

export interface DateRangePickerLabels {
  /** The trigger's text with no range. `placeholder` wins when both are given. */
  placeholder: string;
  /** The popover's accessible name. */
  dialog: string;
  /** The presets group's accessible name. */
  presets: string;
  today: string;
  last7Days: string;
  last30Days: string;
  thisMonth: string;
  /** The month arrows. Omitted → the month they go to, from `Intl`. */
  previousMonth?: string;
  nextMonth?: string;
  /** Announced when a start is picked, with the day's text. */
  startPicked: (day: string) => string;
  /** Announced when a range is committed, with the range's text. */
  rangeSelected: (range: string) => string;
  /** Announced when Escape drops a pending start. */
  cancelled: string;
}

const DEFAULT_LABELS: DateRangePickerLabels = {
  placeholder: 'Select dates',
  dialog: 'Choose a date range',
  presets: 'Presets',
  today: 'Today',
  last7Days: 'Last 7 days',
  last30Days: 'Last 30 days',
  thisMonth: 'This month',
  startPicked: (day) => `Start ${day}. Choose the end date.`,
  rangeSelected: (range) => `Selected ${range}.`,
  cancelled: 'Selection cancelled.',
};

export type DateRangePickerProps = {
  /** Given → controlled. Omitted → uncontrolled from `defaultValue`. */
  value?: DateRange | null;
  onValueChange: (value: DateRange | null) => void;
  defaultValue?: DateRange | null;
  /** Default: Today, Last 7 days, Last 30 days, This month. */
  presets?: DateRangePreset[];
  min?: Date;
  max?: Date;
  /** Default 2; one below the tablet edge whatever this says. */
  months?: 1 | 2;
  /** Default 1, Monday. */
  weekStartsOn?: 0 | 1;
  placeholder?: string;
  disabled?: boolean;
  /** The field tone, as on the sibling field primitives. */
  tone?: FieldTone;
  labels?: Partial<DateRangePickerLabels>;
  /** Styles the trigger. */
  className?: string;
};

export function DateRangePicker({
  value: valueProp,
  onValueChange,
  defaultValue = null,
  presets: presetsProp,
  min,
  max,
  months = 2,
  weekStartsOn = 1,
  placeholder,
  disabled,
  tone = 'surface',
  labels: labelsProp,
  className,
}: DateRangePickerProps) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp };
  const [own, setOwn] = useState<DateRange | null>(defaultValue);
  const value = valueProp === undefined ? own : valueProp;
  const [open, setOpen] = useState(false);
  // The start picked and not yet closed by an end. Here rather than in the
  // calendar because Escape is caught by Radix on the document, above it.
  const [pending, setPending] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const breakpoint = useBreakpoint();
  const count = months === 2 && breakpoint !== 'phone' ? 2 : 1;

  const locale = documentLocale();
  const minDay = min ? dayOf(min) : undefined;
  const maxDay = max ? dayOf(max) : undefined;
  const presets = presetsProp ?? defaultPresets(labels);
  const valueDays = value ? rangeDays(value) : null;
  const text = valueDays ? formatRangeText(valueDays[0], valueDays[1], locale) : null;

  function commit(next: DateRange) {
    const [start, end] = rangeDays(next);
    setPending(null);
    setOpen(false);
    setAnnouncement(labels.rangeSelected(formatRangeText(start, end, locale)));
    if (sameRange(next, value)) return;
    if (valueProp === undefined) setOwn(next);
    onValueChange(next);
  }

  function pick(day: string) {
    if (pending === null || day < pending) {
      setPending(day);
      setAnnouncement(labels.startPicked(formatRangeText(day, day, locale)));
    } else {
      commit(toRange(pending, day));
    }
  }

  return (
    <>
      <PopoverRoot
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          setPending(null);
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={fieldClassName(
              cn(
                'inline-flex h-(--size-field) items-center gap-2 px-3.5 text-left text-sm tabular-nums',
                className,
              ),
              tone,
            )}
          >
            <Calendar size={16} aria-hidden="true" className="text-ink-3 shrink-0" />
            <span className={cn('truncate', !text && 'text-ink-3')}>
              {text ?? placeholder ?? labels.placeholder}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          title={labels.dialog}
          hideTitle
          align="start"
          className="w-auto"
          // The calendar puts focus on its day itself.
          onOpenAutoFocus={(event) => event.preventDefault()}
          onEscapeKeyDown={(event) => {
            if (pending === null) return;
            event.preventDefault();
            setPending(null);
            setAnnouncement(labels.cancelled);
          }}
        >
          <div className="flex flex-col gap-3 tablet:flex-row">
            {/* biome-ignore lint/a11y/useSemanticElements: a row of action buttons, not form fields; a fieldset would add a legend contract */}
            <div
              role="group"
              aria-label={labels.presets}
              className="flex flex-wrap gap-1 tablet:w-36 tablet:flex-col tablet:flex-nowrap"
            >
              {presets.map((preset) => {
                const range = preset.range();
                const fits = rangeFits(range, minDay, maxDay);
                const current = sameRange(range, value);
                return (
                  <button
                    key={preset.id}
                    type="button"
                    aria-pressed={current}
                    disabled={!fits}
                    onClick={() => commit(range)}
                    className={cn(
                      'rounded-control px-2.5 py-1.5 text-left text-sm text-ink',
                      'transition-[background-color] duration-(--dur-fast)',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
                      'disabled:opacity-40',
                      current ? 'bg-accent-soft font-medium' : 'hover:bg-hover',
                    )}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
            <RangeCalendar
              count={count}
              value={valueDays}
              pending={pending}
              locale={locale}
              min={minDay}
              max={maxDay}
              weekStartsOn={weekStartsOn}
              previousMonthLabel={labels.previousMonth}
              nextMonthLabel={labels.nextMonth}
              onPick={pick}
            />
          </div>
        </PopoverContent>
      </PopoverRoot>
      <span aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </span>
    </>
  );
}

interface RangeCalendarProps {
  count: 1 | 2;
  value: [string, string] | null;
  pending: string | null;
  locale: string;
  min?: string;
  max?: string;
  weekStartsOn: 0 | 1;
  previousMonthLabel?: string;
  nextMonthLabel?: string;
  onPick: (day: string) => void;
}

/**
 * The months and the focus, mounted with the popover so each opening starts
 * from the range's start (or today) again.
 */
function RangeCalendar({
  count,
  value,
  pending,
  locale,
  min,
  max,
  weekStartsOn,
  previousMonthLabel,
  nextMonthLabel,
  onPick,
}: RangeCalendarProps) {
  const today = todayIsoDay();
  const [active, setActive] = useState(() => clampDay(value?.[0] ?? today, min, max));
  const [first, setFirst] = useState(() => active.slice(0, 7));
  const [hover, setHover] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  // As `DateFieldGrid`: focus follows the day on opening and on a key, not on
  // a month arrow.
  const focusActive = useRef(true);

  useEffect(() => {
    if (!focusActive.current) return;
    focusActive.current = false;
    rootRef.current?.querySelector<HTMLElement>(`[data-day="${active}"]`)?.focus();
  }, [active]);

  // A narrower viewport can drop the month the active day is in.
  const shown = windowFor(first, active, count);
  const shownMonths = Array.from({ length: count }, (_, index) =>
    addMonths(`${shown}-01`, index).slice(0, 7),
  );

  // The pending start reaches to the pointer, or else to the focused day; a
  // day before the start would start again, so it previews nothing.
  const reach = hover ?? active;
  const edges: [string, string] | null =
    pending !== null ? ordered(pending, reach < pending ? pending : reach) : value;

  function dayState(day: string): MonthGridDayState {
    if (!edges) return null;
    if (day === edges[0] || day === edges[1]) return 'chosen';
    return day > edges[0] && day < edges[1] ? 'between' : null;
  }

  function moveTo(day: string) {
    focusActive.current = true;
    setActive(day);
    setFirst(windowFor(shown, day, count));
  }

  function choose(day: string) {
    setActive(day);
    onPick(day);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTableElement>) {
    const moved = moveDay(event.key, active, event.shiftKey, weekStartsOn);
    if (moved) {
      event.preventDefault();
      setHover(null);
      moveTo(moved);
    } else if (event.key === 'Enter' || event.key === ' ') {
      // Prevented so the button's own synthesized click does not pick twice.
      event.preventDefault();
      if (isWithin(active, min, max)) choose(active);
    }
  }

  function step(amount: number) {
    setActive(addMonths(active, amount));
    setFirst(addMonths(`${shown}-01`, amount).slice(0, 7));
  }

  const firstTitle = formatMonthTitle(`${shownMonths[0]}-01`, locale);
  const lastMonth = shownMonths[count - 1] as string;
  const before = addMonths(`${shown}-01`, -1);
  const after = addMonths(`${lastMonth}-01`, 1);

  return (
    <div ref={rootRef} className="flex flex-col gap-2">
      <PeriodSwitcher
        label={
          count === 1
            ? firstTitle
            : `${firstTitle} – ${formatMonthTitle(`${lastMonth}-01`, locale)}`
        }
        onPrevious={() => step(-1)}
        onNext={() => step(1)}
        previousLabel={previousMonthLabel ?? formatMonthTitle(before, locale)}
        nextLabel={nextMonthLabel ?? formatMonthTitle(after, locale)}
      />
      <div className="flex gap-4">
        {shownMonths.map((month) => (
          <div key={month} className="flex flex-col gap-1">
            {count === 2 ? (
              <span aria-hidden="true" className="text-ink-2 text-center text-sm font-medium">
                {formatMonthTitle(`${month}-01`, locale)}
              </span>
            ) : null}
            <MonthGrid
              month={month}
              active={active}
              locale={locale}
              today={today}
              min={min}
              max={max}
              weekStartsOn={weekStartsOn}
              dayState={dayState}
              onPick={choose}
              onKeyDown={onKeyDown}
              onHover={setHover}
              showOutsideDays={false}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
