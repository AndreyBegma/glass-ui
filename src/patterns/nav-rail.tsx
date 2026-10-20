'use client';

import { ChevronDown, type LucideIcon } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { useBreakpoint } from '../hooks/use-breakpoint';
import { cn } from '../lib/cn';
import { Badge } from '../primitives/badge';
import { Tooltip } from '../primitives/tooltip';
import type { NavLinkRender } from './nav-link';
import {
  hasBadge,
  type RailBadge,
  RailBadgeMark,
  RailBadgeSpeech,
  useScrollFade,
} from './nav-rail-parts';

export type { RailBadge } from './nav-rail-parts';

/**
 * C-281 — how the rail is drawn. `open` and `folded` are `collapsed={false}`
 * and `collapsed={true}`, unchanged. `band` is `collapsed="tablet"`: the open
 * rail's classes plus their folded counterparts under `tablet:max-desktop:`,
 * so the stylesheet folds it in the tablet band and the server's HTML is
 * already right at every width — nothing visible waits for hydration.
 */
type Fold = 'open' | 'folded' | 'band';

/**
 * The classes for one piece of the rail. Every string is written out in full
 * at the call site, because Tailwind finds classes by scanning the source and
 * a class assembled at runtime is a class it never emits.
 */
function foldClass(fold: Fold, open: string, folded: string, band: string) {
  if (fold === 'open') return open;
  if (fold === 'folded') return folded;
  return `${open} ${band}`;
}

/**
 * FEAT-20260902-004 — the vertical rail, for a product with more than four
 * places to be.
 *
 * `BottomCapsule` is the narrow-width answer and it tops out at four tabs plus
 * an overflow. Denitsa has twenty-one sections in six groups, which on a desk
 * is not an overflow problem — it is a list with headings, and it wants the
 * whole width of a rail rather than the bottom of a phone.
 *
 * **The rail is chrome; the items are the consumer's.** Same contract as
 * `SegmentedControlItem` and `BottomCapsule`: this draws the glass, the
 * headings and the travelling capsule, and the thing that navigates comes in
 * through `link` (see `nav-link.ts`). A rail that imported `next/link` would be
 * a rail for exactly one application.
 *
 * **The selection travels on the vertical axis**, which is the
 * `global-search.tsx` precedent rather than the bottom bar's: a list is walked
 * rather than switched between, and the spring is a little stiffer and lighter
 * than the tab bar's because the distance is longer and a soft one reads as
 * lag.
 *
 * **Unavailable is marked, never hidden.** A section whose service is down
 * stays in the rail, carries a `warn` dot, and is still navigable — the page
 * behind it says what is wrong (`SectionUnavailable`), which a missing row
 * cannot. The wording of the marker is the consumer's, because only the
 * consumer knows whether it is "unavailable", "degraded" or "not set up yet".
 */
export interface NavRailItem {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Rendered through `link`. Omit for an item that acts rather than navigates. */
  href?: string;
  active?: boolean;
  onSelect?: () => void;
  /**
   * Draws a `warn` dot and appends this text to the item's accessible name.
   * The string is what a screen reader hears after the label, so it is a phrase
   * — "unavailable", "not connected" — rather than a flag.
   */
  unavailable?: string;
  /**
   * A count or a dot after the label ("Approvals 3"), in a status tone. A zero
   * count draws nothing. Its `label` is what a reader hears after the item's.
   */
  badge?: RailBadge;
  /**
   * C-281 (AgentDock S-7) — the one entry the product is built around (the
   * Board), drawn in an accent frame: a faint accent fill, an accent hairline,
   * the glyph on a solid accent tile and the label in `ink` at 600. Taller
   * than its neighbours (38px open, a 44px square folded), with a little air
   * under it, so it reads as the door rather than as the first row.
   *
   * One per rail. It is still an item — same `link`, `aria-current`, badge and
   * `unavailable` contract — so emphasis never changes what a reader hears.
   */
  primary?: boolean;
}

export interface NavRailGroup {
  id: string;
  /** Drawn above the group; the group's accessible name. */
  title: string;
  items: NavRailItem[];
  /**
   * The heading becomes a button that shows and hides the items
   * (`aria-expanded`, `aria-controls`). Ignored on an icon-only rail, where
   * the headings are not drawn.
   */
  collapsible?: boolean;
  /** Controlled. Pair with `onOpenChange`, which the rail also calls to auto-expand. */
  open?: boolean;
  /** Uncontrolled initial state. Defaults to open. */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * One group: its heading and its list. When `collapsible`, the heading is the
 * toggle and the list sits in a `0fr` → `1fr` grid row — `Disclosure`'s
 * technique, instant under reduced motion — and is `inert` while shut, so a
 * hidden item is neither tabbable nor read.
 *
 * A group that gains the active item opens itself (and says so through
 * `onOpenChange`, so a controlled owner stays in step): a rail must never show
 * the person a closed group holding the page they are on.
 */
function GroupSection({
  group,
  headingId,
  collapsed,
  band,
  reduced,
  hasActive,
  children,
}: {
  group: NavRailGroup;
  headingId: string;
  collapsed: boolean;
  /** `collapsed="tablet"`: the heading hides, and the group opens, in the band by CSS. */
  band: boolean;
  reduced: boolean;
  hasActive: boolean;
  children: ReactNode;
}) {
  const panelId = useId();
  const toggleable = !!group.collapsible && !collapsed;
  // The look: in the band the heading's classes are the open rail's, folded
  // by CSS, whatever `collapsed` says after hydration.
  const folded = collapsed && !band;
  const controlled = group.open !== undefined;
  const [inner, setInner] = useState((group.defaultOpen ?? true) || hasActive);
  const open = controlled ? !!group.open : inner;
  const { onOpenChange } = group;

  const set = (next: boolean) => {
    if (!controlled) setInner(next);
    onOpenChange?.(next);
  };

  const openRef = useRef(open);
  openRef.current = open;
  const setRef = useRef(set);
  setRef.current = set;
  useEffect(() => {
    if (group.collapsible && hasActive && !openRef.current) setRef.current(true);
  }, [group.collapsible, hasActive]);

  const title = (
    <h2
      id={headingId}
      className={cn(
        folded
          ? 'sr-only'
          : 'text-ink-3 text-[10px] font-semibold uppercase tracking-widest',
        !folded && !toggleable && 'px-3 py-2',
        // C-281 — in the tablet band the heading leaves the eye by CSS, so
        // the fold does not wait for hydration (which then drops the toggle).
        band && 'tablet:max-desktop:sr-only',
      )}
    >
      {toggleable ? (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => set(!open)}
          className={cn(
            'lit flex w-full items-center justify-between gap-2 rounded-control px-3 py-2 text-left',
            'uppercase tracking-widest hover:text-ink-2 motion-safe:transition-colors duration-(--dur-fast)',
          )}
        >
          {group.title}
          <ChevronDown
            size={12}
            aria-hidden="true"
            className={cn(
              'shrink-0 ease-out motion-safe:transition-transform',
              open ? 'rotate-0' : '-rotate-90',
            )}
            style={{ transitionDuration: reduced ? '0ms' : 'var(--dur-base)' }}
          />
        </button>
      ) : (
        group.title
      )}
    </h2>
  );

  if (!toggleable) {
    return (
      <>
        {title}
        {children}
      </>
    );
  }

  return (
    <>
      {title}
      <div
        id={panelId}
        inert={!open}
        className={cn(
          'grid ease-out transition-[grid-template-rows]',
          // A folded rail has no headings to reopen a group with, so in the
          // tablet band a closed group is drawn open — over the inline style.
          band && 'tablet:max-desktop:grid-rows-[1fr]!',
        )}
        style={{
          gridTemplateRows: open ? '1fr' : '0fr',
          transitionDuration: reduced ? '0ms' : 'var(--dur-base)',
        }}
      >
        <div className="min-h-0 overflow-hidden">{children}</div>
      </div>
    </>
  );
}

export interface NavRailProps {
  groups: NavRailGroup[];
  /** Required by every item that carries an `href`. */
  link?: NavLinkRender;
  'aria-label': string;
  /**
   * Icons only. Every item keeps its accessible name as `sr-only` text, so a
   * collapsed rail is exactly as reachable by keyboard and by reader as an open
   * one — the labels go for the eye, not for the tree.
   *
   * The visible name is `Tooltip` (glass-ui#10), opened on hover and on
   * keyboard focus — issue #11 item 1 (`u3-shell`, 2026-09-02): a native
   * `title=` does not open on focus and is invisible to touch.
   *
   * C-281 (AgentDock S-7) — `'tablet'` folds the rail to its 64px icon strip
   * only while the viewport is in the tablet band (640–1023px, see
   * `breakpoints.ts`) and draws it open on a desktop and a phone (where the
   * application normally draws `BottomCapsule` instead). The fold is CSS —
   * the open rail's classes plus `tablet:max-desktop:` counterparts — so the
   * server's HTML is already right at every width and hydration moves
   * nothing. Only the tooltips, which are invisible until hovered, wait for
   * `useBreakpoint`. The rail carries `data-collapsed="tablet"` in this mode
   * (`"true"` when `collapsed` is `true`).
   */
  collapsed?: boolean | 'tablet';
  /** Above the groups: a wordmark, a collapse toggle. Drawn once. */
  head?: ReactNode;
  /** Below them, pinned under the scroll: an account row, a version. */
  footer?: ReactNode;
  /** One travelling capsule per rail. */
  layoutId?: string;
  className?: string;
}

export function NavRail({
  groups,
  link,
  'aria-label': ariaLabel,
  collapsed: collapsedProp = false,
  head,
  footer,
  layoutId = 'glass-nav-rail',
  className,
}: NavRailProps) {
  const reduced = useReducedMotion();
  const breakpoint = useBreakpoint();
  // `collapsed` is behaviour — the tooltips, whether a heading toggles — and
  // may wait for hydration. `fold` is the look, and never does.
  const band = collapsedProp === 'tablet';
  const collapsed = band ? breakpoint === 'tablet' : collapsedProp;
  const fold: Fold = band ? 'band' : collapsed ? 'folded' : 'open';
  const headingPrefix = useId();
  const scrollRef = useRef<HTMLDivElement>(null);
  const fade = useScrollFade(scrollRef);

  /**
   * One element, one `layoutId`: walking the rail slides the highlight down it
   * rather than switching one off and another on. Not glass — it sits on a
   * glass rail, and a second blur inside the first has nothing left to refract.
   *
   * #93 — the accent's tint, with the active item's text in
   * `--color-accent-ink`. It was the grey hover fill, and grey on a grey rail
   * was where the audit lost track of which page it was on.
   */
  const capsule = (
    <motion.span
      layoutId={layoutId}
      aria-hidden="true"
      className="bg-accent-soft absolute inset-0 rounded-control"
      transition={
        reduced
          ? { duration: 0 }
          : { type: 'spring', stiffness: 500, damping: 40, mass: 0.7 }
      }
    />
  );

  return (
    <nav
      aria-label={ariaLabel}
      data-collapsed={band ? 'tablet' : collapsed ? 'true' : undefined}
      className={cn(
        'glass rounded-surface flex flex-col gap-2 p-2',
        foldClass(fold, 'w-60', 'w-16', 'tablet:max-desktop:w-16'),
        className,
      )}
    >
      {head ? <div className="shrink-0">{head}</div> : null}

      <div ref={scrollRef} style={fade} className="min-h-0 flex-1 overflow-y-auto">
        {groups.map((group, index) => {
          const headingId = `${headingPrefix}-${group.id}`;

          return (
            <div
              key={group.id}
              className={cn(
                // Collapsed, the headings are gone from the eye, so the groups
                // need some other edge between them or the rail reads as one
                // long column of glyphs.
                index > 0 &&
                  foldClass(
                    fold,
                    'mt-3',
                    'border-line mt-2 border-t pt-2',
                    'tablet:max-desktop:border-line tablet:max-desktop:mt-2 tablet:max-desktop:border-t tablet:max-desktop:pt-2',
                  ),
              )}
            >
              <GroupSection
                group={group}
                headingId={headingId}
                collapsed={collapsed}
                band={band}
                reduced={!!reduced}
                hasActive={group.items.some((item) => item.active)}
              >

              {/*
                  The heading names the list rather than a wrapping
                  `role="group"`. A named `<ul>` inside a `<nav>` is the shape
                  assistive technology already knows — "list, Today, five items"
                  — and it needs no role at all; `role="group"` on a `div` is
                  the ARIA spelling of a `fieldset`, which a set of links is not.
                */}
              <ul aria-labelledby={headingId} className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const itemClassName = cn(
                    // `press-row` (#93): a full-width row keeps the quieter
                    // 0.985 press; collapsed, it is a square and takes 0.97.
                    'lit relative flex w-full items-center rounded-control',
                    'text-sm motion-safe:transition-colors duration-(--dur-fast)',
                    item.primary
                      ? // C-281 — the primary entry's accent frame. The text
                        // stays `ink` when active: the frame already says
                        // "this one", and the capsule says "you are here".
                        [
                          'border border-accent/40 bg-accent/8 font-semibold text-ink',
                          !item.active && 'hover:bg-accent/12',
                          foldClass(
                            fold,
                            'press-row min-h-[38px] gap-3 px-2 py-1.5',
                            'mx-auto size-11 justify-center px-0',
                            'tablet:max-desktop:mx-auto tablet:max-desktop:size-11 tablet:max-desktop:min-h-0 tablet:max-desktop:justify-center tablet:max-desktop:gap-0 tablet:max-desktop:px-0 tablet:max-desktop:py-0',
                          ),
                        ]
                      : [
                          foldClass(
                            fold,
                            'press-row gap-3 px-3 py-2.5',
                            'justify-center px-0 py-2.5',
                            'tablet:max-desktop:justify-center tablet:max-desktop:gap-0 tablet:max-desktop:px-0',
                          ),
                          item.active
                            ? 'text-accent-ink'
                            : 'text-ink-2 hover:bg-hover',
                        ],
                  );

                  const inner = (
                    <>
                      {item.active ? capsule : null}
                      <span
                        data-nav-rail-primary-tile={item.primary ? '' : undefined}
                        className={cn(
                          'relative flex shrink-0 items-center',
                          item.primary &&
                            'size-6 justify-center rounded-control bg-accent text-on-accent',
                        )}
                      >
                        <Icon size={item.primary ? 14 : 18} aria-hidden="true" />
                        {item.unavailable && fold !== 'open' ? (
                          // Collapsed there is no label to sit beside, so the
                          // dot rides the glyph. Under a badge it drops to the
                          // opposite corner rather than sitting on it.
                          <Badge
                            dot
                            tone="warn"
                            aria-hidden="true"
                            className={cn(
                              'absolute -right-1 size-1.5',
                              hasBadge(item.badge) ? '-bottom-1' : '-top-1',
                              fold === 'band' && 'hidden tablet:max-desktop:inline-flex',
                            )}
                          />
                        ) : null}
                        {fold === 'folded' && hasBadge(item.badge) ? (
                          <RailBadgeMark badge={item.badge} placement="corner" />
                        ) : null}
                        {fold === 'band' && hasBadge(item.badge) ? (
                          // `contents`: no box of its own, so the mark still
                          // pins to this glyph.
                          <span className="hidden tablet:max-desktop:contents">
                            <RailBadgeMark badge={item.badge} placement="corner" />
                          </span>
                        ) : null}
                      </span>

                      {fold === 'folded' ? (
                        <span className="sr-only">{item.label}</span>
                      ) : (
                        // One label layer in the band: visible open, `sr-only`
                        // folded, the accessible name the same throughout.
                        <span
                          className={cn(
                            'relative min-w-0 flex-1 truncate',
                            fold === 'band' && 'tablet:max-desktop:sr-only',
                          )}
                        >
                          {item.label}
                        </span>
                      )}

                      {hasBadge(item.badge) ? (
                        fold === 'folded' ? (
                          <RailBadgeSpeech badge={item.badge} />
                        ) : fold === 'band' ? (
                          // Both placements, one shown per band; the hidden
                          // one is `display: none`, so a reader hears one.
                          <>
                            <span className="contents tablet:max-desktop:hidden">
                              <RailBadgeMark badge={item.badge} placement="inline" />
                            </span>
                            <span className="hidden tablet:max-desktop:contents">
                              <RailBadgeSpeech badge={item.badge} />
                            </span>
                          </>
                        ) : (
                          <RailBadgeMark badge={item.badge} placement="inline" />
                        )
                      ) : null}

                      {item.unavailable ? (
                        <>
                          {fold === 'folded' ? null : (
                            <Badge
                              dot
                              tone="warn"
                              aria-hidden="true"
                              className={cn(
                                'relative size-1.5 shrink-0',
                                fold === 'band' && 'tablet:max-desktop:hidden',
                              )}
                            />
                          )}
                          {/*
                              The marker's meaning, for a reader: a coloured dot
                              is nothing at all in the accessibility tree, and
                              this is the half of it that carries the fact.
                            */}
                          <span className="sr-only">{item.unavailable}</span>
                        </>
                      ) : null}
                    </>
                  );

                  const anchor =
                    item.href && link ? (
                      link({
                        href: item.href,
                        className: itemClassName,
                        'aria-current': item.active ? 'page' : undefined,
                        children: inner,
                      })
                    ) : (
                      <button
                        type="button"
                        aria-current={item.active ? 'page' : undefined}
                        onClick={item.onSelect}
                        className={itemClassName}
                      >
                        {inner}
                      </button>
                    );

                  return (
                    <li
                      key={item.id}
                      data-nav-rail-primary={item.primary ? '' : undefined}
                      className={cn('relative', item.primary && 'mb-1.5')}
                    >
                      {collapsed ? (
                        <Tooltip content={item.label} side="right">
                          {anchor}
                        </Tooltip>
                      ) : (
                        anchor
                      )}
                    </li>
                  );
                })}
              </ul>
              </GroupSection>
            </div>
          );
        })}
      </div>

      {footer ? <div className="border-line shrink-0 border-t pt-2">{footer}</div> : null}
    </nav>
  );
}
