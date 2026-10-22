'use client';

import { cn } from '../lib/cn';
import type { Hue } from '../lib/hue';

/**
 * v0.38.0 wave, ActivityHeatmap. Scaffold stub: the final prop types and a
 * placeholder box. The grid, the level bucketing and the keyboard are its
 * slot's.
 */
export type ActivityHeatmapDatum = {
  /** `YYYY-MM-DD`. */
  date: string;
  value: number;
};

export type ActivityHeatmapLabels = Record<string, string>;

export type ActivityHeatmapProps = {
  data: ActivityHeatmapDatum[];
  /** Default: 52 weeks before `end`. */
  start?: Date;
  /** Default: today. */
  end?: Date;
  weekStartsOn?: 0 | 1;
  /** Default 5. */
  levels?: number;
  tone?: Hue;
  onDayClick?: (day: ActivityHeatmapDatum) => void;
  formatValue?: (value: number) => string;
  labels?: Partial<ActivityHeatmapLabels>;
  className?: string;
};

export function ActivityHeatmap({ className }: ActivityHeatmapProps) {
  return <div className={cn(className)} />;
}
