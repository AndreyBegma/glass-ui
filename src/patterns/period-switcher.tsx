import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '../primitives/button';

/**
 * FEAT-20261013-005 (W241) — `‹ label › Today`, the one period picker.
 *
 * The calendar's go-to-date, the review's week control, the budget's month
 * switcher and Reflection's mood arrows were each drawn by hand, four ways of
 * saying "previous week, next week". **No date logic lives here**: the caller
 * owns what a period is, formats it into `label`, and moves it in `onPrevious`
 * and `onNext`. The strings are the caller's too — the package has no
 * catalogue.
 *
 * The label is `aria-live="polite"`, so a screen reader hears the new period
 * after an arrow is pressed. `headingLevel` makes it a heading where the
 * period titles the page or a section; the default is a `<span>`. Each icon
 * button keeps `Button`'s 44px touch target.
 */
export interface PeriodSwitcherProps {
  /** The shown period, formatted by the caller: "12–18 October 2026". */
  label: ReactNode;
  onPrevious: () => void;
  onNext: () => void;
  /** `aria-label` of the ‹ button, from the caller's catalogue. */
  previousLabel: string;
  /** `aria-label` of the › button. */
  nextLabel: string;
  /** Omitted → no Today button. */
  onToday?: () => void;
  /** The visible word of the Today button; required when `onToday` is given. */
  todayLabel?: string;
  /** The shown period contains today → Today is disabled. */
  isCurrent?: boolean;
  /** The label as a heading. Default `null`: a `<span>`. */
  headingLevel?: 2 | 3 | null;
}

export function PeriodSwitcher({
  label,
  onPrevious,
  onNext,
  previousLabel,
  nextLabel,
  onToday,
  todayLabel,
  isCurrent = false,
  headingLevel = null,
}: PeriodSwitcherProps) {
  const Label = headingLevel === null ? 'span' : (`h${headingLevel}` as const);
  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" icon aria-label={previousLabel} onClick={onPrevious}>
        <ChevronLeft size={16} aria-hidden="true" />
      </Button>
      <Label aria-live="polite" className="text-base font-semibold tabular-nums">
        {label}
      </Label>
      <Button variant="ghost" icon aria-label={nextLabel} onClick={onNext}>
        <ChevronRight size={16} aria-hidden="true" />
      </Button>
      {onToday ? (
        <Button variant="ghost" size="sm" disabled={isCurrent} onClick={onToday}>
          {todayLabel}
        </Button>
      ) : null}
    </div>
  );
}
