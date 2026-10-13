/**
 * #94 — the status tones a flow node wears, and the classes each paints.
 *
 * **Placeholder.** `statusTone` belongs to `StatusPill` (slot g-agent-ui), so
 * that a pill, a card and a graph node share one palette. Until it lands this
 * file stands in with the same seven tones; at release it becomes a re-export
 * of that helper and nothing else in `flow-graph/` changes.
 *
 * Every class is written out in full so Tailwind's scanner finds it, and every
 * colour is a token, so light and dark come from the same classes. Text never
 * takes the tone: a node's status is a dot in the tone beside a label in
 * `ink-2`, so contrast is the ink's (AA in both themes), and colour is never
 * the only signal.
 */
export type StatusTone =
  | 'running'
  | 'waiting'
  | 'paused'
  | 'blocked'
  | 'done'
  | 'error'
  | 'idle';

export const STATUS_TONES: readonly StatusTone[] = [
  'running',
  'waiting',
  'paused',
  'blocked',
  'done',
  'error',
  'idle',
];

export type StatusToneClasses = {
  /** The status dot, and any solid swatch. */
  dot: string;
  /** An SVG stroke: a connector, a legend swatch. */
  stroke: string;
  /** An SVG fill: an arrowhead, the animated flow pulse. */
  fill: string;
  /** The card's rim, a 1px border at partial strength. */
  rim: string;
  /** The subtle outer glow. Empty for `idle`: an idle node does not call attention. */
  glow: string;
};

const TONES: Record<StatusTone, StatusToneClasses> = {
  running: {
    dot: 'bg-ok',
    stroke: 'stroke-ok',
    fill: 'fill-ok',
    rim: 'border-ok/55',
    glow: 'shadow-[0_0_22px_-6px_var(--color-ok)]',
  },
  waiting: {
    dot: 'bg-accent',
    stroke: 'stroke-accent',
    fill: 'fill-accent',
    rim: 'border-accent/60',
    glow: 'shadow-[0_0_22px_-6px_var(--color-accent)]',
  },
  paused: {
    dot: 'bg-warn',
    stroke: 'stroke-warn',
    fill: 'fill-warn',
    rim: 'border-warn/55',
    glow: 'shadow-[0_0_22px_-6px_var(--color-warn)]',
  },
  blocked: {
    dot: 'bg-danger',
    stroke: 'stroke-danger',
    fill: 'fill-danger',
    rim: 'border-danger/60',
    glow: 'shadow-[0_0_22px_-6px_var(--color-danger)]',
  },
  done: {
    dot: 'bg-series-3',
    stroke: 'stroke-series-3',
    fill: 'fill-series-3',
    rim: 'border-series-3/45',
    glow: 'shadow-[0_0_18px_-8px_var(--color-series-3)]',
  },
  error: {
    dot: 'bg-danger',
    stroke: 'stroke-danger',
    fill: 'fill-danger',
    rim: 'border-danger/70',
    glow: 'shadow-[0_0_26px_-4px_var(--color-danger)]',
  },
  idle: {
    dot: 'bg-ink-3',
    stroke: 'stroke-line-strong',
    fill: 'fill-line-strong',
    rim: 'border-line',
    glow: '',
  },
};

/** No tone at all: a neutral hairline connector and a plain rim. */
export const NEUTRAL_TONE: StatusToneClasses = {
  dot: 'bg-ink-3',
  // ink-2, not ink-3: a dotted 1.5px line at ink-3 all but disappears.
  stroke: 'stroke-ink-2',
  fill: 'fill-ink-2',
  rim: 'border-line',
  glow: '',
};

export function statusTone(tone: StatusTone | undefined): StatusToneClasses {
  return tone ? TONES[tone] : NEUTRAL_TONE;
}

/** English names, the default of `FlowGraphLabels.tones`. */
export const STATUS_TONE_LABELS: Record<StatusTone, string> = {
  running: 'Running',
  waiting: 'Waiting',
  paused: 'Paused',
  blocked: 'Blocked',
  done: 'Done',
  error: 'Error',
  idle: 'Idle',
};
