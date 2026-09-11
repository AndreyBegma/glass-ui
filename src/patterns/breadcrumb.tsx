'use client';

import { ChevronRight, Ellipsis } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useLayoutEffect, useRef, useState } from 'react';
import { cn } from '../lib/cn';
import { Button } from '../primitives/button';
import { MenuContent, MenuItem, MenuRoot, MenuTrigger } from '../primitives/menu';
import type { NavLinkRender } from './nav-link';

/**
 * FEAT-20260911-002 — the trail (`V2` decision 4).
 *
 * Every screen opens with a full `SectionHeader` today, which is right for a
 * section's own landing and wrong for a document inside a folder inside a
 * section: there the title is the object's and the *path* is the information.
 * `V6` decides where the trail goes; this is the trail.
 *
 * **The last item is the page, and it is not a link.** A link to where you
 * already are is a control that does nothing, and a reader announcing it as
 * one is a small lie. It carries `aria-current="page"` and renders as text
 * whether or not the consumer gave it an `href`.
 *
 * **The middle collapses when it does not fit, and "fit" is measured.** A
 * five-level trail at 390px is first / `…` / last, and what collapsed is in
 * a `Menu` behind the `…`, so nothing on the path stops being reachable. The
 * measurement is the honest one — `scrollWidth` against `clientWidth` on the
 * list, in a layout effect — rather than a breakpoint, because the trail
 * lives in a column whose width is decided by a `SidePanel` and not by the
 * viewport. The list is `overflow-hidden` and layout effects run before
 * paint, so the unfolded pass is never seen. A `ResizeObserver` unfolds on
 * resize and the effect folds again if it still does not fit.
 *
 * **The whole middle folds, not one item at a time.** Folding just enough
 * would keep a short "Q3" and drop a long "Finance" beside it, and which
 * items survive would then depend on their letter counts — a trail that
 * reads differently on every screen. One shape when it fits and one when it
 * does not is the legible answer, and it is the one the acceptance
 * criterion names.
 *
 * The first and the last never collapse: where you are and where the path
 * starts are the two facts a trail exists to state.
 *
 * The anchor is the consumer's, through `link` (see `nav-link.ts`), for the
 * reason every navigation pattern here shares: a package that imported
 * `next/link` would be a package for one application.
 */
export interface BreadcrumbItem {
  id: string;
  label: string;
  /** Rendered through `link`. The last item never is. */
  href?: string;
  icon?: LucideIcon;
}

export interface BreadcrumbProps {
  items: readonly BreadcrumbItem[];
  /** Required by every item but the last that carries an `href`. */
  link?: NavLinkRender;
  'aria-label': string;
  /** The `…` button's accessible name: "Show the path", in the consumer's words. */
  overflowLabel: string;
  className?: string;
}

export function Breadcrumb({
  items,
  link,
  'aria-label': ariaLabel,
  overflowLabel,
  className,
}: BreadcrumbProps) {
  const list = useRef<HTMLOListElement>(null);
  /** Whether the middle is folded into the overflow menu. */
  const [folded, setFolded] = useState(false);
  const foldable = items.length > 2;

  /**
   * Anything that changes the trail unfolds it; the measuring effect below
   * then folds it back if it still does not fit. Tracked by identity rather
   * than by length so that a new trail of the same depth is measured afresh.
   */
  const previous = useRef(items);
  useLayoutEffect(() => {
    if (previous.current !== items) {
      previous.current = items;
      setFolded(false);
    }
  }, [items]);

  useLayoutEffect(() => {
    const element = list.current;
    if (!element) return;
    if (element.scrollWidth > element.clientWidth && !folded && foldable) {
      setFolded(true);
    }
  });

  useLayoutEffect(() => {
    const element = list.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    let width = element.clientWidth;
    const observer = new ResizeObserver(() => {
      if (element.clientWidth === width) return;
      width = element.clientWidth;
      setFolded(false);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const fold = folded && foldable;
  const overflow = fold ? items.slice(1, -1) : [];
  const visible = fold
    ? items.filter((_, index) => index === 0 || index === items.length - 1)
    : [...items];

  const separator = (
    <ChevronRight size={14} aria-hidden="true" className="shrink-0 text-ink-3" />
  );

  return (
    <nav aria-label={ariaLabel} className={cn('min-w-0', className)}>
      <ol
        ref={list}
        className="flex min-w-0 items-center gap-1 overflow-hidden whitespace-nowrap text-sm"
      >
        {visible.map((item, index) => {
          const last = index === visible.length - 1;
          const Icon = item.icon;
          const inner = (
            <>
              {Icon ? <Icon size={14} aria-hidden="true" className="shrink-0" /> : null}
              <span className="truncate">{item.label}</span>
            </>
          );
          const itemClassName = cn(
            'inline-flex max-w-48 items-center gap-1.5 rounded-control px-1 py-0.5',
            last
              ? 'font-medium text-ink'
              : 'text-ink-2 motion-safe:transition-colors duration-(--dur-fast) hover:text-ink',
          );

          return (
            <li key={item.id} className="flex min-w-0 shrink items-center gap-1">
              {index === 1 && overflow.length > 0 ? (
                <>
                  <MenuRoot>
                    <MenuTrigger asChild>
                      <Button variant="ghost" size="sm" icon aria-label={overflowLabel}>
                        <Ellipsis size={16} aria-hidden="true" />
                      </Button>
                    </MenuTrigger>
                    <MenuContent align="start">
                      {overflow.map((hidden) => {
                        const HiddenIcon = hidden.icon;
                        const label = (
                          <>
                            {HiddenIcon ? (
                              <HiddenIcon size={16} aria-hidden="true" />
                            ) : null}
                            <span className="min-w-0 flex-1 truncate">{hidden.label}</span>
                          </>
                        );
                        return hidden.href && link ? (
                          <MenuItem key={hidden.id} asChild>
                            {link({ href: hidden.href, className: '', children: label })}
                          </MenuItem>
                        ) : (
                          <MenuItem key={hidden.id}>{label}</MenuItem>
                        );
                      })}
                    </MenuContent>
                  </MenuRoot>
                  {separator}
                </>
              ) : null}

              {last ? (
                <span aria-current="page" className={itemClassName}>
                  {inner}
                </span>
              ) : item.href && link ? (
                link({ href: item.href, className: itemClassName, children: inner })
              ) : (
                <span className={itemClassName}>{inner}</span>
              )}

              {last ? null : separator}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
