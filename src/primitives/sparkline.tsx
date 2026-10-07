import { cn } from '../lib/cn';

/**
 * FEAT-20260930-067 — Sparkline. Scaffold stub: the final prop types, an empty
 * SVG. The path maths is i67-stats'.
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

export function Sparkline({
  width = 96,
  height = 24,
  label,
  className,
}: SparklineProps) {
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn('inline-block', className)}
    />
  );
}
