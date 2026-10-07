'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * FEAT-20260930-067 (D10) — copy to the clipboard with an inline "Copied"
 * state for 1.5 s. No `toast`: importing it would pull sonner into the module
 * graph of every consumer of `code-block` and `key-value-list`.
 *
 * A failed write (no clipboard, permission denied) leaves `copied` false —
 * the button simply does not confirm.
 */
export const COPIED_MS = 1500;

export function useCopy(text: string) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return;
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), COPIED_MS);
  }, [text]);

  return { copied, copy };
}
