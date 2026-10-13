import { describe, expect, test } from 'bun:test';
import { isArrow, nearestInDirection } from './keyboard';
import type { Box } from './tree-layout';

const box = (x: number, y: number): Box => ({ x, y, width: 100, height: 40 });

// A parent over two children, with a far-off node level with the parent.
//        [p]            [far]
//   [a]       [b]
const boxes = new Map<string, Box>([
  ['p', box(200, 0)],
  ['a', box(0, 120)],
  ['b', box(400, 120)],
  ['far', box(700, 0)],
]);

describe('nearestInDirection', () => {
  test('down from a parent reaches a child, not a node off to the side', () => {
    expect(nearestInDirection('p', boxes, 'ArrowDown')).toBe('a');
  });

  test('left and right move between siblings', () => {
    expect(nearestInDirection('a', boxes, 'ArrowRight')).toBe('b');
    expect(nearestInDirection('b', boxes, 'ArrowLeft')).toBe('a');
  });

  test('up from a child reaches the parent', () => {
    expect(nearestInDirection('b', boxes, 'ArrowUp')).toBe('p');
  });

  test('right from the parent reaches the node level with it', () => {
    expect(nearestInDirection('p', boxes, 'ArrowRight')).toBe('far');
  });

  test('a node in the beam wins over a nearer one off it', () => {
    // b is nearer to p than far is, but only far shares p's row.
    expect(nearestInDirection('p', boxes, 'ArrowRight')).toBe('far');
    // Straight below a, though further than the diagonal neighbour.
    const column = new Map<string, Box>([
      ['top', box(0, 0)],
      ['diag', box(150, 60)],
      ['below', box(0, 300)],
    ]);
    expect(nearestInDirection('top', column, 'ArrowDown')).toBe('below');
  });

  test('nothing in that direction is null, and so is an unknown id', () => {
    expect(nearestInDirection('p', boxes, 'ArrowUp')).toBeNull();
    expect(nearestInDirection('missing', boxes, 'ArrowDown')).toBeNull();
  });

  test('a single node has nowhere to go', () => {
    const one = new Map([['only', box(0, 0)]]);
    expect(nearestInDirection('only', one, 'ArrowRight')).toBeNull();
  });

  test('ties go to the node listed first', () => {
    const tied = new Map<string, Box>([
      ['from', box(100, 0)],
      ['left', box(0, 100)],
      ['right', box(200, 100)],
    ]);
    expect(nearestInDirection('from', tied, 'ArrowDown')).toBe('left');
  });
});

test('isArrow', () => {
  expect(isArrow('ArrowUp')).toBe(true);
  expect(isArrow('Enter')).toBe(false);
});
