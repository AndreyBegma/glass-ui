'use client';

import { Check, Minus } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';
import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';

/**
 * FEAT-20260902-004 — a real control, styled.
 *
 * `ideas/page.tsx:182`, `habit-strip.tsx:188-199` and `task-list.tsx`'s
 * Complete/Reopen button (a checkbox in a button's clothing) are the named
 * sites. A real `<input type="checkbox">` rather than a `div`-and-`onClick`
 * fake, so the platform's own semantics — Space to toggle, the accessible
 * `checked` state — need nothing reimplemented.
 *
 * `indeterminate` has no HTML attribute; a browser only reads it as a DOM
 * property set on the element itself, which is why this needs a ref and an
 * effect rather than a prop passed straight through to JSX.
 *
 * `base.css` turns the global focus ring off for every `input` — it is the
 * carve-out `field.tsx` already relies on for the same reason. This control
 * needs the same carve-out, but `tokens.spec.ts` only allows `field.tsx`
 * itself to spell `ring-white/22` literally; a second file writing that
 * string fails the raw-colour gate. `ring-ink/35` is the token-built
 * equivalent — `--color-ink` is itself near-white, so the ring reads the same
 * on the dark ground this package ships today.
 */
type CheckboxProps = Omit<ComponentProps<'input'>, 'type' | 'className'> & {
  className?: string;
  label: string;
  hint?: string;
  indeterminate?: boolean;
};

export function Checkbox({
  label,
  hint,
  indeterminate = false,
  id,
  className,
  ...props
}: CheckboxProps) {
  const ref = useRef<HTMLInputElement>(null);
  const generatedId = useId();
  const inputId = id ?? generatedId;

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <div className="flex items-start gap-2.5">
      <span className="relative mt-0.5 inline-flex size-4 shrink-0">
        <input
          ref={ref}
          id={inputId}
          type="checkbox"
          className={cn(
            'peer size-4 shrink-0 appearance-none rounded-[4px] border border-line-strong bg-surface',
            'checked:border-ink checked:bg-ink indeterminate:border-ink indeterminate:bg-ink',
            'transition-colors duration-(--dur-fast)',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 focus-visible:ring-offset-2 focus-visible:ring-offset-ground',
            'disabled:cursor-not-allowed disabled:opacity-40',
            className,
          )}
          {...props}
        />
        <Check
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 size-full scale-90 p-0.5 text-ground opacity-0 peer-indeterminate:opacity-0 peer-checked:opacity-100"
        />
        <Minus
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 size-full scale-90 p-0.5 text-ground opacity-0 peer-indeterminate:opacity-100"
        />
      </span>
      <label htmlFor={inputId} className="flex flex-col gap-0.5 text-sm text-ink">
        {label}
        {hint ? <span className="text-xs text-ink-3">{hint}</span> : null}
      </label>
    </div>
  );
}
