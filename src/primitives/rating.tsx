'use client';

import type { LucideIcon } from 'lucide-react';
import { Star } from 'lucide-react';
import type { KeyboardEvent } from 'react';
import { useRef, useState } from 'react';
import { tv } from 'tailwind-variants';
import { cn } from '../lib/cn';

/**
 * Rating — a star (or icon) input and display.
 *
 * Interactive, it is the APG radio group: `role="radiogroup"` over
 * `role="radio"` steps, one tab stop (the checked step, else the first),
 * arrows move focus *and* value. Hover previews a value without committing
 * it; only a click, or a key, calls `onValueChange`. Read-only, it is one
 * `role="img"` named "<label>, 4.5 out of 5".
 *
 * `0` is "no rating". The value is a fact about the data, so it is
 * controlled (`value` + `onValueChange`) with `defaultValue` as the
 * uncontrolled form; only hover and focus are internal.
 *
 * Half values: each icon carries two half-width radios and the filled layer
 * is clipped to the fraction, so the half star is one icon, not two glyphs.
 * Colour is never the only signal — every step has a name, and the read-only
 * image states the number.
 */
export type RatingLabels = {
  /** The name of one step, and the read-only text: "4.5 out of 5". */
  value: (value: number, max: number) => string;
};

const DEFAULT_LABELS: RatingLabels = {
  value: (value, max) => `${value} out of ${max}`,
};

export type RatingProps = {
  value?: number;
  onValueChange?: (value: number) => void;
  defaultValue?: number;
  /** Default 5. */
  max?: number;
  allowHalf?: boolean;
  /** Clicking the current value clears it to 0. Default true. */
  allowClear?: boolean;
  readOnly?: boolean;
  icon?: LucideIcon;
  size?: 'sm' | 'md' | 'lg';
  /** The control's accessible name. */
  label: string;
  labels?: Partial<RatingLabels>;
  className?: string;
};

const icon = tv({
  base: 'shrink-0',
  variants: { size: { sm: 'size-4', md: 'size-6', lg: 'size-8' } },
  defaultVariants: { size: 'md' },
});

const ring =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 focus-visible:ring-offset-2 focus-visible:ring-offset-ground';

function snap(value: number, max: number, step: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(max, Math.max(0, Math.round(value / step) * step));
}

export function Rating({
  value: valueProp,
  onValueChange,
  defaultValue = 0,
  max = 5,
  allowHalf = false,
  allowClear = true,
  readOnly = false,
  icon: Icon = Star,
  size = 'md',
  label,
  labels: labelsProp,
  className,
}: RatingProps) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp };
  const step = allowHalf ? 0.5 : 1;
  const [inner, setInner] = useState(defaultValue);
  const [hover, setHover] = useState<number | null>(null);
  const groupRef = useRef<HTMLDivElement>(null);

  const value = snap(valueProp ?? inner, max, step);
  const shown = !readOnly && hover !== null ? hover : value;
  const iconClass = icon({ size });

  const icons = Array.from({ length: max }, (_, i) => {
    const n = i + 1;
    const fill = Math.min(1, Math.max(0, shown - i));
    return (
      <span key={n} className={cn('relative inline-flex', iconClass)}>
        <Icon
          aria-hidden="true"
          className={cn('absolute inset-0 text-ink-3', iconClass)}
        />
        <Icon
          aria-hidden="true"
          className={cn('absolute inset-0 fill-current text-accent', iconClass)}
          style={{ clipPath: `inset(0 ${(1 - fill) * 100}% 0 0)` }}
        />
      </span>
    );
  });

  if (readOnly) {
    return (
      <div
        role="img"
        aria-label={`${label}, ${labels.value(value, max)}`}
        className={cn('inline-flex items-center gap-0.5', className)}
      >
        {icons}
      </div>
    );
  }

  const commit = (next: number) => {
    if (valueProp === undefined) setInner(next);
    onValueChange?.(next);
  };

  const select = (next: number) => {
    commit(allowClear && next === value ? 0 : next);
  };

  const focusStep = (next: number) => {
    groupRef.current
      ?.querySelector<HTMLElement>(`[data-step="${next}"]`)
      ?.focus();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    let next: number | null = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp')
      next = Math.min(max, value + step);
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown')
      next = Math.max(step, value - step);
    else if (event.key === 'Home') next = step;
    else if (event.key === 'End') next = max;
    else if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      const target = Number((event.target as HTMLElement).dataset.step);
      if (target) select(target);
      return;
    }
    if (next === null) return;
    event.preventDefault();
    commit(next);
    focusStep(next);
  };

  // One tab stop: the checked step, else the first.
  const stop = value === 0 ? step : value;
  const parts = allowHalf ? 2 : 1;

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      onMouseLeave={() => setHover(null)}
      className={cn('relative inline-flex items-center gap-0.5', className)}
    >
      {icons.map((node, i) => (
        <span key={node.key} className="relative inline-flex">
          {node}
          {Array.from({ length: parts }, (_, p) => {
            const step_ = allowHalf ? i + (p + 1) / 2 : i + 1;
            return (
              // biome-ignore lint/a11y/useSemanticElements: a half-width hit area over an icon; the APG radio pattern is the radiogroup's roving, which a native input cannot give a half step.
              // biome-ignore lint/a11y/useKeyWithClickEvents: the keys are handled once, on the radiogroup.
              <span
                key={step_}
                role="radio"
                data-step={step_}
                aria-checked={value === step_}
                aria-label={labels.value(step_, max)}
                tabIndex={step_ === stop ? 0 : -1}
                onClick={() => select(step_)}
                onMouseEnter={() => setHover(step_)}
                onFocus={() => setHover(null)}
                className={cn(
                  'absolute inset-y-0 cursor-pointer rounded-sm',
                  parts === 2
                    ? p === 0
                      ? 'left-0 w-1/2'
                      : 'right-0 w-1/2'
                    : 'inset-x-0',
                  ring,
                )}
              />
            );
          })}
        </span>
      ))}
    </div>
  );
}
