'use client';

import { useId } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../lib/cn';

/**
 * FEAT-20260902-004 — the group, and native roving for free.
 *
 * A native `<input type="radio">` sharing one `name` already moves focus and
 * selection with the arrow keys — the browser has done this since radio
 * inputs existed, the same reason `Slider` is a real `<input type="range">`
 * rather than a hand-built track. `RadioGroup` supplies the `role` and the
 * group's accessible name; the roving needs nothing reimplemented.
 *
 * `name` is not threaded through context: each `Radio` takes its own `name`,
 * exactly as plain HTML radios do, which is one prop repeated rather than a
 * context provider for three lines of DOM.
 */
interface RadioGroupProps {
  label?: string;
  children: ReactNode;
  className?: string;
}

export function RadioGroup({ label, children, className }: RadioGroupProps) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('flex flex-col gap-2', className)}>
      {children}
    </div>
  );
}

/**
 * Same carve-out as `Checkbox`: `base.css` turns the global focus ring off
 * for every `input`, and `tokens.spec.ts` reserves the literal
 * `ring-white/22` for `field.tsx` alone, so this uses the token-built
 * `ring-ink/35` instead.
 */
type RadioProps = Omit<ComponentProps<'input'>, 'type' | 'className'> & {
  className?: string;
  label: string;
  hint?: string;
};

export function Radio({ label, hint, id, className, ...props }: RadioProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className="flex items-start gap-2.5">
      <span className="relative mt-0.5 inline-flex size-4 shrink-0">
        <input
          id={inputId}
          type="radio"
          className={cn(
            'peer size-4 shrink-0 appearance-none rounded-full border border-line-strong bg-surface',
            'checked:border-ink',
            'transition-colors duration-(--dur-fast)',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 focus-visible:ring-offset-2 focus-visible:ring-offset-ground',
            'disabled:cursor-not-allowed disabled:opacity-40',
            className,
          )}
          {...props}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-1 rounded-full bg-ink opacity-0 transition-opacity duration-(--dur-fast) peer-checked:opacity-100"
        />
      </span>
      <label htmlFor={inputId} className="flex flex-col gap-0.5 text-sm text-ink">
        {label}
        {hint ? <span className="text-xs text-ink-3">{hint}</span> : null}
      </label>
    </div>
  );
}
