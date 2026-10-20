import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  BREAKPOINT_QUERIES,
  BREAKPOINTS,
  breakpointFor,
  DESKTOP_QUERY,
  PHONE_QUERY,
  TABLET_QUERY,
} from './breakpoints';

/**
 * C-281 (AgentDock S-7) — the stylesheet and the script name the same widths.
 *
 * `--breakpoint-tablet` and `--breakpoint-desktop` drive the `tablet:` and
 * `desktop:` variants; `BREAKPOINTS` drives `useBreakpoint` and `NavRail`'s
 * `collapsed="tablet"`. If the two drift, a rail folds at one width while the
 * layout beside it reflows at another, and nothing else would notice.
 */
const TOKENS = readFileSync(
  join(new URL('..', import.meta.url).pathname, 'tokens.css'),
  'utf8',
).replace(/\/\*[\s\S]*?\*\//g, ' ');

function remToPx(token: string): number {
  const match = TOKENS.match(new RegExp(`${token}:\\s*([\\d.]+)rem;`));
  if (!match) throw new Error(`tokens.css no longer declares ${token} in rem`);
  return Number(match[1]) * 16;
}

describe('breakpoints', () => {
  test('the tokens and the constants are the same two numbers', () => {
    expect(remToPx('--breakpoint-tablet')).toBe(BREAKPOINTS.tablet);
    expect(remToPx('--breakpoint-desktop')).toBe(BREAKPOINTS.desktop);
  });

  test('they are Tailwind’s `sm` and `lg`, so `sm:` and `tablet:` break together', () => {
    expect(BREAKPOINTS).toEqual({ tablet: 640, desktop: 1024 });
  });

  test('breakpointFor puts each edge pixel in the band above it', () => {
    expect(breakpointFor(0)).toBe('phone');
    expect(breakpointFor(639)).toBe('phone');
    expect(breakpointFor(640)).toBe('tablet');
    expect(breakpointFor(1023)).toBe('tablet');
    expect(breakpointFor(1024)).toBe('desktop');
    expect(breakpointFor(1920)).toBe('desktop');
  });

  test('the three queries tile the axis without overlapping', () => {
    expect(PHONE_QUERY).toBe('(max-width: 639px)');
    expect(TABLET_QUERY).toBe('(min-width: 640px) and (max-width: 1023px)');
    expect(DESKTOP_QUERY).toBe('(min-width: 1024px)');
    expect(BREAKPOINT_QUERIES).toEqual({
      phone: PHONE_QUERY,
      tablet: TABLET_QUERY,
      desktop: DESKTOP_QUERY,
    });
  });
});
