import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';
import { Input } from './field';

/**
 * FEAT-20260902-004 — `Input`, with the type set. No custom widget.
 *
 * Eight date/time sites in the gap document's tally. The browser's native
 * date picker is what a keyboard and a screen reader both already understand
 * — the same argument `Slider` makes for `type="range"` — so this fixes
 * `type="date"` and leaves everything else, `Input`'s border, radius and
 * focus ring included, exactly as it is.
 *
 * #93 — the parts the browser draws inside the field are brought in line
 * with it. The digits are `tabular-nums`, so a column of dates lines up and
 * a segment does not shift as it is typed over. The picker glyph sits at
 * the `ink-3` weight of `Select`'s caret and lifts to full ink under the
 * pointer, instead of the platform's full-strength black or white. The edit
 * box loses the padding Chromium adds, so the text sits where `Input`'s
 * does. It is deliberately not `min-w-0`: a native date input already clips
 * its value once its box is narrower than the value (a `datetime-local` in
 * a 160 px track shows "09:"), and `min-w-0` would let a grid track squeeze
 * it further. Give it a track wide enough for its value. Firefox and
 * Safari draw no such pseudo-elements and are left alone; the
 * picker's colours already follow `color-scheme`, which the theme sets.
 */
const NATIVE_PARTS = [
  'tabular-nums',
  '[&::-webkit-datetime-edit]:p-0',
  '[&::-webkit-datetime-edit-fields-wrapper]:p-0',
  '[&::-webkit-calendar-picker-indicator]:cursor-pointer',
  '[&::-webkit-calendar-picker-indicator]:rounded-sm',
  '[&::-webkit-calendar-picker-indicator]:opacity-55',
  '[&::-webkit-calendar-picker-indicator]:transition-opacity',
  'hover:[&::-webkit-calendar-picker-indicator]:opacity-100',
].join(' ');

type DateInputProps = Omit<ComponentProps<typeof Input>, 'type'> & {
  /** `date` covers most sites; `time` and `datetime-local` are the same field. */
  type?: 'date' | 'time' | 'datetime-local';
};

export function DateInput({ type = 'date', className, ...props }: DateInputProps) {
  return <Input type={type} className={cn(NATIVE_PARTS, className)} {...props} />;
}
