/// <reference types="bun" />

/**
 * FEAT-20260902-004 — the DOM the package's tests run in.
 *
 * The reference above is not decoration. `tsconfig.json` leaves `types`
 * unset, and TypeScript is not picking `@types/bun` up from `node_modules`
 * on its own here, so `bun:test` resolves to nothing in all five files that
 * import it. Pulling it in once, from the file every test run loads first,
 * puts the ambient declarations into the program for the whole of it. The
 * tidier fix is `"types": ["bun", "react"]` in `tsconfig.json`, which is not
 * this slot's file to edit.
 *
 * The package had no tests at all before this ticket, only `tokens.spec.ts`,
 * which reads source text and needs no browser. The four shell patterns are
 * behaviour rather than markup — a highlight that travels, a circle that
 * unmounts so a sheet can grow out of it, arrows that rove, a key that opens a
 * dialog — and behaviour that is untested here is retested by hand in every
 * application that consumes it.
 *
 * `bun test` has no DOM of its own, so one is registered globally before any
 * test file is evaluated. This file is a `preload` (see `bunfig.toml`) rather
 * than an import inside each test: React reads `document` while its module is
 * being evaluated, so a DOM installed from inside a test file arrives after the
 * thing that needed it.
 *
 * happy-dom rather than jsdom because it starts in single-digit milliseconds
 * and this package's tests are numerous and tiny. What it costs is below.
 */
import { GlobalRegistrator } from '@happy-dom/global-registrator';

GlobalRegistrator.register({
  url: 'http://localhost/',
  // A phone, because two of the four patterns exist for narrow widths. Nothing
  // asserts on it; it only stops layout code reading a zero-sized viewport.
  width: 390,
  height: 844,
});

/**
 * React 19 refuses to run `act` — which is what Testing Library's `render` and
 * `fireEvent` are wrapped in — unless the environment declares itself a test
 * environment. Without it every state update warns and some are dropped.
 */
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

/**
 * What happy-dom does not implement, and Radix does not check for.
 *
 * Each of these is a real browser API that Radix's dismissable layer and
 * floating positioning call unconditionally. A missing one throws inside a
 * `useEffect`, which surfaces as a test failing on an assertion several lines
 * later with no mention of the actual cause — so they are stubbed here, once,
 * rather than debugged four times.
 *
 * Deliberately narrow. These are presence stubs, not simulations: nothing in
 * this package's tests asserts on a measured rectangle, because a headless DOM
 * has no layout to measure and an assertion that pretended otherwise would be
 * testing the stub.
 */
if (!('ResizeObserver' in globalThis)) {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

if (!('DOMRect' in globalThis)) {
  (globalThis as unknown as { DOMRect: unknown }).DOMRect = class {
    constructor(
      readonly x = 0,
      readonly y = 0,
      readonly width = 0,
      readonly height = 0,
    ) {}
    get top() {
      return this.y;
    }
    get left() {
      return this.x;
    }
    get right() {
      return this.x + this.width;
    }
    get bottom() {
      return this.y + this.height;
    }
    toJSON() {
      return { ...this };
    }
  };
}

for (const name of [
  'hasPointerCapture',
  'setPointerCapture',
  'releasePointerCapture',
  'scrollIntoView',
] as const) {
  if (!(name in Element.prototype)) {
    (Element.prototype as unknown as Record<string, () => void>)[name] =
      () => {};
  }
}

/**
 * Motion is pushed off the Web Animations API and onto its own frame loop.
 *
 * Motion prefers WAAPI whenever `Element.prototype.animate` exists, and
 * happy-dom provides one — but its `cancel()` rejects the animation's
 * `finished` promise with an `AbortError` that nothing is awaiting. React
 * unmounting a component mid-spring, which is what every one of these tests
 * does, therefore raises an unhandled rejection: `bun test` reports it as an
 * error between tests and exits non-zero with every assertion passing.
 *
 * Removing the method is what Motion's own feature detection reads
 * (`Object.hasOwnProperty.call(Element.prototype, 'animate')`), and its
 * fallback is the JavaScript loop it uses on any browser without WAAPI. That
 * loop is also the honest one to test against here: a headless DOM has no
 * compositor, so the accelerated path was never running anything.
 *
 * Done before the first import, because the detection is memoised on first use.
 */
delete (Element.prototype as Partial<Element>).animate;

/**
 * Testing Library does not unmount for you, and Radix portals to
 * `document.body` — so without this the second test in a file finds the first
 * test's dialog still open and matches the wrong element.
 *
 * Imported after registration, not at the top: Testing Library reads `document`
 * as its module evaluates.
 */
const { cleanup } = await import('@testing-library/react');
const { afterEach } = await import('bun:test');

afterEach(cleanup);
