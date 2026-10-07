import { cn } from '../lib/cn';

/**
 * FEAT-20260930-067 — Spinner. Scaffold stub: the final prop types, a minimal
 * render. Behaviour (rotating arc, reduced-motion dots, `label={null}`) is
 * i67-small's.
 */
export type SpinnerProps = {
  size?: 'sm' | 'md' | 'lg';
  /** Accessible name; default "Loading". `null` hides it from assistive tech. */
  label?: string | null;
  tone?: 'neutral' | 'ok' | 'warn' | 'danger';
  className?: string;
};

export function Spinner({
  size = 'md',
  label = 'Loading',
  tone = 'neutral',
  className,
}: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label ?? undefined}
      aria-hidden={label === null ? true : undefined}
      data-size={size}
      data-tone={tone}
      className={cn('inline-block', className)}
    />
  );
}
