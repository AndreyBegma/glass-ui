import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../lib/cn';

/**
 * #130 (G1) — SectionHeader: the heading of one section on a page.
 *
 * The review found five section-heading styles. This is the one: a 16 px / 600
 * `h2`, an optional line of description under it and an actions slot on the
 * right ("Add", a view menu). The page's own title is `PageHeader`'s h1; a
 * section under it is an h2, and `headingLevel` moves it down when the section
 * sits inside another.
 */
export interface SectionHeaderProps
  extends Omit<ComponentProps<'div'>, 'title' | 'className' | 'children'> {
  title: ReactNode;
  description?: ReactNode;
  /** Right-hand side: a button, icon buttons, a menu. */
  actions?: ReactNode;
  /** Default 2: a section of a page headed by `PageHeader`. */
  headingLevel?: 2 | 3 | 4;
  /** The heading's id, for `aria-labelledby` on the section. */
  headingId?: string;
  className?: string;
}

export function SectionHeader({
  title,
  description,
  actions,
  headingLevel = 2,
  headingId,
  className,
  ...props
}: SectionHeaderProps) {
  const Heading = `h${headingLevel}` as const;
  return (
    <div
      data-section-header
      className={cn('flex min-w-0 items-center justify-between gap-4', className)}
      {...props}
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <Heading
          id={headingId}
          className="min-w-0 text-base leading-6 font-semibold text-ink"
        >
          {title}
        </Heading>
        {description ? (
          <p className="text-[13px] leading-5 text-ink-2">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div
          data-section-header-actions
          className="flex shrink-0 flex-wrap items-center gap-2"
        >
          {actions}
        </div>
      ) : null}
    </div>
  );
}
