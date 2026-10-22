'use client';

import { CircleAlert } from 'lucide-react';
import { type CSSProperties, useId, useState } from 'react';
import { cn } from '../lib/cn';
import {
  PopoverAnchor,
  PopoverContent,
  PopoverRoot,
  PopoverTrigger,
} from '../patterns/popover';
import { BLACK, CHECKER, ColorArea, type Hsva, opaque, Preview } from './color-picker-area';
import {
  type ColorFormat,
  formatColor,
  hsvToRgb,
  parseColor,
  rgbToHex,
  rgbToHsv,
} from './color-picker-color';
import { Input } from './field';
import { Slider } from './slider';
import { useDraftText } from './use-draft-text';

export {
  type ColorFormat,
  formatColor,
  type Hsv,
  hexToRgb,
  hsvToRgb,
  isInSrgb,
  type Oklch,
  oklchToRgb,
  parseColor,
  type Rgba,
  rgbToHex,
  rgbToHsv,
  rgbToOklch,
} from './color-picker-color';

/**
 * v0.38.0 wave, ColorPicker — a colour input for themes, labels and hues.
 *
 * A swatch button (or a text field with one) opens a `PopoverContent` holding
 * a saturation × brightness area, a hue `Slider`, an optional alpha `Slider`,
 * a text input and the caller's swatches. The value is a string, `#rrggbb[aa]`
 * or `oklch(L C H[ / A])`; the maths is `color-picker-color.ts`, pure and
 * re-exported here.
 *
 * **The state is HSV, not the string.** A hex value cannot hold a hue for a
 * grey: drag the area to its bottom edge and the value is black whatever the
 * hue was, and re-deriving the hue from black would throw it away. So the
 * picker keeps the HSV it last produced, and re-derives it only when `value`
 * changes to something it did not emit — keeping the hue (and, on black, the
 * saturation) when the new colour has none.
 *
 * **The format follows the value** unless `format` says otherwise: an
 * `oklch()` value comes back as `oklch()`, anything else as hex. A colour
 * typed or picked from a swatch carries its own format the same way. Without
 * `alpha` the output is always opaque.
 *
 * The area has no APG pattern of its own; it is the Slider pattern on two
 * axes, as one focusable `role="slider"` whose `aria-valuetext` names both
 * axes and the colour. ←/→ move saturation, ↑/↓ brightness, Shift ×10;
 * Home/End are saturation 0/100, PageUp/PageDown brightness ±10.
 *
 * `tokens.spec.ts` exempts only this component's tests from the colour-literal
 * rule; this file spells no literal. The previews are the value itself
 * (`style={{ background: value }}`) and the area's and sliders' gradients are
 * computed from the current hue through the same maths.
 */
export type ColorPickerLabels = {
  /** The trigger's accessible name, given the current value (may be empty). */
  trigger: (value: string) => string;
  /** The popover's (visually hidden) title. */
  title: string;
  /** The 2-D area's accessible name. */
  area: string;
  /** What a reader calls the area instead of "slider". */
  areaRole: string;
  /** The area's `aria-valuetext`: saturation and brightness in percent, and
   *  the colour. */
  areaValue: (saturation: number, brightness: number, color: string) => string;
  hue: string;
  alpha: string;
  /** The text input's accessible name. */
  input: string;
  /** Shown under the text input when what was typed is not a colour. */
  invalid: string;
  /** The swatch group's name. */
  swatches: string;
  /** A swatch's accessible name, given its value. */
  swatch: (value: string) => string;
};

const DEFAULT_LABELS: ColorPickerLabels = {
  trigger: (value) => (value ? `Colour ${value}` : 'Choose a colour'),
  title: 'Colour',
  area: 'Saturation and brightness',
  areaRole: '2D slider',
  areaValue: (s, v, color) => `Saturation ${s}%, brightness ${v}%, ${color}`,
  hue: 'Hue',
  alpha: 'Opacity',
  input: 'Colour value',
  invalid: 'Enter a hex colour or an oklch() value',
  swatches: 'Swatches',
  swatch: (value) => value,
};

export type ColorPickerProps = {
  /** Controlled: a hex colour or an `oklch(...)` string. Omit it, with
   *  `defaultValue`, for the uncontrolled form. */
  value?: string;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
  /** The format written back. Omitted, it follows the value's own. */
  format?: ColorFormat;
  swatches?: string[];
  /** Adds the opacity slider and lets the value carry alpha. */
  alpha?: boolean;
  /** A swatch button (default), or a text field with a swatch in it. */
  trigger?: 'swatch' | 'field';
  disabled?: boolean;
  labels?: Partial<ColorPickerLabels>;
  className?: string;
};

/** The sRGB hue wheel, unrolled. */
const HUE_TRACK = `linear-gradient(to right, ${[0, 60, 120, 180, 240, 300, 360]
  .map((h) => opaque({ h, s: 100, v: 100 }))
  .join(', ')})`;

/** The HSV of `text`, keeping `previous`'s hue where the colour has none. */
function toHsva(text: string, previous: Hsva): Hsva | null {
  const parsed = parseColor(text);
  if (!parsed) return null;
  const hsv = rgbToHsv(parsed.color);
  const grey = hsv.s === 0 || hsv.v === 0;
  return {
    h: grey ? previous.h : hsv.h,
    s: hsv.v === 0 ? previous.s : hsv.s,
    v: hsv.v,
    a: parsed.color.a,
  };
}

function sameColor(a: string, b: string): boolean {
  const pa = parseColor(a);
  const pb = parseColor(b);
  return !!pa && !!pb && rgbToHex(pa.color) === rgbToHex(pb.color);
}

export function ColorPicker({
  value,
  onValueChange,
  defaultValue = '',
  format,
  swatches,
  alpha = false,
  trigger = 'swatch',
  disabled = false,
  labels: labelsProp,
  className,
}: ColorPickerProps) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp };
  const errorId = useId();
  const [open, setOpen] = useState(false);
  const [inner, setInner] = useState(defaultValue);
  const current = value ?? inner;

  const [hsva, setHsva] = useState(() => toHsva(current, BLACK) ?? BLACK);
  // The last string this picker emitted or adopted. A `value` that differs is
  // news from outside, and the HSV is re-derived from it.
  const [synced, setSynced] = useState(current);
  if (synced !== current) {
    setSynced(current);
    const next = toHsva(current, hsva);
    if (next) setHsva(next);
  }

  function publish(text: string, next: Hsva) {
    setHsva(next);
    setSynced(text);
    if (value === undefined) setInner(text);
    if (text !== current) onValueChange?.(text);
  }

  /** From the area and the sliders, in the value's format. */
  function emit(next: Hsva) {
    const fmt = format ?? parseColor(current)?.format ?? 'hex';
    const a = alpha ? next.a : 1;
    publish(formatColor({ ...hsvToRgb(next), a }, fmt), { ...next, a });
  }

  /** Typed or picked text, in its own format unless `format` overrides it;
   *  `null` when it is not a colour. */
  function normalise(text: string): string | null {
    const parsed = parseColor(text);
    if (!parsed) return null;
    const a = alpha ? parsed.color.a : 1;
    return formatColor({ ...parsed.color, a }, format ?? parsed.format);
  }

  function adopt(text: string) {
    publish(text, toHsva(text, hsva) ?? hsva);
  }

  const draft = useDraftText(current, normalise, adopt);
  const shownText = draft.draft ?? current;
  const preview = parseColor(current) ? current : undefined;

  const textInput = (extra: string) => (
    <Input
      type="text"
      autoComplete="off"
      spellCheck={false}
      aria-label={labels.input}
      aria-invalid={draft.invalid || undefined}
      aria-describedby={draft.invalid ? errorId : undefined}
      value={shownText}
      disabled={disabled}
      onChange={(event) => draft.edit(event.target.value)}
      onBlur={draft.commit}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' || draft.draft === null) return;
        // Enter commits the colour; it does not also submit the form.
        event.preventDefault();
        draft.commit();
      }}
      className={cn('font-mono', extra)}
    />
  );

  const error = draft.invalid ? (
    <p id={errorId} role="alert" className="mt-1.5 flex items-center gap-1.5 text-xs text-danger">
      <CircleAlert size={14} aria-hidden="true" />
      {labels.invalid}
    </p>
  ) : null;

  const triggerButton = (size: string) => (
    <PopoverTrigger asChild>
      <button
        type="button"
        disabled={disabled}
        aria-label={labels.trigger(current)}
        className={cn(
          'shrink-0 rounded-control border border-line-strong bg-surface p-1',
          'disabled:cursor-not-allowed disabled:opacity-40',
          size,
        )}
      >
        <Preview color={preview} alpha={alpha} className="size-full" />
      </button>
    </PopoverTrigger>
  );

  return (
    <div className={cn(trigger === 'field' ? 'w-full' : 'inline-block', className)}>
      <PopoverRoot open={open} onOpenChange={setOpen}>
        {trigger === 'field' ? (
          <PopoverAnchor asChild>
            <div className="relative flex items-center">
              {textInput('pl-11')}
              <div className="absolute left-1.5 flex">{triggerButton('size-8')}</div>
            </div>
          </PopoverAnchor>
        ) : (
          triggerButton('size-(--size-field)')
        )}
        <PopoverContent
          title={labels.title}
          hideTitle
          align="start"
          className="w-[min(18rem,calc(100vw-2rem))]"
        >
          <div className="flex flex-col gap-3">
            <ColorArea
              hsva={hsva}
              label={labels.area}
              roleDescription={labels.areaRole}
              valueText={labels.areaValue(Math.round(hsva.s), Math.round(hsva.v), current)}
              onChange={emit}
            />
            <Slider
              aria-label={labels.hue}
              min={0}
              max={360}
              step={1}
              value={Math.round(hsva.h)}
              onChange={(event) => emit({ ...hsva, h: Number(event.target.value) })}
              className="w-full"
              style={
                {
                  '--luna-slider-track-color': HUE_TRACK,
                  '--luna-slider-fill-color': 'transparent',
                } as CSSProperties
              }
            />
            {alpha ? (
              <Slider
                aria-label={labels.alpha}
                aria-valuetext={`${Math.round(hsva.a * 100)}%`}
                min={0}
                max={100}
                step={1}
                value={Math.round(hsva.a * 100)}
                onChange={(event) => emit({ ...hsva, a: Number(event.target.value) / 100 })}
                className="w-full"
                style={
                  {
                    '--luna-slider-track-color': `linear-gradient(to right, transparent, ${opaque(hsva)}), ${CHECKER}`,
                    '--luna-slider-fill-color': 'transparent',
                  } as CSSProperties
                }
              />
            ) : null}
            {trigger === 'swatch' ? (
              <div>
                {textInput('')}
                {error}
              </div>
            ) : null}
            {swatches?.length ? (
              // biome-ignore lint/a11y/useSemanticElements: a group of buttons, not a form fieldset.
              <div role="group" aria-label={labels.swatches} className="flex flex-wrap gap-1.5">
                {swatches.map((swatch) => {
                  const valid = parseColor(swatch) !== null;
                  const pressed = sameColor(swatch, current);
                  return (
                    <button
                      key={swatch}
                      type="button"
                      disabled={!valid}
                      aria-label={labels.swatch(swatch)}
                      aria-pressed={pressed}
                      onClick={() => {
                        const text = normalise(swatch);
                        if (text) {
                          draft.reset();
                          adopt(text);
                        }
                      }}
                      className={cn(
                        'size-7 rounded-full border border-line-strong p-0.5',
                        'disabled:cursor-not-allowed disabled:opacity-40',
                        pressed && 'ring-2 ring-ink',
                      )}
                    >
                      <Preview
                        color={valid ? swatch : undefined}
                        alpha={alpha}
                        className="size-full rounded-full"
                      />
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </PopoverContent>
      </PopoverRoot>
      {trigger === 'field' ? error : null}
    </div>
  );
}
