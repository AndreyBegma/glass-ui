'use client';

import { motion, useReducedMotion } from 'motion/react';
import {
  createContext,
  type KeyboardEvent,
  type ReactNode,
  useContext,
  useId,
} from 'react';
import { cn } from '../lib/cn';
import type { NavLinkRender } from '../patterns/nav-link';
import { SPRINGS } from './springs';

/**
 * FEAT-20260902-004 — navigation, not selection.
 *
 * `SegmentedControl` is `aria-pressed`: a switch that redraws the same region
 * under a different filter. `Tabs` is `aria-current="page"`: each item is a
 * real destination — Denitsa's `task-filters.tsx` is the named consumer, and
 * `U4`'s mapping table draws the line between the two on exactly this axis.
 * Same travelling capsule as `SegmentedControl`, because a selection that
 * lands on a link should look like one that lands on a button; only the ARIA
 * differs, because what happens on click does.
 *
 * The interactive element — the consumer's `Link` — is left to the caller as
 * `children`, exactly as `SegmentedControl` leaves it: a primitive in `ui/`
 * importing a router's `Link` would point the dependency the wrong way. That
 * also means `aria-current="page"` is the caller's own anchor's attribute,
 * not this component's — `current` only drives the capsule.
 *
 * @deprecated #130 — `Tabs` is neither ARIA tabs nor a navigation list: the
 * UX review found AgentDock filling it with `aria-pressed` buttons, so a
 * screen reader heard a row of toggles. Use `TabGroup` / `TabList` / `Tab` /
 * `TabPanel` when the items switch panels on the same page, and `NavTabs` /
 * `NavTab` when each one is a real destination. `Tabs` keeps rendering
 * exactly what it rendered, and goes in the next major.
 */
interface TabsProps {
  children: ReactNode;
  className?: string;
  'aria-label'?: string;
}

/**
 * @deprecated #130 — use `TabGroup` / `TabList` (panels) or `NavTabs`
 * (links). Rendering is unchanged; see the block above `TabsProps`.
 */
export function Tabs({ children, className, ...props }: TabsProps) {
  return (
    <ul className={cn('flex gap-1 rounded-control bg-surface p-1', className)} {...props}>
      {children}
    </ul>
  );
}

interface TabsItemProps {
  current: boolean;
  layoutId: string;
  children: ReactNode;
  className?: string;
}

/** @deprecated #130 — use `Tab` inside a `TabList`, or `NavTab`. */
export function TabsItem({ current, layoutId, children, className }: TabsItemProps) {
  const reduced = useReducedMotion();
  return (
    <li className={cn('relative min-w-0 flex-1', className)}>
      {current ? (
        <motion.span
          layoutId={layoutId}
          className="absolute inset-0 rounded-[calc(var(--radius-control)-4px)] bg-raised"
          transition={
            reduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34, mass: 0.9 }
          }
        />
      ) : null}
      {children}
    </li>
  );
}

/**
 * #130 — ARIA tabs, for a row that switches panels on the same page.
 *
 * The UX review counted three tab implementations in AgentDock and none of
 * them was the WAI-ARIA Tabs pattern: each was a row of `aria-pressed`
 * buttons inside `Tabs`, so a screen reader announced toggles, every item
 * was its own Tab stop, and nothing tied a button to the region it drew.
 * These four are the pattern, so the next screen cannot get it wrong:
 *
 * - `TabGroup` holds the selection and the id base, and renders nothing. The
 *   panels are the list's siblings, not its children, so something above
 *   both has to own what they share; `Tabs` was taken.
 * - `TabList` is `role="tablist"`; `Tab` is `role="tab"` with
 *   `aria-selected` and `aria-controls`; `TabPanel` is `role="tabpanel"`
 *   with `aria-labelledby`. The ids are derived from the group's base and
 *   each tab's `value`, so the caller writes none of them.
 * - **One Tab stop.** The selected tab is `tabIndex=0` and the rest `-1`
 *   (a roving tabindex). Left and Right move focus along the row and wrap,
 *   Home and End go to the ends, and a tab marked `disabled` is passed over.
 * - **Manual activation.** The arrows move focus only; Enter, Space or a
 *   click selects. The APG allows either, and this one is chosen because the
 *   selection is controlled and AgentDock writes it to `?tab=`: automatic
 *   activation would push a URL and mount a panel for every tab the arrow
 *   passes on its way to the one the person wanted.
 *
 * It looks like `Tabs` — the `bg-surface` well and the `bg-raised`
 * travelling capsule — so a screen that moves over changes its semantics and
 * not its pixels. The focus ring is the global `:focus-visible` one, as for
 * every primitive (`button.tsx`).
 *
 * `value` must name one of the tabs. A value that names none leaves the row
 * with no Tab stop, so a consumer reading `?tab=` from the URL falls back to
 * its default before it gets here.
 */
interface TabGroupShape {
  value: string;
  onValueChange: (value: string) => void;
  idBase: string;
}

const TabGroupContext = createContext<TabGroupShape | null>(null);

function useTabGroup(component: string): TabGroupShape {
  const group = useContext(TabGroupContext);
  if (!group) throw new Error(`${component} must be rendered inside a TabGroup`);
  return group;
}

/** An id fragment from a tab's `value`: ids may not carry spaces. */
function idPart(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]/g, '_');
}

const tabId = (group: TabGroupShape, value: string) =>
  `${group.idBase}-tab-${idPart(value)}`;
const panelId = (group: TabGroupShape, value: string) =>
  `${group.idBase}-panel-${idPart(value)}`;

interface TabGroupProps {
  /** The selected tab's `value`. Controlled: sync it to `?tab=` if you like. */
  value: string;
  /** Called with a tab's `value` when it is activated (Enter, Space, click). */
  onValueChange: (value: string) => void;
  /** The base the tab and panel ids are built from; a `useId()` by default. */
  id?: string;
  children: ReactNode;
}

export function TabGroup({ value, onValueChange, id, children }: TabGroupProps) {
  const generated = useId();
  const idBase = id ?? generated.replace(/[^A-Za-z0-9_-]/g, '');
  return (
    <TabGroupContext.Provider value={{ value, onValueChange, idBase }}>
      {children}
    </TabGroupContext.Provider>
  );
}

interface TabListProps {
  children: ReactNode;
  className?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
}

export function TabList({ children, className, ...props }: TabListProps) {
  useTabGroup('TabList');
  return (
    <div
      role="tablist"
      aria-orientation="horizontal"
      className={cn('flex gap-1 rounded-control bg-surface p-1', className)}
      {...props}
    >
      {children}
    </div>
  );
}

const KEYS = new Set(['ArrowLeft', 'ArrowRight', 'Home', 'End']);

/** Moves focus along the tablist the event came from; disabled tabs are passed over. */
function roveFocus(event: KeyboardEvent<HTMLButtonElement>) {
  if (!KEYS.has(event.key)) return;
  const list = event.currentTarget.closest('[role="tablist"]');
  if (!list) return;
  const tabs = Array.from(
    list.querySelectorAll<HTMLButtonElement>(
      '[role="tab"]:not([aria-disabled="true"])',
    ),
  );
  if (tabs.length === 0) return;
  event.preventDefault();
  const at = tabs.indexOf(event.currentTarget);
  const next =
    event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? tabs.length - 1
        : (at + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) %
          tabs.length;
  tabs[next]?.focus();
}

interface TabProps {
  /** Identifies the tab and its `TabPanel`. */
  value: string;
  /**
   * `aria-disabled` rather than the attribute: the tab stays in the
   * accessibility tree and announces that it is unavailable, while the
   * arrows pass over it and a click does nothing.
   */
  disabled?: boolean;
  children: ReactNode;
  /** Merged after the tab's own classes, the way `TabsItem` takes one. */
  className?: string;
}

export function Tab({ value, disabled = false, children, className }: TabProps) {
  const group = useTabGroup('Tab');
  const reduced = useReducedMotion();
  const selected = group.value === value;
  return (
    <button
      type="button"
      role="tab"
      id={tabId(group, value)}
      aria-selected={selected}
      aria-controls={panelId(group, value)}
      aria-disabled={disabled || undefined}
      tabIndex={selected ? 0 : -1}
      onKeyDown={roveFocus}
      onClick={() => {
        if (!disabled && !selected) group.onValueChange(value);
      }}
      className={cn(
        'relative flex min-w-0 flex-1 items-center justify-center whitespace-nowrap rounded-[calc(var(--radius-control)-4px)] px-3 py-2 text-sm',
        selected
          ? 'font-semibold text-ink'
          : 'font-medium text-ink-3 hover:text-ink-2',
        disabled && 'cursor-not-allowed opacity-40 hover:text-ink-3',
        className,
      )}
    >
      {selected ? (
        <motion.span
          layoutId={`${group.idBase}-capsule`}
          className="absolute inset-0 rounded-[calc(var(--radius-control)-4px)] bg-raised"
          transition={reduced ? SPRINGS.reduced : SPRINGS.capsule}
        />
      ) : null}
      <span className="relative">{children}</span>
    </button>
  );
}

interface TabPanelProps {
  /** The `value` of the `Tab` that labels this panel. */
  value: string;
  /**
   * By default a hidden panel keeps its element (so `aria-controls` always
   * points at something) but not its children. `keepMounted` keeps the
   * children too, for a panel whose unsaved state must survive a switch.
   *
   * The panel itself is not a Tab stop. The APG adds `tabIndex=0` only to a
   * panel with nothing focusable inside, and every panel in AgentDock holds
   * a field or a button; Biome's `noNoninteractiveTabindex` holds the line.
   */
  keepMounted?: boolean;
  children: ReactNode;
  className?: string;
}

export function TabPanel({
  value,
  keepMounted = false,
  children,
  className,
}: TabPanelProps) {
  const group = useTabGroup('TabPanel');
  const selected = group.value === value;
  return (
    <div
      role="tabpanel"
      id={panelId(group, value)}
      aria-labelledby={tabId(group, value)}
      hidden={!selected}
      className={className}
    >
      {selected || keepMounted ? children : null}
    </div>
  );
}

/**
 * #130 — tabs that are links: each item is a destination, and the current
 * one is `aria-current="page"`.
 *
 * This is the job `Tabs` was written for (FEAT-20260902-004) and done
 * properly: the component sets `aria-current` itself instead of leaving it to
 * the caller's anchor, and it renders a `<nav>` so the row is a landmark. It
 * is not a `tablist` — arrow keys do not move between links; Tab does, as it
 * does between any links.
 *
 * The anchor is the consumer's, through the same `NavLinkRender` function
 * `NavRail` and `BottomCapsule` take (`patterns/nav-link.ts`, imported as a
 * type only, so no code crosses from patterns into primitives). Without one
 * the item renders a plain `<a>`. Same well and capsule as `TabList`.
 */
interface NavTabsShape {
  link?: NavLinkRender;
  layoutId: string;
}

const NavTabsContext = createContext<NavTabsShape | null>(null);

interface NavTabsProps {
  children: ReactNode;
  className?: string;
  'aria-label': string;
  /** Renders each item's anchor; a plain `<a>` when omitted. */
  link?: NavLinkRender;
}

export function NavTabs({ children, className, link, ...props }: NavTabsProps) {
  const layoutId = `${useId().replace(/[^A-Za-z0-9_-]/g, '')}-nav-capsule`;
  return (
    <NavTabsContext.Provider value={{ link, layoutId }}>
      <nav {...props}>
        <ul className={cn('flex gap-1 rounded-control bg-surface p-1', className)}>
          {children}
        </ul>
      </nav>
    </NavTabsContext.Provider>
  );
}

interface NavTabProps {
  href: string;
  /** The page this item points to is the one on screen. */
  current: boolean;
  children: ReactNode;
  /** Merged after the item's own `relative min-w-0 flex-1`. */
  className?: string;
}

export function NavTab({ href, current, children, className }: NavTabProps) {
  const nav = useContext(NavTabsContext);
  if (!nav) throw new Error('NavTab must be rendered inside NavTabs');
  const reduced = useReducedMotion();
  const anchor = {
    href,
    className: cn(
      'relative flex w-full items-center justify-center whitespace-nowrap rounded-[calc(var(--radius-control)-4px)] px-3 py-2 text-sm',
      current
        ? 'font-semibold text-ink'
        : 'font-medium text-ink-3 hover:text-ink-2',
    ),
    'aria-current': current ? ('page' as const) : undefined,
    children: <span className="relative">{children}</span>,
  };
  return (
    <li className={cn('relative min-w-0 flex-1', className)}>
      {current ? (
        <motion.span
          layoutId={nav.layoutId}
          className="absolute inset-0 rounded-[calc(var(--radius-control)-4px)] bg-raised"
          transition={reduced ? SPRINGS.reduced : SPRINGS.capsule}
        />
      ) : null}
      {nav.link ? nav.link(anchor) : <a {...anchor} />}
    </li>
  );
}
