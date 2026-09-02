'use client';

import type { LucideIcon } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { type ReactNode, useId } from 'react';
import { cn } from '../lib/cn';
import { Badge } from '../primitives/badge';
import { Tooltip } from '../primitives/tooltip';
import type { NavLinkRender } from './nav-link';

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
}

export interface NavRailGroup {
  id: string;
  /** Drawn above the group; the group's accessible name. */
  title: string;
  items: NavRailItem[];
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
   */
  collapsed?: boolean;
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
  collapsed = false,
  head,
  footer,
  layoutId = 'glass-nav-rail',
  className,
}: NavRailProps) {
  const reduced = useReducedMotion();
  const headingPrefix = useId();

  /**
   * One element, one `layoutId`: walking the rail slides the highlight down it
   * rather than switching one off and another on. Not glass — it sits on a
   * glass rail, and a second blur inside the first has nothing left to refract.
   */
  const capsule = (
    <motion.span
      layoutId={layoutId}
      aria-hidden="true"
      className="bg-hover absolute inset-0 rounded-control"
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
      className={cn(
        'glass rounded-surface flex flex-col gap-2 p-2',
        collapsed ? 'w-16' : 'w-60',
        className,
      )}
    >
      {head ? <div className="shrink-0">{head}</div> : null}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {groups.map((group, index) => {
          const headingId = `${headingPrefix}-${group.id}`;

          return (
            <div
              key={group.id}
              className={cn(
                // Collapsed, the headings are gone from the eye, so the groups
                // need some other edge between them or the rail reads as one
                // long column of glyphs.
                collapsed && index > 0 && 'border-line mt-2 border-t pt-2',
                !collapsed && index > 0 && 'mt-3',
              )}
            >
              <h2
                id={headingId}
                className={cn(
                  collapsed
                    ? 'sr-only'
                    : 'text-ink-3 px-3 py-2 text-[10px] font-semibold uppercase tracking-widest',
                )}
              >
                {group.title}
              </h2>

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
                    'lit relative flex w-full items-center rounded-control',
                    'text-sm motion-safe:transition-colors duration-(--dur-fast)',
                    collapsed
                      ? 'justify-center px-0 py-2.5'
                      : 'gap-3 px-3 py-2.5',
                    item.active ? 'text-ink' : 'text-ink-2 hover:bg-hover',
                  );

                  const inner = (
                    <>
                      {item.active ? capsule : null}
                      <span className="relative flex shrink-0 items-center">
                        <Icon size={18} aria-hidden="true" />
                        {item.unavailable && collapsed ? (
                          // Collapsed there is no label to sit beside, so the
                          // dot rides the glyph.
                          <Badge
                            dot
                            tone="warn"
                            aria-hidden="true"
                            className="absolute -right-1 -top-1 size-1.5"
                          />
                        ) : null}
                      </span>

                      {collapsed ? (
                        <span className="sr-only">{item.label}</span>
                      ) : (
                        <span className="relative min-w-0 flex-1 truncate">
                          {item.label}
                        </span>
                      )}

                      {item.unavailable ? (
                        <>
                          {collapsed ? null : (
                            <Badge
                              dot
                              tone="warn"
                              aria-hidden="true"
                              className="relative size-1.5 shrink-0"
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
                    <li key={item.id} className="relative">
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
            </div>
          );
        })}
      </div>

      {footer ? <div className="border-line shrink-0 border-t pt-2">{footer}</div> : null}
    </nav>
  );
}
