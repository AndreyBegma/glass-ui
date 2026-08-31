import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';

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
 * reimplemented. What is styled here is the track and the thumb, in tokens, for
 * the browsers that let a stylesheet reach them.
 *
 * No focus ring is declared: `globals.css` owns it.
 */
type SliderProps = Omit<ComponentProps<'input'>, 'type' | 'className'> & {
  className?: string;
};

export function Slider({ className, ...props }: SliderProps) {
  return (
    <input
      type="range"
      className={cn(
        'h-6 cursor-pointer appearance-none bg-transparent',
        // Track: WebKit and Firefox name it differently and neither inherits
        // from the other, so both are stated.
        '[&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-white/16',
        '[&::-moz-range-track]:h-1 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-white/16',
        // Thumb: the primary colour of this system is white, and a control that
        // reports a value is exactly where that reads.
        '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:-mt-1.5 [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-ink',
        '[&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-ink',
        'disabled:opacity-40',
        className,
      )}
      {...props}
    />
  );
}
