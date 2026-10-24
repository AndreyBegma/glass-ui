'use client';

import {
  type CSSProperties,
  type KeyboardEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { cn } from '../lib/cn';
import type { Hue } from '../lib/hue';
import {
  buildGrid,
  clampLevels,
  dayOf,
  defaultStart,
  type HeatmapDay,
  type HeatmapKey,
  localDate,
  neighbour,
} from './activity-heatmap-model';
import { ActivityHeatmapTable } from './activity-heatmap-table';

/**
 * #186 — ActivityHeatmap: a calendar of activity, a week to a column and a
 * weekday to a row, for a fleet's or a history's page. A solid surface, never
 * glass; only the readout wears the popover material.
 *
 * The maths lives in `activity-heatmap-model.ts` (dates, the week grid, the
 * levels, the arrow-key moves) and the table in `activity-heatmap-table.tsx`.
 * This file measures nothing: every position is a cell count, so the tooltip
 * is placed from the day's column and row.
 *
 * Levels. `levels` counts the empty one: 5 is the hairline plus four shades.
 * The shades are quantiles of the *non-zero* values, so one outlier does not
 * flatten the rest; they are the accent (or `tone`'s hue) at stepped opacity.
 * Colour is never the only signal: every day has a name that carries its
 * value, the readout prints it, and the table lists them.
 *
 * Accessibility. The WAI-ARIA grid pattern: `grid` > `row` (a weekday) >
 * `gridcell` (a day), named "3 runs on 12 October 2026" — the unit is
 * `formatValue`'s. One tab stop, the day last focused (else the newest);
 * ←/→ move a week, ↑/↓ a day, Home/End to the ends of the row, Ctrl+Home/End
 * to the first and last day, Enter or Space to `onDayClick`, Escape to hide
 * the readout. Focus shows what hover shows. Nothing moves under reduced
 * motion: the only transition is `motion-safe:`.
 */

export type ActivityHeatmapDatum = {
  /** `YYYY-MM-DD`. */
  date: string;
  value: number;
};

/** Every visible string, so the consumer's language is the consumer's. */
export type ActivityHeatmapLabels = {
  /** The grid's name. */
  grid: string;
  less: string;
  more: string;
  /** A day's name: its formatted value, then its date. */
  day: (value: string, date: string) => string;
  /** The name of a day with no activity. */
  none: (date: string) => string;
  /** A date, as prose: "12 October 2026". */
  date: (date: Date) => string;
  /** A month above the grid. */
  month: (month: number) => string;
  /** A weekday beside the grid; 0 is Sunday. */
  weekday: (weekday: number) => string;
  /** The grid's summary, after its name. */
  summary: (activeDays: number) => string;
  tableDate: string;
  tableValue: string;
  tableEmpty: string;
};

export type ActivityHeatmapProps = {
  data: ActivityHeatmapDatum[];
  /** Default: 52 weeks before `end`. */
  start?: Date;
  /** Default: today. */
  end?: Date;
  weekStartsOn?: 0 | 1;
  /** The empty level counts: 5 is the hairline and four shades. Default 5. */
  levels?: number;
  /** An identity hue (#109) instead of the accent. */
  tone?: Hue;
  onDayClick?: (day: ActivityHeatmapDatum) => void;
  formatValue?: (value: number) => string;
  labels?: Partial<ActivityHeatmapLabels>;
  className?: string;
};

const LONG_DATE = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const SHORT_MONTH = new Intl.DateTimeFormat('en-GB', { month: 'short' });
const SHORT_WEEKDAY = new Intl.DateTimeFormat('en-GB', { weekday: 'short' });
const COMPACT = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });

const DEFAULT_LABELS: ActivityHeatmapLabels = {
  grid: 'Activity',
  less: 'Less',
  more: 'More',
  day: (value, date) => `${value} on ${date}`,
  none: (date) => `No activity on ${date}`,
  date: (date) => LONG_DATE.format(date),
  month: (month) => SHORT_MONTH.format(new Date(2001, month, 1)),
  weekday: (weekday) => SHORT_WEEKDAY.format(new Date(2001, 0, 7 + weekday)),
  summary: (activeDays) => `${activeDays} ${activeDays === 1 ? 'day' : 'days'} with activity`,
  tableDate: 'Date',
  tableValue: 'Activity',
  tableEmpty: 'No activity',
};

const defaultFormat = (value: number) => COMPACT.format(value);

/** Cell and gap, in px; the side labels' column and the month labels' row. */
const CELL = 12;
const GAP = 3;
const SIDE = 30;
const TOP = 16;

const ARROWS: readonly string[] = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];

/**
 * The accent, or the hue, at a stepped opacity — a token, never a colour. The
 * level count is the consumer's, so the step is a custom property that the one
 * `HEAT` class reads, rather than a class per step.
 */
const HEAT = 'bg-[color-mix(in_oklab,var(--heat-base)_var(--heat-pct),transparent)]';

function shade(level: number, levels: number, tone: Hue | undefined): CSSProperties | undefined {
  if (level === 0) return undefined;
  const pct = levels <= 2 ? 100 : Math.round(25 + (75 * (level - 1)) / (levels - 2));
  return {
    '--heat-base': tone ? `var(--color-hue-${tone})` : 'var(--color-accent)',
    '--heat-pct': `${pct}%`,
  } as CSSProperties;
}

export function ActivityHeatmap({
  data,
  start,
  end,
  weekStartsOn = 0,
  levels: levelsProp = 5,
  tone,
  onDayClick,
  formatValue = defaultFormat,
  labels: labelOverrides,
  className,
}: ActivityHeatmapProps) {
  const labels = { ...DEFAULT_LABELS, ...labelOverrides };
  const id = useId();
  const tableId = `${id}-table`;
  const levels = clampLevels(levelsProp);
  const scrollRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef(new Map<string, HTMLElement>());
  const [current, setCurrent] = useState<string | null>(null);
  const [active, setActive] = useState<string | null>(null);

  const endMs = dayOf(end ?? new Date());
  const startMs = start ? dayOf(start) : defaultStart(endMs);
  const grid = useMemo(
    () => buildGrid(data, startMs, endMs, weekStartsOn, levels),
    [data, startMs, endMs, weekStartsOn, levels],
  );

  // The newest week is the one that matters: a narrow box opens on it.
  // biome-ignore lint/correctness/useExhaustiveDependencies: scrolls again when the range changes, not when the data does
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [grid.weeks]);

  const byDate = useMemo(() => new Map(grid.days.map((d) => [d.date, d])), [grid.days]);
  const stop = current !== null && byDate.has(current) ? current : (grid.days.at(-1)?.date ?? null);
  const hovered = active !== null ? (byDate.get(active) ?? null) : null;

  const dateText = (d: HeatmapDay) => labels.date(localDate(d.ms));
  const nameOf = (d: HeatmapDay) =>
    d.value > 0 ? labels.day(formatValue(d.value), dateText(d)) : labels.none(dateText(d));
  const datum = (d: HeatmapDay): ActivityHeatmapDatum => ({ date: d.date, value: d.value });

  const onKeyDown = (e: KeyboardEvent<HTMLElement>, from: HeatmapDay) => {
    if (e.key === 'Escape') {
      setActive(null);
      return;
    }
    if ((e.key === 'Enter' || e.key === ' ') && onDayClick) {
      e.preventDefault();
      onDayClick(datum(from));
      return;
    }
    if (!ARROWS.includes(e.key)) return;
    e.preventDefault();
    const to = neighbour(grid.days, from, e.key as HeatmapKey, e.ctrlKey || e.metaKey);
    if (to) cellRefs.current.get(to.date)?.focus();
  };

  const rows = Array.from({ length: 7 }, (_, row) => grid.days.filter((d) => d.row === row));
  const weekdayAt = (row: number) => (weekStartsOn + row) % 7;

  const tooltip = (() => {
    if (!hovered) return null;
    const below = hovered.row < 3;
    const x = SIDE + GAP + hovered.col * (CELL + GAP);
    const y = TOP + GAP + hovered.row * (CELL + GAP);
    const edge = hovered.col < 4 ? 'start' : hovered.col > grid.weeks - 5 ? 'end' : 'middle';
    return (
      <div
        aria-hidden
        data-activity-heatmap-tooltip
        style={{
          left: edge === 'end' ? x + CELL : edge === 'start' ? x : x + CELL / 2,
          top: below ? y + CELL + 4 : y - 4,
        }}
        className={cn(
          'glass-strong pointer-events-none absolute z-overlay whitespace-nowrap rounded-control px-2.5 py-1.5 text-ink text-xs',
          below ? 'translate-y-0' : '-translate-y-full',
          edge === 'end' ? '-translate-x-full' : edge === 'middle' ? '-translate-x-1/2' : undefined,
        )}
      >
        {hovered.value > 0 ? (
          <>
            <span className="font-medium tabular-nums">{formatValue(hovered.value)}</span>
            <span className="ml-2 text-ink-3">{dateText(hovered)}</span>
          </>
        ) : (
          labels.none(dateText(hovered))
        )}
      </div>
    );
  })();

  return (
    <div
      data-activity-heatmap
      className={cn('w-full rounded-(--radius-surface) bg-surface p-3 text-ink', className)}
    >
      <div ref={scrollRef} className="overflow-x-auto">
        <div className="relative w-max">
          {/* biome-ignore lint/a11y/useSemanticElements: the APG grid on a CSS grid — weeks are columns, so a `table` (rows in DOM order) cannot place the cells */}
          <div
            role="grid"
            aria-label={`${labels.grid}. ${labels.summary(grid.active)}`}
            className="grid"
            style={{
              gap: GAP,
              gridTemplateColumns: `${SIDE}px repeat(${grid.weeks}, ${CELL}px)`,
              gridTemplateRows: `${TOP}px repeat(7, ${CELL}px)`,
            }}
            onPointerLeave={() => setActive(null)}
          >
            {grid.months.map((m) => (
              <div
                key={m.col}
                aria-hidden
                data-activity-heatmap-month={m.month}
                style={{ gridRow: 1, gridColumn: `${m.col + 2} / span 4` }}
                className="whitespace-nowrap text-[10px] text-ink-3 leading-none"
              >
                {labels.month(m.month)}
              </div>
            ))}
            {[1, 3, 5].map((row) => (
              <div
                key={row}
                aria-hidden
                data-activity-heatmap-weekday={weekdayAt(row)}
                style={{ gridRow: row + 2, gridColumn: 1 }}
                className="flex items-center text-[10px] text-ink-3 leading-none"
              >
                {labels.weekday(weekdayAt(row))}
              </div>
            ))}

            {rows.map((row, r) => (
              // biome-ignore lint/a11y/useSemanticElements: a `tr` cannot be `display: contents` inside a CSS grid without losing its role in some browsers
              // biome-ignore lint/a11y/useFocusableInteractive: a row is not a tab stop — the one stop is a gridcell (APG grid, roving)
              <div key={weekdayAt(r)} role="row" className="contents">
                {row.map((d) => (
                  // biome-ignore lint/a11y/useSemanticElements: a `td` outside a `table` has no role; the cell is placed by CSS grid
                  <div
                    key={d.date}
                    role="gridcell"
                    ref={(el) => {
                      if (el) cellRefs.current.set(d.date, el);
                      else cellRefs.current.delete(d.date);
                    }}
                    aria-label={nameOf(d)}
                    data-date={d.date}
                    data-level={d.level}
                    data-col={d.col}
                    data-row={d.row}
                    tabIndex={d.date === stop ? 0 : -1}
                    style={{ gridRow: d.row + 2, gridColumn: d.col + 2, ...shade(d.level, levels, tone) }}
                    className={cn(
                      'rounded-[3px] motion-safe:transition-opacity motion-safe:duration-150',
                      d.level === 0 ? 'bg-line' : HEAT,
                      onDayClick && 'cursor-pointer hover:opacity-80',
                    )}
                    onPointerEnter={() => setActive(d.date)}
                    onFocus={() => {
                      setCurrent(d.date);
                      setActive(d.date);
                    }}
                    onBlur={() => setActive(null)}
                    onClick={onDayClick ? () => onDayClick(datum(d)) : undefined}
                    onKeyDown={(e) => onKeyDown(e, d)}
                  />
                ))}
              </div>
            ))}
          </div>
          {tooltip}
        </div>
      </div>

      <div
        aria-hidden
        data-activity-heatmap-legend
        className="mt-2 flex items-center justify-end gap-1.5 text-[10px] text-ink-3 leading-none"
      >
        <span>{labels.less}</span>
        {Array.from({ length: levels }, (_, level) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: a fixed ramp, the index is the level
            key={level}
            data-level={level}
            style={shade(level, levels, tone)}
            className={cn('size-3 rounded-[3px]', level === 0 ? 'bg-line' : HEAT)}
          />
        ))}
        <span>{labels.more}</span>
      </div>

      <ActivityHeatmapTable
        id={tableId}
        label={labels.grid}
        days={grid.days}
        headers={{ date: labels.tableDate, value: labels.tableValue }}
        empty={labels.tableEmpty}
        formatDate={dateText}
        formatValue={formatValue}
      />
    </div>
  );
}
