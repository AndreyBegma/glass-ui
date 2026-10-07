import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

/**
 * FEAT-20260930-067 — StatTile. Scaffold stub: the final prop types and a
 * solid-surface box. Delta, loading and pressable behaviour are i67-stats'.
 */
export type StatTileDelta = {
  value: ReactNode;
  direction: 'up' | 'down' | 'flat';
  sentiment: 'good' | 'bad' | 'neutral';
};

export type StatTileProps = {
  label: string;
  value: ReactNode;
  delta?: StatTileDelta;
  hint?: ReactNode;
  loading?: boolean;
  href?: string;
  onClick?: () => void;
  /** The trend slot, usually a Sparkline. */
  children?: ReactNode;
  className?: string;
};

export function StatTile({ label, value, children, className }: StatTileProps) {
  return (
    <div
      className={cn(
        'rounded-surface bg-raised border border-line tabular-nums',
        className,
      )}
    >
      <div>{label}</div>
      <div>{value}</div>
      {children}
    </div>
  );
}
