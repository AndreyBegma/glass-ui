import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

/**
 * "You have nothing here yet."
 *
 * FEAT-20260831-002 — brought in from Denitsa, which is the application that
 * needed it. Luna Watch never did: a media centre's shelves are full of other
 * people's films from the first minute, so nothing in it is ever legitimately
 * empty. That is why this arrives from the second consumer rather than the
 * first, and it is the rule the package states for itself — a component earns
 * its place when a second application needs it.
 *
 * An empty state is **calm**. Nothing is wrong; the person simply has not done
 * this yet. It is centred, quiet, and it offers the one action that fills it.
 *
 * The distinction it exists to protect: an empty state and a broken state must
 * not look alike. A section that cannot be reached is a failure and reads as
 * one; a section with nothing in it yet is an invitation. Anything that tints
 * this warn or danger has confused the two.
 *
 * One action, or none. Three choices at zero data is a menu rather than an
 * invitation.
 */
export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  /** What this section is for. Not "No tasks" — "Tasks you have not done yet". */
  title: string;
  /** One sentence. What appears here, and how it gets here. */
  description?: string;
  /** The single action that fills it. One, or none. */
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-surface',
        'px-6 py-12 text-center',
      )}
    >
      {icon && <div className="text-ink-3">{icon}</div>}
      <p className="text-ink text-sm font-medium">{title}</p>
      {description && (
        <p className="text-ink-2 max-w-sm text-sm">{description}</p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
