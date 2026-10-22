'use client';

import { cn } from '../lib/cn';

/**
 * v0.38.0 wave, ColorPicker. Scaffold stub: the final prop types and a
 * placeholder box. The colour maths is hand-rolled in its slot, with no
 * dependency.
 */
export type ColorPickerLabels = Record<string, string>;

export type ColorPickerProps = {
  /** A hex colour or an `oklch(...)` string. */
  value: string;
  onValueChange: (value: string) => void;
  defaultValue?: string;
  format?: 'hex' | 'oklch';
  swatches?: string[];
  alpha?: boolean;
  trigger?: 'swatch' | 'field';
  disabled?: boolean;
  labels?: Partial<ColorPickerLabels>;
  className?: string;
};

export function ColorPicker({ value, className }: ColorPickerProps) {
  return <div className={cn('font-mono', className)}>{value}</div>;
}
