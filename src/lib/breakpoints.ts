/**
 * C-281 (AgentDock S-7) — the three widths, for script.
 *
 * `tokens.css` names them for CSS (`--breakpoint-tablet`,
 * `--breakpoint-desktop`, and the `tablet:` / `desktop:` variants they emit).
 * This is the same two numbers for code that has to decide in JavaScript —
 * `useBreakpoint`, `NavRail`'s `collapsed="tablet"`, a consumer's own
 * `matchMedia`. `breakpoints.spec.ts` reads the stylesheet and fails if the
 * two ever disagree.
 *
 *   phone    below 640px
 *   tablet   640–1023px
 *   desktop  1024px and up
 *
 * Pure and framework-free: no React, no `window`, safe on the server.
 */
export type Breakpoint = 'phone' | 'tablet' | 'desktop';

/** The first pixel of each band above the phone. Tailwind's `sm` and `lg`. */
export const BREAKPOINTS = {
  tablet: 640,
  desktop: 1024,
} as const;

/** Below the tablet edge. */
export const PHONE_QUERY = `(max-width: ${BREAKPOINTS.tablet - 1}px)`;
/** The tablet band, both edges. */
export const TABLET_QUERY = `(min-width: ${BREAKPOINTS.tablet}px) and (max-width: ${BREAKPOINTS.desktop - 1}px)`;
/** The desktop edge and up. */
export const DESKTOP_QUERY = `(min-width: ${BREAKPOINTS.desktop}px)`;

/** Each band's media query, keyed by its name. */
export const BREAKPOINT_QUERIES: Record<Breakpoint, string> = {
  phone: PHONE_QUERY,
  tablet: TABLET_QUERY,
  desktop: DESKTOP_QUERY,
};

/** The band a viewport width (CSS pixels) falls in. */
export function breakpointFor(width: number): Breakpoint {
  if (width < BREAKPOINTS.tablet) return 'phone';
  if (width < BREAKPOINTS.desktop) return 'tablet';
  return 'desktop';
}
