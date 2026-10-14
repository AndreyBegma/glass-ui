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
}: {
  action: EmptyStateAction;
  link?: NavLinkRender;
}) {
  if (action.href === undefined) {
    return <Button onClick={action.onClick}>{action.label}</Button>;
  }
  const className = buttonClassName();
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
 * One action, or none. Three choices at zero data is a menu rather than an
 * invitation.
 */
export function EmptyState({
  title,
  description,
  action,
  icon,
  link,
}: {
  /** What this section is for. Not "No tasks" — "Tasks you have not done yet". */
  title: string;
  /** One sentence. What appears here, and how it gets here. */
  description?: string;
  /**
   * The single action that fills it. One, or none. Prefer the data shape
   * (`{ label, onClick }` or `{ label, href }`, #130); a `ReactNode` still
   * renders as given.
   */
  action?: ReactNode | EmptyStateAction;
  icon?: ReactNode;
  /** Renders an `href` action's anchor. See `nav-link.ts`. Plain `<a>` without it. */
  link?: NavLinkRender;
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
      {action && (
        <div className="mt-1">
          {isActionData(action) ? <ActionControl action={action} link={link} /> : action}
        </div>
      )}
    </div>
  );
}
