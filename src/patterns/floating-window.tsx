'use client';

import {
  ChevronDown,
  GripVertical,
  Maximize2,
  Minimize2,
  Minus,
  X,
} from 'lucide-react';
import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../lib/cn';
import { Button } from '../primitives/button';
import { SheetContent, SheetRoot } from '../primitives/sheet';
import {
  fit,
  maximizedRect,
  moveRect,
  RESIZE_EDGES,
  type Rect,
  type ResizeEdge,
  resizeRect,
  type Size,
  type SizeLimits,
} from './floating-window-geometry';

/**
 * #161 — a window that floats over the page: dragged by its title bar,
 * resized from any edge or corner, minimized to its bar and maximized to the
 * viewport. AgentDock's assistant is the first one; nothing here knows that.
 *
 * **The window does not own its contents.** It draws a title bar, the
 * handles and a body; what is in the body is `children`, and the extra
 * buttons in the bar are `actions`. Whether it is open is the consumer's —
 * `open` and `onOpenChange`, as `Sheet` has them — because the thing that
 * opens it (a `Launcher`, a shortcut) is the consumer's too.
 *
 * **It owns its geometry, and remembers it.** `{ x, y, width, height,
 * minimized, maximized }` is written under `storageKey` when one is given,
 * read after mount for the reason `SidePanel` gives: the server has no
 * `localStorage` and no viewport. Until that first effect runs the window is
 * not drawn at all, rather than drawn somewhere and moved.
 *
 * **The stored rectangle is the person's choice; the drawn one fits the
 * viewport.** Every frame draws `fit(rect)`: sized within the limits, moved
 * back inside the viewport if it has to be. A browser window that shrinks
 * pulls the floating window in without forgetting where it was put, so
 * growing the browser back puts it back. A drag starts from what is drawn,
 * so the two agree again the moment the person touches it.
 *
 * **Drags are pointer-captured and read against where they started**, as in
 * `SidePanel`: a fast pointer that leaves the handle still lands where it
 * is. The bar drags; a button in the bar does not start one.
 *
 * **Keyboard.** The grip at the start of the bar is a button: arrows move
 * the window by 16, Shift+arrows resize it by 16 from the bottom-right
 * corner. Minimize, maximize and close are buttons with names. Escape
 * anywhere inside minimizes — it never closes, because a long conversation
 * is not something to lose to a stray key. The edge handles are pointer-only
 * and hidden from assistive technology; the grip is their keyboard
 * alternative.
 *
 * **Below `md` it is a `Sheet`.** A six-pixel edge is no use to a thumb and
 * a phone has no room to float anything in, so the same `children` go into a
 * bottom sheet with the same `title`, opened and closed by the same `open`.
 * Minimize and the geometry do not apply there and are left as they were.
 *
 * Non-modal: `role="dialog"` without `aria-modal`, so the page underneath
 * stays usable — the reason to float a window rather than open a dialog.
 */
export interface FloatingWindowLabels {
  /** The grip's name: "Move the window". */
  move: string;
  minimize: string;
  /** The minimize button's name while minimized: "Restore". */
  restore: string;
  maximize: string;
  /** The maximize button's name while maximized: "Restore size". */
  unmaximize: string;
  close: string;
}

export interface FloatingWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The bar's title and the dialog's accessible name. */
  title: string;
  /** Drawn before the title. Decorative: give it `aria-hidden`. */
  icon?: ReactNode;
  /** The consumer's own buttons, between the title and minimize. */
  actions?: ReactNode;
  labels: FloatingWindowLabels;
  /**
   * Where the geometry and the minimized state are remembered. Without one
   * nothing is stored and every mount starts from the defaults.
   */
  storageKey?: string;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  defaultWidth?: number;
  defaultHeight?: number;
  /** The top-left corner on first open. Unset: 24 px in from the top-right corner of the viewport. */
  defaultPosition?: { x: number; y: number };
  defaultMinimized?: boolean;
  onMinimizedChange?: (minimized: boolean) => void;
  children: ReactNode;
  className?: string;
}

const STEP = 16;
const DEFAULT_INSET = 24;
/** The bar's height, which is the whole window when it is minimized. */
const BAR_HEIGHT = 40;
const MD_QUERY = '(min-width: 48rem)';

interface Stored extends Rect {
  minimized: boolean;
  maximized: boolean;
}

function read(storageKey: string): Partial<Stored> {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    const record = parsed as Record<string, unknown>;
    const out: Partial<Stored> = {};
    for (const key of ['x', 'y', 'width', 'height'] as const) {
      const value = record[key];
      if (typeof value === 'number' && Number.isFinite(value)) out[key] = value;
    }
    for (const key of ['minimized', 'maximized'] as const) {
      const value = record[key];
      if (typeof value === 'boolean') out[key] = value;
    }
    return out;
  } catch {
    // A browser that blocks storage keeps the defaults. Nothing to say.
    return {};
  }
}

function write(storageKey: string, value: Stored) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(value));
  } catch {
    // See above.
  }
}

const subscribeMd = (onChange: () => void) => {
  const query = window.matchMedia(MD_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
};
const isMd = () => window.matchMedia(MD_QUERY).matches;
// The server draws the sheet branch, which renders nothing while closed and
// portals nothing on the server while open; the client corrects it on hydration.
const isMdOnServer = () => false;

const readViewport = (): Size => ({
  width: window.innerWidth,
  height: window.innerHeight,
});

/** Where each handle sits and which cursor it shows. Edges are 6 px, corners 12 px. */
const EDGE_CLASS: Record<ResizeEdge, string> = {
  n: 'inset-x-3 top-0 h-1.5 cursor-ns-resize',
  s: 'inset-x-3 bottom-0 h-1.5 cursor-ns-resize',
  e: 'inset-y-3 right-0 w-1.5 cursor-ew-resize',
  w: 'inset-y-3 left-0 w-1.5 cursor-ew-resize',
  ne: 'right-0 top-0 size-3 cursor-nesw-resize',
  sw: 'bottom-0 left-0 size-3 cursor-nesw-resize',
  nw: 'left-0 top-0 size-3 cursor-nwse-resize',
  se: 'bottom-0 right-0 size-3 cursor-nwse-resize',
};

/** A press on one of these, inside the bar, is a click on it — not the start of a drag. */
const INTERACTIVE = 'button, a, input, select, textarea, [role="button"]';

export function FloatingWindow(props: FloatingWindowProps) {
  const md = useSyncExternalStore(subscribeMd, isMd, isMdOnServer);
  if (!md) {
    return (
      <SheetRoot open={props.open} onOpenChange={props.onOpenChange}>
        <SheetContent title={props.title} pad="none">
          {props.children}
        </SheetContent>
      </SheetRoot>
    );
  }
  return <DesktopWindow {...props} />;
}

function DesktopWindow({
  open,
  onOpenChange,
  title,
  icon,
  actions,
  labels,
  storageKey,
  minWidth = 360,
  minHeight = 320,
  maxWidth = 1280,
  maxHeight = 960,
  defaultWidth = 820,
  defaultHeight = 680,
  defaultPosition,
  defaultMinimized = false,
  onMinimizedChange,
  children,
  className,
}: FloatingWindowProps) {
  const titleId = useId();
  const limits: SizeLimits = { minWidth, minHeight, maxWidth, maxHeight };

  // `null` until mounted: there is no viewport to place the window in before.
  const [viewport, setViewport] = useState<Size | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const [minimized, setMinimizedState] = useState(defaultMinimized);
  const [maximized, setMaximized] = useState(false);

  // Read once per key, after mount. The defaults are read here and not
  // tracked: they describe a first open, not a live value.
  // biome-ignore lint/correctness/useExhaustiveDependencies: see above
  useEffect(() => {
    const current = readViewport();
    const stored = storageKey ? read(storageKey) : {};
    const width = stored.width ?? defaultWidth;
    const height = stored.height ?? defaultHeight;
    setRect({
      width,
      height,
      x:
        stored.x ?? defaultPosition?.x ?? current.width - DEFAULT_INSET - width,
      y: stored.y ?? defaultPosition?.y ?? DEFAULT_INSET,
    });
    if (stored.minimized !== undefined) setMinimizedState(stored.minimized);
    if (stored.maximized !== undefined) setMaximized(stored.maximized);
    setViewport(current);
  }, [storageKey]);

  useEffect(() => {
    const onResize = () => setViewport(readViewport());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!storageKey || !rect) return;
    write(storageKey, { ...rect, minimized, maximized });
  }, [storageKey, rect, minimized, maximized]);

  const setMinimized = useCallback(
    (next: boolean) => {
      setMinimizedState(next);
      onMinimizedChange?.(next);
    },
    [onMinimizedChange],
  );

  // Focus comes into the window when it opens, so Escape and the keyboard
  // controls work without a click first.
  const windowRef = useRef<HTMLElement>(null);
  const placed = rect !== null && viewport !== null;
  useEffect(() => {
    if (open && placed) windowRef.current?.focus();
  }, [open, placed]);

  const drawn = rect && viewport ? fit(rect, limits, viewport) : null;
  const shown =
    drawn && viewport && maximized ? maximizedRect(viewport) : drawn;

  const drag = useRef<{
    kind: 'move' | ResizeEdge;
    startX: number;
    startY: number;
    start: Rect;
  } | null>(null);

  const begin = (
    kind: 'move' | ResizeEdge,
    event: PointerEvent<HTMLElement>,
  ) => {
    if (event.button !== 0 || !drawn) return;
    drag.current = {
      kind,
      startX: event.clientX,
      startY: event.clientY,
      start: drawn,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };
  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d || !viewport) return;
    const dx = event.clientX - d.startX;
    const dy = event.clientY - d.startY;
    setRect(
      d.kind === 'move'
        ? moveRect(d.start, dx, dy, limits, viewport)
        : resizeRect(d.start, d.kind, dx, dy, limits, viewport),
    );
  };
  const onPointerUp = (event: PointerEvent<HTMLElement>) => {
    if (!drag.current) return;
    drag.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const onBarPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (maximized) return;
    const target = event.target as Element;
    const control = target.closest(INTERACTIVE);
    if (control && !control.hasAttribute('data-window-grip')) return;
    begin('move', event);
  };

  const onGripKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!drawn || !viewport || maximized) return;
    const delta: Record<string, [number, number]> = {
      ArrowLeft: [-STEP, 0],
      ArrowRight: [STEP, 0],
      ArrowUp: [0, -STEP],
      ArrowDown: [0, STEP],
    };
    const step = delta[event.key];
    if (!step) return;
    event.preventDefault();
    const [dx, dy] = step;
    setRect(
      event.shiftKey && !minimized
        ? resizeRect(drawn, 'se', dx, dy, limits, viewport)
        : moveRect(drawn, dx, dy, limits, viewport),
    );
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Escape' || minimized) return;
    // React bubbles events through portals, so Escape in a menu or select
    // opened from inside the window arrives here too. That Escape is the
    // menu's; only one pressed in the window's own DOM minimizes it.
    if (!event.currentTarget.contains(event.target as Node)) return;
    event.preventDefault();
    setMinimized(true);
    windowRef.current?.focus();
  };

  if (!open || !shown) return null;

  const MinimizeIcon = minimized ? ChevronDown : Minus;
  const MaximizeIcon = maximized ? Minimize2 : Maximize2;

  return createPortal(
    <section
      ref={windowRef}
      role="dialog"
      aria-labelledby={titleId}
      tabIndex={-1}
      data-minimized={minimized ? 'true' : undefined}
      data-maximized={maximized ? 'true' : undefined}
      onKeyDown={onKeyDown}
      style={
        {
          left: shown.x,
          top: shown.y,
          width: shown.width,
          height: minimized ? BAR_HEIGHT : shown.height,
        } as CSSProperties
      }
      className={cn(
        'glass-strong fixed z-overlay flex flex-col overflow-hidden rounded-sheet text-ink outline-none',
        className,
      )}
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: the bar is a drag surface for a pointer; its keyboard alternative is the grip button inside it */}
      <header
        onPointerDown={onBarPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={(event) => {
          if ((event.target as Element).closest(INTERACTIVE)) return;
          setMaximized((value) => !value);
        }}
        className={cn(
          'flex h-10 shrink-0 touch-none select-none items-center gap-2 pl-1 pr-1.5',
          !minimized && 'border-b border-line',
          !maximized && 'cursor-move',
        )}
      >
        <Button
          variant="ghost"
          size="sm"
          icon
          data-window-grip=""
          aria-label={labels.move}
          aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight Shift+ArrowUp Shift+ArrowDown Shift+ArrowLeft Shift+ArrowRight"
          disabled={maximized}
          onKeyDown={onGripKeyDown}
          className="cursor-move text-ink-3"
        >
          <GripVertical size={16} aria-hidden="true" />
        </Button>
        <h2
          id={titleId}
          className="flex min-w-0 flex-1 items-center gap-2 truncate text-sm font-semibold"
        >
          {icon}
          <span className="truncate">{title}</span>
        </h2>
        {actions}
        <Button
          variant="ghost"
          size="sm"
          icon
          aria-label={minimized ? labels.restore : labels.minimize}
          onClick={() => setMinimized(!minimized)}
        >
          <MinimizeIcon size={16} aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon
          aria-label={maximized ? labels.unmaximize : labels.maximize}
          aria-pressed={maximized}
          onClick={() => {
            setMaximized(!maximized);
            if (minimized) setMinimized(false);
          }}
        >
          <MaximizeIcon size={16} aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon
          aria-label={labels.close}
          onClick={() => onOpenChange(false)}
        >
          <X size={16} aria-hidden="true" />
        </Button>
      </header>

      {/* Kept mounted while minimized, so what is in it — a draft, a scroll position — survives. */}
      <div hidden={minimized} className="flex min-h-0 flex-1 flex-col">
        {children}
      </div>

      {minimized || maximized
        ? null
        : RESIZE_EDGES.map((edge) => (
            <div
              key={edge}
              aria-hidden="true"
              data-resize={edge}
              onPointerDown={(event) => begin(edge, event)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              className={cn('absolute z-raised touch-none', EDGE_CLASS[edge])}
            />
          ))}
    </section>,
    document.body,
  );
}
