import type { CSSProperties, ReactNode } from 'react';
import { cn } from '../lib/cn';

/**
 * C-281 (AgentDock S-7) — ListDetail: a list and the thing picked from it.
 *
 * Settings' sections beside the open one, a run list beside its run, the
 * queue beside the card. One layout across the three widths:
 *
 *   - **phone** (below 640px): one column. `phoneView` decides what is in it —
 *     `both` (default) stacks the list above the detail; `list` and `detail`
 *     show one pane and leave the other out of the layout, for a phone flow
 *     where picking a row navigates to it and Back returns to the list.
 *   - **tablet and up** (640px+, `tablet:`): two columns side by side, the
 *     list at `listWidth` and the detail taking the rest. `phoneView` no
 *     longer applies: both panes are always drawn.
 *
 * Pure CSS, no measurement and no `matchMedia`, so the server renders the
 * right layout for every width and nothing moves on hydration. The panes are
 * the consumer's: this draws no surface and no border, so a list can be a
 * `Section`, a bare `nav` or a `Card`, and the gap is the only thing between
 * them.
 */
export interface ListDetailProps {
  list: ReactNode;
  detail?: ReactNode;
  /** Below the tablet edge: `both` (default, list then detail), `list` or `detail` alone. */
  phoneView?: 'both' | 'list' | 'detail';
  /** The list column's width from tablet up: px as a number, or any CSS length. Default 280. */
  listWidth?: number | string;
  /** From tablet up, the list stays in view while the detail scrolls. */
  stickyList?: boolean;
  /** Names the list pane for a reader (`aria-label` on an `aside`). */
  listLabel?: string;
  className?: string;
}

export function ListDetail({
  list,
  detail,
  phoneView = 'both',
  listWidth = 280,
  stickyList = false,
  listLabel,
  className,
}: ListDetailProps) {
  const width = typeof listWidth === 'number' ? `${listWidth}px` : listWidth;
  return (
    <div
      data-list-detail=""
      data-phone-view={phoneView}
      style={{ '--list-detail-width': width } as CSSProperties}
      className={cn(
        'grid min-w-0 grid-cols-1 gap-6',
        'tablet:grid-cols-[minmax(0,var(--list-detail-width))_minmax(0,1fr)] tablet:gap-8',
        className,
      )}
    >
      <aside
        data-list-detail-list=""
        aria-label={listLabel}
        className={cn(
          'min-w-0',
          phoneView === 'detail' && 'max-tablet:hidden',
          stickyList && 'tablet:sticky tablet:top-4 tablet:self-start',
        )}
      >
        {list}
      </aside>
      <div
        data-list-detail-detail=""
        className={cn('min-w-0', phoneView === 'list' && 'max-tablet:hidden')}
      >
        {detail}
      </div>
    </div>
  );
}
