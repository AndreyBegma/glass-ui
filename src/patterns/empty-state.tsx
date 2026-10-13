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
 * One filling action, and at most one quiet secondary. Three choices at zero
 * data is a menu rather than an invitation.
 *
 * `align` is where the block sits: `center` (the default) for a card or a
 * dialog, `start` when the page's content begins at its left edge and the
 * empty state must begin there too.
 */
export interface EmptyStateProps {
  /** The state, in a sentence: "No starred documents yet". */
  title: string;
  /** One sentence. What appears here, and how it gets here. */
  description?: string;
  /** A lucide icon; the disc sizes it. */
  icon?: ReactNode;
  /** The one action that fills it — `solid` to create, `glass` to go somewhere. */
  action?: ReactNode;
  /** Optional, quieter — a `ghost` Button. */
  secondaryAction?: ReactNode;
  align?: 'center' | 'start';
}

export function EmptyState({
  title,
  description,
  action,
  secondaryAction,
  icon,
  align = 'center',
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 py-12',
        align === 'center'
          ? 'items-center px-6 text-center'
          : 'max-w-md items-start text-left',
      )}
    >
      {icon && (
        <div className="bg-hover text-ink-2 grid size-10 place-items-center rounded-full [&_svg]:size-5">
          {icon}
        </div>
      )}
      <p className="text-ink text-base font-semibold">{title}</p>
      {description && (
        <p className="text-ink-2 max-w-sm text-sm">{description}</p>
      )}
      {(action || secondaryAction) && (
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}
