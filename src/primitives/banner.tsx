import { AlertTriangle, CheckCircle2, Info, OctagonAlert, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { tv } from 'tailwind-variants';
import { cn } from '../lib/cn';

/**
 * FEAT-20260930-070 — Banner: an inline notice in flow, full width of its
 * container.
 *
 * A solid tinted surface from the tone tokens, never glass (D3). `warn` and
 * `danger` are `role="alert"` (assertive); `info` and `ok` are
 * `role="status"` (polite) — D11. The tone is never colour alone: each tone
 * has its own default lucide icon, and `title` / `children` carry the words.
 *
 * Dismissal is the consumer's: `onDismiss` is called and the consumer stops
 * rendering the banner. The component persists nothing.
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

const banner = tv({
  base: 'flex w-full items-start gap-3 rounded-surface border bg-raised p-3 text-sm text-ink',
  variants: {
    tone: {
      info: 'border-line bg-hover',
      ok: 'border-ok/30 bg-ok/10',
      warn: 'border-warn/30 bg-warn/10',
      danger: 'border-danger/30 bg-danger/10',
    },
  },
});

const ICON_TONE = {
  info: 'text-ink-2',
  ok: 'text-ok',
  warn: 'text-warn',
  danger: 'text-danger',
} as const;

const DEFAULT_ICON = {
  info: Info,
  ok: CheckCircle2,
  warn: AlertTriangle,
  danger: OctagonAlert,
} as const;

export function Banner({
  tone,
  title,
  children,
  action,
  onDismiss,
  icon,
  className,
}: BannerProps) {
  const Default = DEFAULT_ICON[tone];
  return (
    <div
      role={tone === 'warn' || tone === 'danger' ? 'alert' : 'status'}
      data-tone={tone}
      className={cn(banner({ tone }), className)}
    >
      {icon === false ? null : (
        <span
          data-banner-icon
          aria-hidden="true"
          className={cn('mt-0.5 inline-flex shrink-0', ICON_TONE[tone])}
        >
          {icon ?? <Default size={16} />}
        </span>
      )}
      <div className="min-w-0 flex-1">
        {title ? <div className="font-semibold">{title}</div> : null}
        {children ? <div className="text-ink-2">{children}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
      {onDismiss ? (
        <button
          type="button"
          aria-label="Dismiss"
          onClick={onDismiss}
          className="inline-flex size-6 shrink-0 items-center justify-center rounded-control text-ink-2 hover:bg-hover hover:text-ink pointer-coarse:size-11"
        >
          <X size={14} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
