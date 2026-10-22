'use client';

import { useId, useRef, useState, type ClipboardEvent, type ChangeEvent } from 'react';
import { tv } from 'tailwind-variants';
import { cn } from '../lib/cn';
import type { FieldTone } from './field';

/**
 * v0.38.0 wave, PinInput — one-time codes and PINs.
 *
 * **One real input.** The cells are drawn, `aria-hidden`; a single transparent
 * `<input autocomplete="one-time-code">` lies over them and takes the focus,
 * the keyboard, the paste and the SMS autofill. A screen reader hears one
 * labelled text field and its value, not N boxes. The caret is kept at the end
 * of the value, so typing appends, Backspace removes the last character and
 * the active cell is always the first empty one (or the last, when full).
 */
export type PinInputLabels = {
  /** Spoken description of progress, e.g. "3 of 6 characters". */
  progress: (filled: number, length: number) => string;
};

const DEFAULT_LABELS: PinInputLabels = {
  progress: (filled, length) => `${filled} of ${length} characters`,
};

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
  /** The field's accessible name. */
  label: string;
  labels?: Partial<PinInputLabels>;
  className?: string;
};

const cell = tv({
  base: 'flex aspect-square h-(--size-field) items-center justify-center rounded-control border text-base font-semibold tabular-nums text-ink transition-[border-color,box-shadow] duration-(--dur-fast)',
  variants: {
    tone: { surface: 'bg-surface', 'on-glass': 'bg-hover' },
    active: {
      true: 'border-ink/70 ring-2 ring-ink/22',
      false: 'border-line-strong',
    },
    disabled: { true: 'opacity-40', false: '' },
  },
});

const INVALID: Record<NonNullable<PinInputProps['type']>, RegExp> = {
  numeric: /[^0-9]/g,
  alphanumeric: /[^a-zA-Z0-9]/g,
};

export function PinInput({
  length = 6,
  value,
  onValueChange,
  onComplete,
  type = 'numeric',
  mask = false,
  disabled = false,
  tone = 'surface',
  label,
  labels: labelsProp,
  className,
}: PinInputProps) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp };
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const statusId = useId();

  const clean = (raw: string) => raw.replace(INVALID[type], '').slice(0, length);

  const commit = (raw: string) => {
    const next = clean(raw);
    if (next !== value) {
      onValueChange(next);
      if (next.length === length && value.length !== length) onComplete?.(next);
    }
    return next;
  };

  const toEnd = () => {
    const el = inputRef.current;
    if (el) el.setSelectionRange(el.value.length, el.value.length);
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const next = commit(e.target.value);
    // A rejected character leaves `value` as it was; put the DOM back.
    if (next === value) e.target.value = value;
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    commit(e.clipboardData.getData('text'));
  };

  const active = Math.min(value.length, length - 1);

  return (
    <div className={cn('relative inline-flex gap-2', className)}>
      {Array.from({ length }, (_, i) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: cells are positional
          key={i}
          aria-hidden="true"
          data-active={focused && !disabled && i === active ? '' : undefined}
          className={cell({
            tone,
            active: focused && !disabled && i === active,
            disabled,
          })}
        >
          {value[i] ? (mask ? '•' : value[i]) : null}
        </span>
      ))}
      <input
        ref={inputRef}
        type={mask ? 'password' : 'text'}
        value={value}
        onChange={onChange}
        onPaste={onPaste}
        onFocus={() => {
          setFocused(true);
          toEnd();
        }}
        onBlur={() => setFocused(false)}
        onSelect={toEnd}
        onClick={toEnd}
        disabled={disabled}
        maxLength={length}
        autoComplete="one-time-code"
        inputMode={type === 'numeric' ? 'numeric' : 'text'}
        pattern={type === 'numeric' ? '[0-9]*' : undefined}
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        aria-label={label}
        aria-describedby={statusId}
        className="absolute inset-0 size-full cursor-text bg-transparent text-transparent caret-transparent opacity-0 outline-none disabled:cursor-not-allowed"
      />
      <span id={statusId} className="sr-only">
        {labels.progress(value.length, length)}
      </span>
    </div>
  );
}
