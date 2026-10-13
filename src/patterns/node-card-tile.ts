/**
 * #94 — the icon tile's colours, shared by `NodeCard` and `MetaBar`.
 *
 * A module of its own, without `'use client'`: `NodeCard` is a client module,
 * and a server-rendered `MetaBar` importing a plain object from one receives
 * a client reference instead of the object.
 *
 * The colour is an identity, not a state: the categorical series, or a status
 * tone. Never the accent.
 */
export type NodeCardColor =
  | 'series-1'
  | 'series-2'
  | 'series-3'
  | 'series-4'
  | 'series-5'
  | 'series-6'
  | 'ok'
  | 'warn'
  | 'danger'
  | 'info'
  | 'neutral';

/** The tile's text and tint per colour, spelled out so Tailwind's scan finds every one. */
export const NODE_TILE: Record<NodeCardColor, string> = {
  'series-1':
    'text-series-1 bg-[color-mix(in_oklab,var(--color-series-1)_18%,transparent)]',
  'series-2':
    'text-series-2 bg-[color-mix(in_oklab,var(--color-series-2)_18%,transparent)]',
  'series-3':
    'text-series-3 bg-[color-mix(in_oklab,var(--color-series-3)_18%,transparent)]',
  'series-4':
    'text-series-4 bg-[color-mix(in_oklab,var(--color-series-4)_18%,transparent)]',
  'series-5':
    'text-series-5 bg-[color-mix(in_oklab,var(--color-series-5)_18%,transparent)]',
  'series-6':
    'text-series-6 bg-[color-mix(in_oklab,var(--color-series-6)_18%,transparent)]',
  ok: 'text-ok bg-ok/14',
  warn: 'text-warn bg-warn/14',
  danger: 'text-danger bg-danger/14',
  info: 'text-info bg-info-soft',
  neutral: 'text-ink-2 bg-hover',
};
