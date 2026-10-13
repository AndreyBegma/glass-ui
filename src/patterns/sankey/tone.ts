import type { SankeyTone } from './types';

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
