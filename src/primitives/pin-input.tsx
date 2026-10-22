'use client';

import { cn } from '../lib/cn';
import type { FieldTone } from './field';

/**
 * v0.38.0 wave, PinInput. Scaffold stub: the final prop types and a
 * placeholder group. The cells, paste and `onComplete` are its slot's.
 */
export type PinInputLabels = Record<string, string>;

export type PinInputProps = {
  /** Default 6. */
  length?: number;
  value: string;
  onValueChange: (value: string) => void;
  /** Called once, when the value reaches `length`. */
  onComplete?: (value: string) => void;
  type?: 'numeric' | 'alphanumeric';
  mask?: boolean;
  disabled?: boolean;
  tone?: FieldTone;
  /** The group's accessible name. */
  label: string;
  labels?: Partial<PinInputLabels>;
  className?: string;
};

export function PinInput({ label, className }: PinInputProps) {
  return <fieldset aria-label={label} className={cn(className)} />;
}
