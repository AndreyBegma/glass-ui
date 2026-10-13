import {
  STATUSES,
  type Status,
  type StatusToneClasses,
  statusTone,
} from '../../primitives/status-pill';

/**
 * #94 — the status tones a flow node wears. They are `StatusPill`'s, so a
 * pill, a card and a graph node read one palette: `statusTone` decides the
 * rim, the glow and the dot, and this file only adds what a graph needs on
 * top of it.
 *
 * - **SVG classes.** A connector and an arrowhead are painted with `stroke-*`
 *   and `fill-*`, which a pill never needs. They read the state's own
 *   `--color-status-*` token (#109), the dot's, so they can never drift from
 *   the dot beside them.
 * - **No tone at all.** A node without a status is a plain rim and a neutral
 *   connector. `ink-2`, not `ink-3`: a dotted 1.5px line at ink-3 all but
 *   disappears.
 *
 * Every class is written out in full so Tailwind's scanner finds it. Text
 * never takes the tone: a node's status is a dot beside a word in `ink-2`, so
 * contrast is the ink's (AA in both themes), and colour is never the only
 * signal.
 */
export type StatusTone = Status;
export type { StatusToneClasses };
export { statusTone };

export const STATUS_TONES: readonly StatusTone[] = STATUSES;

export type FlowToneClasses = StatusToneClasses & {
  /** An SVG stroke: a connector, a legend swatch. */
  stroke: string;
  /** An SVG fill: an arrowhead, the animated flow pulse. */
  fill: string;
};

/* #109 — per state rather than per family, so a connector is the colour of
   the dot beside it now that each state has its own. */
const SVG: Record<StatusTone, { stroke: string; fill: string }> = {
  running: { stroke: 'stroke-status-running', fill: 'fill-status-running' },
  waiting: { stroke: 'stroke-status-waiting', fill: 'fill-status-waiting' },
  paused: { stroke: 'stroke-status-paused', fill: 'fill-status-paused' },
  blocked: { stroke: 'stroke-status-blocked', fill: 'fill-status-blocked' },
  done: { stroke: 'stroke-status-done', fill: 'fill-status-done' },
  error: { stroke: 'stroke-status-error', fill: 'fill-status-error' },
  idle: { stroke: 'stroke-ink-2', fill: 'fill-ink-2' },
};

/** No tone at all: a neutral connector and a plain rim. */
export const NEUTRAL_TONE: FlowToneClasses = {
  tone: 'neutral',
  text: 'text-ink-2',
  soft: 'bg-hover',
  dot: 'bg-ink-3',
  rim: 'border-line',
  glow: '',
  pulse: false,
  label: '',
  ...SVG.idle,
};

const FLOW_TONES = new Map<StatusTone, FlowToneClasses>(
  STATUSES.map((status) => [status, { ...statusTone(status), ...SVG[status] }]),
);

/** `statusTone` plus the SVG classes, and neutral for a node without a status. */
export function flowTone(tone: StatusTone | undefined): FlowToneClasses {
  return tone ? FLOW_TONES.get(tone)! : NEUTRAL_TONE;
}

/** English names, the default of `FlowGraphLabels.tones`. */
export const STATUS_TONE_LABELS = Object.fromEntries(
  STATUSES.map((status) => [status, statusTone(status).label]),
) as Record<StatusTone, string>;
