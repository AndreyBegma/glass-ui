'use client';

import type { ComponentProps, CSSProperties, PointerEvent } from 'react';
import { useState } from 'react';
import { cn } from '../lib/cn';
import './slider.css';

/**
 * FEAT-20260823-375 — a range control, which the system did not have.
 *
 * Added rather than written inline, because the rule in the design system is
 * that a one-off element with its own class string is the thing the primitive
 * layer exists to stop. The first caller is a party's per-person volume; the
 * second will be whatever else needs a continuous value, and it should look the
 * same.
 *
 * Built on the native `<input type="range">` on purpose. It is the one control
 * a television's remote and a screen reader both already understand — arrow
 * keys move it, the value is announced, and none of that has to be
 * reimplemented.
 *
 * FEAT-20260916-608 — the look moved to `slider.css`, which `RangeSlider`
 * shares, and the props did not move at all: the three callers read
 * `event.target.value`, one reads `event.target` on `onPointerUp`, and every
 * one of them puts its layout utilities on this element. So the element is
 * still the input, the caller's `className` still lands on it, and what is
 * added is a class, one inline custom property for the fill, and a
 * `data-dragging` attribute for the press.
 *
 * The focus ring is `base.css`'s, restated in `slider.css` on the thumb
 * because `base.css` blanks it on every `input`.
 */
type SliderProps = Omit<ComponentProps<'input'>, 'type' | 'className'> & {
  className?: string;
};

export function Slider({
  className,
  value,
  defaultValue,
  min = 0,
  max = 100,
  onChange,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  style,
  ...props
}: SliderProps) {
  // The WebKit track cannot show its own fill, so the fill is drawn from the
  // value. An uncontrolled slider keeps a mirror of it here; a controlled one
  // reads the prop and the mirror is never consulted.
  const [mirror, setMirror] = useState(() => Number(defaultValue ?? min));
  const current = value === undefined ? mirror : Number(value);
  const dragging = usePointerDragging({
    onPointerDown,
    onPointerUp,
    onPointerCancel,
  });

  return (
    <input
      type="range"
      className={cn('luna-slider disabled:opacity-40', className)}
      value={value}
      defaultValue={defaultValue}
      min={min}
      max={max}
      style={
        {
          ...style,
          '--luna-slider-ratio': fillRatio(current, Number(min), Number(max)),
        } as CSSProperties
      }
      onChange={(event) => {
        setMirror(Number(event.target.value));
        onChange?.(event);
      }}
      {...dragging}
      {...props}
    />
  );
}

type PointerHandler<E extends Element> = (event: PointerEvent<E>) => void;

interface PointerHandlers<E extends Element> {
  onPointerDown?: PointerHandler<E>;
  onPointerUp?: PointerHandler<E>;
  onPointerCancel?: PointerHandler<E>;
}

/**
 * `data-dragging` while a pointer is held on the control, for the press in
 * `slider.css`. An attribute set from the events rather than `:active`,
 * which iOS applies to a touch only when a `touchstart` listener happens to
 * be registered somewhere above the element. The caller's own handlers run
 * first and are not conditional on anything here.
 *
 * Shared with `RangeSlider`; exported from this file rather than its own so
 * the two sliders stay two files.
 */
export function usePointerDragging<E extends Element>(
  own: PointerHandlers<E>,
): PointerHandlers<E> & { 'data-dragging'?: '' } {
  const [dragging, setDragging] = useState(false);
  return {
    'data-dragging': dragging ? '' : undefined,
    onPointerDown: (event) => {
      own.onPointerDown?.(event);
      setDragging(true);
    },
    onPointerUp: (event) => {
      own.onPointerUp?.(event);
      setDragging(false);
    },
    onPointerCancel: (event) => {
      own.onPointerCancel?.(event);
      setDragging(false);
    },
  };
}

/** Where the thumb sits, 0 to 1, for the fill behind it. */
function fillRatio(value: number, min: number, max: number): number {
  if (!Number.isFinite(value) || max <= min) return 0;
  return Math.min(1, Math.max(0, (value - min) / (max - min)));
}
