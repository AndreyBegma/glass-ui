'use client';

import type { KeyboardEvent, PointerEvent } from 'react';
import { useCallback, useState } from 'react';

/**
 * BUG-20260919-625 — which input last moved focus inside a surface.
 *
 * A Radix menu moves DOM focus to the item under the pointer, and in
 * Chromium that script focus inherits `:focus-visible` from the content —
 * which got it on open, because nothing was focused before the trigger's
 * prevented `pointerdown`. So `base.css`'s 3px television ring was drawn
 * around every hovered item, mouse or keyboard. The browser cannot tell the
 * two apart from where it sits; the surface that roves focus can, because it
 * is the surface the pointer moves over and the key is pressed in.
 *
 * Spread the result on that surface. It writes `data-input="pointer"` after
 * a `pointermove` and `data-input="keyboard"` after a `keydown`, and
 * `base.css` strips the ring from everything under a `pointer` surface.
 * Until the first input it writes nothing, which leaves the browser's own
 * verdict in place — the right default for a menu the keyboard opened and
 * has not yet moved in.
 *
 * Any pointer type counts as `pointer`. Radix only roves on a mouse
 * (`whenMouse`), so a finger or a pen highlights nothing and there is
 * nothing to ring either way.
 *
 * The caller's own handlers run first and are not consulted: this is a
 * record of what happened, not a decision about it, and a handler that
 * prevents the default still saw the pointer.
 */
export type InputModality = 'pointer' | 'keyboard';

export interface InputModalityHandlers<T extends Element> {
  onPointerMove?: (event: PointerEvent<T>) => void;
  onKeyDown?: (event: KeyboardEvent<T>) => void;
}

export function useInputModality<T extends Element>({
  onPointerMove,
  onKeyDown,
}: InputModalityHandlers<T> = {}) {
  // A `pointermove` flood sets the same value every time; React bails out of
  // a same-value update, so the surface re-renders once per change of input.
  const [input, setInput] = useState<InputModality | undefined>(undefined);

  const handlePointerMove = useCallback(
    (event: PointerEvent<T>) => {
      onPointerMove?.(event);
      setInput('pointer');
    },
    [onPointerMove],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<T>) => {
      onKeyDown?.(event);
      setInput('keyboard');
    },
    [onKeyDown],
  );

  return {
    'data-input': input,
    onPointerMove: handlePointerMove,
    onKeyDown: handleKeyDown,
  };
}
