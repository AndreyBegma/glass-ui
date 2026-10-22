'use client';

import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import { cn } from '../lib/cn';
import { type Hsv, hsvToRgb, rgbToHex } from './color-picker-color';

/**
 * v0.38.0 wave, ColorPicker — the two drawn parts: the saturation ×
 * brightness area and the preview swatch. Split from `color-picker.tsx` to
 * keep that file to the picker's state and composition.
 *
 * Nothing here is a colour literal. The area's gradients are the current hue
 * at full saturation, and the white and black the maths makes of HSV's
 * corners; the preview draws whatever value it is handed.
 */

export type Hsva = Hsv & { a: number };

export const BLACK: Hsva = { h: 0, s: 0, v: 0, a: 1 };

/** The colour as opaque hex, for drawing. */
export const opaque = (hsv: Hsv) => rgbToHex({ ...hsvToRgb(hsv), a: 1 });

const clamp = (n: number) => Math.min(100, Math.max(0, n));

const WHITE = opaque({ h: 0, s: 0, v: 100 });
const INK = opaque(BLACK);

/** What shows through a colour that is not opaque. Tokens, not colours. */
export const CHECKER =
  'repeating-conic-gradient(var(--color-line-strong) 0 25%, transparent 0 50%) 0 0 / 8px 8px';

/** The value, drawn. Over a checkerboard when it may carry alpha; a dashed
 *  outline, not a colour, when there is no value to draw. */
export function Preview({
  color,
  alpha,
  className,
}: {
  color: string | undefined;
  alpha: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'block overflow-hidden rounded-[calc(var(--radius-control)-0.25rem)]',
        color === undefined && 'border border-dashed border-ink-3',
        className,
      )}
      style={alpha && color ? { background: CHECKER } : undefined}
    >
      {color ? <span className="block size-full" style={{ background: color }} /> : null}
    </span>
  );
}

/**
 * The Slider pattern (APG) on two axes: one focusable `role="slider"` whose
 * `aria-valuenow` is the saturation and whose `aria-valuetext` names both axes
 * and the colour. ←/→ saturation, ↑/↓ brightness, Shift ×10; Home/End
 * saturation 0/100, PageUp/PageDown brightness ±10. A pointer drags with
 * capture, so a drag that leaves the area keeps steering it.
 */
export function ColorArea({
  hsva,
  label,
  roleDescription,
  valueText,
  onChange,
}: {
  hsva: Hsva;
  label: string;
  roleDescription: string;
  valueText: string;
  onChange: (next: Hsva) => void;
}) {
  function fromPointer(event: ReactPointerEvent<HTMLDivElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    if (!box.width || !box.height) return;
    onChange({
      ...hsva,
      s: Math.round(clamp(((event.clientX - box.left) / box.width) * 100)),
      v: Math.round(clamp((1 - (event.clientY - box.top) / box.height) * 100)),
    });
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? 10 : 1;
    let s = Math.round(hsva.s);
    let v = Math.round(hsva.v);
    switch (event.key) {
      case 'ArrowLeft':
        s -= step;
        break;
      case 'ArrowRight':
        s += step;
        break;
      case 'ArrowDown':
        v -= step;
        break;
      case 'ArrowUp':
        v += step;
        break;
      case 'Home':
        s = 0;
        break;
      case 'End':
        s = 100;
        break;
      case 'PageDown':
        v -= 10;
        break;
      case 'PageUp':
        v += 10;
        break;
      default:
        return;
    }
    event.preventDefault();
    onChange({ ...hsva, s: clamp(s), v: clamp(v) });
  }

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-roledescription={roleDescription}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(hsva.s)}
      aria-valuetext={valueText}
      onKeyDown={onKeyDown}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture?.(event.pointerId);
        fromPointer(event);
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture?.(event.pointerId)) fromPointer(event);
      }}
      className="relative h-36 w-full cursor-crosshair touch-none rounded-control"
      style={{
        background: `linear-gradient(to top, ${INK}, transparent), linear-gradient(to right, ${WHITE}, transparent), ${opaque({ h: hsva.h, s: 100, v: 100 })}`,
      }}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -ml-2 -mt-2 size-4 rounded-full border-2 border-paper ring-1 ring-ink/60"
        style={{
          left: `${hsva.s}%`,
          top: `${100 - hsva.v}%`,
          background: opaque(hsva),
        }}
      />
    </div>
  );
}
