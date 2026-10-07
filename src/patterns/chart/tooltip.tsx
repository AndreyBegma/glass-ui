import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { seriesStyle } from './series-style';
import type { ChartTooltipContext } from './types';

/**
 * #74 — the readout at the focused x. It follows the pointer and the arrow
 * keys alike. It is drawn here rather than through the `Tooltip` primitive,
 * which takes one string and anchors to a trigger, whereas this holds a row
 * per series and moves with the data. It still wears the popover material
 * (D12). It is `aria-hidden`: the live region in `index.tsx` already says the
 * same thing, and saying it twice is noise.
 */
export function ChartTooltip({
  context,
  left,
  flip,
  formatX,
  formatY,
  formatTooltip,
}: {
  context: ChartTooltipContext;
  /** The focused x, as a fraction of the chart's width. */
  left: number;
  /** Open to the left of the x, when the x is in the right half. */
  flip: boolean;
  formatX: (x: Date | string | number) => string;
  formatY: (y: number) => string;
  formatTooltip?: (context: ChartTooltipContext) => ReactNode;
}) {
  return (
    <div
      aria-hidden
      data-chart-tooltip
      style={{ left: `${left * 100}%` }}
      className={cn(
        'glass-strong pointer-events-none absolute top-2 z-overlay rounded-control px-2.5 py-1.5 text-xs text-ink',
        flip ? '-translate-x-[calc(100%+8px)]' : 'translate-x-2',
      )}
    >
      {formatTooltip ? (
        formatTooltip(context)
      ) : (
        <>
          <div className="mb-1 font-medium text-ink-2">{formatX(context.x)}</div>
          <ul className="grid gap-0.5">
            {context.entries.map(({ series, y }, i) => (
              <li key={series.id} className="flex items-center gap-2 whitespace-nowrap">
                <span className={cn('size-2 shrink-0 rounded-full', seriesStyle(series, i).bg)} />
                <span className="text-ink-2">{series.name}</span>
                <span className="ml-auto pl-3 tabular-nums">{y === null ? '—' : formatY(y)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
