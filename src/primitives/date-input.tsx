import type { ComponentProps } from 'react';
import { Input } from './field';

/**
 * FEAT-20260902-004 — `Input`, with the type set. No custom widget.
 *
 * Eight date/time sites in the gap document's tally. The browser's native
 * date picker is what a keyboard and a screen reader both already understand
 * — the same argument `Slider` makes for `type="range"` — so this fixes
 * `type="date"` and leaves everything else, `Input`'s border, radius and
 * focus ring included, exactly as it is.
 */
type DateInputProps = Omit<ComponentProps<typeof Input>, 'type'> & {
  /** `date` covers most sites; `time` and `datetime-local` are the same field. */
  type?: 'date' | 'time' | 'datetime-local';
};

export function DateInput({ type = 'date', ...props }: DateInputProps) {
  return <Input type={type} {...props} />;
}
