'use client';

import { Ellipsis, type LucideIcon } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { Fragment, type ReactNode } from 'react';
import { cn } from '../lib/cn';
import { SheetContent, SheetRoot } from '../primitives/sheet';
import { SPRINGS } from '../primitives/springs';
import type { NavLinkRender } from './nav-link';

/**
 * #93 — the bottom tab bar: a glass strip pinned to the bottom edge of a
 * phone, up to five places and a `More`.
 *
 * It is the other shape from `BottomCapsule`. The capsule floats clear of
 * the edges, holds four tabs and an action circle, and reads as part of the
 * page. This is the edge-to-edge bar a phone application is expected to
 * have: full width, a hairline along its top, the home-indicator inset
 * inside it, and one more slot because nothing floats beside it. Pick the
 * capsule for a page that wants its content to run under the navigation;
 * pick this for an application shell.
 *
 * **The selection is the accent.** The active place's icon sits on an
 * `accent-soft` pill and its icon and label are `accent-ink`; the others are
 * `ink-3`. The pill travels between tabs on one `layoutId`, the same spring
 * the capsule uses, and jumps when motion is reduced. Every item carries
 * `aria-current="page"` when active, so the selection is never colour alone.
 *
 * **It holds no state.** Which item is active and whether `More`'s sheet is
 * open are the application's facts, as in `BottomCapsule`. While the sheet
 * is open `More` holds the selection, so exactly one element ever carries
 * the `layoutId`.
 *
 * **No breakpoint.** The package does not decide when a phone is a phone;
 * hide the bar at the call site, where the layout that pairs with it lives.
 */
export interface TabBarItem {
  id: string;
  label: string;
  icon: LucideIcon;
  /**
   * Rendered through `link`. Omit for an item that changes something in the
   * page rather than going somewhere: it renders a `button` and calls
   * `onSelect`.
   */
  href?: string;
  active?: boolean;
  onSelect?: () => void;
}

export interface TabBarMore {
  label: string;
  /** Defaults to the ellipsis. */
  icon?: LucideIcon;
  /** The sheet's accessible name. */
  title: string;
  hideTitle?: boolean;
  description?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Whatever did not fit in the bar. */
  children: ReactNode;
}

export interface TabBarProps {
  /**
   * Five, at most. A sixth makes every slot narrower than a thumb at 320 px;
   * the rest belongs behind `more`. Not enforced — the package does not
   * police its callers — but the geometry does not forgive it.
   */
  items: TabBarItem[];
  /** Required by every item that carries an `href`. See `nav-link.ts`. */
  link?: NavLinkRender;
  'aria-label': string;
  /** The overflow item, and the bottom sheet it opens. */
  more?: TabBarMore;
  /** One travelling pill per bar. Only matters if two are ever mounted at once. */
  layoutId?: string;
  className?: string;
}

const ITEM = [
  'relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5',
  'min-h-12 px-1 pt-1.5 pb-1 text-[11px] font-medium leading-tight',
  'motion-safe:transition-[color,transform] duration-100 motion-safe:active:scale-[0.97]',
].join(' ');

export function TabBar({
  items,
  link,
  'aria-label': ariaLabel,
  more,
  layoutId = 'glass-tab-bar',
  className,
}: TabBarProps) {
  const reduced = useReducedMotion();
  const moreSelected = Boolean(more?.open);

  const glyph = (Icon: LucideIcon, selected: boolean) => (
    <span className="relative flex h-7 w-12 items-center justify-center">
      {selected ? (
        <motion.span
          layoutId={layoutId}
          aria-hidden="true"
          data-tab-bar-pill
          className="absolute inset-0 rounded-full bg-accent-soft"
          transition={reduced ? SPRINGS.reduced : SPRINGS.capsule}
        />
      ) : null}
      <Icon size={20} aria-hidden="true" className="relative" />
    </span>
  );

  const tone = (selected: boolean) => (selected ? 'text-accent-ink' : 'text-ink-3');
  const MoreIcon = more?.icon ?? Ellipsis;

  return (
    <>
      {/*
          Clearance for the pinned bar, shipped with the bar so a page rendered
          without it has no dead space. It carries the inset, so the last row
          of a list is not under the home indicator.
        */}
      <div aria-hidden="true" className="h-[calc(3.5rem+env(safe-area-inset-bottom))]" />

      <nav
        aria-label={ariaLabel}
        className={cn(
          'glass z-chrome fixed inset-x-0 bottom-0 flex items-stretch rounded-none border-t border-line px-1',
          'pb-[env(safe-area-inset-bottom)]',
          className,
        )}
      >
        {items.map((item) => {
          const selected = Boolean(item.active) && !moreSelected;
          const itemClass = cn(ITEM, tone(selected));
          const inner = (
            <>
              {glyph(item.icon, selected)}
              <span className="max-w-full truncate">{item.label}</span>
            </>
          );

          if (item.href && link) {
            return (
              <Fragment key={item.id}>
                {link({
                  href: item.href,
                  className: itemClass,
                  'aria-current': item.active ? 'page' : undefined,
                  children: inner,
                })}
              </Fragment>
            );
          }

          return (
            <button
              key={item.id}
              type="button"
              aria-current={item.active ? 'page' : undefined}
              onClick={item.onSelect}
              className={itemClass}
            >
              {inner}
            </button>
          );
        })}

        {more ? (
          <button
            type="button"
            aria-haspopup="dialog"
            aria-expanded={more.open}
            onClick={() => more.onOpenChange(true)}
            className={cn(ITEM, tone(moreSelected))}
          >
            {glyph(MoreIcon, moreSelected)}
            <span className="max-w-full truncate">{more.label}</span>
          </button>
        ) : null}
      </nav>

      {more ? (
        <SheetRoot open={more.open} onOpenChange={more.onOpenChange}>
          <SheetContent
            title={more.title}
            hideTitle={more.hideTitle}
            description={more.description}
            side="bottom"
          >
            {more.children}
          </SheetContent>
        </SheetRoot>
      ) : null}
    </>
  );
}
