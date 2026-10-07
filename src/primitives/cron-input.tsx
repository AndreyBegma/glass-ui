import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

/**
 * #74 — CronInput: a 5-field cron expression with presets, a plain-language
 * description, the next runs in a time zone, and validation.
 *
 * Exported only from `glass-ui/cron-input`, never the barrel: the real
 * implementation imports the optional peers `cron-parser` and `cronstrue`, and
 * the barrel must not pull them in (D8).
 *
 * This file is the scaffold: the final prop types and a placeholder body, with
 * no import of either peer. i74-cron replaces the body.
 */
export type CronPreset = {
  label: string;
  /** The 5-field expression the preset sets. */
  expression: string;
};

export type CronInputChange = {
  expression: string;
  /** An invalid expression still fires `onChange`; the consumer decides (D9). */
  valid: boolean;
};

export type CronInputProps = {
  value: string;
  onChange: (v: CronInputChange) => void;
  /** An IANA zone. Defaults to the browser's. */
  timezone?: string;
  /** `false` hides the preset select. */
  presets?: CronPreset[] | false;
  /** How many upcoming runs to list. Default 5. */
  nextRuns?: number;
  label: string;
  description?: ReactNode;
  disabled?: boolean;
  className?: string;
};

export function CronInput({ value, label, disabled, className }: CronInputProps) {
  return (
    <div data-cron-input-scaffold className={cn('flex flex-col gap-2', className)}>
      <label className="text-sm text-ink-2">
        {label}
        <input readOnly value={value} disabled={disabled} className="block" />
      </label>
    </div>
  );
}
