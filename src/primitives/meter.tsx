import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

/**
 * v0.38.0 wave, Meter. Scaffold stub: the final prop types and a
 * `<meter>`. Tone thresholds, the bar and the gauge are its slot's.
 */
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
  valueText?: ReactNode;
  variant?: 'bar' | 'gauge';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

export function Meter({
  value,
  min = 0,
  max = 100,
  label,
  className,
}: MeterProps) {
  return (
    <meter value={value} min={min} max={max} className={cn(className)}>
      {label}
    </meter>
  );
}
