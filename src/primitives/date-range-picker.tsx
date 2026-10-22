'use client';

import { cn } from '../lib/cn';
import type { FieldTone } from './field';

/**
 * v0.38.0 wave, DateRangePicker. Scaffold stub: the final prop types and a
 * placeholder box. The calendar, presets and field are its slot's.
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

export type DateRangePickerLabels = Record<string, string>;

export type DateRangePickerProps = {
  value: DateRange | null;
  onValueChange: (value: DateRange | null) => void;
  defaultValue?: DateRange | null;
  /** Default: Today, Last 7 days, Last 30 days, This month. */
  presets?: DateRangePreset[];
  min?: Date;
  max?: Date;
  months?: 1 | 2;
  weekStartsOn?: 0 | 1;
  placeholder?: string;
  disabled?: boolean;
  /** The field tone, as on the sibling field primitives. */
  tone?: FieldTone;
  labels?: Partial<DateRangePickerLabels>;
  className?: string;
};

export function DateRangePicker({
  placeholder,
  className,
}: DateRangePickerProps) {
  return <div className={cn(className)}>{placeholder}</div>;
}
