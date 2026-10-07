'use client';

import { type RefObject, useEffect, useMemo, useRef, useState } from 'react';
import { COPIED_MS } from '../primitives/code-block-copy';
import type { LogLine } from './log-viewer';
import { plainText } from './log-viewer-line';

/**
 * FEAT-20260930-070 — `LogViewer`'s search, copy and motion preference, apart
 * from its scrolling.
 */

/** D7 — a jump scrolls instantly under reduced motion. Guarded for a DOM without `matchMedia`. */
export function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** One occurrence: the kept line it is on, and where in its plain text. */
export type LogMatch = { line: number; start: number };

/**
 * D8 — a case-insensitive substring over the ANSI-stripped text of every kept
 * line (`lines[offset …]`), counted in occurrences. The cursor resets to the
 * first match when the query changes and clamps when matches shrink.
 */
export function useLogSearch(lines: LogLine[], offset: number, query: string) {
  const needle = query.toLowerCase();
  const { matches, byLine } = useMemo(() => {
    const matches: LogMatch[] = [];
    const byLine = new Map<number, number[]>();
    if (!needle) return { matches, byLine };
    for (let k = 0; k < lines.length - offset; k++) {
      const text = plainText(lines[offset + k]).toLowerCase();
      let at = text.indexOf(needle);
      while (at !== -1) {
        const list = byLine.get(k) ?? [];
        list.push(matches.length);
        byLine.set(k, list);
        matches.push({ line: k, start: at });
        at = text.indexOf(needle, at + needle.length);
      }
    }
    return { matches, byLine };
  }, [lines, offset, needle]);

  const [cursorState, setCursorState] = useState({ needle, index: 0 });
  const cursor =
    matches.length === 0
      ? -1
      : cursorState.needle === needle
        ? Math.min(cursorState.index, matches.length - 1)
        : 0;
  const setCursor = (index: number) => setCursorState({ needle, index });

  return { needle, matches, byLine, cursor, setCursor };
}

/**
 * D12 — the selection inside the log if there is one, otherwise every line of
 * `lines` ANSI-stripped, with an inline "Copied" for `COPIED_MS`. The text is
 * built at click time rather than per render: it can be 50 000 lines. A failed
 * write (no clipboard, permission denied) does not confirm, as `useCopy`.
 */
export function useLogCopy(scrollRef: RefObject<HTMLElement | null>, lines: LogLine[]) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copy = async () => {
    const selection = typeof window.getSelection === 'function' ? window.getSelection() : null;
    const el = scrollRef.current;
    const inside =
      selection &&
      !selection.isCollapsed &&
      el &&
      selection.anchorNode &&
      el.contains(selection.anchorNode);
    const text = (inside && selection.toString()) || lines.map(plainText).join('\n');
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return;
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), COPIED_MS);
  };

  return { copied, copy };
}
