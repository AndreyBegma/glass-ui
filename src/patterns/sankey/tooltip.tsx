import { cn } from '../../lib/cn';

/**
 * #94 — the readout for the hovered or focused node or link. Drawn here, as
 * `Chart`'s is, rather than through the `Tooltip` primitive: it follows the
 * pointer and the keyboard alike, and anchors to a point in the graph rather
 * than to a trigger. It wears the popover material. It is `aria-hidden`: the
 * live region in `index.tsx` already says the same thing.
 */
export function SankeyTooltip({
  title,
  detail,
  value,
  left,
  top,
  flip,
}: {
  title: string;
  /** The column of a node, or nothing for a link (its title names both ends). */
  detail?: string;
  value: string;
  /** Where it points, in pixels from the top-left of the graph. */
  left: number;
  top: number;
  /** Open to the left of the point, when the point is in the right half. */
  flip: boolean;
}) {
  return (
    <div
      aria-hidden
      data-sankey-tooltip
      style={{ left, top }}
      className={cn(
        'glass-strong pointer-events-none absolute z-overlay -translate-y-1/2 rounded-control px-2.5 py-1.5 text-xs text-ink',
        flip ? '-translate-x-[calc(100%+12px)]' : 'translate-x-3',
      )}
    >
      <div className="flex items-baseline gap-3 whitespace-nowrap">
        <span className="font-medium">{title}</span>
        <span className="ml-auto tabular-nums">{value}</span>
      </div>
      {detail ? <div className="text-ink-3">{detail}</div> : null}
    </div>
  );
}
