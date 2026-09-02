'use client';

import { useEffect, useRef } from 'react';

/**
 * FEAT-20260902-004 — ⌘K, as a hook rather than as a prop on the palette.
 *
 * The palette does not listen for its own key. A shortcut is a fact about the
 * application it is bound in — which screens have it, whether an editor takes
 * the key back — and a component that bound its own would be listening from
 * wherever it happened to be mounted, which for a dialog is nowhere until it is
 * already open.
 *
 * So the shell calls this once, next to whatever holds the palette's `open`
 * state, and the palette stays a controlled dialog that knows nothing about
 * keyboards.
 *
 * **Two ways a text field keeps the key.** Both are needed and neither is
 * enough on its own:
 *
 *   - `event.defaultPrevented` — a field that handles ⌘K and calls
 *     `preventDefault()` has already claimed it, and this hook is a document
 *     listener in the bubble phase, so it sees that decision. This is the case
 *     that needs no cooperation at all.
 *   - `[data-command-palette-ignore]` — for the field that handles the key
 *     without preventing the default, which is most rich-text editors: they
 *     bind their own shortcut map and never touch the native event. Put the
 *     attribute on the editor's container and the shortcut stops inside it.
 *
 * Not `event.target instanceof HTMLInputElement`, which was the obvious first
 * answer and is wrong in both directions: it disables ⌘K in the search field
 * where a person is most likely to reach for it, and it does nothing for a
 * `contenteditable`, which is what an editor actually is.
 *
 * `preventDefault` on the way out, because Ctrl-K is the browser's own search
 * shortcut in Firefox and reaches the address bar otherwise.
 */
export function useCommandPaletteShortcut(onOpen: () => void): void {
  /**
   * The callback is read through a ref so that a consumer passing an inline
   * arrow — which is every consumer — does not rebind a document listener on
   * every render of its shell.
   */
  const latest = useRef(onOpen);
  useEffect(() => {
    latest.current = onOpen;
  }, [onOpen]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.key !== 'k' && event.key !== 'K') return;
      if (!(event.metaKey || event.ctrlKey)) return;
      // ⌘⇧K and ⌥⌘K are somebody else's shortcuts, and a browser has several.
      if (event.altKey || event.shiftKey) return;

      const target = event.target;
      if (
        target instanceof Element &&
        target.closest('[data-command-palette-ignore]')
      ) {
        return;
      }

      event.preventDefault();
      latest.current();
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);
}
