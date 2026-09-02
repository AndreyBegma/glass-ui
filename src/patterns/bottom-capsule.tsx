'use client';

import { Ellipsis, type LucideIcon } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { Fragment, type ReactNode } from 'react';
import { cn } from '../lib/cn';
import { SheetContent, SheetRoot } from '../primitives/sheet';
import type { NavLinkRender } from './nav-link';

/**
 * FEAT-20260902-004 — the bottom bar, as a floating capsule, for anyone.
 *
 * Lifted from Luna Watch's `mobile-bottom-nav.tsx`, which argued the shape and
 * then hard-wired the product into it: four named routes, a translation
 * namespace, an auth check, `hidesChrome`, and an import of the application's
 * routed `Link`. `E-92` makes it the package's because Denitsa is the second
 * consumer — the same capsule, over twenty-one sections instead of four films.
 *
 * The shape, and why it is this shape rather than a strip:
 *
 * A full-width bar pinned to the bottom edge with a hairline along its top is
 * what every web application has drawn since tab bars arrived, and it reads as
 * browser chrome rather than as part of the application. This is the
 * arrangement iOS 26 settled on instead — a capsule floating clear of the
 * edges with the page visibly continuing underneath it.
 *
 * **The action is a circle, not a fifth tab.** It is not a place, so it holds
 * no selected state and does not belong in a row of places that do. In Luna it
 * is search; in Denitsa it is Ask. It is also the far corner problem solved:
 * the one control that had been stranded at the top of the screen, which is the
 * hardest point on a phone to reach with the thumb holding the device.
 *
 * **It holds no state of its own.** Which tab is selected, whether the overflow
 * sheet is open, whether the action's surface is up — all three are the
 * consumer's, because all three are facts about the application's routing and
 * its panels rather than about a bar. That is also what makes the `morphFrom`
 * handoff work: the circle has to unmount at the exact moment the sheet mounts,
 * and only the thing that owns both can promise that.
 *
 * **No breakpoint.** The package does not decide when a phone is a phone. Luna
 * hides this above `lg`, Denitsa the same; both do it at the call site, where
 * the layout that pairs with it also lives.
 */
export interface BottomCapsuleTab {
  id: string;
  label: string;
  icon: LucideIcon;
  /**
   * Rendered through `link`. Omit for a tab that changes something in the page
   * rather than going somewhere, which renders a `button` and calls `onSelect`.
   */
  href?: string;
  active?: boolean;
  onSelect?: () => void;
}

export interface BottomCapsuleAction {
  /** The accessible name. The circle is a glyph and nothing else. */
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  /**
   * The `layoutId` the surface this opens also carries, so the surface grows
   * out of the circle rather than arriving over the page. Pair it with
   * `SheetContent`'s `morphFrom`.
   */
  morphFrom?: string;
  /**
   * True while that surface is open. The circle is then **removed from the
   * tree** — not hidden, removed. Two elements carrying one `layoutId` at the
   * same time is the single case Motion cannot resolve; it crossfades, which
   * looks exactly like no animation having been written.
   */
  open?: boolean;
}

export interface BottomCapsuleMore {
  label: string;
  /** Defaults to the ellipsis. */
  icon?: LucideIcon;
  /** The sheet's accessible name. */
  title: string;
  hideTitle?: boolean;
  description?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Whatever did not fit in four tabs. The capsule does not know what it is. */
  children: ReactNode;
}

export interface BottomCapsuleProps {
  /**
   * Four, at most. A fifth tab makes each one narrower than a thumb and turns
   * the labels into truncated stubs; the rest belongs behind `more`. Not
   * enforced — the package does not police its callers — but the geometry does
   * not forgive it.
   */
  tabs: BottomCapsuleTab[];
  /** Required by every tab that carries an `href`. See `nav-link.ts`. */
  link?: NavLinkRender;
  'aria-label': string;
  /** The round button beside the capsule. */
  action?: BottomCapsuleAction;
  /** The overflow tab, and the bottom sheet it opens. */
  more?: BottomCapsuleMore;
  /** One travelling capsule per bar. Only matters if two are ever mounted at once. */
  layoutId?: string;
  className?: string;
}

const item = [
  'lit relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5',
  'rounded-full px-2 py-2 text-[11px] font-medium',
  'motion-safe:transition-colors duration-(--dur-fast)',
].join(' ');

export function BottomCapsule({
  tabs,
  link,
  'aria-label': ariaLabel,
  action,
  more,
  layoutId = 'glass-bottom-capsule',
  className,
}: BottomCapsuleProps) {
  const reduced = useReducedMotion();

  /**
   * The selection travels rather than blinking.
   *
   * There is exactly one of these in the bar, and `layoutId` is what makes it
   * one: unmounting from the tab you left and mounting on the tab you chose
   * makes Motion animate a single element between the two rectangles instead of
   * cross-fading two of them. That is the whole difference between "the
   * highlight moved" and "one highlight went out and another came on".
   *
   * The spring is tuned rather than defaulted — stiff enough to arrive with the
   * finger, damped just under critical so it settles with a hint of overshoot.
   * A duration-based ease reads as mechanical at this size whichever curve it
   * uses. `base.css` neutralises CSS transitions under `prefers-reduced-motion`
   * but a JavaScript animation is invisible to that rule, so it is honoured
   * explicitly.
   */
  const capsule = (
    <motion.span
      layoutId={layoutId}
      aria-hidden="true"
      className="bg-hover absolute inset-0 rounded-full"
      transition={
        reduced
          ? { duration: 0 }
          : { type: 'spring', stiffness: 420, damping: 34, mass: 0.9 }
      }
    />
  );

  const MoreIcon = more?.icon ?? Ellipsis;

  /**
   * While the overflow sheet is up, `More` holds the selection and the tabs do
   * not — which is a statement about the interface and also the only way to
   * keep the invariant this whole component rests on: **exactly one element
   * carries `layoutId` at a time.**
   *
   * Without it the ordinary case breaks it. A person on Today taps `More`;
   * Today is still the active route, so its capsule is still mounted, and now
   * so is the one under `More`. Two owners of one `layoutId` is the case Motion
   * cannot resolve — it crossfades, which looks exactly like the animation
   * having never been written — and it is silent, so it survives review.
   */
  const moreSelected = Boolean(more?.open);

  return (
    <>
      {/*
          Clearance for the floating bar below, and it ships with the bar rather
          than sitting on the page's main element: a page rendered without the
          capsule then has no dead space at the bottom either. Taller than a
          pinned strip needs, because the capsule floats clear of the edge, and
          it carries the inset so the last row of a list is not under the home
          indicator.
        */}
      <div
        aria-hidden="true"
        className="h-[calc(6rem+env(safe-area-inset-bottom))]"
      />

      <div
        className={cn(
          'z-chrome fixed inset-x-0 bottom-0 flex items-stretch justify-center gap-2 px-3',
          className,
        )}
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <nav
          aria-label={ariaLabel}
          className="glass flex min-w-0 flex-1 items-stretch rounded-full p-1"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const selected = Boolean(tab.active) && !moreSelected;
            const className = cn(item, tab.active ? 'text-ink' : 'text-ink-3');
            const inner = (
              <>
                {selected ? capsule : null}
                <Icon size={19} aria-hidden="true" className="relative" />
                <span className="relative truncate">{tab.label}</span>
              </>
            );

            if (tab.href && link) {
              // A `Fragment` for the key rather than a wrapper element: the
              // consumer's anchor already takes `flex-1` from `className`, and
              // a `span` around it would be a second flex child holding the
              // first one at a different width.
              return (
                <Fragment key={tab.id}>
                  {link({
                    href: tab.href,
                    className,
                    'aria-current': tab.active ? 'page' : undefined,
                    children: inner,
                  })}
                </Fragment>
              );
            }

            return (
              <button
                key={tab.id}
                type="button"
                aria-current={tab.active ? 'page' : undefined}
                onClick={tab.onSelect}
                className={className}
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
              className={cn(item, more.open ? 'text-ink' : 'text-ink-3')}
            >
              {more.open ? capsule : null}
              <MoreIcon size={19} aria-hidden="true" className="relative" />
              <span className="relative truncate">{more.label}</span>
            </button>
          ) : null}
        </nav>

        {/*
            Gone, not hidden, while its surface is open — see `open` above. A
            `hidden` class would leave the element mounted and Motion would find
            two owners for one `layoutId`.
          */}
        {action && !action.open ? (
          <motion.button
            type="button"
            layoutId={action.morphFrom}
            transition={
              reduced
                ? { duration: 0 }
                : { type: 'spring', stiffness: 380, damping: 36, mass: 0.9 }
            }
            onClick={action.onSelect}
            aria-label={action.label}
            className="glass lit text-ink flex size-16 shrink-0 items-center justify-center"
            style={{ borderRadius: 9999 }}
          >
            <action.icon size={21} aria-hidden="true" />
          </motion.button>
        ) : null}
      </div>

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
