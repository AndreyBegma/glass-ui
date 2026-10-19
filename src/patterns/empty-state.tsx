import { isValidElement, type ReactNode } from 'react';
import { cn } from '../lib/cn';
import { Button, buttonClassName } from '../primitives/button';
import type { NavLinkRender } from './nav-link';

/**
 * #130 — the action as data, so the pattern draws the control. Callers were
 * passing bare text links, which read as body copy and lost the one action
 * the empty state exists to offer. `onClick` renders a glass `Button`; `href`
 * renders a link with the same class, through `link` when one is given (see
 * `nav-link.ts`), so a Next application keeps client-side navigation.
 */
export type EmptyStateAction =
  | { label: string; onClick: () => void; href?: never }
  | { label: string; href: string; onClick?: never };

function isActionData(action: unknown): action is EmptyStateAction {
  return (
    typeof action === 'object' &&
    action !== null &&
    !Array.isArray(action) &&
    !isValidElement(action) &&
    'label' in action
  );
}

function ActionControl({
  action,
  link,
  variant,
}: {
  action: EmptyStateAction;
  link?: NavLinkRender;
  /** `ghost` for the secondary; the glass default for the one that fills it. */
  variant?: 'ghost';
}) {
  if (action.href === undefined) {
    return (
      <Button variant={variant} onClick={action.onClick}>
        {action.label}
      </Button>
    );
  }
  const className = buttonClassName({ variant });
  if (link) return <>{link({ href: action.href, className, children: action.label })}</>;
  return (
    <a href={action.href} className={className}>
      {action.label}
    </a>
  );
}

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
 * FEAT-20261013-004 (#168) — `align` is where the block sits: `center` (the
 * default) for a card or a dialog, `start` when the page's content begins at
 * its left edge and the empty state must begin there too. `secondaryAction`
 * sits on the action's row as a `ghost`. Under the workspace profile the
 * anatomy is maint's: the icon in a 40px disc, the title at 16/600.
 */
export interface EmptyStateProps {
  /** What this section is for. Not "No tasks" — "Tasks you have not done yet". */
  title: string;
  /** One sentence. What appears here, and how it gets here. */
  description?: string;
  /**
   * The single action that fills it. Prefer the data shape
   * (`{ label, onClick }` or `{ label, href }`, #130); a `ReactNode` still
   * renders as given.
   */
  action?: ReactNode | EmptyStateAction;
  /** Optional, quieter, on the same row — a `ghost` when given as data. */
  secondaryAction?: ReactNode | EmptyStateAction;
  icon?: ReactNode;
  /** Renders an `href` action's anchor. See `nav-link.ts`. Plain `<a>` without it. */
  link?: NavLinkRender;
  align?: 'center' | 'start';
}

export function EmptyState({
  title,
  description,
  action,
  secondaryAction,
  icon,
  link,
  align = 'center',
}: EmptyStateProps) {
  const control = (value: ReactNode | EmptyStateAction, variant?: 'ghost') =>
    isActionData(value) ? <ActionControl action={value} link={link} variant={variant} /> : value;
  return (
    <div
      className={cn(
        'flex flex-col gap-3 py-12',
        align === 'center'
          ? 'items-center justify-center rounded-surface px-6 text-center'
          : 'max-w-md items-start text-left',
      )}
    >
      {icon && (
        <div
          className={cn(
            'text-ink-3',
            'workspace:bg-hover workspace:text-ink-2 workspace:grid workspace:size-10',
            'workspace:place-items-center workspace:rounded-full workspace:[&_svg]:size-5',
          )}
        >
          {icon}
        </div>
      )}
      <p className="text-ink text-sm font-medium workspace:text-base workspace:font-semibold">
        {title}
      </p>
      {description && (
        <p className="text-ink-2 max-w-sm text-sm">{description}</p>
      )}
      {secondaryAction ? (
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {action ? control(action) : null}
          {control(secondaryAction, 'ghost')}
        </div>
      ) : action ? (
        <div className="mt-1">{control(action)}</div>
      ) : null}
    </div>
  );
}
