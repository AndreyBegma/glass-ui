import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';

/**
 * FEAT-20260902-004 — a readout, not an input.
 *
 * `settings/usage/page.tsx:119-134` already draws a real `role="progressbar"`
 * by hand; `ideas/potential-bar.tsx` draws the same idea in `█░` characters.
 * `Slider` looks similar but reports a value the user sets — this reports one
 * the system computed, so it takes no `onChange` and is not focusable.
 *
 * `label` is required and is the human-unit text ("12 of 40 GB", "6 of 8
 * habits") — turning `value`/`max` into a percentage is copy, and copy is the
 * consumer's, per this package's own rule against a primitive guessing at
 * product language.
 */
type ProgressProps = Omit<ComponentProps<'div'>, 'className' | 'children'> & {
  className?: string;
  value: number;
  max?: number;
  label: string;
  hint?: string;
};

export function Progress({ value, max = 100, label, hint, className, ...props }: ProgressProps) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-ink-2">{label}</span>
        {hint ? <span className="text-ink-3">{hint}</span> : null}
      </div>
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
        className="h-1.5 w-full overflow-hidden rounded-full bg-hover"
        {...props}
      >
        <div
          className="h-full rounded-full bg-ink transition-[width] duration-(--dur-base)"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
