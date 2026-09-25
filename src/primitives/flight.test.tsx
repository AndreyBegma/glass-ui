import { afterEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { act, render } from '@testing-library/react';
import { FlightLayer, type FlightOptions, useFlight } from './flight';

/**
 * FEAT-20260924-680 — the flight's contract, not its curve.
 *
 * happy-dom runs no transitions, so what is asserted is what the consumer is
 * promised: `onLand` always comes, exactly once — at once under reduced motion
 * with nothing drawn, after a fade when the destination never appears, and
 * after the transform when it does — and the clone animates nothing but
 * `transform` and `opacity`.
 */

function stubReduced(reduced: boolean) {
  return spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        matches: query === '(prefers-reduced-motion: reduce)' && reduced,
        media: query,
        addEventListener() {},
        removeEventListener() {},
      }) as unknown as MediaQueryList,
  );
}

let media: ReturnType<typeof stubReduced> | undefined;
afterEach(() => media?.mockRestore());

/**
 * Calls `fly` when pressed — a flight starts from a gesture, after the layer
 * has mounted, which is the order a real page has.
 */
function Launcher({ options }: { options: FlightOptions }) {
  const fly = useFlight();
  return (
    <button type="button" onClick={() => fly(options)}>
      Save
    </button>
  );
}

function press() {
  act(() => {
    document.querySelector('button')!.click();
  });
}

const FROM = new DOMRect(100, 600, 120, 180);
const TO = new DOMRect(40, 80, 360, 540);

function layer() {
  return document.querySelector<HTMLElement>('[data-flight-layer]');
}

function clone() {
  return layer()?.querySelector('img') ?? null;
}

function nextFrame() {
  return act(
    () => new Promise((resolve) => requestAnimationFrame(() => resolve(null))),
  );
}

function transitionEnd(target: Element) {
  act(() => {
    target.dispatchEvent(new Event('transitionend'));
  });
}

describe('FlightLayer', () => {
  test('is one fixed, inert layer on <body>', () => {
    media = stubReduced(false);
    render(<FlightLayer>{null}</FlightLayer>);
    const el = layer()!;
    expect(el.parentElement).toBe(document.body);
    expect(el.getAttribute('aria-hidden')).toBe('true');
    expect(el.className).toContain('fixed');
    expect(el.className).toContain('pointer-events-none');
  });

  test('under reduced motion, lands at once and draws nothing', () => {
    media = stubReduced(true);
    const onLand = mock();
    render(
      <FlightLayer>
        <Launcher
          options={{ src: '/p.jpg', from: FROM, to: () => TO, onLand }}
        />
      </FlightLayer>,
    );
    press();
    expect(onLand).toHaveBeenCalledTimes(1);
    expect(clone()).toBeNull();
  });

  test('with no layer above it, fly still lands', () => {
    const onLand = mock();
    render(
      <Launcher
        options={{ src: '/p.jpg', from: FROM, to: () => TO, onLand }}
      />,
    );
    press();
    expect(onLand).toHaveBeenCalledTimes(1);
  });

  test('draws the clone where it took off, and asks for the destination a frame later', async () => {
    media = stubReduced(false);
    const to = mock(() => TO);
    render(
      <FlightLayer>
        <Launcher
          options={{ src: '/p.jpg', from: FROM, to, radius: [8, 20] }}
        />
      </FlightLayer>,
    );
    press();

    const img = clone()!;
    expect(img.style.left).toBe('100px');
    expect(img.style.width).toBe('120px');
    expect(img.style.borderRadius).toBe('8px');
    expect(to).not.toHaveBeenCalled();

    await nextFrame();
    expect(to).toHaveBeenCalledTimes(1);
  });

  test('flies by transform alone, laid out and rounded where it lands, then lands once', async () => {
    media = stubReduced(false);
    const onLand = mock();
    render(
      <FlightLayer>
        <Launcher
          options={{
            src: '/p.jpg',
            from: FROM,
            to: () => TO,
            radius: [8, 20],
            onLand,
          }}
        />
      </FlightLayer>,
    );
    press();
    await nextFrame();

    const img = clone()!;
    expect(img.style.left).toBe('40px');
    expect(img.style.width).toBe('360px');
    expect(img.style.borderRadius).toBe('20px');
    expect(img.style.transform).toBe('none');
    expect(img.style.transition).toContain('transform');
    expect(img.style.transition).toContain('var(--dur-scene)');
    expect(img.style.transition).not.toMatch(
      /radius|clip|width|height|left|top/,
    );
    expect(onLand).not.toHaveBeenCalled();

    transitionEnd(img);
    transitionEnd(img);
    expect(onLand).toHaveBeenCalledTimes(1);
    expect(clone()).toBeNull();
  });

  test('when to() returns null, it fades where it is and still lands', async () => {
    media = stubReduced(false);
    const onLand = mock();
    render(
      <FlightLayer>
        <Launcher
          options={{ src: '/p.jpg', from: FROM, to: () => null, onLand }}
        />
      </FlightLayer>,
    );
    press();
    await nextFrame();

    const img = clone()!;
    expect(img.style.left).toBe('100px');
    expect(img.style.transform).toBe('');
    expect(img.style.opacity).toBe('0');
    expect(img.style.transition).toMatch(/^opacity /);

    transitionEnd(img);
    expect(onLand).toHaveBeenCalledTimes(1);
    expect(clone()).toBeNull();
  });

  test('lands on the backstop when transitionend never comes', async () => {
    media = stubReduced(false);
    const onLand = mock();
    const timers = spyOn(window, 'setTimeout');
    render(
      <FlightLayer>
        <Launcher
          options={{ src: '/p.jpg', from: FROM, to: () => TO, onLand }}
        />
      </FlightLayer>,
    );
    press();
    await nextFrame();

    const backstop = timers.mock.calls.at(-1)!;
    timers.mockRestore();
    act(() => (backstop[0] as () => void)());
    expect(onLand).toHaveBeenCalledTimes(1);
    expect(clone()).toBeNull();
  });
});
