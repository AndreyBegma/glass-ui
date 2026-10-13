'use client';

import { Plus, X } from 'lucide-react';
import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useScrollEdges } from '../hooks/use-scroll-edges';
import { cn } from '../lib/cn';
import { Button } from '../primitives/button';
import { type Status, StatusDot } from '../primitives/status-pill';

/**
 * #94 — the strip along the bottom of a workspace: what is open, which one is
 * in front, and a word on how things are going ("3 agents running").
 *
 * Each tab is a status dot, a label and a close ×; after them, a "+". It is
 * chrome, so it is glass. Too many tabs scroll sideways, with a fade on the
 * side that has more, and the active tab is brought into view whenever it
 * changes — opening the twentieth item never leaves it off-screen.
 *
 * **A tablist with a roving focus.** One Tab stop for the whole strip; the
 * arrow keys, Home and End move between tabs; Enter or Space brings one to
 * the front. Moving focus does not switch — a tab here is often a whole
 * session, and walking past five of them should not load five. Delete (or
 * Backspace) closes the focused tab and focus moves to its neighbour.
 *
 * **The × is beside the tab, not in it.** A button inside a `role="tab"` is an
 * interactive element inside another, which a screen reader cannot reach
 * reliably. So the × is a sibling, for the pointer, out of the Tab order —
 * the keyboard closes with Delete — and named "Close <label>".
 *
 * The dot is `StatusDot`, the same mapping as every other status surface. The
 * active tab is marked with the accent, which is what the accent is for.
 * Every string it writes itself is in `labels`.
 */
export interface DockTab {
  id: string;
  label: string;
  status?: Status;
  /** Default true. A pinned tab has no ×, and Delete leaves it. */
  closable?: boolean;
}

export interface DockTabsLabels {
  /** The tablist's accessible name. Default "Open items". */
  tablist: string;
  /** The × button. Default "Close <label>". */
  close: (label: string) => string;
  /** The "+" button. Default "New tab". */
  add: string;
}

const DEFAULT_LABELS: DockTabsLabels = {
  tablist: 'Open items',
  close: (label) => `Close ${label}`,
  add: 'New tab',
};

export interface DockTabsProps {
  items: readonly DockTab[];
  activeId?: string;
  onSelect: (id: string) => void;
  onClose?: (id: string) => void;
  /** Shows the "+" button. */
  onAdd?: () => void;
  /** Right-hand text: "3 agents running". */
  status?: ReactNode;
  labels?: Partial<DockTabsLabels>;
  className?: string;
}

/*
 * The fade is a mask on the scroller rather than a gradient over it: the strip
 * is glass, and a gradient would have to guess the colour behind it. Each
 * combination spelled out for Tailwind's scan.
 */
const FADE = {
  none: '',
  start: '[mask-image:linear-gradient(to_right,transparent,black_24px)]',
  end: '[mask-image:linear-gradient(to_left,transparent,black_24px)]',
  both: '[mask-image:linear-gradient(to_right,transparent,black_24px,black_calc(100%-24px),transparent)]',
} as const;

export function DockTabs({
  items,
  activeId,
  onSelect,
  onClose,
  onAdd,
  status,
  labels: labelsProp,
  className,
}: DockTabsProps) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp };
  const {
    ref: scroller,
    edges,
    onScroll,
  } = useScrollEdges<HTMLDivElement>('x');
  const tabs = useRef(new Map<string, HTMLButtonElement>());
  const activeIndex = items.findIndex((item) => item.id === activeId);
  // The tab that holds the strip's single Tab stop: the active one until the
  // arrows move it.
  const [focusId, setFocusId] = useState<string | undefined>(activeId);
  const focusIndex = items.findIndex((item) => item.id === focusId);
  const stopIndex = focusIndex >= 0 ? focusIndex : Math.max(0, activeIndex);

  useEffect(() => {
    setFocusId(activeId);
    if (!activeId) return;
    tabs.current
      .get(activeId)
      ?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [activeId]);

  const focusAt = (index: number) => {
    const item = items[index];
    if (!item) return;
    setFocusId(item.id);
    tabs.current.get(item.id)?.focus();
  };

  const close = (index: number) => {
    const item = items[index];
    if (!item || item.closable === false || !onClose) return;
    const neighbour = items[index + 1] ?? items[index - 1];
    onClose(item.id);
    if (neighbour) {
      setFocusId(neighbour.id);
      // After the parent drops the closed tab.
      queueMicrotask(() => tabs.current.get(neighbour.id)?.focus());
    }
  };

  const onKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    const last = items.length - 1;
    switch (event.key) {
      case 'ArrowRight':
        focusAt(index === last ? 0 : index + 1);
        break;
      case 'ArrowLeft':
        focusAt(index === 0 ? last : index - 1);
        break;
      case 'Home':
        focusAt(0);
        break;
      case 'End':
        focusAt(last);
        break;
      case 'Delete':
      case 'Backspace':
        close(index);
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  const fade =
    edges.start && edges.end
      ? FADE.both
      : edges.start
        ? FADE.start
        : edges.end
          ? FADE.end
          : FADE.none;

  return (
    <div
      data-dock-tabs
      className={cn(
        'glass flex h-11 min-w-0 items-center gap-1 rounded-control px-1.5 text-ink',
        className,
      )}
    >
      <div
        ref={scroller}
        onScroll={onScroll}
        className={cn(
          'flex min-w-0 flex-1 items-center overflow-x-auto scrollbar-hide',
          fade,
        )}
      >
        <div
          role="tablist"
          aria-label={labels.tablist}
          aria-orientation="horizontal"
          className="flex items-center gap-1"
        >
          {items.map((item, index) => {
            const active = item.id === activeId;
            const closable = item.closable !== false && Boolean(onClose);
            return (
              <div
                key={item.id}
                data-dock-tab={item.id}
                data-active={active || undefined}
                className={cn(
                  'group/dock-tab relative flex h-8 shrink-0 items-center rounded-control',
                  'transition-colors duration-(--dur-fast)',
                  active
                    ? 'bg-hover text-ink after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-accent after:content-[""]'
                    : 'text-ink-2 hover:bg-hover hover:text-ink',
                )}
              >
                <button
                  ref={(el) => {
                    if (el) tabs.current.set(item.id, el);
                    else tabs.current.delete(item.id);
                  }}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  tabIndex={index === stopIndex ? 0 : -1}
                  onClick={() => onSelect(item.id)}
                  onKeyDown={(event) => onKeyDown(event, index)}
                  onFocus={() => setFocusId(item.id)}
                  className={cn(
                    'flex h-full max-w-48 items-center gap-2 rounded-control text-xs font-medium',
                    closable ? 'pr-1 pl-3' : 'px-3',
                  )}
                >
                  {item.status ? <StatusDot status={item.status} /> : null}
                  <span className="truncate">{item.label}</span>
                </button>
                {closable ? (
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label={labels.close(item.label)}
                    data-dock-close={item.id}
                    onClick={() => close(index)}
                    className="mr-1 flex size-5 items-center justify-center rounded-full text-ink-3 hover:bg-hover hover:text-ink"
                  >
                    <X size={12} aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
      {onAdd ? (
        <Button
          variant="ghost"
          size="sm"
          icon
          aria-label={labels.add}
          onClick={onAdd}
          className="h-8 shrink-0"
        >
          <Plus size={16} aria-hidden="true" />
        </Button>
      ) : null}
      {status ? (
        <div
          data-dock-status
          className="ml-2 shrink-0 truncate pr-2 text-label text-ink-2"
        >
          {status}
        </div>
      ) : null}
    </div>
  );
}
