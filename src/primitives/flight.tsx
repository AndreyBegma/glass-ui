'use client';

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from 'react';

/**
 * FEAT-20260924-680 — an image that flies from one place on the page to
 * another: a poster into the title page's header, a thumbnail into the lists
 * entry.
 *
 * **One layer, only `transform` and `opacity`.** `FlightLayer` is a single
 * `position: fixed` element appended to `<body>`, so no page transform, no
 * template fade and no `overflow: hidden` card can clip or re-anchor what is
 * in flight. A flight is one `<img>` inside it, created and removed by hand
 * rather than rendered: a flight that re-rendered React on every frame would
 * be the opposite of the point. The layer is `aria-hidden` and ignores the
 * pointer — the clone is a picture of something the page already says. It
 * sits on the transient layer, with the toasts: above the chrome it may land
 * on, below nothing that could need a click while it is in the air.
 *
 * **FLIP, laid out at the destination.** The clone is first drawn at `from`
 * exactly as the source looked. When the flight starts it is re-laid out at
 * the destination's box with its destination radius, and inverted back onto
 * `from` with a translate and a non-uniform scale; the transition then takes
 * the transform to `none`. The image is therefore rasterised once, at the size
 * it lands at, and only composited after that — and `border-radius` and
 * `clip-path` are never animated, because both repaint every frame.
 *
 * **A duration, not a spring.** The transition is `var(--dur-scene)` on
 * `var(--ease-sheet)`: a flight crosses the viewport, which is what
 * `--dur-scene` exists for. `SPRINGS.morph` would read the same on a desk, but
 * a Motion spring reaches the compositor only through `linear()` easing, which
 * Luna's Samsung (Tizen, Chromium 94–108) does not have — there it would run on
 * the main thread. A CSS transition is the one path that is identical on every
 * engine Luna ships to.
 *
 * **The destination is asked for as late as possible.** `to()` is called on
 * the frame after the clone is drawn, so a page that is navigating can mount
 * its header first. `null` — the destination never appeared — or a box with
 * no size fades the clone out where it is; a flight never lands on a guess.
 *
 * **Under reduced motion nothing is drawn** and `onLand` runs at once: the
 * consumer's "after" state (a count bumping, a header showing its poster) is
 * the whole message, and the flight was only ever the way there. The same
 * happens when there is no `FlightLayer` above the caller, or when `fly` runs
 * before the layer's first commit (it is created in an effect, so a server
 * render has nothing to match) — a missing layer is a missing flourish, never
 * a lost callback.
 */

export interface FlightOptions {
  /** The image to fly. It should already be in the cache: the source's `src`. */
  src: string;
  /** Where it takes off: the source's `getBoundingClientRect()`. */
  from: DOMRect;
  /** Where it lands, read on the frame the flight starts; `null` fades it out. */
  to: () => DOMRect | null;
  /** Corner radius in px at take-off and at landing. */
  radius?: readonly [from: number, to: number];
  /** Called once, when it has landed or faded — or at once under reduced motion. */
  onLand?: () => void;
}

type Fly = (options: FlightOptions) => void;

const REDUCED = '(prefers-reduced-motion: reduce)';

/**
 * How long past its own duration a flight may run before it is landed anyway.
 * `transitionend` does not fire in a hidden tab, or when the transition is
 * cancelled by a style change; the clone must never be stranded on screen.
 */
const BACKSTOP_GRACE_MS = 100;
/** Used when the computed duration cannot be read, e.g. tokens not loaded. */
const BACKSTOP_FALLBACK_MS = 1000;

const FlightContext = createContext<Fly>((options) => options.onLand?.());

function place(img: HTMLImageElement, box: DOMRect, radius: number) {
  img.style.left = `${box.left}px`;
  img.style.top = `${box.top}px`;
  img.style.width = `${box.width}px`;
  img.style.height = `${box.height}px`;
  img.style.borderRadius = `${radius}px`;
}

function durationMs(img: HTMLImageElement): number {
  const first = getComputedStyle(img).transitionDuration.split(',')[0]?.trim();
  const value = Number.parseFloat(first ?? '');
  if (!first || !Number.isFinite(value) || value === 0)
    return BACKSTOP_FALLBACK_MS;
  return first.endsWith('ms') ? value : value * 1000;
}

function launch(layer: HTMLElement, options: FlightOptions) {
  const { src, from, to, radius = [0, 0], onLand } = options;

  const img = document.createElement('img');
  img.src = src;
  img.alt = '';
  img.decoding = 'sync';
  img.style.position = 'absolute';
  img.style.objectFit = 'cover';
  img.style.transformOrigin = '0 0';
  img.style.willChange = 'transform, opacity';
  place(img, from, radius[0]);
  layer.appendChild(img);

  let landed = false;
  let timer = 0;
  const finish = () => {
    if (landed) return;
    landed = true;
    window.clearTimeout(timer);
    img.remove();
    onLand?.();
  };
  const onEnd = (e: TransitionEvent) => {
    if (e.target === img) finish();
  };

  requestAnimationFrame(() => {
    const target = to();
    img.addEventListener('transitionend', onEnd);
    img.addEventListener('transitioncancel', onEnd);

    if (!target || target.width === 0 || target.height === 0) {
      img.style.transition = 'opacity var(--dur-base) var(--ease-sheet)';
      img.style.opacity = '0';
    } else {
      // Invert: laid out where it lands, transformed back onto where it began.
      place(img, target, radius[1]);
      img.style.transform = `translate(${from.left - target.left}px, ${from.top - target.top}px) scale(${from.width / target.width}, ${from.height / target.height})`;
      // Resolve the inverted frame before the transition is set, or the two
      // writes merge and the image jumps straight to the end.
      void img.getBoundingClientRect();
      img.style.transition = 'transform var(--dur-scene) var(--ease-sheet)';
      img.style.transform = 'none';
    }

    timer = window.setTimeout(finish, durationMs(img) + BACKSTOP_GRACE_MS);
  });
}

/**
 * The layer every flight is drawn in. Mount it once, high in the tree — above
 * any page template that fades or transforms, so a flight outlives the page it
 * took off from.
 */
export function FlightLayer({ children }: { children: ReactNode }) {
  const layerRef = useRef<HTMLDivElement>(null);

  // Created by hand rather than portalled: the layer has no React children —
  // every flight is an element `launch` appends and removes itself — and an
  // effect only runs in a browser, so a server render has nothing to match.
  useEffect(() => {
    const layer = document.createElement('div');
    layer.setAttribute('aria-hidden', 'true');
    layer.setAttribute('data-flight-layer', '');
    layer.className =
      'pointer-events-none fixed inset-0 z-transient overflow-hidden';
    document.body.appendChild(layer);
    layerRef.current = layer;
    return () => {
      layerRef.current = null;
      layer.remove();
    };
  }, []);

  const fly = useCallback<Fly>((options) => {
    const layer = layerRef.current;
    if (!layer || window.matchMedia(REDUCED).matches) {
      options.onLand?.();
      return;
    }
    launch(layer, options);
  }, []);

  return <FlightContext value={fly}>{children}</FlightContext>;
}

/**
 * The `fly` of the nearest `FlightLayer`. Stable across renders, so it can sit
 * in an effect's dependencies or a memoised handler without churning either.
 */
export function useFlight(): Fly {
  return useContext(FlightContext);
}
