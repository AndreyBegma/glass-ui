import type { Hue } from '../../lib/hue';
import type { SankeyTone } from './types';

/**
 * #109 — a node with an identity hue, in the same shape, and the stroke of
 * every link out of it. The badge sits on the node's own tint, so its text is
 * `ink-2`, as the series' is: a second layer of tint under the hue's ink is a
 * pair nobody measured.
 */
export const HUE_TONE: Record<Hue, { card: string; badge: string; swatch: string; link: string }> = {
  1: { card: 'bg-hue-1-soft border-hue-1-line', badge: 'bg-hue-1-soft text-ink-2', swatch: 'bg-hue-1', link: 'stroke-hue-1' },
  2: { card: 'bg-hue-2-soft border-hue-2-line', badge: 'bg-hue-2-soft text-ink-2', swatch: 'bg-hue-2', link: 'stroke-hue-2' },
  3: { card: 'bg-hue-3-soft border-hue-3-line', badge: 'bg-hue-3-soft text-ink-2', swatch: 'bg-hue-3', link: 'stroke-hue-3' },
  4: { card: 'bg-hue-4-soft border-hue-4-line', badge: 'bg-hue-4-soft text-ink-2', swatch: 'bg-hue-4', link: 'stroke-hue-4' },
  5: { card: 'bg-hue-5-soft border-hue-5-line', badge: 'bg-hue-5-soft text-ink-2', swatch: 'bg-hue-5', link: 'stroke-hue-5' },
  6: { card: 'bg-hue-6-soft border-hue-6-line', badge: 'bg-hue-6-soft text-ink-2', swatch: 'bg-hue-6', link: 'stroke-hue-6' },
  7: { card: 'bg-hue-7-soft border-hue-7-line', badge: 'bg-hue-7-soft text-ink-2', swatch: 'bg-hue-7', link: 'stroke-hue-7' },
  8: { card: 'bg-hue-8-soft border-hue-8-line', badge: 'bg-hue-8-soft text-ink-2', swatch: 'bg-hue-8', link: 'stroke-hue-8' },
};

/** A link without a hued source: the accent, as every link was before #109. */
export const LINK_DEFAULT = 'stroke-accent';

/**
 * #94 — how a node is painted. Every colour is a token class, written out in
 * full so Tailwind's scanner finds it, and each theme re-colours it with no
 * re-read. The tone is on the card's tint, its rim and its value badge; the
 * name is always `text-ink`, so it reads the same in every tone and theme.
 *
 * The badge's text takes the tone only where the token is meant for text on
 * its own 14 % tint (`ok`, `warn`, `danger`, as `Badge` does, and the
 * accent's `accent-ink`); the series colours are tuned for marks, not text, so
 * their badge reads in `text-ink-2`.
 */
export const TONE: Record<SankeyTone, { card: string; badge: string; swatch: string }> = {
  accent: {
    card: 'bg-accent-soft border-accent/45',
    badge: 'bg-accent/20 text-accent-ink',
    swatch: 'bg-accent',
  },
  ok: { card: 'bg-ok/14 border-ok/45', badge: 'bg-ok/18 text-ok', swatch: 'bg-ok' },
  warn: { card: 'bg-warn/14 border-warn/45', badge: 'bg-warn/18 text-warn', swatch: 'bg-warn' },
  danger: {
    card: 'bg-danger/14 border-danger/45',
    badge: 'bg-danger/18 text-danger',
    swatch: 'bg-danger',
  },
  neutral: { card: 'bg-hover border-line-strong', badge: 'bg-hover text-ink-2', swatch: 'bg-ink-3' },
  'series-1': {
    card: 'bg-series-1/14 border-series-1/45',
    badge: 'bg-series-1/18 text-ink-2',
    swatch: 'bg-series-1',
  },
  'series-2': {
    card: 'bg-series-2/14 border-series-2/45',
    badge: 'bg-series-2/18 text-ink-2',
    swatch: 'bg-series-2',
  },
  'series-3': {
    card: 'bg-series-3/14 border-series-3/45',
    badge: 'bg-series-3/18 text-ink-2',
    swatch: 'bg-series-3',
  },
  'series-4': {
    card: 'bg-series-4/14 border-series-4/45',
    badge: 'bg-series-4/18 text-ink-2',
    swatch: 'bg-series-4',
  },
  'series-5': {
    card: 'bg-series-5/14 border-series-5/45',
    badge: 'bg-series-5/18 text-ink-2',
    swatch: 'bg-series-5',
  },
  'series-6': {
    card: 'bg-series-6/14 border-series-6/45',
    badge: 'bg-series-6/18 text-ink-2',
    swatch: 'bg-series-6',
  },
};
