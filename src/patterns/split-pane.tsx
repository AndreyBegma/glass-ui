'use client';

import {
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { cn } from '../lib/cn';

/**
 * FEAT-20260930-070 — two panes around a draggable separator.
 *
 * **It draws no surface.** A pane carries whatever the consumer puts in it —
 * glass, a table, a log — so the split has no material of its own.
 *
 * **It owns its size and persists it**, the rule `SidePanel` follows: `{ size }`
 * is written under `storageKey` (required, so two splits never share a record),
 * debounced at 150 ms, and read *after mount* so the server render and the
 * first client render agree. The size is the first pane's, in `unit`, clamped
 * by `min` / `max`.
 *
 * **The separator is the WAI-ARIA window splitter**: `role="separator"`,
 * `aria-valuenow` / `min` / `max`, focusable. Pointer drag with pointer
 * capture, arrows move it by 16 px, Home / End go to the ends, a double-click
 * resets to `defaultSize`. There is no drag-to-collapse; `collapsedFirst` is the
 * consumer's.
 */
export type SplitPaneProps = {
  /** `horizontal` = side-by-side panes (separator vertical); the size is the first pane's. */
  orientation?: 'horizontal' | 'vertical';
  /** Required: the `localStorage` key the size persists under. */
  storageKey: string;
  defaultSize: number;
  min: number;
  max?: number;
  unit?: 'px' | '%';
  first: ReactNode;
  second: ReactNode;
  /** Controlled by the consumer; no drag-to-collapse. */
  collapsedFirst?: boolean;
  className?: string;
};

const STEP = 16;
const DEBOUNCE_MS = 150;

function read(storageKey: string): number | undefined {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return undefined;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return undefined;
    const { size } = parsed as Record<string, unknown>;
    return typeof size === 'number' && Number.isFinite(size) ? size : undefined;
  } catch {
    // A browser that blocks storage keeps the default. Nothing to say.
    return undefined;
  }
}

function write(storageKey: string, size: number) {
  try {
    localStorage.setItem(storageKey, JSON.stringify({ size }));
  } catch {
    // See above.
  }
}

export function SplitPane({
  orientation = 'horizontal',
  storageKey,
  defaultSize,
  min,
  max,
  unit = 'px',
  first,
  second,
  collapsedFirst = false,
  className,
}: SplitPaneProps) {
  const horizontal = orientation === 'horizontal';
  const upper = max ?? (unit === '%' ? 100 : Number.POSITIVE_INFINITY);

  const clamp = useCallback(
    (value: number) => Math.min(upper, Math.max(min, value)),
    [min, upper],
  );

  const [size, setSizeState] = useState(() => clamp(defaultSize));
  // Nothing is written until the stored record has been read, or the first
  // render's default would overwrite what the person chose last time.
  const [hydrated, setHydrated] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const latest = useRef(size);
  latest.current = size;

  useEffect(() => {
    const stored = read(storageKey);
    if (stored !== undefined) setSizeState(clamp(stored));
    setHydrated(true);
  }, [storageKey, clamp]);

  // Debounced write. `dirty` marks a size the person changed, so hydrating
  // from storage does not write the same record straight back.
  const dirty = useRef(false);
  useEffect(() => {
    if (!hydrated || !dirty.current) return;
    const timer = setTimeout(() => {
      dirty.current = false;
      write(storageKey, size);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [hydrated, storageKey, size]);

  // A change still waiting out the debounce when the pane unmounts is flushed,
  // or a remount inside 150 ms would restore the previous size.
  useEffect(
    () => () => {
      if (dirty.current) write(storageKey, latest.current);
    },
    [storageKey],
  );

  const setSize = useCallback(
    (next: number) => {
      dirty.current = true;
      setSizeState(clamp(next));
    },
    [clamp],
  );

  /** Pixels along the split's axis, for converting a drag or a step into `unit`. */
  const axisPx = () => {
    const rect = container.current?.getBoundingClientRect();
    return (horizontal ? rect?.width : rect?.height) || 0;
  };
  const toUnit = (px: number) => {
    if (unit === 'px') return px;
    const total = axisPx();
    return total > 0 ? (px / total) * 100 : px;
  };

  /**
   * A drag is read against where it started, not against the last event, so a
   * pointer that leaves the separator mid-drag still lands where it is.
   */
  const drag = useRef<{ start: number; startSize: number } | null>(null);
  const axis = (event: { clientX: number; clientY: number }) =>
    horizontal ? event.clientX : event.clientY;

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    drag.current = { start: axis(event), startSize: size };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    setSize(drag.current.startSize + toUnit(axis(event) - drag.current.start));
  };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    drag.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const grow = horizontal ? 'ArrowRight' : 'ArrowDown';
    const shrink = horizontal ? 'ArrowLeft' : 'ArrowUp';
    switch (event.key) {
      case grow:
        setSize(size + toUnit(STEP));
        break;
      case shrink:
        setSize(size - toUnit(STEP));
        break;
      case 'Home':
        setSize(min);
        break;
      case 'End':
        setSize(upper);
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  return (
    <div
      ref={container}
      data-orientation={orientation}
      data-collapsed={collapsedFirst ? 'true' : undefined}
      className={cn('flex min-h-0 min-w-0', horizontal ? 'flex-row' : 'flex-col', className)}
    >
      <div
        hidden={collapsedFirst}
        style={{ flexBasis: `${size}${unit}` }}
        className="min-h-0 min-w-0 shrink-0 grow-0 overflow-auto"
      >
        {first}
      </div>
      {collapsedFirst ? null : (
        // biome-ignore lint/a11y/useSemanticElements: a separator that is dragged has no element; the role is the correct one and the keyboard alternative is the arrow keys
        <div
          role="separator"
          aria-orientation={horizontal ? 'vertical' : 'horizontal'}
          aria-valuenow={Math.round(size * 100) / 100}
          aria-valuemin={min}
          aria-valuemax={max ?? (unit === '%' ? 100 : undefined)}
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
          onDoubleClick={() => setSize(defaultSize)}
          className={cn(
            // A 6 px bar; the ::before widens the hit area to 44 px on a coarse pointer.
            'relative shrink-0 touch-none bg-line',
            'motion-safe:transition-colors duration-(--dur-fast)',
            'hover:bg-hover focus-visible:bg-hover',
            "before:absolute before:content-[''] pointer-coarse:before:block",
            horizontal
              ? 'w-1.5 cursor-col-resize before:inset-y-0 before:left-1/2 before:w-1.5 before:-translate-x-1/2 pointer-coarse:before:w-11'
              : 'h-1.5 cursor-row-resize before:inset-x-0 before:top-1/2 before:h-1.5 before:-translate-y-1/2 pointer-coarse:before:h-11',
          )}
        />
      )}
      <div className="min-h-0 min-w-0 flex-1 overflow-auto">{second}</div>
    </div>
  );
}
