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
 *
 * FEAT-20260930-004 (SYS-19) — `locale` sets `lang` on the input, which is
 * what Firefox and Safari read to order the day, month and year in the field
 * and to name the months in their picker. Chromium does not: it draws the
 * field and the picker in the browser's own UI language whatever `lang` says.
 * That gap is accepted (`Q503`) rather than papered over with a custom widget;
 * the README says so. An explicit `lang` still wins over `locale`.
 */
type DateInputProps = Omit<ComponentProps<typeof Input>, 'type'> & {
  /** `date` covers most sites; `time` and `datetime-local` are the same field. */
  type?: 'date' | 'time' | 'datetime-local';
  /** The interface locale, a BCP 47 tag (`ru`, `uk`, `en-GB`). Sets `lang`. */
  locale?: string;
};

export function DateInput({
  type = 'date',
  locale,
  lang,
  ...props
}: DateInputProps) {
  return <Input type={type} lang={lang ?? locale} {...props} />;
}
