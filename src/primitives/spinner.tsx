import { tv } from 'tailwind-variants';
import { cn } from '../lib/cn';

/**
 * FEAT-20260930-067 — a busy indicator for a control or a region.
 *
 * `role="status"` with an accessible name; `label={null}` is for a spinner
 * inside a control that already announces its own state (a button that says
 * "Saving…"), where a second announcement is noise — it is then `aria-hidden`
 * and carries no role.
 *
 * The arc is `currentColor`, so `tone` only sets the text colour token. Under
 * `prefers-reduced-motion` the arc is swapped for three static dots by CSS
 * (`motion-reduce:`), not by a JS media query: no hydration flash, and the
 * same accessible name either way.
 */
const root = tv({
  base: 'inline-flex shrink-0 items-center justify-center align-middle',
  variants: {
    size: { sm: 'size-3', md: 'size-4', lg: 'size-6' },
    tone: {
      neutral: 'text-ink-2',
      ok: 'text-ok',
      warn: 'text-warn',
      danger: 'text-danger',
    },
  },
  defaultVariants: { size: 'md', tone: 'neutral' },
});

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
  const a11y =
    label === null
      ? { 'aria-hidden': true as const }
      : { role: 'status', 'aria-label': label };
  return (
    <span
      {...a11y}
      data-size={size}
      data-tone={tone}
      className={cn(root({ size, tone }), className)}
    >
      <svg
        data-spinner="arc"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        aria-hidden="true"
        className="size-full animate-spin motion-reduce:hidden"
      >
        <circle cx="12" cy="12" r="9" className="opacity-25" />
        <path d="M21 12a9 9 0 0 0-9-9" />
      </svg>
      <span
        data-spinner="dots"
        aria-hidden="true"
        className="hidden size-full items-center justify-between motion-reduce:flex"
      >
        <span className="size-[22%] rounded-full bg-current" />
        <span className="size-[22%] rounded-full bg-current" />
        <span className="size-[22%] rounded-full bg-current" />
      </span>
    </span>
  );
}
