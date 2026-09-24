import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import { fireEvent, render } from '@testing-library/react';
import { tiltFromDirection, useTilt } from './tilt';

/**
 * FEAT-20260924-680 — the tilt's gates, not its drawing.
 *
 * happy-dom has no compositor and no cascade, so nothing here asserts what a
 * tilted card looks like; `motion.spec.ts` holds `.luna-tilt` to its rules.
 * What is asserted is what only JavaScript can get wrong: that nothing is
 * attached on a device without a fine pointer or under reduced motion, that a
 * query changing mid-session is followed, that unmounting leaves no listener
 * behind, and that the television's arrival lean settles back to rest.
 */

type Listener = () => void;

/** A `matchMedia` whose answers the test sets, and whose `change` it fires. */
function stubMedia(initial: Record<string, boolean>) {
  const state = { ...initial };
  const listeners = new Map<string, Set<Listener>>();
  const spy = spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        get matches() {
          return state[query] ?? false;
        },
        media: query,
        addEventListener: (_: string, fn: Listener) => {
          if (!listeners.has(query)) listeners.set(query, new Set());
          listeners.get(query)!.add(fn);
        },
        removeEventListener: (_: string, fn: Listener) => {
          listeners.get(query)?.delete(fn);
        },
      }) as unknown as MediaQueryList,
  );
  return {
    set(query: string, value: boolean) {
      state[query] = value;
      for (const fn of listeners.get(query) ?? []) fn();
    },
    listenerCount: () =>
      [...listeners.values()].reduce((n, set) => n + set.size, 0),
    restore: () => spy.mockRestore(),
  };
}

const FINE = '(hover: hover) and (pointer: fine)';
const REDUCED = '(prefers-reduced-motion: reduce)';

function Card() {
  const ref = useTilt<HTMLDivElement>();
  return <div ref={ref} data-testid="card" className="luna-tilt" />;
}

/** Runs queued animation frames now; the tilt coalesces moves into one. */
function flushFrames() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
}

let media: ReturnType<typeof stubMedia>;

afterEach(() => media?.restore());

/** Renders a card with a known box, moves the pointer to its right edge. */
async function hoverRightEdge() {
  const view = render(<Card />);
  const card = view.getByTestId('card');
  spyOn(card, 'getBoundingClientRect').mockReturnValue(
    new DOMRect(0, 0, 200, 300),
  );
  fireEvent.pointerMove(card, { clientX: 200, clientY: 150 });
  await flushFrames();
  return { ...view, card };
}

describe('useTilt', () => {
  test('attaches nothing without a fine pointer', async () => {
    media = stubMedia({ [FINE]: false, [REDUCED]: false });
    const { card } = await hoverRightEdge();
    expect(card.getAttribute('style')).toBeNull();
  });

  test('attaches nothing under reduced motion, even with a mouse', async () => {
    media = stubMedia({ [FINE]: true, [REDUCED]: true });
    const { card } = await hoverRightEdge();
    expect(card.getAttribute('style')).toBeNull();
  });

  test('a fine pointer tilts toward itself, one write per frame', async () => {
    media = stubMedia({ [FINE]: true, [REDUCED]: false });
    const { getByTestId } = render(<Card />);
    const card = getByTestId('card');
    spyOn(card, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(0, 0, 200, 300),
    );

    fireEvent.pointerMove(card, { clientX: 10, clientY: 10 });
    fireEvent.pointerMove(card, { clientX: 200, clientY: 150 });
    await flushFrames();

    // Only the last move of the frame is drawn: the right edge, mid-height.
    expect(card.style.getPropertyValue('--tilt-x')).toBe('1');
    expect(card.style.getPropertyValue('--tilt-y')).toBe('0');
    expect(card.style.getPropertyValue('--tilt-sx')).toBe('1');

    fireEvent.pointerLeave(card);
    expect(card.style.getPropertyValue('--tilt-x')).toBe('');
  });

  test('the side under the pointer dips: top-left leans left and back', async () => {
    media = stubMedia({ [FINE]: true, [REDUCED]: false });
    const { card } = await hoverRightEdge();
    fireEvent.pointerMove(card, { clientX: 0, clientY: 0 });
    await flushFrames();
    // Unitless -1..1; the CSS owns the angle and the sheen's travel.
    expect(card.style.getPropertyValue('--tilt-x')).toBe('-1');
    expect(card.style.getPropertyValue('--tilt-y')).toBe('1');
    expect(card.style.getPropertyValue('--tilt-sx')).toBe('-1');
    expect(card.style.getPropertyValue('--tilt-sy')).toBe('-1');
  });

  test('follows the query: detaches and rests when reduced motion turns on', async () => {
    media = stubMedia({ [FINE]: true, [REDUCED]: false });
    const { getByTestId } = render(<Card />);
    const card = getByTestId('card');
    const removeSpy = spyOn(card, 'removeEventListener');

    fireEvent.pointerMove(card, { clientX: 0, clientY: 0 });
    await flushFrames();
    media.set(REDUCED, true);

    expect(removeSpy.mock.calls.map(([type]) => type)).toEqual([
      'pointermove',
      'pointerleave',
    ]);
    expect(card.style.getPropertyValue('--tilt-x')).toBe('');
  });

  test('attaches when a fine pointer appears mid-session', async () => {
    media = stubMedia({ [FINE]: false, [REDUCED]: false });
    const { card } = await hoverRightEdge();
    media.set(FINE, true);
    fireEvent.pointerMove(card, { clientX: 200, clientY: 150 });
    await flushFrames();
    expect(card.style.getPropertyValue('--tilt-x')).toBe('1');
  });

  test('unmounting removes the listeners and stops listening to the queries', () => {
    media = stubMedia({ [FINE]: true, [REDUCED]: false });
    const { getByTestId, unmount } = render(<Card />);
    const card = getByTestId('card');
    const removeSpy = spyOn(card, 'removeEventListener');
    expect(media.listenerCount()).toBe(2);

    unmount();

    expect(media.listenerCount()).toBe(0);
    expect(removeSpy.mock.calls.map(([type]) => type)).toContain('pointermove');
    expect(removeSpy.mock.calls.map(([type]) => type)).toContain(
      'pointerleave',
    );
  });
});

describe('tiltFromDirection', () => {
  test('needs no pointer: leans in, then hands the settle to --dur-sheet', () => {
    media = stubMedia({ [FINE]: false, [REDUCED]: false });
    const el = document.createElement('div');

    // What the element carried at the moment its style was resolved.
    const resolved: { dur: string; x: string }[] = [];
    const original = window.getComputedStyle.bind(window);
    const spy = spyOn(window, 'getComputedStyle').mockImplementation(
      (target) => {
        if (target === el) {
          resolved.push({
            dur: el.style.getPropertyValue('--tilt-dur'),
            x: el.style.getPropertyValue('--tilt-x'),
          });
        }
        return original(target);
      },
    );
    tiltFromDirection(el, 'right');
    spy.mockRestore();

    // Reached moving right: the left edge dips, written with no transition.
    expect(resolved).toContainEqual({ dur: '0s', x: '-1' });
    // Then released to rest over the sheet duration.
    expect(el.style.getPropertyValue('--tilt-dur')).toBe('var(--dur-sheet)');
    expect(el.style.getPropertyValue('--tilt-x')).toBe('');
  });

  test('the settle cleans up after itself when the transition ends', () => {
    media = stubMedia({ [FINE]: false, [REDUCED]: false });
    const el = document.createElement('div');
    tiltFromDirection(el, 'up');

    const end = new Event('transitionend') as TransitionEvent;
    Object.defineProperty(end, 'propertyName', { value: 'transform' });
    el.dispatchEvent(end);

    expect(el.style.getPropertyValue('--tilt-dur')).toBe('');
  });

  test('a second move stops the first settle before starting its own', () => {
    media = stubMedia({ [FINE]: false, [REDUCED]: false });
    const el = document.createElement('div');
    const stopFirst = tiltFromDirection(el, 'left');
    tiltFromDirection(el, 'down');
    stopFirst();
    // The second settle still owns the element.
    expect(el.style.getPropertyValue('--tilt-dur')).toBe('var(--dur-sheet)');
  });

  test('writes nothing under reduced motion', () => {
    media = stubMedia({ [FINE]: false, [REDUCED]: true });
    const el = document.createElement('div');
    tiltFromDirection(el, 'left');
    expect(el.getAttribute('style')).toBeNull();
  });
});
