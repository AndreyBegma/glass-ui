import { cn } from '../../lib/cn';
import { edgeDash } from './edge-style';
import { flowTone } from './tone';
import type { FlowEdgeKind, FlowTone } from './types';

/**
 * #94 — one swatch and one phrase per edge kind. Each swatch is drawn with the
 * very dash its edges use (`edgeDash`), so the legend reads the same to
 * someone who cannot tell the tones apart. It sits outside the graph, where
 * the page puts it: a panel header, under the canvas.
 */

export const DEFAULT_KIND_LABELS: Record<string, string> = {
  depends: 'Depends on',
  delegates: 'Delegates to',
  returns: 'Returns result',
};

export type FlowLegendProps = {
  /** Defaults to depends, delegates, returns. */
  kinds?: FlowEdgeKind[];
  /** A phrase per kind. Unknown kinds fall back to the kind itself. */
  labels?: Partial<Record<string, string>>;
  /** The swatch colour. Defaults to neutral, since the tone belongs to the node. */
  tone?: FlowTone;
  className?: string;
};

export function FlowLegend({
  kinds = ['depends', 'delegates', 'returns'],
  labels,
  tone,
  className,
}: FlowLegendProps) {
  const classes = flowTone(tone);
  return (
    <ul
      data-flow-legend
      className={cn('flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-2', className)}
    >
      {kinds.map((kind) => (
        <li key={kind} data-kind={kind} className="inline-flex items-center gap-1.5">
          <svg aria-hidden="true" width={22} height={10} viewBox="0 0 22 10" className="shrink-0">
            <line
              x1={2}
              x2={20}
              y1={5}
              y2={5}
              strokeWidth={2}
              strokeLinecap="round"
              strokeDasharray={edgeDash(kind)}
              className={classes.stroke}
            />
          </svg>
          {labels?.[kind] ?? DEFAULT_KIND_LABELS[kind] ?? kind}
        </li>
      ))}
    </ul>
  );
}
