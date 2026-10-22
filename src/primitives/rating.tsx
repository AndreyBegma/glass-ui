'use client';

import type { LucideIcon } from 'lucide-react';
import { cn } from '../lib/cn';

/**
 * v0.38.0 wave, Rating. Scaffold stub: the final prop types and a placeholder
 * group. The stars, half values and hover preview are its slot's.
 */
export type RatingLabels = Record<string, string>;

export type RatingProps = {
  value?: number;
  onValueChange?: (value: number) => void;
  defaultValue?: number;
  /** Default 5. */
  max?: number;
  allowHalf?: boolean;
  readOnly?: boolean;
  icon?: LucideIcon;
  size?: 'sm' | 'md' | 'lg';
  /** The control's accessible name. */
  label: string;
  labels?: Partial<RatingLabels>;
  className?: string;
};

export function Rating({ label, className }: RatingProps) {
  return <fieldset aria-label={label} className={cn(className)} />;
}
