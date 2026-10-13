import { ChevronRight, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../lib/cn';
import type { NavLinkRender } from './nav-link';

/**
 * #94 — a short column of things to do: "New agent", "Open worktree", "Run
 * checks". An icon, a label, an optional chevron for "this goes somewhere".
 *
 * **Independent actions, so independent Tab stops.** It is a list of buttons
 * and links, not a menu: nothing is selected, nothing opens and closes, and a
 * roving focus would hide from Tab the very actions it lists. Each row is a
 * real `button`, or — when it has an `href` — whatever element `link`
 * renders, the same render prop `NavRail` takes, so the package never
 * imports a router. Without `link`, an `href` is a plain anchor.
 *
 * **Glass by default**, because a quick-action panel is a tool palette that
 * floats over the work. `surface="content"` draws it as a card for a page
 * that already has a glass shell around it. `tone="danger"` is for the one
 * destructive row, never for emphasis.
 */
export interface ActionListItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  /** A second, quieter line under the label. */
  description?: string;
  onSelect?: () => void;
  /** Makes the row a link (through `link`, if given). */
  href?: string;
  /** A trailing chevron: the row goes somewhere. Default: on for `href` rows. */
  chevron?: boolean;
  disabled?: boolean;
  tone?: 'default' | 'danger';
}

export interface ActionListProps {
  items: readonly ActionListItem[];
  /** A small heading over the list. */
  heading?: ReactNode;
  surface?: 'glass' | 'content';
  link?: NavLinkRender;
  className?: string;
}

const ROW =
  'flex w-full min-h-10 items-center gap-3 rounded-control px-3 py-2 text-left text-[13px] font-medium ' +
  'transition-colors duration-(--dur-fast) hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent';

const TONE = {
  default: 'text-ink',
  danger: 'text-danger',
} as const;

export function ActionList({
  items,
  heading,
  surface = 'glass',
  link,
  className,
}: ActionListProps) {
  return (
    <div
      data-action-list
      data-surface={surface}
      className={cn(
        'flex flex-col gap-1 p-1.5',
        surface === 'glass' ? 'glass rounded-surface' : 'surface-content',
        className,
      )}
    >
      {heading ? (
        <h3 className="px-3 pt-1.5 pb-1 text-label text-ink-3">{heading}</h3>
      ) : null}
      <ul className="flex flex-col gap-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          const chevron = item.chevron ?? Boolean(item.href);
          const className = cn(ROW, TONE[item.tone ?? 'default']);
          const children = (
            <>
              {Icon ? (
                <Icon
                  size={16}
                  aria-hidden="true"
                  className={cn(
                    'shrink-0',
                    item.tone === 'danger' ? 'text-danger' : 'text-ink-2',
                  )}
                />
              ) : null}
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate">{item.label}</span>
                {item.description ? (
                  <span className="truncate text-xs font-normal text-ink-3">
                    {item.description}
                  </span>
                ) : null}
              </span>
              {chevron ? (
                <ChevronRight
                  size={16}
                  aria-hidden="true"
                  data-action-chevron
                  className="shrink-0 text-ink-3"
                />
              ) : null}
            </>
          );
          return (
            <li key={item.id} data-action-item={item.id}>
              {item.href && !item.disabled ? (
                link ? (
                  link({ href: item.href, className, children })
                ) : (
                  <a href={item.href} className={className}>
                    {children}
                  </a>
                )
              ) : (
                <button
                  type="button"
                  disabled={item.disabled}
                  onClick={item.onSelect}
                  className={className}
                >
                  {children}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
