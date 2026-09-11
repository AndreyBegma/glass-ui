'use client';

import type { ComponentProps } from 'react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '../lib/cn';

/**
 * FEAT-20260911-003 — text that becomes an input. `E-104`, `V3` decision 3.
 *
 * Click or Enter starts the edit; Enter and blur commit; Escape reverts to
 * the value the edit started from. **The row's height is identical in both
 * states, and that is the whole difficulty** — the reason this is a
 * component rather than a pattern repeated per screen. It is solved by one
 * class, `h-[var(--size-field)]`, shared byte-for-byte by both branches
 * below: the display button and the edit input sit in the same box, sized by
 * the same token, so nothing about switching between them can move the row.
 * `inline-edit.test.tsx` asserts the two branches carry that class.
 *
 * The display state is a real `<button>`, not a `div` wearing `onClick` and
 * `tabIndex` — the same reasoning `Checkbox` gives for a real `<input>`:
 * Enter and Space to activate, focus and `disabled` need nothing reimplemented.
 */
type InlineEditProps = Omit<ComponentProps<'input'>, 'className' | 'value' | 'onChange'> & {
  value: string;
  onCommit: (value: string) => void;
  className?: string;
};

const sizing = 'flex h-[var(--size-field)] w-full items-center rounded-control px-3.5 text-sm';

export function InlineEdit({
  value,
  onCommit,
  placeholder,
  disabled,
  className,
  'aria-label': ariaLabel,
  ...rest
}: InlineEditProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  // A `value` arriving from outside — another editor committed, a refetch —
  // is not clobbered mid-edit: it only replaces the draft while this row is
  // showing it, not while someone is typing over it.
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function commit() {
    setEditing(false);
    onCommit(draft);
  }

  function revert() {
    setDraft(value);
    setEditing(false);
  }

  // `ring-ink/35`, not `field.tsx`'s `ring-white/22` — `tokens.spec.ts`
  // reserves that literal for `field.tsx` alone, and `--color-ink` is itself
  // near-white, so the ring reads the same on the ground this package ships
  // today. The same substitution `Checkbox` and `Radio` already make.
  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            commit();
          } else if (event.key === 'Escape') {
            event.preventDefault();
            revert();
          }
        }}
        className={cn(
          sizing,
          'bg-surface text-ink placeholder:text-ink-3',
          'border border-line-strong',
          'transition-[border-color,box-shadow] duration-(--dur-fast)',
          'focus:border-ink/70 focus:ring-2 focus:ring-ink/35 focus:outline-none',
          'disabled:opacity-40',
          className,
        )}
        {...rest}
      />
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={ariaLabel}
      onClick={() => setEditing(true)}
      className={cn(
        sizing,
        'text-left transition-colors duration-(--dur-fast) hover:bg-hover',
        value ? 'text-ink' : 'text-ink-3',
        'disabled:pointer-events-none disabled:opacity-40',
        className,
      )}
    >
      <span className="truncate">{value || placeholder}</span>
    </button>
  );
}
