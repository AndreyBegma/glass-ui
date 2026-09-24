'use client';

import { type RefCallback, useCallback } from 'react';

/**
 * FEAT-20260924-680 — the tilt: a card that leans toward whatever is looking
 * at it.
 *
 * `.luna-tilt` in `motion.css` is the drawing: a `perspective()` rotation that
 * reads `--tilt-x`/`--tilt-y`, and a sheen child moved by `--tilt-sx`/`--tilt-sy`.
 * This file only writes those four numbers, each unitless in `-1..1`; the CSS
 * multiplies them by `--tilt-angle` and by the sheen's travel, so how far a
 * card leans is the token's decision and never this file's. That split is the
 * whole design:
 * a pointer move becomes four custom properties on one element and a composited
 * transform — never a React render, never a background position (which would
 * repaint the card on every move, the way `MaterialLight`'s highlight does on a
 * desk where one paint is cheap).
 *
 * Two doors, for the two kinds of screen:
 *
 * - `useTilt()` — a desk. One `pointermove`/`pointerleave` pair on the element,
 *   and only while `(hover: hover) and (pointer: fine)` matches and reduced
 *   motion is off; both queries are listened to, so a tablet that gains a
 *   trackpad, or a person who turns reduced motion on mid-session, is followed
 *   rather than read once. Moves are coalesced to one write per frame: a mouse
 *   reports far more often than a screen refreshes.
 * - `tiltFromDirection(el, direction)` — a television, or anything else that
 *   knows where focus came from and has no pointer at all. The card arrives
 *   leaning away from the way the D-pad moved and settles flat over
 *   `--dur-sheet` (the plan's Q8): a tilt held on a screen nobody is touching
 *   would be a card that looks broken.
 *
 * Both are no-ops under reduced motion, where `.luna-tilt` is absent anyway and
 * the lift falls back to `.luna-focus-lift`.
 */

const FINE_POINTER = '(hover: hover) and (pointer: fine)';
const REDUCED = '(prefers-reduced-motion: reduce)';

const TILT_PROPERTIES = [
  '--tilt-x',
  '--tilt-y',
  '--tilt-sx',
  '--tilt-sy',
] as const;

/** Three decimals: finer than a pixel of sheen, and no float noise in styles. */
function unit(value: number): string {
  // `+` folds `-0` into `0`, which would otherwise print as "-0.000".
  return (+value.toFixed(3) || 0).toString();
}

/**
 * Leans `el` toward a point given as `-1..1` on each axis from its centre, in
 * screen axes (`+x` right, `+y` down). The side under the point goes away from
 * the viewer — `--tilt-x` is `+1` at the right edge (`rotateY` positive) and
 * `--tilt-y` is `+1` at the top (`rotateX` positive) — and the sheen follows
 * the point in screen axes.
 */
function writeTilt(el: HTMLElement, nx: number, ny: number) {
  el.style.setProperty('--tilt-x', unit(nx));
  el.style.setProperty('--tilt-y', unit(-ny));
  el.style.setProperty('--tilt-sx', unit(nx));
  el.style.setProperty('--tilt-sy', unit(ny));
}

function clearTilt(el: HTMLElement) {
  for (const property of TILT_PROPERTIES) el.style.removeProperty(property);
}

/**
 * Attaches the pointer tilt to `el` while the device can hover finely and
 * motion is allowed. Returns what detaches everything, listeners and queries.
 */
function attachPointerTilt(el: HTMLElement): () => void {
  const fine = window.matchMedia(FINE_POINTER);
  const reduced = window.matchMedia(REDUCED);

  let frame = 0;
  let pointer: { x: number; y: number } | null = null;
  // Measured once per hover rather than per move: a rect read after a style
  // write forces the style to resolve, and this runs on every frame of a hover.
  let box: DOMRect | null = null;

  const draw = () => {
    frame = 0;
    if (!pointer) return;
    box ??= el.getBoundingClientRect();
    const rect = box;
    if (rect.width === 0 || rect.height === 0) return;
    const nx = ((pointer.x - rect.left) / rect.width) * 2 - 1;
    const ny = ((pointer.y - rect.top) / rect.height) * 2 - 1;
    writeTilt(el, Math.max(-1, Math.min(1, nx)), Math.max(-1, Math.min(1, ny)));
  };

  const onMove = (e: PointerEvent) => {
    pointer = { x: e.clientX, y: e.clientY };
    if (!frame) frame = requestAnimationFrame(draw);
  };

  const onLeave = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    pointer = null;
    box = null;
    clearTilt(el);
  };

  let listening = false;
  const sync = () => {
    const wanted = fine.matches && !reduced.matches;
    if (wanted === listening) return;
    listening = wanted;
    if (wanted) {
      el.addEventListener('pointermove', onMove, { passive: true });
      el.addEventListener('pointerleave', onLeave);
    } else {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      onLeave();
    }
  };

  sync();
  fine.addEventListener('change', sync);
  reduced.addEventListener('change', sync);

  return () => {
    fine.removeEventListener('change', sync);
    reduced.removeEventListener('change', sync);
    el.removeEventListener('pointermove', onMove);
    el.removeEventListener('pointerleave', onLeave);
    onLeave();
  };
}

/**
 * The pointer tilt, as a ref for the element that carries `.luna-tilt`.
 *
 * A callback ref with a cleanup (React 19) rather than a `useRef` and an
 * effect: the listeners belong to one DOM node, and a ref callback is told
 * exactly when that node arrives and leaves — an effect would miss a
 * conditional child that mounts later.
 */
export function useTilt<T extends HTMLElement = HTMLElement>(): RefCallback<T> {
  return useCallback((el: T | null) => {
    if (!el) return;
    return attachPointerTilt(el);
  }, []);
}

export type TiltDirection = 'left' | 'right' | 'up' | 'down';

/**
 * Where the arrival lean points for each D-pad direction: moving right, the
 * card is reached from its left, so its left edge dips as it takes focus.
 */
const ARRIVAL: Record<TiltDirection, readonly [number, number]> = {
  right: [-1, 0],
  left: [1, 0],
  down: [0, -1],
  up: [0, 1],
};

/** Parses the first entry of a computed `transition-duration` into ms. */
function transitionMs(el: HTMLElement): number | null {
  const first = getComputedStyle(el).transitionDuration.split(',')[0]?.trim();
  if (!first) return null;
  const value = Number.parseFloat(first);
  if (!Number.isFinite(value)) return null;
  return first.endsWith('ms') ? value : value * 1000;
}

/** What a settle in progress on an element needs to be stopped early. */
const settling = new WeakMap<HTMLElement, () => void>();

/**
 * Leans `el` in from `direction`, then lets it settle flat over `--dur-sheet`.
 *
 * Call it after moving focus to `el`: `.luna-tilt` only tilts a focused or
 * hovered card. The lean is written with `--tilt-dur` at zero so it is simply
 * there on the first frame, then `--tilt-dur` becomes `var(--dur-sheet)` and
 * the lean is removed, which `.luna-tilt`'s transition turns into the settle.
 * `--tilt-dur` is cleared again when the transition ends, or after its own
 * duration if the event never comes (the card left the page, the tab hid).
 *
 * Returns what stops the settle early and leaves the card at rest.
 */
export function tiltFromDirection(
  el: HTMLElement,
  direction: TiltDirection,
): () => void {
  settling.get(el)?.();
  if (window.matchMedia(REDUCED).matches) return () => {};

  const [nx, ny] = ARRIVAL[direction];
  el.style.setProperty('--tilt-dur', '0s');
  writeTilt(el, nx, ny);
  // The lean has to be resolved as a style before it is taken away, or the
  // two writes collapse into one and there is nothing to transition from.
  void getComputedStyle(el).transform;

  el.style.setProperty('--tilt-dur', 'var(--dur-sheet)');
  clearTilt(el);

  let timer = 0;
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    window.clearTimeout(timer);
    el.removeEventListener('transitionend', onEnd);
    el.removeEventListener('transitioncancel', onEnd);
    el.style.removeProperty('--tilt-dur');
    clearTilt(el);
    if (settling.get(el) === finish) settling.delete(el);
  };
  const onEnd = (e: TransitionEvent) => {
    if (e.target === el && e.propertyName === 'transform') finish();
  };

  el.addEventListener('transitionend', onEnd);
  el.addEventListener('transitioncancel', onEnd);
  timer = window.setTimeout(finish, (transitionMs(el) ?? 0) + 50);
  settling.set(el, finish);
  return finish;
}
