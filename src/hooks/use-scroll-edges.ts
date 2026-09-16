'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * FEAT-20260916-604 — does a scroll container have more on either side?
 *
 * `ScrollHintRow` (BUG-20260822-287) measured this inline for the horizontal
 * axis. The catalogue's filter rail needed the same answer for the vertical
 * one — a sticky rail that overflows a 1440×900 desk with nothing to say so —
 * and the measurement is the same code with `Height` and `Top` in place of
 * `Width` and `Left`, so it lives here once and both hints read it.
 *
 * `start` and `end` are the axis's two ends: left/right for `x`, top/bottom
 * for `y`. A pixel or two of rounding is not "more content", hence the
 * four-pixel slack. The observer watches the container and its direct
 * children because both change the answer: the viewport rotates, chips
 * arrive from a request, a section collapses.
 */
export type ScrollAxis = 'x' | 'y';

export interface ScrollEdges {
  start: boolean;
  end: boolean;
}

const SLACK = 4;

function measureEdges(el: HTMLElement, axis: ScrollAxis): ScrollEdges {
  if (axis === 'x') {
    const max = el.scrollWidth - el.clientWidth;
    return { start: el.scrollLeft > SLACK, end: max - el.scrollLeft > SLACK };
  }
  const max = el.scrollHeight - el.clientHeight;
  return { start: el.scrollTop > SLACK, end: max - el.scrollTop > SLACK };
}

export function useScrollEdges<T extends HTMLElement = HTMLDivElement>(
  axis: ScrollAxis,
) {
  const ref = useRef<T>(null);
  const [edges, setEdges] = useState<ScrollEdges>({ start: false, end: false });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const next = measureEdges(el, axis);
    // Scroll fires per frame; a state write per frame that changes nothing is
    // a render per frame that changes nothing.
    setEdges((prev) =>
      prev.start === next.start && prev.end === next.end ? prev : next,
    );
  }, [axis]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    for (const child of Array.from(el.children)) observer.observe(child);
    return () => observer.disconnect();
  }, [measure]);

  return { ref, edges, onScroll: measure };
}
