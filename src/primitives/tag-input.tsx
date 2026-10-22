'use client';

import { CircleAlert, X } from 'lucide-react';
import {
  type ClipboardEvent as ReactClipboardEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  useId,
  useRef,
  useState,
} from 'react';
import { cn } from '../lib/cn';
import { Chip } from './chip';
import type { FieldTone } from './field';

/**
 * v0.38.0 wave, TagInput — free-form values as chips: labels, env keys,
 * emails. `Combobox multiple` only picks from a list; this takes whatever is
 * typed, validates it, and keeps what it rejects in the input with the reason
 * beside it, never dropped.
 *
 * Keyboard. Focus is on the text input; `ArrowLeft` from its start enters the
 * chips (roving: each chip is `tabIndex={-1}`, so the row is one Tab stop),
 * `ArrowLeft` / `ArrowRight` move between them, `ArrowRight` off the last one
 * returns to the input, `Delete` / `Backspace` removes the focused chip.
 * `Backspace` on an *empty* input does not delete: it selects (focuses) the
 * last chip, and a second `Backspace` removes it — one slip never costs a tag.
 *
 * Suggestions follow the Combobox listbox pattern (APG): the keyboard stays on
 * the input and the highlight moves through `aria-activedescendant`. Nothing
 * is highlighted until the arrows move it, so `Enter` commits what was typed,
 * not whatever happens to be first in the list.
 *
 * Separators are either a key name (`'Enter'`, `'Tab'`) or a single character
 * (`','`, `' '`, `';'`). A character separator splits whatever it arrives in,
 * typed or pasted; a paste is committed whole, its last piece included.
 */
export type TagInputLabels = {
  /** The chip row's group name. */
  tags: string;
  /** The text input's accessible name, unless `aria-label` is given. */
  input: string;
  remove: (tag: string) => string;
  added: (tag: string) => string;
  removed: (tag: string) => string;
  duplicate: (tag: string) => string;
  maxReached: (max: number) => string;
  suggestions: string;
  matches: (count: number) => string;
};

const DEFAULT_LABELS: TagInputLabels = {
  tags: 'Tags',
  input: 'Add a tag',
  remove: (tag) => `Remove ${tag}`,
  added: (tag) => `${tag} added`,
  removed: (tag) => `${tag} removed`,
  duplicate: (tag) => `"${tag}" is already added`,
  maxReached: (max) => `At most ${max} tags`,
  suggestions: 'Suggestions',
  matches: (count) => `${count} suggestions`,
};

export type TagInputProps = {
  /** Controlled. Omit it, with `defaultValue`, for the uncontrolled form. */
  value?: string[];
  onValueChange?: (value: string[]) => void;
  defaultValue?: string[];
  placeholder?: string;
  /** Key names (`'Enter'`, `'Tab'`) or single characters. Default `[',', 'Enter']`. */
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
  id?: string;
  'aria-label'?: string;
};

const DEFAULT_SEPARATORS = [',', 'Enter'];
const EMPTY: string[] = [];

export function TagInput({
  value,
  onValueChange,
  defaultValue = EMPTY,
  placeholder,
  separators = DEFAULT_SEPARATORS,
  validate,
  suggestions,
  max,
  allowDuplicates = false,
  disabled = false,
  tone = 'surface',
  labels: labelsProp,
  className,
  id,
  'aria-label': ariaLabel,
}: TagInputProps) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp };
  const baseId = useId();
  const errorId = `${baseId}-error`;
  const listboxId = `${baseId}-list`;

  const inputRef = useRef<HTMLInputElement>(null);
  const chipRefs = useRef<Array<HTMLSpanElement | null>>([]);

  const [inner, setInner] = useState(defaultValue);
  const tags = value ?? inner;
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [open, setOpen] = useState(false);
  const [activeState, setActive] = useState(-1);

  const sepChars = separators.filter((s) => s.length === 1);
  const sepKeys = separators.filter((s) => s.length > 1);

  function setTags(next: string[]) {
    if (value === undefined) setInner(next);
    onValueChange?.(next);
  }

  const query = draft.trim().toLowerCase();
  const matches = (suggestions ?? []).filter(
    (s) =>
      (allowDuplicates || !tags.includes(s)) && (query === '' || s.toLowerCase().includes(query)),
  );
  const listOpen = open && matches.length > 0 && !disabled;
  // Derived, like Combobox's: a stale id never reaches the accessibility tree.
  const active = listOpen ? Math.min(activeState, matches.length - 1) : -1;

  /**
   * Commits what it can, in order, against the list as it grows. What it
   * cannot commit goes back into the input — joined with the first character
   * separator — and the first reason is shown.
   */
  function commitParts(parts: string[], rest = '') {
    let next = tags;
    const rejected: string[] = [];
    let firstError: string | null = null;
    const added: string[] = [];
    for (const raw of parts) {
      const tag = raw.trim();
      if (tag === '') continue;
      let message: string | null = null;
      if (max !== undefined && next.length >= max) message = labels.maxReached(max);
      else if (!allowDuplicates && next.includes(tag)) message = labels.duplicate(tag);
      else message = validate?.(tag) ?? null;
      if (message !== null) {
        rejected.push(tag);
        firstError ??= message;
        continue;
      }
      next = [...next, tag];
      added.push(tag);
    }
    if (added.length > 0) {
      setTags(next);
      setStatus(added.map((t) => labels.added(t)).join(', '));
    }
    const glue = sepChars[0] ?? ',';
    const kept = rest === '' ? rejected : [...rejected, rest];
    setDraft(kept.join(glue));
    setError(firstError);
    setActive(-1);
  }

  function removeAt(index: number) {
    const tag = tags[index];
    if (tag === undefined) return;
    setTags(tags.filter((_, i) => i !== index));
    setStatus(labels.removed(tag));
  }

  function focusInput() {
    inputRef.current?.focus();
  }

  function onInputChange(text: string) {
    setOpen(true);
    setActive(-1);
    if (sepChars.some((c) => text.includes(c))) {
      const pattern = new RegExp(`[${sepChars.map(escapeClass).join('')}]`);
      const parts = text.split(pattern);
      const rest = parts.pop() ?? '';
      commitParts(parts, rest);
      return;
    }
    setDraft(text);
    setError(null);
  }

  function onPaste(event: ReactClipboardEvent<HTMLInputElement>) {
    const text = event.clipboardData.getData('text');
    const breaks = sepKeys.includes('Enter') ? /\r?\n/ : null;
    const hasSeparator =
      sepChars.some((c) => text.includes(c)) || breaks?.test(text);
    if (!hasSeparator) return;
    event.preventDefault();
    const classes = sepChars.map(escapeClass).join('');
    const pattern = new RegExp(
      [classes ? `[${classes}]` : null, breaks ? '\\r?\\n' : null].filter(Boolean).join('|'),
    );
    commitParts((draft + text).split(pattern));
  }

  function onInputKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return;
    const { key } = event;
    const input = event.currentTarget;

    if (key === 'ArrowDown' || key === 'ArrowUp') {
      if (matches.length === 0) return;
      event.preventDefault();
      if (!listOpen) {
        setOpen(true);
        return;
      }
      const step = key === 'ArrowDown' ? 1 : -1;
      setActive((i) => {
        const from = Math.min(i, matches.length - 1);
        if (from < 0) return step === 1 ? 0 : matches.length - 1;
        return (from + step + matches.length) % matches.length;
      });
      return;
    }
    if (key === 'Escape' && listOpen) {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (key === 'Enter' && active >= 0) {
      event.preventDefault();
      commitParts([matches[active] as string]);
      return;
    }
    if (sepKeys.includes(key)) {
      // An empty input lets Enter / Tab do what they always do — submit the
      // form, move on — rather than swallow them.
      if (draft.trim() === '') return;
      event.preventDefault();
      commitParts([draft]);
      return;
    }
    if (key === 'Backspace' && draft === '' && tags.length > 0) {
      event.preventDefault();
      chipRefs.current[tags.length - 1]?.focus();
      return;
    }
    if (
      key === 'ArrowLeft' &&
      tags.length > 0 &&
      input.selectionStart === 0 &&
      input.selectionEnd === 0
    ) {
      event.preventDefault();
      chipRefs.current[tags.length - 1]?.focus();
    }
  }

  function onChipKeyDown(event: ReactKeyboardEvent<HTMLSpanElement>, index: number) {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      chipRefs.current[Math.max(index - 1, 0)]?.focus();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      if (index >= tags.length - 1) focusInput();
      else chipRefs.current[index + 1]?.focus();
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      removeAt(index);
      // The neighbour that slides into this slot, else the one before it,
      // else the input. Refs are re-read after the render drops this chip.
      const remaining = tags.length - 1;
      if (remaining === 0) focusInput();
      else if (index < remaining) queueMicrotask(() => chipRefs.current[index]?.focus());
      else queueMicrotask(() => chipRefs.current[remaining - 1]?.focus());
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      // Typing while a chip is selected goes back to the field.
      focusInput();
    }
  }

  // Only a field with suggestions is a combobox; a plain one stays a textbox.
  const comboboxProps = suggestions
    ? ({
        role: 'combobox',
        'aria-expanded': listOpen,
        'aria-controls': listboxId,
        'aria-autocomplete': 'list',
        'aria-activedescendant': active >= 0 ? `${baseId}-opt-${active}` : undefined,
      } as const)
    : {};

  return (
    <div className="relative">
      {/* biome-ignore lint/a11y/noStaticElementInteractions: a pointer convenience (a click on the padding focuses the input); the input is the keyboard path. */}
      <div
        onMouseDown={(event) => {
          if (disabled) return;
          const target = event.target as HTMLElement;
          if (target.closest('button, input, [data-tag]')) return;
          event.preventDefault();
          focusInput();
        }}
        className={cn(
          tone === 'on-glass' ? 'bg-hover' : 'bg-surface',
          'w-full text-ink border rounded-control',
          error ? 'border-danger' : 'border-line-strong',
          'transition-[border-color,box-shadow] duration-(--dur-fast)',
          'focus-within:border-ink/70 focus-within:ring-2 focus-within:ring-ink/35',
          'flex min-h-(--size-field) flex-wrap items-center gap-1.5 px-2 py-1.5',
          disabled && 'opacity-40',
          className,
        )}
      >
        {/* biome-ignore lint/a11y/useSemanticElements: a group of chips, not a form fieldset. */}
        <div role="group" aria-label={labels.tags} className="contents">
          {tags.map((tag, index) => (
            <Chip
              // Duplicates are allowed, so the tag is not a unique key.
              // biome-ignore lint/suspicious/noArrayIndexKey: identity here is the position.
              key={`${index}-${tag}`}
              ref={(node: HTMLSpanElement | null) => {
                chipRefs.current[index] = node;
              }}
              data-tag=""
              tabIndex={disabled ? undefined : -1}
              onKeyDown={disabled ? undefined : (event) => onChipKeyDown(event, index)}
              size="md"
              className="gap-1 outline-none transition-shadow duration-(--dur-fast) focus:ring-2 focus:ring-ink/45"
            >
              {tag}
              <button
                type="button"
                tabIndex={-1}
                aria-label={labels.remove(tag)}
                disabled={disabled}
                onClick={() => {
                  removeAt(index);
                  focusInput();
                }}
                className="-mr-0.5 rounded-full p-0.5 hover:bg-hover disabled:cursor-not-allowed"
              >
                <X size={12} aria-hidden="true" />
              </button>
            </Chip>
          ))}
        </div>
        <input
          ref={inputRef}
          id={id}
          type="text"
          {...comboboxProps}
          aria-label={ariaLabel ?? labels.input}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          disabled={disabled}
          placeholder={tags.length === 0 ? placeholder : undefined}
          value={draft}
          autoComplete="off"
          onChange={(event) => onInputChange(event.target.value)}
          onPaste={onPaste}
          onKeyDown={onInputKeyDown}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          className={cn(
            'min-w-16 flex-1 bg-transparent px-1.5 text-sm text-ink placeholder:text-ink-3 outline-none',
            'disabled:cursor-not-allowed',
          )}
        />
      </div>

      {error ? (
        // Icon and words as well as the border colour: colour is never the only signal.
        <p id={errorId} role="alert" className="mt-1.5 flex items-center gap-1.5 text-xs text-danger">
          <CircleAlert size={14} aria-hidden="true" />
          {error}
        </p>
      ) : null}

      <p aria-live="polite" aria-atomic="true" className="sr-only">
        {listOpen ? labels.matches(matches.length) : status}
      </p>

      {listOpen ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label={labels.suggestions}
          className="glass-strong absolute inset-x-0 top-[calc(100%+4px)] z-overlay max-h-64 overflow-y-auto rounded-surface p-1.5"
        >
          {matches.map((option, index) => (
            // Not focusable: the keyboard is on the input (see the header).
            // `onMouseDown` is prevented so a click never blurs it first.
            // biome-ignore lint/a11y/useKeyWithClickEvents: the keyboard path is the input's, above.
            // biome-ignore lint/a11y/useFocusableInteractive: an option under `aria-activedescendant` must not be focusable.
            <div
              key={option}
              id={`${baseId}-opt-${index}`}
              role="option"
              aria-selected={index === active}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => commitParts([option])}
              onMouseMove={() => setActive(index)}
              className={cn(
                'lit flex cursor-default items-center rounded-control px-3 py-2.5 text-sm',
                'transition-colors duration-(--dur-fast)',
                index === active ? 'bg-hover text-ink' : 'text-ink-2',
              )}
            >
              {option}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function escapeClass(char: string): string {
  return char.replace(/[\\\]^-]/g, '\\$&');
}
