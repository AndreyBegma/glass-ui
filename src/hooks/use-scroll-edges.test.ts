import { describe, expect, test } from 'bun:test';
import { act, renderHook } from '@testing-library/react';
import { useScrollEdges } from './use-scroll-edges';

/**
 * happy-dom has no layout, so the scroll geometry is written onto the element
 * by hand: `scrollWidth`/`clientWidth`/`scrollLeft` for the row's axis and
 * the `Height`/`Top` trio for the column's. What is asserted is the arithmetic
 * and the axis, not a measured rectangle.
 */
function box(overrides: Record<string, number>): HTMLDivElement {
  const el = document.createElement('div');
  for (const [key, value] of Object.entries(overrides)) {
    Object.defineProperty(el, key, {
      configurable: true,
      value,
      writable: true,
    });
  }
  return el;
}

describe('useScrollEdges', () => {
  test('x: nothing on either side while the content fits', () => {
    const { result } = renderHook(() => useScrollEdges('x'));
    (result.current.ref as { current: HTMLDivElement | null }).current = box({
      scrollWidth: 200,
      clientWidth: 200,
      scrollLeft: 0,
    });
    act(() => result.current.onScroll());
    expect(result.current.edges).toEqual({ start: false, end: false });
  });

  test('x: more to the right at the start, more to the left at the end, both in the middle', () => {
    const { result } = renderHook(() => useScrollEdges('x'));
    const el = box({ scrollWidth: 600, clientWidth: 200, scrollLeft: 0 });
    (result.current.ref as { current: HTMLDivElement | null }).current = el;

    act(() => result.current.onScroll());
    expect(result.current.edges).toEqual({ start: false, end: true });

    el.scrollLeft = 200;
    act(() => result.current.onScroll());
    expect(result.current.edges).toEqual({ start: true, end: true });

    el.scrollLeft = 400;
    act(() => result.current.onScroll());
    expect(result.current.edges).toEqual({ start: true, end: false });
  });

  test('y reads the vertical trio and ignores the horizontal one', () => {
    const { result } = renderHook(() => useScrollEdges('y'));
    const el = box({
      scrollWidth: 600,
      clientWidth: 200,
      scrollLeft: 0,
      scrollHeight: 900,
      clientHeight: 300,
      scrollTop: 0,
    });
    (result.current.ref as { current: HTMLDivElement | null }).current = el;

    act(() => result.current.onScroll());
    expect(result.current.edges).toEqual({ start: false, end: true });

    el.scrollTop = 600;
    act(() => result.current.onScroll());
    expect(result.current.edges).toEqual({ start: true, end: false });
  });

  test('a few pixels of rounding are not "more content"', () => {
    const { result } = renderHook(() => useScrollEdges('y'));
    (result.current.ref as { current: HTMLDivElement | null }).current = box({
      scrollHeight: 303,
      clientHeight: 300,
      scrollTop: 0,
    });
    act(() => result.current.onScroll());
    expect(result.current.edges).toEqual({ start: false, end: false });
  });

  test('an unchanged answer keeps the same state object', () => {
    const { result } = renderHook(() => useScrollEdges('x'));
    (result.current.ref as { current: HTMLDivElement | null }).current = box({
      scrollWidth: 600,
      clientWidth: 200,
      scrollLeft: 0,
    });
    act(() => result.current.onScroll());
    const first = result.current.edges;
    act(() => result.current.onScroll());
    expect(result.current.edges).toBe(first);
  });
});
