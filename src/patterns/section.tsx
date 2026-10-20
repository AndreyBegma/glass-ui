import { type ComponentProps, type ReactNode, useId } from 'react';
import { cn } from '../lib/cn';
import { SectionHeader } from './section-header';

/**
 * C-281 (AgentDock S-7) — Section: a titled block of a page's content.
 *
 * The calm layout's unit. A `SectionHeader` (16 px / 600 `h2`, a line of
 * description, actions on the right) sitting *on the page*, and one content
 * surface under it holding the section's rows, table or form. The heading is
 * outside the box on purpose: a page of titled boxes, each with a title bar
 * inside its own border, is the wall of frames the redesign took away. One
 * hairline per block, no second box around the heading, more air between
 * blocks than inside them.
 *
 * `<section aria-labelledby>`, so each block is a named region a reader can
 * jump to, and `id` can be the target of an in-page table of contents.
 *
 * **`surface`.** `content` (default) draws the body on `surface-content`, the
 * near-opaque paper — the content surface, never glass. `none` draws no box:
 * for a body that is already a surface (a `DataTable`, a grid of `Card`s,
 * a `Board`) or that must sit on the page (an `EmptyState` aligned `start`).
 *
 * **`pad`.** `md` (default) is the card's 16 px. `none` is for rows that carry
 * their own padding and divide themselves with hairlines — a list, a table —
 * so the dividers run edge to edge.
 */
export interface SectionProps
  extends Omit<ComponentProps<'section'>, 'title' | 'className' | 'children'> {
  title: ReactNode;
  /** One line under the title: what this block holds. */
  description?: ReactNode;
  /** Right of the title: one quiet control ("Reorder", "View all"). */
  actions?: ReactNode;
  /** Default 2: a block of a page headed by `PageHeader`. */
  headingLevel?: 2 | 3 | 4;
  /** `content` (default): the paper surface. `none`: no box. */
  surface?: 'content' | 'none';
  /** `md` (default): 16 px inside the surface. `none`: flush, for rows and tables. */
  pad?: 'none' | 'md';
  children: ReactNode;
  className?: string;
  /** Extra classes for the body (the surface). */
  bodyClassName?: string;
}

export function Section({
  title,
  description,
  actions,
  headingLevel = 2,
  surface = 'content',
  pad = 'md',
  children,
  className,
  bodyClassName,
  ...props
}: SectionProps) {
  const headingId = useId();
  return (
    <section
      data-section=""
      aria-labelledby={headingId}
      className={cn('flex min-w-0 flex-col gap-3', className)}
      {...props}
    >
      <SectionHeader
        title={title}
        description={description}
        actions={actions}
        headingLevel={headingLevel}
        headingId={headingId}
        className="items-end"
      />
      <div
        data-section-body=""
        className={cn(
          'min-w-0',
          surface === 'content' && 'surface-content rounded-surface',
          pad === 'md' && 'p-4',
          bodyClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
}
