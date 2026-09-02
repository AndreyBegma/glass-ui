'use client';

import * as RadixDialog from '@radix-ui/react-dialog';
import type { LucideIcon } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { cn } from '../lib/cn';
import { DialogRoot } from '../primitives/dialog';
import { SearchField } from '../primitives/field';
import { Skeleton } from '../primitives/skeleton';
import '../primitives/motion.css';

/**
 * FEAT-20260902-004 — ⌘K, generalised out of Luna Watch's `global-search.tsx`.
 *
 * `E-92` makes this the package's because Denitsa is the second consumer: Luna
 * searches a film library, Denitsa searches sections, objects and actions, and
 * the only thing the two have in common is the machinery — a dialog, a field, a
 * grouped list, a highlight that travels under the arrow keys, and a key that
 * opens it. That machinery is four hundred lines of `global-search.tsx`, and
 * roughly two hundred of it are about films.
 *
 * **The palette knows nothing about content.** It takes one function, from a
 * query to groups, and calls it. Ranking, debouncing, budgets, which sources
 * are consulted and in what order — all of that is the consumer's, because all
 * of it is a product decision. Luna spends one budget of eight across three
 * library groups; Denitsa fetches objects after two characters and lists
 * sections immediately. Neither of those is a fact about a command palette.
 *
 * What the palette does own is the part that was got wrong the first time and
 * is easy to get wrong again: the highlight is clamped to the list that is
 * actually rendered, `aria-activedescendant` therefore always names an element
 * that exists, and Enter cannot fire on a row that has disappeared underneath
 * it. That was `BUG-20260823-306`, and it was a real defect for a screen reader
 * rather than a cosmetic one.
 */
export interface CommandPaletteItem {
  id: string;
  label: string;
  /** The right-hand column: a section's group, a shortcut, an object's kind. */
  hint?: string;
  icon?: LucideIcon;
  /**
   * Carried so a consumer's ranking function and its rendered item can be the
   * same object. **The palette never reads it** — it does no matching of its
   * own, and a `keywords` array it filtered on would be a second, invisible
   * ranking competing with the one the consumer wrote.
   */
  keywords?: string[];
}

export interface CommandPaletteGroup {
  id: string;
  /** Drawn above the group, and read out as the group's name. */
  title: string;
  items: CommandPaletteItem[];
}

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * The whole of the palette's knowledge of content.
   *
   * May return synchronously or return a promise; a promise puts the list into
   * a pending state that draws `Skeleton` rows. Results that arrive out of
   * order are dropped — a fast empty query resolving after a slow "tas" is the
   * ordinary case, not the edge one — so the consumer's function does not have
   * to carry a request counter of its own.
   *
   * **Memoise it.** It is a dependency of the effect that runs it; an inline
   * arrow re-runs the search on every render of the shell.
   */
  search: (
    query: string,
  ) => CommandPaletteGroup[] | Promise<CommandPaletteGroup[]>;
  /** The group is passed too: what to do with a row usually depends on which list it was in. */
  onSelect: (item: CommandPaletteItem, group: CommandPaletteGroup) => void;
  /** The dialog's accessible name. Never drawn — the field is the visible label. */
  title?: string;
  placeholder?: string;
  /**
   * Drawn when the search returns no groups and nothing is pending. An
   * `EmptyState` at the call site, or a sentence. The palette has no opinion
   * about what "nothing matched" should say, because that depends on what was
   * being searched.
   */
  empty?: ReactNode;
  className?: string;
}

export function CommandPalette({
  open,
  onOpenChange,
  search,
  onSelect,
  title = 'Command palette',
  placeholder = 'Search',
  empty,
  className,
}: CommandPaletteProps) {
  const reduced = useReducedMotion();
  const listId = useId();
  const rowIdPrefix = useId();

  const [query, setQuery] = useState('');
  const [groups, setGroups] = useState<CommandPaletteGroup[]>([]);
  const [pending, setPending] = useState(false);
  const [activeIndexState, setActiveIndex] = useState(0);

  /**
   * A counter rather than a boolean flag, because two searches can be in flight
   * and only the newest one may write. Incremented before the call, compared
   * after it resolves; anything that is not the current id is a result for a
   * query the person has already typed past.
   */
  const requestId = useRef(0);

  /**
   * FEAT-20260902-004 — the palette returns focus itself, because Radix cannot.
   *
   * `Dialog.Content` restores focus to `Dialog.Trigger`: it preventDefaults the
   * focus scope's own restoration and calls `triggerRef.current?.focus()`. A
   * command palette has no trigger — it is opened by a keystroke from anywhere
   * in the shell — so that ref is null and focus lands on `document.body`.
   * Measured, not assumed: the test below failed with `BODY` before this
   * existed, and it is the specification's "Escape returns focus to where it
   * was" that would have shipped broken.
   *
   * Recorded during render rather than in an effect, because a child's effects
   * run before its parent's: by the time an effect here saw `open` turn true,
   * Radix's focus scope had already moved focus into the field and the palette
   * would have recorded itself. The write is idempotent within a commit, which
   * is what makes it safe to do here.
   */
  const restoreTo = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);
  if (open !== wasOpen.current) {
    if (open && typeof document !== 'undefined') {
      restoreTo.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
    }
    wasOpen.current = open;
  }

  useEffect(() => {
    if (!open) return;

    const id = ++requestId.current;
    const result = search(query);

    if (!(result instanceof Promise)) {
      setPending(false);
      setGroups(result);
      return;
    }

    setPending(true);
    result.then(
      (resolved) => {
        if (requestId.current !== id) return;
        setGroups(resolved);
        setPending(false);
      },
      () => {
        // The palette draws no error state. A search that fails is the
        // consumer's to report — it can resolve to a group saying so, which
        // keeps the failure in the list where the person is looking. What must
        // not happen is a rejected promise leaving the pending state on
        // forever, which is what this arm is for.
        if (requestId.current !== id) return;
        setPending(false);
      },
    );
  }, [open, query, search]);

  /**
   * The palette is a dialog, so it is thrown away between openings — but the
   * query is state, and state outlives an unmounted child. Reset on close so
   * the next ⌘K is a fresh palette rather than the last one.
   */
  useEffect(() => {
    if (open) return;
    setQuery('');
    setGroups([]);
    setPending(false);
    setActiveIndex(0);
  }, [open]);

  const flat = useMemo(
    () =>
      groups.flatMap((group) =>
        group.items.map((item) => ({ item, group })),
      ),
    [groups],
  );

  /**
   * `BUG-20260823-306`, and the reason it is derived here rather than corrected
   * by an effect: an effect fixes the state one render late, so a stale
   * `aria-activedescendant` still reaches the accessibility tree for a frame,
   * and Enter in that frame fires on a row that is no longer there.
   *
   * Clamped to the first row rather than to nothing, which is the difference
   * between this and Luna's search field: a palette is typed into and then
   * committed with Enter, so there is always a candidate. A search field sits
   * in a page header and must not steal Enter from the form it is in.
   */
  const activeIndex =
    flat.length === 0
      ? -1
      : Math.min(Math.max(activeIndexState, 0), flat.length - 1);

  const activeRowId = activeIndex >= 0 ? `${rowIdPrefix}-${activeIndex}` : undefined;

  useEffect(() => {
    if (!activeRowId) return;
    document.getElementById(activeRowId)?.scrollIntoView({ block: 'nearest' });
  }, [activeRowId]);

  const commit = useCallback(
    (index: number) => {
      const row = flat[index];
      if (!row) return;
      onSelect(row.item, row.group);
      onOpenChange(false);
    },
    [flat, onSelect, onOpenChange],
  );

  const onKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (flat.length === 0) return;
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((i) => (Math.max(i, 0) + 1) % flat.length);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((i) => (Math.max(i, 0) - 1 + flat.length) % flat.length);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        commit(activeIndex);
      }
    },
    [flat.length, activeIndex, commit],
  );

  /**
   * The same travelling highlight as the bottom capsule and the rail, on the
   * list's axis. One element with a `layoutId`, so walking the list slides the
   * highlight down it rather than switching one off and another on.
   *
   * Deliberately not glass: it sits inside a `glass-strong` panel, which has
   * already flattened everything behind it, so a second blur has nothing left
   * to refract. `bg-hover` is the token that exists for exactly this.
   */
  const highlight = (
    <motion.span
      layoutId="glass-command-palette-capsule"
      aria-hidden="true"
      className="bg-hover absolute inset-0 -z-10 rounded-control"
      transition={
        reduced
          ? { duration: 0 }
          : { type: 'spring', stiffness: 500, damping: 40, mass: 0.7 }
      }
    />
  );

  let cursor = -1;

  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay
          className={cn(
            // `bg-ground`, not `bg-black`. The two are within a percent of each
            // other today and the older overlays are spelled the second way,
            // but only one of them follows the token: when the light theme
            // lands (`u1-light`), a scrim written as black stays black over a
            // white ground. The alpha matches `--glass-scrim`, which is this
            // same ground colour and is the floor the material already uses.
            'z-overlay fixed inset-0 bg-ground/72 backdrop-blur-sm',
            'data-[state=open]:animate-[lunaFadeIn_var(--dur-base)_ease-out]',
            'data-[state=closed]:animate-[lunaFadeOut_var(--dur-fast)_ease-out]',
          )}
        />
        <RadixDialog.Content
          onCloseAutoFocus={(event) => {
            const target = restoreTo.current;
            if (!target?.isConnected) return;
            // Ours rather than Radix's: preventing the default is what stops
            // `Dialog.Content` reaching for a trigger that does not exist.
            event.preventDefault();
            target.focus();
          }}
          className={cn(
            // Near the top rather than centred, which is why this does not
            // reuse `DialogContent`. A palette is a thing you type into with
            // the results growing downwards; centring it means the list moves
            // the field as it fills.
            'glass-strong z-overlay fixed left-1/2 top-[12vh] -translate-x-1/2',
            'w-[min(36rem,calc(100vw-2rem))] rounded-sheet',
            'flex max-h-[70dvh] flex-col overflow-hidden',
            'data-[state=open]:animate-[lunaDialogIn_var(--dur-base)_cubic-bezier(0.23,1,0.32,1)]',
            'data-[state=closed]:animate-[lunaDialogOut_var(--dur-fast)_ease-out]',
            className,
          )}
        >
          <RadixDialog.Title className="sr-only">{title}</RadixDialog.Title>

          <div className="border-line shrink-0 border-b p-2">
            <SearchField
              autoFocus
              value={query}
              placeholder={placeholder}
              aria-label={title}
              role="combobox"
              aria-expanded
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={activeRowId}
              inputClassName="border-transparent bg-transparent"
              onChange={(event) => {
                setQuery(event.target.value);
                // A new query is a new list; the highlight goes back to the top
                // rather than staying on whatever row happens to be at index 4.
                setActiveIndex(0);
              }}
              onKeyDown={onKeyDown}
            />
          </div>

          {/* Counted for a reader, who cannot see the list grow under the field. */}
          <p aria-live="polite" aria-atomic="true" className="sr-only">
            {pending ? 'Searching' : `${flat.length} results`}
          </p>

          <div
            id={listId}
            role="listbox"
            aria-label={title}
            className="min-h-0 flex-1 overflow-y-auto p-2"
          >
            {pending && flat.length === 0
              ? [0, 1, 2].map((row) => (
                  <Skeleton key={row} delay={row * 90} className="mb-1 h-11" />
                ))
              : null}

            {!pending && flat.length === 0 && empty ? (
              <div className="text-ink-3 px-3 py-8 text-center text-sm">
                {empty}
              </div>
            ) : null}

            {groups.map((group) => (
              // `role="group"` is what a listbox's own grouping is called —
              // listbox › group › option is the structure the pattern defines.
              // biome-ignore lint/a11y/useSemanticElements: a `fieldset` inside a listbox is not the same thing.
              <div
                key={group.id}
                role="group"
                aria-labelledby={`${rowIdPrefix}-g-${group.id}`}
              >
                <p
                  id={`${rowIdPrefix}-g-${group.id}`}
                  className="text-ink-3 px-3 py-2 text-[10px] font-semibold uppercase tracking-widest"
                >
                  {group.title}
                </p>

                {group.items.map((item) => {
                  cursor += 1;
                  const index = cursor;
                  const isActive = index === activeIndex;
                  const Icon = item.icon;

                  return (
                    // Not a `button`. Inside a listbox the keyboard is on the
                    // field and moves the highlight through
                    // `aria-activedescendant`; a row that could also take focus
                    // would give a reader two places to be at once.
                    // biome-ignore lint/a11y/useKeyWithClickEvents: the keyboard path is the combobox's, above.
                    // biome-ignore lint/a11y/useFocusableInteractive: an option under `aria-activedescendant` must not be focusable — two focus locations is the defect, not the fix.
                    <div
                      key={item.id}
                      id={`${rowIdPrefix}-${index}`}
                      role="option"
                      aria-selected={isActive}
                      onClick={() => commit(index)}
                      onMouseMove={() => setActiveIndex(index)}
                      className={cn(
                        'relative isolate flex cursor-default items-center gap-3',
                        'rounded-control px-3 py-2.5 text-sm',
                        'transition-colors duration-(--dur-fast)',
                        isActive ? 'text-ink' : 'text-ink-2 hover:bg-hover',
                      )}
                    >
                      {isActive ? highlight : null}
                      {Icon ? (
                        <Icon size={16} aria-hidden="true" className="shrink-0" />
                      ) : null}
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {item.hint ? (
                        <span className="text-ink-3 shrink-0 text-xs">
                          {item.hint}
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </DialogRoot>
  );
}
