import { afterEach, describe, expect, test } from 'bun:test';
import { act, renderHook } from '@testing-library/react';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { useBreakpoint } from './use-breakpoint';

/**
 * happy-dom has no layout, so the viewport is a stub: `matchMedia` answers
 * from a width this file sets, and a resize fires `change` on every list that
 * is listening. What is asserted is which band a width lands in and that a
 * crossing re-renders — not a real media query engine.
 */
const original = window.matchMedia;
let width = 390;
const listeners = new Set<() => void>();

function matches(query: string): boolean {
  const min = query.match(/min-width: (\d+)px/);
  const max = query.match(/max-width: (\d+)px/);
  return (!min || width >= Number(min[1])) && (!max || width <= Number(max[1]));
}

function stub() {
  window.matchMedia = ((query: string) => ({
    media: query,
    get matches() {
      return matches(query);
    },
    onchange: null,
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

function resize(next: number) {
  width = next;
  for (const fn of [...listeners]) fn();
}

afterEach(() => {
  window.matchMedia = original;
  listeners.clear();
  width = 390;
});

describe('useBreakpoint', () => {
  test('names the band the viewport is in', () => {
    stub();
    for (const [w, band] of [
      [390, 'phone'],
      [640, 'tablet'],
      [1023, 'tablet'],
      [1280, 'desktop'],
    ] as const) {
      width = w;
      const { result, unmount } = renderHook(() => useBreakpoint());
      expect(result.current).toBe(band);
      unmount();
    }
  });

  test('re-renders when the viewport crosses an edge', () => {
    stub();
    width = 1280;
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current).toBe('desktop');
    act(() => resize(800));
    expect(result.current).toBe('tablet');
    act(() => resize(500));
    expect(result.current).toBe('phone');
  });

  test('stops listening on unmount', () => {
    stub();
    const { unmount } = renderHook(() => useBreakpoint());
    expect(listeners.size).toBeGreaterThan(0);
    unmount();
    expect(listeners.size).toBe(0);
  });

  test('the server answers the fallback, desktop unless told otherwise', () => {
    function Probe({
      fallback,
    }: {
      fallback?: 'phone' | 'tablet' | 'desktop';
    }) {
      return createElement('span', null, useBreakpoint(fallback));
    }
    expect(renderToString(createElement(Probe))).toContain('desktop');
    expect(
      renderToString(createElement(Probe, { fallback: 'tablet' })),
    ).toContain('tablet');
  });
});
