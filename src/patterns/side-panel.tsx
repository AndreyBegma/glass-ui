'use client';

import { PanelLeftOpen, PanelRightOpen } from 'lucide-react';
import {
  type CSSProperties,
  createContext,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { cn } from '../lib/cn';
import { Button } from '../primitives/button';
import { Tooltip } from '../primitives/tooltip';

/**
 * FEAT-20260911-002 — the resizable, collapsible column (`V2` decision 2).
 *
 * Denitsa's Ask panel hand-rolls this today: a `role="separator"` div with
 * pointer capture, arrow keys at ±16, a 320–640 clamp and a width remembered
 * in `localStorage`. `V4` needs the same thing on the other side of the
 * content for the current application's sections. Two hand-rolled copies of
 * a splitter is how the two stop agreeing about what a splitter does, so the
 * behaviour moves here and both take it.
 *
 * **The panel does not own its contents and does not know what an
 * application is.** It draws a column, a handle and — when collapsed — a
 * strip with the way back. What goes in the column is `children`; what goes
 * in the strip is `rail`. Neither is read.
 *
 * **It does own its state, and persists it.** `{ width, collapsed }` lives
 * here and is written under `storageKey`, which is required so two panels
 * on one screen never share a record. Read after mount rather than during
 * render: the server has no `localStorage`, and the alternative is a panel
 * that renders at one width and snaps to another as it hydrates. A consumer
 * that needs its own control — a collapse button in its header — reaches
 * the state through `useSidePanel()`.
 *
 * **Collapsing to zero is not possible.** `minWidth` is a prop, and dragging
 * past half of it does not produce a narrower panel — it produces the strip,
 * which carries the expand button and never goes away. A panel that can be
 * dragged to nothing is a panel a person has to know how to get back.
 *
 * **The handle is the WAI-ARIA window splitter.** `role="separator"` with
 * `aria-valuenow` / `min` / `max`, focusable, drag by pointer capture, and
 * the keys the pattern names: arrows move it by 16, Home and End go to the
 * ends, Enter collapses an open panel and restores a collapsed one. The
 * handle stays when the panel is collapsed, so a keyboard has the same way
 * back a pointer does.
 *
 * `side` says which edge of the content the panel sits on, and therefore
 * which edge the handle is on and which way a drag widens. The sections
 * panel is `start`; Ask is `end`.
 */
export interface SidePanelLabels {
  /** The handle's accessible name: "Resize the panel". */
  resize: string;
  /** The strip's button: "Show the panel". */
  expand: string;
}

export interface SidePanelState {
  collapsed: boolean;
  width: number;
  collapse: () => void;
  expand: () => void;
  toggle: () => void;
  setWidth: (width: number) => void;
}

const SidePanelContext = createContext<SidePanelState | null>(null);

/** The panel's state, for a control the consumer draws itself. */
export function useSidePanel(): SidePanelState {
  const state = useContext(SidePanelContext);
  if (!state) throw new Error('useSidePanel() is read inside a <SidePanel>');
  return state;
}

export interface SidePanelProps {
  /** Where `{ width, collapsed }` is remembered. Required: two panels must not share one. */
  storageKey: string;
  'aria-label': string;
  labels: SidePanelLabels;
  /** Which edge of the content the panel sits on. */
  side?: 'start' | 'end';
  minWidth?: number;
  maxWidth?: number;
  defaultWidth?: number;
  defaultCollapsed?: boolean;
  /** `glass` for chrome — a rail of sections; `glass-strong` under body text. */
  material?: 'glass' | 'glass-strong';
  /** What the strip carries under the expand button, when collapsed. */
  rail?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** What the strip is wide: one rail item and the rail's own padding. */
const STRIP_WIDTH = 'calc(var(--size-nav) + 1rem)';
const STEP = 16;

interface Stored {
  width: number;
  collapsed: boolean;
}

function read(storageKey: string): Partial<Stored> {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    const { width, collapsed } = parsed as Record<string, unknown>;
    return {
      width: typeof width === 'number' && Number.isFinite(width) ? width : undefined,
      collapsed: typeof collapsed === 'boolean' ? collapsed : undefined,
    };
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

export function SidePanel({
  storageKey,
  'aria-label': ariaLabel,
  labels,
  side = 'start',
  minWidth = 240,
  maxWidth = 480,
  defaultWidth = 288,
  defaultCollapsed = false,
  material = 'glass',
  rail,
  children,
  className,
}: SidePanelProps) {
  const clamp = useCallback(
    (value: number) => Math.min(maxWidth, Math.max(minWidth, value)),
    [minWidth, maxWidth],
  );

  const [width, setWidthState] = useState(() => clamp(defaultWidth));
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  // Nothing is written back until the stored record has been read, or the
  // first render's defaults would overwrite what the person chose last time.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = read(storageKey);
    if (stored.width !== undefined) setWidthState(clamp(stored.width));
    if (stored.collapsed !== undefined) setCollapsed(stored.collapsed);
    setHydrated(true);
  }, [storageKey, clamp]);

  useEffect(() => {
    if (hydrated) write(storageKey, { width, collapsed });
  }, [hydrated, storageKey, width, collapsed]);

  const setWidth = useCallback((next: number) => setWidthState(clamp(next)), [clamp]);
  const collapse = useCallback(() => setCollapsed(true), []);
  const expand = useCallback(() => setCollapsed(false), []);
  const toggle = useCallback(() => setCollapsed((value) => !value), []);

  const state = useMemo<SidePanelState>(
    () => ({ collapsed, width, collapse, expand, toggle, setWidth }),
    [collapsed, width, collapse, expand, toggle, setWidth],
  );

  /**
   * A drag is read against where it started, not against the last event, so
   * a pointer that leaves the handle mid-drag — which every fast drag does —
   * still lands where the pointer is. Pointer capture keeps the events
   * coming after the pointer has left the element.
   *
   * `sign` is which direction widens: rightward for a panel on the start
   * edge, leftward for one on the end edge.
   */
  const drag = useRef<{ startX: number; startWidth: number } | null>(null);
  const sign = side === 'start' ? 1 : -1;

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    drag.current = { startX: event.clientX, startWidth: collapsed ? 0 : width };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const raw = drag.current.startWidth + sign * (event.clientX - drag.current.startX);
    if (raw < minWidth / 2) {
      setCollapsed(true);
    } else {
      setCollapsed(false);
      setWidthState(clamp(raw));
    }
  };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    drag.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const widen = side === 'start' ? 'ArrowRight' : 'ArrowLeft';
    const narrow = side === 'start' ? 'ArrowLeft' : 'ArrowRight';
    switch (event.key) {
      case widen:
        if (collapsed) expand();
        else setWidth(width + STEP);
        break;
      case narrow:
        if (!collapsed) setWidth(width - STEP);
        break;
      case 'Home':
        expand();
        setWidth(minWidth);
        break;
      case 'End':
        expand();
        setWidth(maxWidth);
        break;
      case 'Enter':
        toggle();
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  const ExpandIcon = side === 'start' ? PanelLeftOpen : PanelRightOpen;

  return (
    <SidePanelContext.Provider value={state}>
      <aside
        aria-label={ariaLabel}
        data-collapsed={collapsed ? 'true' : undefined}
        style={
          {
            '--side-panel-width': collapsed ? STRIP_WIDTH : `${width}px`,
          } as CSSProperties
        }
        className={cn(
          material,
          'relative flex w-[var(--side-panel-width)] shrink-0 flex-col rounded-surface',
          'motion-safe:transition-[width] motion-safe:duration-(--dur-base) motion-safe:ease-(--ease-sheet)',
          className,
        )}
      >
        {collapsed ? (
          <div className="flex min-h-0 flex-1 flex-col items-center gap-1 overflow-y-auto p-2">
            <Tooltip content={labels.expand} side={side === 'start' ? 'right' : 'left'}>
              <Button
                variant="ghost"
                size="sm"
                icon
                aria-label={labels.expand}
                onClick={expand}
                className="h-[var(--size-nav)] w-[var(--size-nav)]"
              >
                <ExpandIcon size={18} aria-hidden="true" />
              </Button>
            </Tooltip>
            {rail}
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        )}

        {/*
            The handle. Six pixels on the panel's content edge, inside it, so it
            does not add to the layout. A thumb cannot use a six-pixel edge, and
            on the layout that has thumbs this panel is a sheet instead — the
            consumer's decision, as it is for Ask today.
          */}
        {/* biome-ignore lint/a11y/useSemanticElements: a separator that is dragged has no element; the role is the correct one and the keyboard alternative is above */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={labels.resize}
          aria-valuemin={minWidth}
          aria-valuemax={maxWidth}
          aria-valuenow={collapsed ? minWidth : width}
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
          className={cn(
            'absolute top-0 z-raised h-full w-1.5 cursor-col-resize touch-none',
            'rounded-full motion-safe:transition-colors duration-(--dur-fast)',
            'hover:bg-hover focus-visible:bg-hover',
            side === 'start' ? 'right-0' : 'left-0',
          )}
        />
      </aside>
    </SidePanelContext.Provider>
  );
}
