'use client';

import { Calendar } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../lib/cn';
import { PopoverAnchor, PopoverContent, PopoverRoot, PopoverTrigger } from '../patterns/popover';
import { Button } from './button';
import { DateFieldGrid } from './date-field-grid';
import {
  datePlaceholder,
  formatLongDay,
  formatNumericDay,
  isIsoDay,
  isWithin,
  parseDayText,
  todayIsoDay,
} from './date-text';
import { Input } from './field';
import { useDraftText } from './use-draft-text';

/**
 * FEAT-20261013-006 (W242, `Q3916`) — a date in the interface's language.
 *
 * `<input type="date">` is drawn by Chromium in the browser's language whatever
 * `lang` says (`DateInput`'s note), so a Russian interface asked for
 * `10/13/2026`. This field speaks the native input's contract — `value` and
 * `onValueChange` carry `YYYY-MM-DD` or `''` — so a call site swaps without
 * touching its logic, and draws everything else from `Intl` in `locale`.
 *
 * **At rest** it reads `вт, 13 окт.` (the year only when it is not this one).
 * **Focused**, the same day in the locale's numbers, `13.10.2026`, to edit.
 * Typed text is read on blur or Enter (`date-text.ts` has the rules); text
 * that is not a day, or is outside `min`/`max`, stays with `aria-invalid` and
 * calls nothing. The calendar button opens the month grid
 * (`date-field-grid.tsx`).
 *
 * Height, radius and focus ring are `Input`'s. `inputMode="decimal"` because a
 * phone's decimal pad has a separator and the parser takes any separator.
 */
export interface DateFieldProps {
  /** `YYYY-MM-DD` or `''` — the native input's contract. */
  value: string;
  onValueChange: (value: string) => void;
  /** BCP 47: `uk`, `ru`, `en` in Denitsa. */
  locale: string;
  /** `YYYY-MM-DD`. */
  min?: string;
  /** `YYYY-MM-DD`. */
  max?: string;
  id?: string;
  name?: string;
  disabled?: boolean;
  required?: boolean;
  'aria-label'?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  /** `aria-label` of the calendar button, and the popover's name ("Choose a date"). */
  calendarLabel: string;
  /** Default 1, Monday. */
  weekStartsOn?: 0 | 1;
  /** The grid's month arrows. Omitted → the month they go to, from `Intl` ("September 2026"). */
  previousMonthLabel?: string;
  nextMonthLabel?: string;
  /** Styles the wrapper, as `SearchField`: what a caller means here is its width. */
  className?: string;
}

export function DateField({
  value,
  onValueChange,
  locale,
  min,
  max,
  disabled,
  'aria-invalid': ariaInvalid,
  calendarLabel,
  weekStartsOn = 1,
  previousMonthLabel,
  nextMonthLabel,
  className,
  ...inputProps
}: DateFieldProps) {
  const [focused, setFocused] = useState(false);
  const [open, setOpen] = useState(false);
  const today = todayIsoDay();

  const draft = useDraftText(
    value,
    (text) => {
      const day = parseDayText(text, locale, today);
      return day && !isWithin(day, min, max) ? null : day;
    },
    onValueChange,
  );

  const shown =
    draft.draft ??
    (!isIsoDay(value)
      ? value
      : focused
        ? formatNumericDay(value, locale)
        : formatLongDay(value, locale, today));

  return (
    <PopoverRoot open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className={cn('relative flex items-center', className)}>
          <Input
            {...inputProps}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={shown}
            placeholder={datePlaceholder(locale)}
            disabled={disabled}
            aria-invalid={ariaInvalid || draft.invalid || undefined}
            onChange={(event) => draft.edit(event.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setFocused(false);
              draft.commit();
            }}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' || draft.draft === null) return;
              // Enter on typed text commits it; it does not also submit the form.
              event.preventDefault();
              draft.commit();
            }}
            className="pr-11"
          />
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              icon
              aria-label={calendarLabel}
              disabled={disabled}
              className="absolute right-1"
            >
              <Calendar size={16} aria-hidden="true" />
            </Button>
          </PopoverTrigger>
        </div>
      </PopoverAnchor>
      <PopoverContent
        title={calendarLabel}
        hideTitle
        align="end"
        className="w-auto"
        // The grid puts focus on its day itself; Radix's default would put it
        // on the first month arrow.
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <DateFieldGrid
          value={value}
          locale={locale}
          today={today}
          min={min}
          max={max}
          weekStartsOn={weekStartsOn}
          previousMonthLabel={previousMonthLabel}
          nextMonthLabel={nextMonthLabel}
          onPick={(day) => {
            draft.reset();
            setOpen(false);
            if (day !== value) onValueChange(day);
          }}
        />
      </PopoverContent>
    </PopoverRoot>
  );
}
