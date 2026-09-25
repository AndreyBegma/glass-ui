import { describe, expect, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { RangeSlider, type RangeSliderProps } from './range-slider';

/**
 * FEAT-20260916-608 — the two-thumb slider, held to what a remote and a
 * screen reader get from it. The pointer model is Radix's and needs a layout
 * to measure against, which a headless DOM does not have; it is walked on
 * staging. What is asserted here is the structure, the announcement and the
 * keyboard, which is where the decisions in the file comment were made.
 */

const hours = (value: number) => `${value / 60} h`;

function Harness(
  props: Partial<RangeSliderProps> & { initial?: [number, number] },
) {
  const [value, setValue] = useState<[number, number]>(
    props.initial ?? [60, 180],
  );
  return (
    <RangeSlider
      min={0}
      max={300}
      step={5}
      thumbLabels={['From', 'To']}
      formatValue={hours}
      {...props}
      value={props.value ?? value}
      onValueChange={(next) => {
        setValue(next);
        props.onValueChange?.(next);
      }}
    />
  );
}

const thumbs = () => screen.getAllByRole('slider');

describe('RangeSlider', () => {
  test('two thumbs, each a tab stop with its own name, bounds, value and announced text', () => {
    render(<Harness />);
    const [from, to] = thumbs();
    expect(thumbs().length).toBe(2);
    for (const thumb of [from, to]) {
      expect(thumb?.tagName).toBe('SPAN');
      expect(thumb?.getAttribute('tabindex')).toBe('0');
      expect(thumb?.getAttribute('aria-valuemin')).toBe('0');
      expect(thumb?.getAttribute('aria-valuemax')).toBe('300');
    }
    expect(from?.getAttribute('aria-label')).toBe('From');
    expect(to?.getAttribute('aria-label')).toBe('To');
    expect(from?.getAttribute('aria-valuenow')).toBe('60');
    expect(to?.getAttribute('aria-valuenow')).toBe('180');
    expect(from?.getAttribute('aria-valuetext')).toBe('1 h');
    expect(to?.getAttribute('aria-valuetext')).toBe('3 h');
  });

  test('the root carries the shared class and the track carries the fill', () => {
    const { container } = render(<Harness />);
    const root = container.querySelector('.luna-slider.luna-range-slider');
    expect(root).not.toBeNull();
    expect(
      root?.querySelector('.luna-slider-track .luna-slider-fill'),
    ).not.toBeNull();
    expect(root?.querySelectorAll('.luna-slider-thumb').length).toBe(2);
  });

  test('arrows move the focused thumb by a step and commit; PageUp/Down and Shift by ten', () => {
    const changes: [number, number][] = [];
    const commits: [number, number][] = [];
    render(
      <Harness
        onValueChange={(v) => changes.push(v)}
        onValueCommit={(v) => commits.push(v)}
      />,
    );
    const [from, to] = thumbs();
    if (!from || !to) throw new Error('no thumbs');

    fireEvent.keyDown(from, { key: 'ArrowRight' });
    expect(changes.at(-1)).toEqual([65, 180]);
    expect(commits.at(-1)).toEqual([65, 180]);

    fireEvent.keyDown(to, { key: 'ArrowLeft' });
    expect(changes.at(-1)).toEqual([65, 175]);

    fireEvent.keyDown(to, { key: 'PageUp' });
    expect(changes.at(-1)).toEqual([65, 225]);

    fireEvent.keyDown(from, { key: 'ArrowDown', shiftKey: true });
    expect(changes.at(-1)).toEqual([15, 225]);
    expect(commits.length).toBe(changes.length);
  });

  test('Home and End move the focused thumb to its own end, bounded by the other', () => {
    const changes: [number, number][] = [];
    render(<Harness onValueChange={(v) => changes.push(v)} />);
    const [from, to] = thumbs();
    if (!from || !to) throw new Error('no thumbs');

    fireEvent.keyDown(to, { key: 'Home' });
    expect(changes.at(-1)).toEqual([60, 60]);

    fireEvent.keyDown(to, { key: 'End' });
    expect(changes.at(-1)).toEqual([60, 300]);

    fireEvent.keyDown(from, { key: 'End' });
    expect(changes.at(-1)).toEqual([300, 300]);

    fireEvent.keyDown(from, { key: 'Home' });
    expect(changes.at(-1)).toEqual([0, 300]);
  });

  test('a thumb stops at the other thumb and at the ends; a stopped press reports nothing', () => {
    const changes: [number, number][] = [];
    render(
      <Harness initial={[100, 100]} onValueChange={(v) => changes.push(v)} />,
    );
    const [from, to] = thumbs();
    if (!from || !to) throw new Error('no thumbs');

    fireEvent.keyDown(from, { key: 'ArrowRight' });
    fireEvent.keyDown(to, { key: 'ArrowLeft' });
    expect(changes).toEqual([]);
    expect(from.getAttribute('aria-valuenow')).toBe('100');
    expect(to.getAttribute('aria-valuenow')).toBe('100');

    fireEvent.keyDown(to, { key: 'PageUp' });
    fireEvent.keyDown(to, { key: 'PageUp' });
    fireEvent.keyDown(to, { key: 'PageUp' });
    fireEvent.keyDown(to, { key: 'PageUp' });
    fireEvent.keyDown(to, { key: 'PageUp' });
    expect(changes.at(-1)).toEqual([100, 300]);
    const count = changes.length;
    fireEvent.keyDown(to, { key: 'ArrowRight' });
    expect(changes.length).toBe(count);
  });

  test('a value handed in out of bounds or out of order is shown clamped and sorted', () => {
    render(<Harness value={[1000, 30]} />);
    const [from, to] = thumbs();
    expect(from?.getAttribute('aria-valuenow')).toBe('30');
    expect(to?.getAttribute('aria-valuenow')).toBe('300');
  });

  test('a fractional step stays on its grid', () => {
    const changes: [number, number][] = [];
    render(
      <Harness
        min={0}
        max={10}
        step={0.5}
        initial={[7, 9]}
        onValueChange={(v) => changes.push(v)}
      />,
    );
    const [from] = thumbs();
    if (!from) throw new Error('no thumbs');
    fireEvent.keyDown(from, { key: 'ArrowUp' });
    fireEvent.keyDown(from, { key: 'ArrowUp' });
    fireEvent.keyDown(from, { key: 'ArrowUp' });
    expect(changes).toEqual([
      [7.5, 9],
      [8, 9],
      [8.5, 9],
    ]);
  });

  test('disabled removes the tab stops and ignores the keyboard', () => {
    const changes: [number, number][] = [];
    render(<Harness disabled onValueChange={(v) => changes.push(v)} />);
    const [from] = thumbs();
    if (!from) throw new Error('no thumbs');
    expect(from.hasAttribute('tabindex')).toBe(false);
    fireEvent.keyDown(from, { key: 'ArrowRight' });
    expect(changes).toEqual([]);
  });

  test('data-dragging is set on the root by a pointer down and cleared by up or cancel', () => {
    const { container } = render(<Harness />);
    const root = container.querySelector('.luna-range-slider');
    const [from] = thumbs();
    if (!root || !from) throw new Error('no root');
    expect(root.hasAttribute('data-dragging')).toBe(false);
    fireEvent.pointerDown(from, { pointerId: 1 });
    expect(root.hasAttribute('data-dragging')).toBe(true);
    fireEvent.pointerUp(from, { pointerId: 1 });
    expect(root.hasAttribute('data-dragging')).toBe(false);
    fireEvent.pointerDown(from, { pointerId: 1 });
    fireEvent.pointerCancel(from, { pointerId: 1 });
    expect(root.hasAttribute('data-dragging')).toBe(false);
  });
});
