'use client';

import { useSyncExternalStore } from 'react';
import {
  BREAKPOINT_QUERIES,
  type Breakpoint,
  breakpointFor,
} from '../lib/breakpoints';

/**
 * C-281 (AgentDock S-7) — which of the three widths the viewport is in.
 *
 * `useSyncExternalStore` over the three media queries in `breakpoints.ts`, so
 * a resize across an edge re-renders once and a resize inside a band does not
 * re-render at all. Prefer the `tablet:` / `desktop:` CSS variants when the
 * difference is only how something looks; this is for a difference in what is
 * rendered — a rail that folds, a list that hides its detail.
 *
 * **The server has no viewport.** It answers `serverFallback` (default
 * `'desktop'`), and so does the first client render, which then corrects
 * itself after hydration. Pass the band the page is most often opened in.
 *
 * A DOM without `matchMedia` (a test runner, an old embedded view) is read as
 * `breakpointFor(window.innerWidth)`, so the answer is still a band.
 */
function subscribe(onChange: () => void): () => void {
  if (typeof window.matchMedia !== 'function') {
    window.addEventListener('resize', onChange);
    return () => window.removeEventListener('resize', onChange);
  }
  const lists = Object.values(BREAKPOINT_QUERIES).map((query) =>
    window.matchMedia(query),
  );
  for (const list of lists) list.addEventListener('change', onChange);
  return () => {
    for (const list of lists) list.removeEventListener('change', onChange);
  };
}

function read(): Breakpoint {
  if (typeof window.matchMedia !== 'function') {
    return breakpointFor(window.innerWidth);
  }
  for (const [name, query] of Object.entries(BREAKPOINT_QUERIES)) {
    if (window.matchMedia(query).matches) return name as Breakpoint;
  }
  return breakpointFor(window.innerWidth);
}

export function useBreakpoint(
  serverFallback: Breakpoint = 'desktop',
): Breakpoint {
  return useSyncExternalStore(subscribe, read, () => serverFallback);
}
