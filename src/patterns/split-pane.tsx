import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

/**
 * FEAT-20260930-070 — SplitPane. Scaffold stub: the final prop types and two
 * panes around a separator. Size state, persistence, drag and keyboard are
 * i70-split's, mirroring `SidePanel`.
 */
export type SplitPaneProps = {
  /** `horizontal` = side-by-side panes; the size is the first pane's. */
  orientation?: 'horizontal' | 'vertical';
  /** Required: the `localStorage` key the size persists under. */
  storageKey: string;
  defaultSize: number;
  min: number;
  max?: number;
  unit?: 'px' | '%';
  first: ReactNode;
  second: ReactNode;
  /** Controlled by the consumer; no drag-to-collapse. */
  collapsedFirst?: boolean;
  className?: string;
};

export function SplitPane({
  orientation = 'horizontal',
  defaultSize,
  min,
  max,
  first,
  second,
  className,
}: SplitPaneProps) {
  return (
    <div
      data-orientation={orientation}
      className={cn(
        'flex',
        orientation === 'horizontal' ? 'flex-row' : 'flex-col',
        className,
      )}
    >
      <div>{first}</div>
      {/* biome-ignore lint/a11y/useSemanticElements: a separator that is dragged has no element; the role is the correct one and the keyboard alternative is the arrow keys */}
      <div
        role="separator"
        aria-orientation={orientation === 'horizontal' ? 'vertical' : 'horizontal'}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={defaultSize}
        tabIndex={0}
      />
      <div className="flex-1">{second}</div>
    </div>
  );
}
