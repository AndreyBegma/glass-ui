'use client';

import { cn } from '../lib/cn';
import type { FieldTone } from './field';

/**
 * v0.38.0 wave, TagInput. Scaffold stub: the final prop types and a
 * placeholder box. Commit, paste, validation and suggestions are its slot's.
 */
export type TagInputLabels = Record<string, string>;

export type TagInputProps = {
  value: string[];
  onValueChange: (value: string[]) => void;
  defaultValue?: string[];
  placeholder?: string;
  /** Default `[',', 'Enter']`. */
  separators?: string[];
  /** A message when the tag is invalid, otherwise `null`. */
  validate?: (tag: string) => string | null;
  suggestions?: string[];
  max?: number;
  allowDuplicates?: boolean;
  disabled?: boolean;
  tone?: FieldTone;
  labels?: Partial<TagInputLabels>;
  className?: string;
};

export function TagInput({ value, placeholder, className }: TagInputProps) {
  return (
    <div className={cn(className)}>
      {value.join(' ')}
      {placeholder}
    </div>
  );
}
