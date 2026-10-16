'use client';

import {
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';
import { cn } from '../lib/cn';

/**
 * #139 — a controlled-width box, centred in its container, with a drag handle
 * on each side edge. Built for a mockup in a sandboxed `<iframe>` whose width
 * the consumer drives from viewport presets, a typed number and a drag.
 *
 * **It owns no size.** `SplitPane` and `SidePanel` own and persist theirs; this
 * one only reports. Every change goes out through `onWidthChange`, already
 * clamped by `min` / `max` and rounded, and the end of each gesture through
 * `onWidthCommit` — once per drag, once per run of key presses.
 *
 * **It draws a hairline and nothing else.** No material: the child is the
 * content. The hairline is a ring, so the child gets exactly `width` px.
 *
 * **Both handles are the WAI-ARIA window splitter**, as `SplitPane`'s is:
 * `role="separator"`, `aria-valuenow` / `min` / `max` / `text`, focusable.
 * Arrows step 16 px (Shift 1 px), Page Up / Page Down 160 px, Home / End go to
 * `min` / `max`. On the left handle the arrows mirror — ArrowLeft moves the
 * left edge out, so it widens.
 *
 * **An iframe swallows pointer moves.** The handle takes pointer capture, and
 * while a drag is on the child is `pointer-events: none`, so a pointer that
 * crosses into the iframe keeps driving the drag. The frame is centred, so an
 * edge moved by `dx` changes the width by `2·dx`; a frame wider than its box is
 * left-aligned and scrolls, and there the factor is 1. A drag that crosses
 * between the two keeps the dragged edge under the pointer.
 *
 * **The page never scrolls sideways.** The frame's own box does. `max` is not
 * capped by the container.
 */
export type ResizableFrameProps = {
  /** Controlled width in px. */
  width: number;
  /** Fires during drag (rAF-throttled) and on key steps; already clamped. */
  onWidthChange: (width: number) => void;
  /** Fires once on pointer-up / key-up — the consumer commits here (e.g. URL). */
  onWidthCommit?: (width: number) => void;
  min: number;
  /** The frame never exceeds its container — it scrolls horizontally instead. */
  max: number;
  /** Fixed height in px; omitted = fill the container's height. */
  height?: number;
  /** Shown on the handle while dragging: `${width} × ${height}`. Default true. */
  showSizeHint?: boolean;
  /** `resize` is each handle's accessible name. */
  labels: { resize: string };
  /** The `<iframe>`. */
  children: ReactNode;
  className?: string;
};

type Side = 'left' | 'right';

const STEP = 16;
const FINE_STEP = 1;
const PAGE_STEP = 160;
/** The box's side gutter, in px — half a handle's 24 px hit area, so neither is clipped. */
const GUTTER = 12;

/** Where the dragged edge sits in the box's content, for a frame `w` wide. */
const edgeAt = (w: number, side: Side, room: number) => {
  if (side === 'right') return w <= room ? (room + w) / 2 : w;
  return w <= room ? (room - w) / 2 : 0;
};

export function ResizableFrame({
  width,
  onWidthChange,
  onWidthCommit,
  min,
  max,
  height,
  showSizeHint = true,
  labels,
  children,
  className,
}: ResizableFrameProps) {
  const clamp = (value: number) => Math.round(Math.min(max, Math.max(min, value)));

  const box = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<Side | null>(null);
  const [hintHeight, setHintHeight] = useState<number | undefined>(undefined);

  // The callbacks are read through a ref so a frame scheduled before a
  // re-render still reaches the consumer's current handler.
  const handlers = useRef({ onWidthChange, onWidthCommit });
  handlers.current = { onWidthChange, onWidthCommit };

  /**
   * A drag is read against where it started, not against the last event (the
   * rule `SplitPane` follows), so a pointer that leaves the handle still lands
   * where it is.
   */
  const drag = useRef<{
    start: number;
    startWidth: number;
    side: Side;
    room: number;
    last: number;
  } | null>(null);
  const frameRequest = useRef<number | null>(null);
  const pending = useRef<number | null>(null);
  /** The last width a run of key presses reached, waiting for its key-up. */
  const keyed = useRef<number | null>(null);

  const flush = () => {
    if (frameRequest.current !== null) {
      cancelAnimationFrame(frameRequest.current);
      frameRequest.current = null;
    }
    if (pending.current !== null) {
      const next = pending.current;
      pending.current = null;
      handlers.current.onWidthChange(next);
    }
  };

  useEffect(
    () => () => {
      if (frameRequest.current !== null) cancelAnimationFrame(frameRequest.current);
    },
    [],
  );

  const onPointerDown = (side: Side) => (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    // The room is kept, not a factor: a drag may cross from centred to
    // left-aligned (or back) and the dragged edge has to follow the pointer.
    const room = (box.current?.clientWidth ?? 0) - GUTTER * 2;
    drag.current = { start: event.clientX, startWidth: width, side, room, last: width };
    event.currentTarget.setPointerCapture(event.pointerId);
    setHintHeight(height ?? frame.current?.offsetHeight);
    setDragging(side);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current) return;
    const { start, startWidth, side, room } = current;
    const target = edgeAt(startWidth, side, room) + (event.clientX - start);
    const next = clamp(
      side === 'right'
        ? target <= room
          ? 2 * target - room // centred
          : target // left-aligned
        : target >= 0
          ? room - 2 * target
          : room - target, // left edge out past the box: grows by dx
    );
    if (next === current.last) return;
    current.last = next;
    pending.current = next;
    if (frameRequest.current === null) {
      frameRequest.current = requestAnimationFrame(() => {
        frameRequest.current = null;
        flush();
      });
    }
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current) return;
    drag.current = null;
    flush();
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragging(null);
    handlers.current.onWidthCommit?.(current.last);
  };

  const onKeyDown = (side: Side) => (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? FINE_STEP : STEP;
    // ArrowRight moves the right edge out and the left edge in.
    const outward = side === 'right' ? 'ArrowRight' : 'ArrowLeft';
    const inward = side === 'right' ? 'ArrowLeft' : 'ArrowRight';
    // Controlled: the step is taken from the width the consumer rendered.
    const base = width;
    let next: number;
    switch (event.key) {
      case outward:
        next = base + step;
        break;
      case inward:
        next = base - step;
        break;
      case 'PageUp':
        next = base + PAGE_STEP;
        break;
      case 'PageDown':
        next = base - PAGE_STEP;
        break;
      case 'Home':
        next = min;
        break;
      case 'End':
        next = max;
        break;
      default:
        return;
    }
    event.preventDefault();
    const clamped = clamp(next);
    keyed.current = clamped;
    if (clamped !== width) onWidthChange(clamped);
  };

  // A run of key presses — one tap, or a held arrow's auto-repeat — commits
  // once, when it ends: on key-up, or on blur if the key-up never came here.
  const endKeys = () => {
    if (keyed.current === null) return;
    const last = keyed.current;
    keyed.current = null;
    onWidthCommit?.(last);
  };

  const handle = (side: Side) => (
    // biome-ignore lint/a11y/useSemanticElements: a separator that is dragged has no element; the role is the correct one and the keyboard alternative is the arrow keys
    <div
      role="separator"
      aria-orientation="vertical"
      aria-valuenow={width}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuetext={`${width} pixels`}
      aria-label={labels.resize}
      tabIndex={0}
      data-side={side}
      data-dragging={dragging === side ? 'true' : undefined}
      onPointerDown={onPointerDown(side)}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onLostPointerCapture={endDrag}
      onKeyDown={onKeyDown(side)}
      onKeyUp={endKeys}
      onBlur={endKeys}
      className={cn(
        // A 24 px hit area centred on the edge; the visible bar is the ::before.
        'group/handle absolute inset-y-0 z-10 w-6 cursor-col-resize touch-none outline-none',
        side === 'left' ? 'left-0 -translate-x-1/2' : 'right-0 translate-x-1/2',
        "before:absolute before:inset-y-0 before:left-1/2 before:w-0.5 before:-translate-x-1/2 before:content-['']",
        'before:bg-line hover:before:bg-hover focus-visible:before:bg-ink data-dragging:before:bg-ink',
        'motion-safe:before:transition-colors before:duration-(--dur-fast)',
      )}
    >
      {showSizeHint && dragging === side ? (
        <span
          aria-hidden="true"
          data-size-hint=""
          className={cn(
            'pointer-events-none absolute top-1/2 -translate-y-1/2 whitespace-nowrap rounded-sm',
            'bg-ink px-1.5 py-0.5 font-mono text-xs text-ground tabular-nums',
            side === 'left' ? 'left-full ml-1' : 'right-full mr-1',
          )}
        >
          {hintHeight === undefined ? width : `${width} × ${hintHeight}`}
        </span>
      ) : null}
    </div>
  );

  return (
    <div
      ref={box}
      data-dragging={dragging ? 'true' : undefined}
      style={{ paddingInline: GUTTER }}
      className={cn(
        'w-full min-w-0 max-w-full overflow-x-auto overflow-y-hidden overscroll-x-contain',
        height === undefined && 'h-full',
        dragging && 'cursor-col-resize select-none',
        className,
      )}
    >
      <div
        ref={frame}
        style={{ width, height }}
        className={cn(
          'relative mx-auto ring-1 ring-line',
          height === undefined && 'h-full',
          // No width transition while dragging — the edge must track the
          // pointer — and none at all under prefers-reduced-motion.
          !dragging && 'motion-safe:transition-[width] motion-safe:duration-(--dur-fast)',
        )}
      >
        <div
          data-frame-content=""
          className={cn('size-full overflow-hidden', dragging && 'pointer-events-none')}
        >
          {children}
        </div>
        {handle('left')}
        {handle('right')}
      </div>
    </div>
  );
}
