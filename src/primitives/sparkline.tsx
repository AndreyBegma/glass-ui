import { cn } from '../lib/cn';

/**
 * FEAT-20260930-067 — Sparkline: a trend with no axes, sized to sit in a line
 * of text or a StatTile's trend slot.
 *
 * Stroke and fill are `currentColor`; `tone` only picks the text colour token,
 * so the line follows light, dark and flat without a colour of its own.
 * Fewer than two finite values cannot make a line, so they draw a flat
 * baseline — never a path with `NaN` in it. Non-finite entries are dropped.
 */
export type SparklineProps = {
  values: number[];
  width?: number;
  height?: number;
  area?: boolean;
  tone?: 'neutral' | 'ok' | 'warn' | 'danger';
  /** With a label the SVG is `role="img"`; without, `aria-hidden`. */
  label?: string;
  min?: number;
  max?: number;
  className?: string;
};

const TONE = {
  neutral: 'text-ink-2',
  ok: 'text-ok',
  warn: 'text-warn',
  danger: 'text-danger',
} as const;

/** Keeps the stroke from being clipped at the edges of the viewBox. */
const PAD = 1;

const round = (n: number) => Math.round(n * 100) / 100;

export function Sparkline({
  values,
  width = 96,
  height = 24,
  area = false,
  tone = 'neutral',
  label,
  min,
  max,
  className,
}: SparklineProps) {
  const series = values.filter(Number.isFinite);
  const innerW = Math.max(width - PAD * 2, 0);
  const innerH = Math.max(height - PAD * 2, 0);
  const baseline = round(height / 2);

  let points: Array<[number, number]>;
  if (series.length < 2) {
    points = [
      [PAD, baseline],
      [PAD + innerW, baseline],
    ];
  } else {
    const lo = Number.isFinite(min) ? (min as number) : Math.min(...series);
    const hi = Number.isFinite(max) ? (max as number) : Math.max(...series);
    const span = hi - lo;
    const step = innerW / (series.length - 1);
    points = series.map((v, i) => {
      // A constant series has no span: draw it mid-height instead of dividing by 0.
      const t = span > 0 ? Math.min(Math.max((v - lo) / span, 0), 1) : 0.5;
      return [round(PAD + i * step), round(PAD + innerH * (1 - t))];
    });
  }

  const line = points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`)
    .join(' ');
  const bottom = round(height - PAD);
  const first = points[0];
  const last = points[points.length - 1];
  const fill = `${line} L${last?.[0]} ${bottom} L${first?.[0]} ${bottom} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn('inline-block shrink-0', TONE[tone], className)}
    >
      {area && series.length >= 2 ? (
        <path d={fill} fill="currentColor" fillOpacity={0.14} stroke="none" />
      ) : null}
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
