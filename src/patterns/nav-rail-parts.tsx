'use client';

import {
  type CSSProperties,
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Badge } from '../primitives/badge';

/**
 * #94 (g94-nav) — the pieces `NavRail` and `AppRail` share, so the two rails
 * cannot drift on how they fade, scroll to the active item or draw a badge.
 */

/**
 * An item's count or dot, in the tone of the status colours. `label` is what a
 * reader hears: a bare "3" is a number, "3 pending approvals" is a fact — the
 * same split as `unavailable`, and for the same reason.
 */
export interface RailBadge {
  /** A count bubble ("99+" past 99). Omit for a dot. */
  count?: number;
  /** A bare dot. Wins over nothing: with a `count` the count is drawn. */
  dot?: boolean;
  tone?: 'neutral' | 'ok' | 'warn' | 'danger';
  /** Spoken after the item's label. Defaults to the count. */
  label?: string;
}

/** Whether a badge draws anything at all — a zero count is silence, not "0". */
export function hasBadge(badge: RailBadge | undefined): badge is RailBadge {
  if (!badge) return false;
  if (typeof badge.count === 'number') return badge.count > 0;
  return badge.dot === true;
}

/** What a reader hears for a badge. */
export function badgeSpeech(badge: RailBadge): string {
  if (badge.label) return badge.label;
  return typeof badge.count === 'number' ? String(badge.count) : '';
}

/**
 * `inline`: beside the label, in flow. `corner`: pinned to the glyph, for a rail
 * with no label to sit beside.
 */
export function RailBadgeMark({
  badge,
  placement,
}: {
  badge: RailBadge;
  placement: 'inline' | 'corner';
}) {
  const counting = typeof badge.count === 'number';
  const corner = placement === 'corner';
  return (
    <>
      <Badge
        aria-hidden="true"
        tone={badge.tone ?? (counting ? 'neutral' : 'danger')}
        dot={!counting}
        count={counting ? badge.count : undefined}
        className={
          corner
            ? counting
              ? 'absolute -right-2 -top-2 h-4 min-w-4 text-[9px]'
              : 'absolute -right-1 -top-1 size-1.5'
            : counting
              ? 'relative shrink-0'
              : 'relative size-1.5 shrink-0'
        }
      />
      {corner ? null : <RailBadgeSpeech badge={badge} />}
    </>
  );
}

/**
 * What a reader hears. Drawn after the item's label by the caller when the
 * mark itself rides the glyph (`corner`), which comes first in the DOM —
 * otherwise the reader hears "unread Mail".
 */
export function RailBadgeSpeech({ badge }: { badge: RailBadge }) {
  return <span className="sr-only"> {badgeSpeech(badge)}</span>;
}

const FADE = 20;

/**
 * Edge fades for a scroller: a mask that dissolves the top and the bottom edge
 * only while there is something past them. A mask rather than an overlay, so
 * it works on glass and on the opaque rung alike and paints nothing the
 * material does not already own.
 *
 * Also scrolls the active item into view on mount (`nearest`, so a rail whose
 * active item is already visible does not move).
 */
export function useScrollFade(
  ref: RefObject<HTMLElement | null>,
  activeSelector = '[aria-current="page"]',
): CSSProperties {
  const [edges, setEdges] = useState({ top: false, bottom: false });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const top = el.scrollTop > 1;
    const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 1;
    setEdges((prev) =>
      prev.top === top && prev.bottom === bottom ? prev : { top, bottom },
    );
  }, [ref]);

  const mounted = useRef(false);
  useLayoutEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    ref.current
      ?.querySelector<HTMLElement>(activeSelector)
      ?.scrollIntoView?.({ block: 'nearest' });
    measure();
  }, [ref, activeSelector, measure]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.addEventListener('scroll', measure, { passive: true });
    // Content height changes too — a group opening, a badge appearing — and
    // neither fires a scroll event.
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(measure);
    observer?.observe(el);
    for (const child of Array.from(el.children)) observer?.observe(child);
    return () => {
      el.removeEventListener('scroll', measure);
      observer?.disconnect();
    };
  }, [ref, measure]);

  if (!edges.top && !edges.bottom) return {};
  // Only the alpha of a mask counts, so `currentColor` is "opaque" without
  // writing a colour of the palette's.
  const top = edges.top ? FADE : 0;
  const bottom = edges.bottom ? FADE : 0;
  const mask = `linear-gradient(to bottom, ${
    edges.top ? 'transparent' : 'currentColor'
  } 0, currentColor ${top}px, currentColor calc(100% - ${bottom}px), ${
    edges.bottom ? 'transparent' : 'currentColor'
  } 100%)`;
  return { maskImage: mask, WebkitMaskImage: mask };
}
