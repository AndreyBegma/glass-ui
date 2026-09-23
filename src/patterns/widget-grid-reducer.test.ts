import { describe, expect, test } from 'bun:test';
import {
  applyWidgetMove,
  resolveWidgetMove,
  resolveWidgetResize,
  type WidgetGridItem,
} from './widget-grid-reducer';

/**
 * FEAT-20260923-003 — the widget grid's reducers, as tables. The claim that
 * the pointer and the keyboard reach the same answers through them is tested
 * in `widget-grid.test.tsx`. This file tests the answers.
 */

const ITEMS: WidgetGridItem[] = [
  { id: 'capture', label: 'Capture', span: 4, minSpan: 2 },
  { id: 'habits', label: 'Habits', span: 2 },
  { id: 'money', label: 'Money', span: 2, minSpan: 1 },
  { id: 'week', label: 'Week', span: 2, minSpan: 2 },
];

describe('resolveWidgetMove', () => {
  test('a drop is the raw slot, and moving down vacates the slot above', () => {
    expect(resolveWidgetMove(ITEMS, { kind: 'drop', id: 'week', index: 0 })).toEqual({
      id: 'week',
      index: 0,
    });
    expect(resolveWidgetMove(ITEMS, { kind: 'drop', id: 'habits', index: 3 })).toEqual({
      id: 'habits',
      index: 2,
    });
    expect(resolveWidgetMove(ITEMS, { kind: 'drop', id: 'capture', index: 99 })).toEqual({
      id: 'capture',
      index: 3,
    });
  });

  test('a drop that changes nothing, or names nothing, is null', () => {
    expect(resolveWidgetMove(ITEMS, { kind: 'drop', id: 'habits', index: 1 })).toBeNull();
    expect(resolveWidgetMove(ITEMS, { kind: 'drop', id: 'habits', index: 2 })).toBeNull();
    expect(resolveWidgetMove(ITEMS, { kind: 'drop', id: 'nope', index: 0 })).toBeNull();
  });

  test('commands move one step or to an end, and stop at the edges', () => {
    const move = (id: string, command: 'up' | 'down' | 'top' | 'bottom') =>
      resolveWidgetMove(ITEMS, { kind: 'command', id, command });
    expect(move('money', 'up')).toEqual({ id: 'money', index: 1 });
    expect(move('money', 'down')).toEqual({ id: 'money', index: 3 });
    expect(move('money', 'top')).toEqual({ id: 'money', index: 0 });
    expect(move('habits', 'bottom')).toEqual({ id: 'habits', index: 3 });
    expect(move('capture', 'up')).toBeNull();
    expect(move('capture', 'top')).toBeNull();
    expect(move('week', 'down')).toBeNull();
    expect(move('week', 'bottom')).toBeNull();
  });
});

describe('applyWidgetMove', () => {
  test('remove, then insert at the landing index', () => {
    const next = applyWidgetMove(ITEMS, { id: 'week', index: 1 });
    expect(next.map((item) => item.id)).toEqual(['capture', 'week', 'habits', 'money']);
    expect(ITEMS.map((item) => item.id)).toEqual(['capture', 'habits', 'money', 'week']);
  });

  test('an unknown id returns the same array', () => {
    expect(applyWidgetMove(ITEMS, { id: 'nope', index: 0 })).toBe(ITEMS);
  });
});

describe('resolveWidgetResize', () => {
  test('steps and sets are clamped to minSpan…columns', () => {
    const resize = (id: string, intent: { span: number } | { delta: 1 | -1 }, columns = 4) =>
      resolveWidgetResize(
        ITEMS,
        columns,
        'span' in intent ? { kind: 'set', id, ...intent } : { kind: 'step', id, ...intent },
      );
    expect(resize('habits', { delta: 1 })).toEqual({ id: 'habits', span: 3 });
    expect(resize('money', { delta: -1 })).toEqual({ id: 'money', span: 1 });
    expect(resize('money', { span: 9 })).toEqual({ id: 'money', span: 4 });
    expect(resize('capture', { span: 1 })).toEqual({ id: 'capture', span: 2 });
    expect(resize('capture', { delta: 1 })).toBeNull();
    expect(resize('week', { delta: -1 })).toBeNull();
    expect(resize('nope', { delta: 1 })).toBeNull();
  });

  test('at fewer columns the bounds follow the drawn columns, stepping from the drawn span', () => {
    // Capture is stored at 4 and drawn at 2: wider changes nothing on screen.
    expect(resolveWidgetResize(ITEMS, 2, { kind: 'step', id: 'capture', delta: 1 })).toBeNull();
    expect(resolveWidgetResize(ITEMS, 2, { kind: 'set', id: 'capture', span: 2 })).toBeNull();
    // Money is drawn at 2; narrower is 1, not 3.
    expect(resolveWidgetResize(ITEMS, 2, { kind: 'step', id: 'money', delta: -1 })).toEqual({
      id: 'money',
      span: 1,
    });
    // A minSpan above the column count is capped by it.
    expect(resolveWidgetResize(ITEMS, 1, { kind: 'step', id: 'week', delta: -1 })).toBeNull();
  });
});
