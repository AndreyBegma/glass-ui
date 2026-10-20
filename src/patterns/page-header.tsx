import { type LucideIcon, MoreHorizontal } from 'lucide-react';
import { type ComponentProps, isValidElement, type ReactNode } from 'react';
import { cn } from '../lib/cn';
import { Button, buttonClassName } from '../primitives/button';
import {
  MenuContent,
  MenuItem,
  MenuRoot,
  MenuTrigger,
} from '../primitives/menu';
import type { NavLinkRender } from './nav-link';

/**
 * C-281 (AgentDock S-7) — the page's one primary action, as data, so the
 * header draws it as the screen's single `solid` button. `onClick` renders a
 * `Button`; `href` renders an anchor with the same class, through `link` when
 * one is given (`nav-link.ts`), so a Next application keeps client-side
 * navigation. `EmptyState`'s action has the same shape for the same reason.
 */
export type PageHeaderAction =
  | { label: string; onClick: () => void; href?: never; icon?: LucideIcon }
  | { label: string; href: string; onClick?: never; icon?: LucideIcon };

/** C-281 — one row of the overflow menu. */
export interface PageHeaderOverflowItem {
  id: string;
  label: string;
  onSelect: () => void;
  icon?: LucideIcon;
  tone?: 'default' | 'danger';
  disabled?: boolean;
}

function isActionData(action: unknown): action is PageHeaderAction {
  return (
    typeof action === 'object' &&
    action !== null &&
    !Array.isArray(action) &&
    !isValidElement(action) &&
    'label' in action
  );
}

function PrimaryControl({
  action,
  link,
}: {
  action: PageHeaderAction;
  link?: NavLinkRender;
}) {
  const Icon = action.icon;
  const children = (
    <>
      {Icon ? <Icon size={16} aria-hidden="true" /> : null}
      {action.label}
    </>
  );
  if (action.href === undefined) {
    return (
      <Button variant="solid" onClick={action.onClick}>
        {children}
      </Button>
    );
  }
  const className = buttonClassName({ variant: 'solid' });
  if (link) return <>{link({ href: action.href, className, children })}</>;
  return (
    <a href={action.href} className={className}>
      {children}
    </a>
  );
}

function OverflowMenu({
  items,
  label,
}: {
  items: readonly PageHeaderOverflowItem[];
  label: string;
}) {
  return (
    <MenuRoot>
      <MenuTrigger asChild>
        <Button
          variant="ghost"
          icon
          aria-label={label}
          data-page-header-overflow=""
        >
          <MoreHorizontal size={16} aria-hidden="true" />
        </Button>
      </MenuTrigger>
      <MenuContent align="end">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <MenuItem
              key={item.id}
              tone={item.tone}
              disabled={item.disabled}
              onSelect={item.onSelect}
            >
              {Icon ? <Icon size={16} aria-hidden="true" /> : null}
              {item.label}
            </MenuItem>
          );
        })}
      </MenuContent>
    </MenuRoot>
  );
}

/**
 * #130 (G1) — PageHeader: the top of every page, one shape.
 *
 * A review of AgentDock found two page-header shapes (a hand-written h1 row and
 * `MetaBar`'s own 20 px h1) across the app. This is the one canonical shape:
 * an optional `eyebrow`, an h1 at the desk text scale's 28 px, a `status` beside
 * the title, a `description`, a `meta` row and `actions` on the right.
 *
 * **`status` is a node, not a `Status`.** It is drawn beside the title, outside
 * the h1, so the heading's accessible name stays the page's name and not
 * "Agent Fleet Running". Pass a `StatusPill`.
 *
 * **`meta` is a counter row.** `MetaBar` without a `title` renders exactly that
 * — its counters, no header landmark, no second h1 — so
 * `<PageHeader meta={<MetaBar counters={…} />} />` is how Fleet and Workflows
 * keep their counters under the shared title.
 *
 * **`actions` are the caller's** — a primary `Button`, icon buttons, a menu.
 * They sit on the right and, below `sm`, wrap under the title at full width
 * rather than squeezing it.
 *
 * **No back link.** Going up is a breadcrumb's job, not the header's.
 *
 * C-281 (AgentDock S-7) — the calm header: **one** primary action and an
 * overflow menu. `primaryAction` is drawn last in the row as the screen's one
 * `solid` button; `overflow` is a `…` icon button after it that opens a menu
 * of everything else, so a page carries one loud control and one quiet door
 * instead of a toolbar. `actions` still renders, before them, for the
 * secondary glass button the mockup keeps beside the primary. All three are
 * optional and additive: a header written before them draws as it did.
 */
export interface PageHeaderProps
  extends Omit<ComponentProps<'header'>, 'title' | 'className' | 'children'> {
  /** The page's h1. */
  title: ReactNode;
  /** One or two sentences under the title: what this page is for. */
  description?: ReactNode;
  /** A small line above the title: the parent entity, a kind ("Run"). */
  eyebrow?: ReactNode;
  /** Beside the title — a `StatusPill`. Outside the h1, so the name stays clean. */
  status?: ReactNode;
  /** A counter row under the description: `<MetaBar counters={…} />`. */
  meta?: ReactNode;
  /** Right-hand side; wraps below the title at full width under `sm`. */
  actions?: ReactNode;
  /**
   * C-281 — the page's one primary action, drawn as the `solid` button at the
   * end of the row. Prefer the data shape; a `ReactNode` renders as given.
   */
  primaryAction?: ReactNode | PageHeaderAction;
  /**
   * C-281 — `'hidden'` drops the primary action below the tablet edge, for a
   * phone layout whose floating button already carries it. Default `'inline'`.
   */
  primaryActionOnPhone?: 'inline' | 'hidden';
  /** C-281 — everything else, behind a `…` button at the very end. Empty draws nothing. */
  overflow?: readonly PageHeaderOverflowItem[];
  /** The `…` button's accessible name. Default "More actions". */
  overflowLabel?: string;
  /** Renders an `href` primary action's anchor. See `nav-link.ts`. */
  link?: NavLinkRender;
  /** The h1's id, for `aria-labelledby` on the page's main region. */
  headingId?: string;
  className?: string;
}

export function PageHeader({
  title,
  description,
  eyebrow,
  status,
  meta,
  actions,
  primaryAction,
  primaryActionOnPhone = 'inline',
  overflow,
  overflowLabel = 'More actions',
  link,
  headingId,
  className,
  ...props
}: PageHeaderProps) {
  const hasOverflow = !!overflow && overflow.length > 0;
  const hasRow = !!actions || !!primaryAction || hasOverflow;
  return (
    <header
      data-page-header
      className={cn(
        'flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6',
        className,
      )}
      {...props}
    >
      <div className="flex min-w-0 flex-col gap-1">
        {eyebrow ? (
          <div
            data-page-header-eyebrow
            className="text-xs font-medium text-ink-3"
          >
            {eyebrow}
          </div>
        ) : null}
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <h1 id={headingId} className="min-w-0 text-display text-ink">
            {title}
          </h1>
          {status ? <div data-page-header-status>{status}</div> : null}
        </div>
        {description ? (
          <p className="max-w-prose text-sm text-ink-2">{description}</p>
        ) : null}
        {meta ? <div data-page-header-meta>{meta}</div> : null}
      </div>
      {hasRow ? (
        <div
          data-page-header-actions
          className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto"
        >
          {actions}
          {primaryAction ? (
            <div
              data-page-header-primary
              className={cn(
                'contents',
                primaryActionOnPhone === 'hidden' && 'max-tablet:hidden',
              )}
            >
              {isActionData(primaryAction) ? (
                <PrimaryControl action={primaryAction} link={link} />
              ) : (
                primaryAction
              )}
            </div>
          ) : null}
          {hasOverflow ? (
            <OverflowMenu items={overflow} label={overflowLabel} />
          ) : null}
        </div>
      ) : null}
    </header>
  );
}
