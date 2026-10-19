'use client';

import { cn } from '../lib/cn';
import { Input } from './field';
import { formatTime, type HourCycle, isHhMm, parseTimeText, resolveHourCycle, stepTime } from './time-text';
import { useDraftText } from './use-draft-text';

/**
 * FEAT-20261013-006 (W242, `Q3917`) — a time on the interface's clock.
 *
 * `<input type="time">` in Chromium uses the browser's clock, so a Russian
 * interface got a twelve-hour field. This is a text input that speaks the
 * native input's contract — `HH:MM` on a 24-hour clock, or `''` — and shows
 * the time on `hourCycle`, which defaults to the locale's own: `14:30` in ru
 * and uk, `2:30 PM` in en.
 *
 * Typing is forgiving and read on blur or Enter (`time-text.ts` has the
 * list); text that is not a time stays with `aria-invalid` and calls nothing.
 * ArrowUp and ArrowDown move by `step` minutes and wrap at midnight.
 */
export interface TimeFieldProps {
  /** `HH:MM` (24-hour) or `''`. */
  value: string;
  onValueChange: (value: string) => void;
  locale: string;
  /** Default: the locale's own, from `Intl`. */
  hourCycle?: HourCycle;
  /** Minutes, for ArrowUp and ArrowDown. Default 15. */
  step?: number;
  id?: string;
  name?: string;
  disabled?: boolean;
  required?: boolean;
  'aria-label'?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  className?: string;
}

export function TimeField({
  value,
  onValueChange,
  locale,
  hourCycle,
  step = 15,
  'aria-invalid': ariaInvalid,
  className,
  ...inputProps
}: TimeFieldProps) {
  const cycle = hourCycle ?? resolveHourCycle(locale);
  const parse = (text: string) => parseTimeText(text, locale, cycle);
  const draft = useDraftText(value, parse, onValueChange);

  const shown = draft.draft ?? (isHhMm(value) ? formatTime(value, locale, cycle) : value);

  function stepBy(minutes: number) {
    const typed = draft.draft === null ? null : parse(draft.draft);
    const from = typed || (isHhMm(value) ? value : '00:00');
    draft.reset();
    onValueChange(stepTime(from, minutes));
  }

  return (
    <Input
      {...inputProps}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={shown}
      aria-invalid={ariaInvalid || draft.invalid || undefined}
      onChange={(event) => draft.edit(event.target.value)}
      onBlur={draft.commit}
      onKeyDown={(event) => {
        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
          event.preventDefault();
          stepBy(event.key === 'ArrowUp' ? step : -step);
        } else if (event.key === 'Enter' && draft.draft !== null) {
          event.preventDefault();
          draft.commit();
        }
      }}
      className={cn('w-24', className)}
    />
  );
}
