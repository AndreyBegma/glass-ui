'use client';

import * as SliderPrimitive from '@radix-ui/react-slider';
import type { KeyboardEvent } from 'react';
import { cn } from '../lib/cn';
import { usePointerDragging } from './slider';
import './slider.css';

/**
 * FEAT-20260916-608 — two thumbs on one track.
 *
 * Built on Radix rather than on two overlaid `<input type="range">`, and the
 * reasons are the two devices this control is for. A phone: the native pair
 * needs `pointer-events: none` on the inputs and `auto` on the thumb
 * pseudo-elements so the upper input does not swallow every press, and iOS
 * Safari does not reliably honour that on a pseudo-element; and a tap on the
 * track cannot start a native drag at all. Radix takes the pointer anywhere
 * on the root, moves the nearer thumb and captures the drag. A television:
 * the thumbs are `span[role="slider"]`, so `base.css`'s focus ring lands on
 * each of them, where an input's is blanked; arrow keys on a focused thumb
 * are a `keydown` and need no pointer.
 *
 * The keyboard is handled here, in front of Radix. Radix's Home moves the
 * *first* thumb to `min` and End the *last* to `max` whichever thumb has
 * focus, and an arrow that reaches the other thumb hands focus across and
 * keeps going — on a remote both read as the wrong thumb moving. Here the
 * focused thumb moves, by `step` (×10 for PageUp/PageDown and Shift), and
 * stops at the other thumb. The pointer keeps Radix's model: a thumb dragged
 * into the other stops there and the drag continues on the other. Either
 * way the two never cross, and `value[0] <= value[1]` is an invariant a
 * consumer can rely on.
 *
 * Every change is reported through `onValueChange`; the release of a drag
 * and every keyboard step also reach `onValueCommit`, which is what a
 * consumer that fetches on every value should listen to — a request per
 * pixel is not a filter, it is a flood.
 *
 * The look is `slider.css`, shared with `Slider`. Not built: the elastic
 * end-stretch, for the reason that file gives.
 */
export interface RangeSliderProps {
  value: readonly [number, number];
  onValueChange: (value: [number, number]) => void;
  /** The release of a drag, and every keyboard step. */
  onValueCommit?: (value: [number, number]) => void;
  min?: number;
  max?: number;
  step?: number;
  /**
   * The accessible name of each thumb, in the application's language.
   * Required: Radix's fallback is the English "Minimum" and "Maximum".
   */
  thumbLabels: readonly [string, string];
  /** What a thumb's value is called out as: "1 h 30 min" rather than "90". */
  formatValue?: (value: number, thumb: 0 | 1) => string;
  disabled?: boolean;
  className?: string;
}

const STEP_KEYS: Record<string, 1 | -1> = {
  ArrowRight: 1,
  ArrowUp: 1,
  PageUp: 1,
  ArrowLeft: -1,
  ArrowDown: -1,
  PageDown: -1,
};

export function RangeSlider({
  value,
  onValueChange,
  onValueCommit,
  min = 0,
  max = 100,
  step = 1,
  thumbLabels,
  formatValue,
  disabled = false,
  className,
}: RangeSliderProps) {
  const dragging = usePointerDragging<HTMLSpanElement>({});
  const [lo, hi] = clampPair(value, min, max);

  const onKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    if (disabled) return;
    const thumb = thumbIndex(event.target);
    if (thumb === null) return;
    const next = keyedValue(event, [lo, hi], thumb, { min, max, step });
    if (next === null) return;
    // Handled here; Radix's own handler is skipped on a prevented event.
    event.preventDefault();
    if (next === (thumb === 0 ? lo : hi)) return;
    const pair: [number, number] = thumb === 0 ? [next, hi] : [lo, next];
    onValueChange(pair);
    onValueCommit?.(pair);
  };

  return (
    <SliderPrimitive.Root
      className={cn('luna-slider luna-range-slider', className)}
      value={[lo, hi]}
      min={min}
      max={max}
      step={step}
      minStepsBetweenThumbs={0}
      disabled={disabled}
      onValueChange={(next) => onValueChange(pairOf(next))}
      onValueCommit={(next) => onValueCommit?.(pairOf(next))}
      onKeyDown={onKeyDown}
      {...dragging}
    >
      <SliderPrimitive.Track className="luna-slider-track">
        <SliderPrimitive.Range className="luna-slider-fill" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        className="luna-slider-thumb"
        data-thumb="0"
        aria-label={thumbLabels[0]}
        aria-valuetext={formatValue?.(lo, 0)}
      />
      <SliderPrimitive.Thumb
        className="luna-slider-thumb"
        data-thumb="1"
        aria-label={thumbLabels[1]}
        aria-valuetext={formatValue?.(hi, 1)}
      />
    </SliderPrimitive.Root>
  );
}

function pairOf(values: number[]): [number, number] {
  return [values[0] ?? 0, values[1] ?? values[0] ?? 0];
}

/** Inside the bounds and in order, whatever a URL handed the consumer. */
function clampPair(
  [a, b]: readonly [number, number],
  min: number,
  max: number,
): [number, number] {
  const lo = Math.min(Math.max(Math.min(a, b), min), max);
  const hi = Math.min(Math.max(Math.max(a, b), min), max);
  return [lo, hi];
}

function thumbIndex(target: EventTarget): 0 | 1 | null {
  if (!(target instanceof Element)) return null;
  const at = target.getAttribute('data-thumb');
  return at === '0' ? 0 : at === '1' ? 1 : null;
}

/**
 * The focused thumb's next value for a key, or `null` for a key that is not
 * the slider's. Bounded by the other thumb, not only by the ends.
 */
function keyedValue(
  event: KeyboardEvent,
  [lo, hi]: readonly [number, number],
  thumb: 0 | 1,
  { min, max, step }: { min: number; max: number; step: number },
): number | null {
  const floor = thumb === 0 ? min : lo;
  const ceiling = thumb === 0 ? hi : max;
  const current = thumb === 0 ? lo : hi;
  if (event.key === 'Home') return floor;
  if (event.key === 'End') return ceiling;
  const direction = STEP_KEYS[event.key];
  if (direction === undefined) return null;
  const skip = event.key.startsWith('Page') || event.shiftKey;
  const moved = snap(current + direction * step * (skip ? 10 : 1), min, step);
  // Clamped after snapping: the other thumb may sit off the grid (a value a
  // URL handed the consumer), and a snap after the clamp could step past it.
  return Math.min(ceiling, Math.max(floor, moved));
}

/** Onto the step grid, rounded to the step's own precision. */
function snap(value: number, min: number, step: number): number {
  const decimals = (String(step).split('.')[1] ?? '').length;
  const onGrid = Math.round((value - min) / step) * step + min;
  return Number(onGrid.toFixed(decimals));
}
