import { describe, expect, test } from 'bun:test';
import {
  fit,
  maximizedRect,
  moveRect,
  resizeRect,
} from './floating-window-geometry';

const limits = { minWidth: 300, minHeight: 200, maxWidth: 800, maxHeight: 600 };
const viewport = { width: 1200, height: 900 };
const start = { x: 100, y: 100, width: 400, height: 300 };

describe('fit', () => {
  test('a rectangle inside the viewport and its limits is left alone', () => {
    expect(fit(start, limits, viewport)).toEqual(start);
  });

  test('the size is held within the limits', () => {
    expect(
      fit({ ...start, width: 100, height: 2000 }, limits, viewport),
    ).toMatchObject({
      width: 300,
      height: 600,
    });
  });

  test('a rectangle past an edge is moved back inside, 8 px from it', () => {
    expect(fit({ ...start, x: 1100, y: -50 }, limits, viewport)).toMatchObject({
      x: 1200 - 8 - 400,
      y: 8,
    });
  });

  test('a viewport smaller than the minimum wins over the minimum', () => {
    expect(fit(start, limits, { width: 280, height: 180 })).toEqual({
      x: 8,
      y: 8,
      width: 264,
      height: 164,
    });
  });
});

describe('moveRect', () => {
  test('moves by the delta and stops at the viewport', () => {
    expect(moveRect(start, 50, 20, limits, viewport)).toMatchObject({
      x: 150,
      y: 120,
    });
    expect(moveRect(start, 5000, 5000, limits, viewport)).toMatchObject({
      x: 1200 - 8 - 400,
      y: 900 - 8 - 300,
    });
    expect(moveRect(start, -5000, -5000, limits, viewport)).toMatchObject({
      x: 8,
      y: 8,
    });
  });
});

describe('resizeRect', () => {
  test('the east and south edges grow the size and keep the corner', () => {
    expect(resizeRect(start, 'se', 100, 50, limits, viewport)).toEqual({
      x: 100,
      y: 100,
      width: 500,
      height: 350,
    });
  });

  test('the west and north edges keep the opposite edge where it was', () => {
    const next = resizeRect(start, 'nw', -60, -40, limits, viewport);
    expect(next).toEqual({ x: 40, y: 60, width: 460, height: 340 });
    expect(next.x + next.width).toBe(start.x + start.width);
    expect(next.y + next.height).toBe(start.y + start.height);
  });

  test('an edge resizes along its own axis only', () => {
    expect(resizeRect(start, 'e', 100, 100, limits, viewport)).toMatchObject({
      width: 500,
      height: 300,
    });
    expect(resizeRect(start, 'n', 100, -20, limits, viewport)).toMatchObject({
      width: 400,
      height: 320,
      y: 80,
    });
  });

  test('stops at the minimum and maximum size', () => {
    expect(
      resizeRect(start, 'se', -1000, -1000, limits, viewport),
    ).toMatchObject({
      width: 300,
      height: 200,
    });
    expect(resizeRect(start, 'se', 1000, 1000, limits, viewport)).toMatchObject(
      {
        width: 800,
        height: 600,
      },
    );
    const shrunk = resizeRect(start, 'w', 1000, 0, limits, viewport);
    expect(shrunk).toMatchObject({ width: 300, x: 200 });
  });

  test('stops at the viewport on the side being dragged', () => {
    const near = { x: 700, y: 500, width: 400, height: 300 };
    expect(resizeRect(near, 'se', 400, 400, limits, viewport)).toMatchObject({
      width: 1200 - 8 - 700,
      height: 900 - 8 - 500,
    });
    expect(resizeRect(start, 'nw', -400, -400, limits, viewport)).toMatchObject(
      { x: 8, y: 8 },
    );
  });
});

test('maximizedRect fills the viewport less the margin', () => {
  expect(maximizedRect(viewport)).toEqual({
    x: 8,
    y: 8,
    width: 1184,
    height: 884,
  });
});
