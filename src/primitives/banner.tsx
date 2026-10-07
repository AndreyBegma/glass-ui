import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

/**
 * FEAT-20260930-070 — Banner. Scaffold stub: the final prop types and a
 * solid-surface box with the right live-region role. Tone surfaces, icons and
 * the dismiss button are i70-feed's.
 */
export type BannerProps = {
  tone: 'info' | 'ok' | 'warn' | 'danger';
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  onDismiss?: () => void;
  /** Overrides the per-tone lucide icon; `false` hides it. */
  icon?: ReactNode | false;
  className?: string;
};

export function Banner({ tone, title, children, className }: BannerProps) {
  return (
    <div
      role={tone === 'warn' || tone === 'danger' ? 'alert' : 'status'}
      data-tone={tone}
      className={cn('w-full rounded-surface bg-raised border border-line', className)}
    >
      {title ? <div>{title}</div> : null}
      {children}
    </div>
  );
}
