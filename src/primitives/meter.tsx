import { type ReactNode, useId } from 'react';
import { tv } from 'tailwind-variants';
import { cn } from '../lib/cn';

/**
 * #185 — how full something is: budget, quota, limit. `Progress` is task
 * progress; this is a level, so the tone comes from where the value sits
 * against `low` / `high` / `optimum`, the way the HTML `<meter>` reads them.
 *
 * Tone, per the HTML spec: `low` defaults to `min`, `high` to `max`, `optimum`
 * to the midpoint. The region holding `optimum` is the good one (`ok`), its
 * neighbour is `warn`, the far one is `danger`. With no thresholds given, the
 * whole range is one region and the tone is `ok`.
 *
 * Colour is never the only signal: the value text is always drawn, and so is
 * a tone word (`labels`) — a screen reader gets both in `aria-valuetext`.
 */
export type MeterTone = 'ok' | 'warn' | 'danger';

export type MeterLabels = {
  ok: string;
  warn: string;
  danger: string;
};

const DEFAULT_LABELS: MeterLabels = {
  ok: 'OK',
  warn: 'Warning',
  danger: 'Critical',
};

const fill = tv({
  variants: {
    tone: {
      ok: 'bg-ok',
      warn: 'bg-warn',
      danger: 'bg-danger',
    },
  },
});

const arc = tv({
  variants: {
    tone: {
      ok: 'stroke-ok',
      warn: 'stroke-warn',
      danger: 'stroke-danger',
    },
  },
});

const track = tv({
  base: 'relative w-full rounded-full bg-hover',
  variants: {
    size: { sm: 'h-1', md: 'h-1.5', lg: 'h-2.5' },
  },
  defaultVariants: { size: 'md' },
});

const gaugeBox = tv({
  base: 'relative aspect-square',
  variants: {
    size: { sm: 'w-24', md: 'w-36', lg: 'w-48' },
  },
  defaultVariants: { size: 'md' },
});

export type MeterProps = {
  value: number;
  /** Default 0. */
  min?: number;
  /** Default 100. */
  max?: number;
  low?: number;
  high?: number;
  optimum?: number;
  label: ReactNode;
  /** Defaults to the clamped value. */
  valueText?: ReactNode;
  variant?: 'bar' | 'gauge';
  size?: 'sm' | 'md' | 'lg';
  labels?: Partial<MeterLabels>;
  className?: string;
};

export function meterTone(
  value: number,
  min: number,
  max: number,
  low?: number,
  high?: number,
  optimum?: number,
): MeterTone {
  const lo = Math.min(max, Math.max(min, low ?? min));
  const hi = Math.min(max, Math.max(lo, high ?? max));
  const opt = Math.min(max, Math.max(min, optimum ?? (min + max) / 2));
  const region = (n: number) => (n < lo ? 0 : n > hi ? 2 : 1);
  const distance = Math.abs(region(value) - region(opt));
  return distance === 0 ? 'ok' : distance === 1 ? 'warn' : 'danger';
}

// 240° sweep from the lower left (150°) round the top to the lower right (30°).
const R = 40;
const ARC = `M ${50 + R * Math.cos((150 * Math.PI) / 180)} ${
  50 + R * Math.sin((150 * Math.PI) / 180)
} A ${R} ${R} 0 1 1 ${50 + R * Math.cos((30 * Math.PI) / 180)} ${
  50 + R * Math.sin((30 * Math.PI) / 180)
}`;

export function Meter({
  value,
  min = 0,
  max = 100,
  low,
  high,
  optimum,
  label,
  valueText,
  variant = 'bar',
  size = 'md',
  labels,
  className,
}: MeterProps) {
  const labelId = useId();
  const text = { ...DEFAULT_LABELS, ...labels };
  const top = max > min ? max : min;
  const safe = Number.isFinite(value) ? value : min;
  const clamped = Math.min(top, Math.max(min, safe));
  const pct = top > min ? ((clamped - min) / (top - min)) * 100 : 0;
  const tone = meterTone(clamped, min, top, low, high, optimum);
  const shown = valueText ?? clamped;
  const ariaText = `${typeof shown === 'string' || typeof shown === 'number' ? shown : clamped} · ${text[tone]}`;
  const tick = (n: number | undefined) =>
    n !== undefined && n > min && n < top
      ? ((n - min) / (top - min)) * 100
      : null;

  const meterProps = {
    role: 'meter',
    'aria-labelledby': labelId,
    'aria-valuenow': clamped,
    'aria-valuemin': min,
    'aria-valuemax': top,
    'aria-valuetext': ariaText,
    'data-tone': tone,
  } as const;

  const readout = (
    <span className="text-ink-3" data-meter-tone>
      {text[tone]}
    </span>
  );

  if (variant === 'gauge') {
    return (
      <div
        {...meterProps}
        className={cn('inline-flex flex-col items-center gap-1', className)}
      >
        <div className={gaugeBox({ size })}>
          <svg
            viewBox="0 0 100 100"
            className="absolute inset-0 size-full"
            aria-hidden="true"
            focusable="false"
          >
            <path
              d={ARC}
              pathLength={100}
              fill="none"
              strokeWidth={8}
              strokeLinecap="round"
              className="stroke-hover"
            />
            <path
              d={ARC}
              pathLength={100}
              fill="none"
              strokeWidth={8}
              strokeLinecap="round"
              strokeDasharray={`${(pct / 100) * 100} 100`}
              className={cn(
                arc({ tone }),
                pct === 0 && 'opacity-0',
                'motion-safe:transition-[stroke-dasharray] motion-safe:duration-(--dur-base)',
              )}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-ink">
            {shown}
          </span>
        </div>
        <span id={labelId} className="text-xs text-ink-2">
          {label}
        </span>
        <span className="text-xs">{readout}</span>
      </div>
    );
  }

  const ticks = [tick(low), tick(high)].filter((t): t is number => t !== null);
  return (
    <div {...meterProps} className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span id={labelId} className="text-ink-2">
          {label}
        </span>
        <span className="text-ink">
          {shown} · {readout}
        </span>
      </div>
      <div className={track({ size })}>
        <div
          className={cn(
            'h-full rounded-full motion-safe:transition-[width] motion-safe:duration-(--dur-base)',
            fill({ tone }),
          )}
          style={{ width: `${pct}%` }}
        />
        {ticks.map((t) => (
          <span
            key={t}
            aria-hidden="true"
            data-meter-tick
            className="absolute inset-y-0 w-px bg-ink-3"
            style={{ left: `${t}%` }}
          />
        ))}
      </div>
    </div>
  );
}
