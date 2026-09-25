'use client';

import { X } from 'lucide-react';
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { cn } from '../lib/cn';
import { Chip } from './chip';

/**
 * FEAT-20260911-003 — a typeahead over options. `E-104`, `V3` decision 2.
 *
 * **`Select` stays.** A native select is still the right control for three
 * fixed options and is the one that works best on a phone; this is the
 * addition for the case a native select cannot cover — a person, a project, a
 * tag, an option list too long to scan, or one that comes from a server.
 *
 * The keyboard model is `CommandPalette`'s, not `MenuContent`'s, and for the
 * same reason that pattern gives: inside a listbox the keyboard stays on the
 * field and moves the highlight through `aria-activedescendant`. A `Menu`
 * gives its rows roving focus and `role="menuitem"`, which is the wrong shape
 * here — an option that could also take focus gives a screen reader two
 * places to be at once. So the popup below is a plain listbox, not
 * `MenuContent`, and it borrows `Input`'s shapes (`field.tsx`) rather than
 * rendering one, because an `Input` has no room for a row of `Chip`s in front
 * of it.
 *
 * `aria-activedescendant` is clamped to the list that is actually rendered,
 * the same guard `CommandPalette` carries for `BUG-20260823-306`: derived at
 * render rather than corrected by an effect, so a stale id never reaches the
 * accessibility tree for even one frame and Enter never fires on a row that
 * is no longer there.
 */
export interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxSharedProps {
  /**
   * A fixed list, filtered here by label; or a function from the typed query
   * to candidates, called instead of any local filtering. May return
   * synchronously or return a promise — a promise puts the list into a
   * pending state, announced for a reader who cannot see a spinner, and is
   * debounced by `debounceMs` so a fast typist does not open one request per
   * keystroke. A result that resolves after a newer query has been typed is
   * dropped, exactly as `CommandPalette` drops one.
   */
  options: ComboboxOption[] | ((query: string) => ComboboxOption[] | Promise<ComboboxOption[]>);
  placeholder?: string;
  'aria-label'?: string;
  /** Drawn in the popup when nothing matches. Defaults to a sentence naming the query. */
  noMatches?: ReactNode;
  debounceMs?: number;
  disabled?: boolean;
  className?: string;
}

interface ComboboxSingleProps extends ComboboxSharedProps {
  multiple?: false;
  value: string | null;
  onValueChange: (value: string | null) => void;
}

interface ComboboxMultipleProps extends ComboboxSharedProps {
  multiple: true;
  value: string[];
  onValueChange: (value: string[]) => void;
}

export type ComboboxProps = ComboboxSingleProps | ComboboxMultipleProps;

export function Combobox(props: ComboboxProps) {
  const {
    options,
    placeholder,
    noMatches,
    debounceMs = 200,
    disabled,
    className,
    // Stripped rather than left in `rest`: the DOM `<input>` below is spread
    // with `rest`, and a raw `value` in there would fight the `query` this
    // file shows on it — see the effect that keeps them in sync.
    value: _value,
    onValueChange: _onValueChange,
    multiple: _multiple,
    ...rest
  } = props;
  const multiple = props.multiple ?? false;

  const listboxId = useId();
  const rowIdPrefix = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [asyncResults, setAsyncResults] = useState<ComboboxOption[]>([]);
  const [pending, setPending] = useState(false);
  const [activeIndexState, setActiveIndex] = useState(0);

  /** Every label this box has ever seen, so a controlled `value` can be shown as text — see below. */
  const labels = useRef(new Map<string, string>());
  const requestId = useRef(0);

  const selected = props.multiple ? props.value : [];

  /**
   * The two branches of `ComboboxProps` are correlated — `multiple: true` goes
   * with a `string[]` value and its matching setter — but destructuring loses
   * that correlation, so the calls below go through these two narrow helpers
   * rather than a cast at every call site.
   */
  function setSingleValue(v: string | null) {
    if (!props.multiple) props.onValueChange(v);
  }
  function setMultipleValue(v: string[]) {
    if (props.multiple) props.onValueChange(v);
  }

  if (Array.isArray(options)) {
    for (const option of options) labels.current.set(option.value, option.label);
  }

  /**
   * While closed, the field shows the selected label rather than whatever was
   * last typed — the same box, doing what a native `<select>` already does.
   * Gated on `!open` rather than corrected on blur: a `value` set from outside
   * (the caller loading a saved draft) must be reflected without the field
   * ever having had focus.
   */
  useEffect(() => {
    if (props.multiple || open) return;
    const v = props.value;
    setQuery(v ? (labels.current.get(v) ?? '') : '');
  }, [props.value, props.multiple, open]);

  useEffect(() => {
    if (typeof options !== 'function' || !open) return;
    const id = ++requestId.current;
    const timer = setTimeout(() => {
      const result = options(query);
      if (!(result instanceof Promise)) {
        for (const option of result) labels.current.set(option.value, option.label);
        setAsyncResults(result);
        setPending(false);
        return;
      }
      setPending(true);
      result.then(
        (resolved) => {
          if (requestId.current !== id) return;
          for (const option of resolved) labels.current.set(option.value, option.label);
          setAsyncResults(resolved);
          setPending(false);
        },
        () => {
          if (requestId.current !== id) return;
          setPending(false);
        },
      );
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [options, query, open, debounceMs]);

  const filtered = useMemo(() => {
    const candidates = Array.isArray(options)
      ? query.trim() === ''
        ? options
        : options.filter((option) =>
            option.label.toLowerCase().includes(query.trim().toLowerCase()),
          )
      : asyncResults;
    return multiple ? candidates.filter((option) => !selected.includes(option.value)) : candidates;
  }, [options, query, asyncResults, multiple, selected]);

  const activeIndex =
    filtered.length === 0 ? -1 : Math.min(Math.max(activeIndexState, 0), filtered.length - 1);
  const activeRowId = open && activeIndex >= 0 ? `${rowIdPrefix}-${activeIndex}` : undefined;

  function commit(index: number) {
    const option = filtered[index];
    if (!option) return;
    if (multiple) {
      setMultipleValue([...selected, option.value]);
      setQuery('');
    } else {
      setSingleValue(option.value);
      setQuery(option.label);
    }
    setOpen(false);
    setActiveIndex(0);
    // Focus never left the field to begin with — Enter fires with it already
    // focused, and a click's `onMouseDown` above already prevents the browser
    // moving focus to the option — so there is nothing to restore here.
  }

  function removeChip(v: string) {
    setMultipleValue(selected.filter((x) => x !== v));
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      if (filtered.length === 0) return;
      setActiveIndex((i) => (Math.max(i, 0) + 1) % filtered.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      if (filtered.length === 0) return;
      setActiveIndex((i) => (Math.max(i, 0) - 1 + filtered.length) % filtered.length);
    } else if (event.key === 'Enter') {
      if (open && activeIndex >= 0) {
        event.preventDefault();
        commit(activeIndex);
      }
    } else if (event.key === 'Escape') {
      if (open) {
        event.preventDefault();
        setOpen(false);
        if (multiple) setQuery('');
      }
    } else if (event.key === 'Backspace') {
      if (multiple && query === '' && selected.length > 0) {
        removeChip(selected[selected.length - 1]);
      }
    }
  }

  // `ring-ink/35`, not `field.tsx`'s `ring-white/22` — `tokens.spec.ts`
  // reserves that literal for `field.tsx` alone, and `--color-ink` is itself
  // near-white, so the ring reads the same on the ground this package ships
  // today. The same substitution `Checkbox` and `Radio` already make.
  return (
    <div className="relative">
      <div
        className={cn(
          'w-full bg-surface text-ink',
          'border border-line-strong rounded-control',
          'transition-[border-color,box-shadow] duration-(--dur-fast)',
          'focus-within:border-ink/70 focus-within:ring-2 focus-within:ring-ink/35',
          multiple
            ? 'flex min-h-[var(--size-field)] flex-wrap items-center gap-1.5 px-2 py-1.5'
            : 'flex h-[var(--size-field)] items-center px-3.5',
          disabled && 'opacity-40',
          className,
        )}
      >
        {multiple
          ? selected.map((v) => (
              <Chip key={v} size="md" className="gap-1">
                {labels.current.get(v) ?? v}
                <button
                  type="button"
                  aria-label={`Remove ${labels.current.get(v) ?? v}`}
                  disabled={disabled}
                  onClick={() => removeChip(v)}
                  className="-mr-0.5 rounded-full p-0.5 hover:bg-hover"
                >
                  <X size={12} aria-hidden="true" />
                </button>
              </Chip>
            ))
          : null}
        <input
          ref={inputRef}
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeRowId}
          disabled={disabled}
          placeholder={placeholder}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setActiveIndex(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            setOpen(false);
            if (multiple) setQuery('');
          }}
          onKeyDown={onKeyDown}
          className={cn(
            'min-w-[4rem] flex-1 bg-transparent text-sm text-ink placeholder:text-ink-3 outline-none',
            'disabled:cursor-not-allowed',
          )}
          {...rest}
        />
      </div>

      {/* Counted for a reader, who cannot see the list open under the field. */}
      {open ? (
        <p aria-live="polite" aria-atomic="true" className="sr-only">
          {pending ? 'Searching' : `${filtered.length} matches`}
        </p>
      ) : null}

      {open ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label={rest['aria-label']}
          className="glass-strong absolute inset-x-0 top-[calc(100%+4px)] z-overlay max-h-64 overflow-y-auto rounded-surface p-1.5"
        >
          {pending && filtered.length === 0 ? (
            <div className="px-3 py-2.5 text-sm text-ink-3">Searching…</div>
          ) : filtered.length === 0 ? (
            <div className="px-3 py-2.5 text-sm text-ink-3">
              {noMatches ?? `No matches for "${query}".`}
            </div>
          ) : (
            filtered.map((option, index) => (
              // Not a `button`. Inside a listbox the keyboard is on the field
              // and moves the highlight through `aria-activedescendant`; a row
              // that could also take focus would give a reader two places to
              // be at once. `onMouseDown` is prevented so a click never blurs
              // the field before its own `onClick` has a chance to commit.
              // biome-ignore lint/a11y/useKeyWithClickEvents: the keyboard path is the combobox's, above.
              // biome-ignore lint/a11y/useFocusableInteractive: an option under `aria-activedescendant` must not be focusable.
              <div
                key={option.value}
                id={`${rowIdPrefix}-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => commit(index)}
                onMouseMove={() => setActiveIndex(index)}
                className={cn(
                  'lit flex cursor-default items-center rounded-control px-3 py-2.5 text-sm',
                  'transition-colors duration-(--dur-fast)',
                  index === activeIndex ? 'bg-hover text-ink' : 'text-ink-2',
                )}
              >
                {option.label}
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
