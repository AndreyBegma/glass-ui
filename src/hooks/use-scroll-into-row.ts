'use client';

import { type RefObject, useLayoutEffect } from 'react';

/**
 * FEAT-20260930-004 (SYS-16) moved here by FEAT-20261013-005 (W241) — the
 * active item of a horizontally scrolling row brings itself to the middle.
 *
 * The row's own `scrollLeft`, not `scrollIntoView`: that one also scrolls
 * every ancestor, and a tab row below the fold would drag the page down to it
 * on load. Centred, so the items either side of the active one show too. The
 * row is the item's parent, and must be `relative` — that makes it the item's
 * `offsetParent`, which is what `offsetLeft` is measured from.
 *
 * Nothing happens while the row fits: there is nothing to scroll.
 */
export function useScrollIntoRow(ref: RefObject<HTMLElement | null>, active: boolean) {
  useLayoutEffect(() => {
    const item = ref.current;
    const row = item?.parentElement;
    if (!active || !item || !row || row.scrollWidth <= row.clientWidth) return;
    row.scrollLeft = item.offsetLeft - (row.clientWidth - item.offsetWidth) / 2;
  }, [ref, active]);
}
