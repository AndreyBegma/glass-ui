/**
 * #161 — the arithmetic behind `FloatingWindow`, kept out of the component
 * so it can be read and tested without a DOM.
 *
 * Every rectangle the window draws goes through `fit`: the person's chosen
 * rectangle is kept as they left it, and what is drawn is that rectangle
 * clamped to the viewport as it is now. A browser window that shrinks pulls
 * the floating window in; one that grows back gives it its old place again,
 * because the choice itself was never overwritten.
 */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface SizeLimits {
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;
}

/** Which edge or corner a resize handle sits on. */
export type ResizeEdge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export const RESIZE_EDGES: readonly ResizeEdge[] = [
  'n',
  's',
  'e',
  'w',
  'ne',
  'nw',
  'se',
  'sw',
];

/** The gap kept between the window and the viewport's edges, in px. */
export const VIEWPORT_MARGIN = 8;

/** `lo` wins when the range is empty: a minimum is a floor, not a suggestion. */
const clamp = (value: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, value));

/**
 * The limits as they apply in this viewport. The viewport wins over
 * `minWidth`: a window that may not leave the screen cannot be wider than
 * the screen, whatever it was asked to be.
 */
export function effectiveLimits(
  limits: SizeLimits,
  viewport: Size,
): SizeLimits {
  const roomWidth = Math.max(0, viewport.width - 2 * VIEWPORT_MARGIN);
  const roomHeight = Math.max(0, viewport.height - 2 * VIEWPORT_MARGIN);
  const maxWidth = Math.min(limits.maxWidth, roomWidth);
  const maxHeight = Math.min(limits.maxHeight, roomHeight);
  return {
    maxWidth,
    maxHeight,
    minWidth: Math.min(limits.minWidth, maxWidth),
    minHeight: Math.min(limits.minHeight, maxHeight),
  };
}

/** The rectangle sized within its limits and moved, if it has to be, back inside the viewport. */
export function fit(rect: Rect, limits: SizeLimits, viewport: Size): Rect {
  const l = effectiveLimits(limits, viewport);
  const width = clamp(rect.width, l.minWidth, l.maxWidth);
  const height = clamp(rect.height, l.minHeight, l.maxHeight);
  return {
    width,
    height,
    x: clamp(rect.x, VIEWPORT_MARGIN, viewport.width - VIEWPORT_MARGIN - width),
    y: clamp(
      rect.y,
      VIEWPORT_MARGIN,
      viewport.height - VIEWPORT_MARGIN - height,
    ),
  };
}

/** `start` moved by a pointer delta, kept inside the viewport. */
export function moveRect(
  start: Rect,
  dx: number,
  dy: number,
  limits: SizeLimits,
  viewport: Size,
): Rect {
  return fit({ ...start, x: start.x + dx, y: start.y + dy }, limits, viewport);
}

/**
 * `start` resized from `edge` by a pointer delta. The opposite edge stays where
 * it was: dragging the west edge moves `x` and changes `width` by the same
 * amount, so the window grows towards the pointer and nowhere else. The size
 * stops at its limits and at the viewport's edge on the side being dragged.
 */
export function resizeRect(
  start: Rect,
  edge: ResizeEdge,
  dx: number,
  dy: number,
  limits: SizeLimits,
  viewport: Size,
): Rect {
  const l = effectiveLimits(limits, viewport);
  let { x, y, width, height } = start;

  if (edge.includes('e')) {
    width = clamp(
      start.width + dx,
      l.minWidth,
      Math.min(l.maxWidth, viewport.width - VIEWPORT_MARGIN - start.x),
    );
  } else if (edge.includes('w')) {
    const right = start.x + start.width;
    width = clamp(
      start.width - dx,
      l.minWidth,
      Math.min(l.maxWidth, right - VIEWPORT_MARGIN),
    );
    x = right - width;
  }

  if (edge.includes('s')) {
    height = clamp(
      start.height + dy,
      l.minHeight,
      Math.min(l.maxHeight, viewport.height - VIEWPORT_MARGIN - start.y),
    );
  } else if (edge.includes('n')) {
    const bottom = start.y + start.height;
    height = clamp(
      start.height - dy,
      l.minHeight,
      Math.min(l.maxHeight, bottom - VIEWPORT_MARGIN),
    );
    y = bottom - height;
  }

  return fit({ x, y, width, height }, limits, viewport);
}

/** The rectangle a maximized window fills: the viewport, less the margin. */
export function maximizedRect(viewport: Size): Rect {
  return {
    x: VIEWPORT_MARGIN,
    y: VIEWPORT_MARGIN,
    width: Math.max(0, viewport.width - 2 * VIEWPORT_MARGIN),
    height: Math.max(0, viewport.height - 2 * VIEWPORT_MARGIN),
  };
}
