'use client';

import type { LucideIcon } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { cn } from '../lib/cn';
import { Badge } from '../primitives/badge';
import { Tooltip } from '../primitives/tooltip';
import type { NavLinkRender } from './nav-link';

/**
 * FEAT-20260911-002 — the level above the rail (`V2` decision 1, `E-104`).
 *
 * `NavRail` lists *sections*, flat: twenty-three of them in one column, four
 * of which are whole products at the visual weight of a single row. This is
 * the strip beside it that lists the products — seven applications, icon
 * only, always visible — and the rail beside it carries only the current
 * one's sections (`V4`). Two levels, where there was one.
 *
 * **Icon-only, always.** There is no expanded state and no labels for the
 * eye: the label is `sr-only` text for the reader and a `Tooltip` on the
 * right for the pointer and the keyboard, which is `NavRail`'s collapsed
 * contract taken as the only contract. The tooltip opens on focus, so a
 * keyboard reaches every name (issue #11 item 1).
 *
 * **The active item carries the accent — the first of its four places.**
 * `E-104` allows the accent on the active navigation item, a selection, the
 * primary fill and a link, and this is the first. The glyph is
 * `--color-accent` and the capsule under it `--color-accent-soft`. Both
 * tokens exist only under `data-scale="desk"`, on purpose, so off the desk
 * each is read with a `var()` fallback to the sofa's own look for the same
 * place — `NavRail`'s `bg-hover` capsule and `ink` — which is not a fifth
 * use of anything (`V2` correction 3). Under `desk` it is the accent; under
 * nothing it is exactly `NavRail`.
 *
 * **Unavailable is marked, still navigable, never hidden.** `E-50`'s rule,
 * one level up, which is the point at which it becomes visible at a glance
 * rather than as one dimmed row in the middle of a list: a `warn` dot rides
 * the glyph and the consumer's phrase follows the label for a reader. The
 * page behind the item says what is wrong; a missing item cannot. The rule
 * `NavRail` keeps is the rule this keeps, and `V4` inherits it from here.
 *
 * **Chrome.** `glass`, and under the flat rung opaque, and the component does
 * not know which — that is `material.css`'s decision, taken by the attribute.
 * The anchor is the consumer's through `link` (`nav-link.ts`), as on every
 * navigation pattern here.
 */
export interface AppRailItem {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Rendered through `link`. Omit for an item that acts rather than navigates. */
  href?: string;
  onSelect?: () => void;
  /**
   * Draws a `warn` dot on the glyph and appends this text to the item's
   * accessible name — `NavRail`'s exact contract. The string is a phrase a
   * reader hears after the label ("unavailable", "not connected"), in the
   * consumer's words, because only the consumer knows which it is.
   */
  unavailable?: string;
}

export interface AppRailProps {
  apps: readonly AppRailItem[];
  /** The application the person is in. Its item carries the accent and `aria-current`. */
  activeId?: string;
  /** Required by every item that carries an `href`. */
  link?: NavLinkRender;
  'aria-label': string;
  /** Above the list: a wordmark. Drawn once. */
  head?: ReactNode;
  /**
   * Drawn under a separator, pinned under the scroll, with the same item
   * component the body uses — `activeId`, `link`, `unavailable` and the
   * travelling capsule all behave exactly as they do in the body. Tab order
   * follows: body items, then these, then `footer`.
   */
  footerApps?: readonly AppRailItem[];
  /** Below it, pinned under the scroll: an account avatar, a settings door. */
  footer?: ReactNode;
  /** One travelling capsule per rail. */
  layoutId?: string;
  className?: string;
}

export function AppRail({
  apps,
  activeId,
  link,
  'aria-label': ariaLabel,
  head,
  footerApps,
  footer,
  layoutId = 'glass-app-rail',
  className,
}: AppRailProps) {
  const reduced = useReducedMotion();

  /**
   * One element, one `layoutId`, `NavRail`'s spring: switching applications
   * slides the capsule rather than blinking it. The tint is the accent's
   * selected-row alpha under `desk` and the sofa's hover fill otherwise.
   */
  const capsule = (
    <motion.span
      layoutId={layoutId}
      aria-hidden="true"
      className="absolute inset-0 rounded-control bg-[var(--color-accent-soft,var(--color-hover))]"
      transition={
        reduced
          ? { duration: 0 }
          : { type: 'spring', stiffness: 500, damping: 40, mass: 0.7 }
      }
    />
  );

  /**
   * One item, drawn the same way wherever it is asked for — the body list
   * and `footerApps` both call this, so the capsule, the tooltip, the
   * unavailable mark and `aria-current` cannot drift between the two.
   */
  const renderItem = (app: AppRailItem) => {
    const Icon = app.icon;
    const active = app.id === activeId;
    const itemClassName = cn(
      'lit relative flex items-center justify-center rounded-control',
      // A square of the rail's own row height, so the desk profile
      // tightens it with everything else and no height is written here.
      'h-[var(--size-nav)] w-[var(--size-nav)]',
      'motion-safe:transition-colors duration-(--dur-fast)',
      active
        ? 'text-[var(--color-accent,var(--color-ink))]'
        : 'text-ink-2 hover:bg-hover hover:text-ink',
    );

    const inner = (
      <>
        {active ? capsule : null}
        <span className="relative flex shrink-0 items-center">
          <Icon size={18} aria-hidden="true" />
          {app.unavailable ? (
            // There is no label to sit beside, so the dot rides the glyph.
            <Badge
              dot
              tone="warn"
              aria-hidden="true"
              className="absolute -right-1 -top-1 size-1.5"
            />
          ) : null}
        </span>
        <span className="sr-only">{app.label}</span>
        {app.unavailable ? (
          // The marker's meaning, for a reader: a coloured dot is nothing
          // at all in the accessibility tree, and this is the half of it
          // that carries the fact.
          <span className="sr-only">{app.unavailable}</span>
        ) : null}
      </>
    );

    const anchor =
      app.href && link ? (
        link({
          href: app.href,
          className: itemClassName,
          'aria-current': active ? 'page' : undefined,
          children: inner,
        })
      ) : (
        <button
          type="button"
          aria-current={active ? 'page' : undefined}
          onClick={app.onSelect}
          className={itemClassName}
        >
          {inner}
        </button>
      );

    return (
      <li key={app.id} className="relative">
        <Tooltip content={app.label} side="right">
          {anchor}
        </Tooltip>
      </li>
    );
  };

  return (
    <nav
      aria-label={ariaLabel}
      className={cn('glass flex w-fit flex-col gap-2 rounded-surface p-2', className)}
    >
      {head ? <div className="flex shrink-0 justify-center">{head}</div> : null}

      <ul className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        {apps.map(renderItem)}
      </ul>

      {footerApps?.length || footer ? (
        <div className="flex shrink-0 flex-col items-center gap-2 border-t border-line pt-2">
          {footerApps?.length ? (
            <ul className="flex flex-col gap-1">{footerApps.map(renderItem)}</ul>
          ) : null}
          {footer}
        </div>
      ) : null}
    </nav>
  );
}
