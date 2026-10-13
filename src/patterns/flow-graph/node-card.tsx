import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { type Hue, hueClasses } from '../../lib/hue';
import { flowTone, hueTone } from './tone';
import type { FlowTone } from './types';

/**
 * #94 — the node a `FlowGraph` draws when it has no `renderNode`: a title, a
 * status (a dot in the tone beside a word), and one meta line.
 *
 * Content paper (`bg-content`, the colour `surface-content` paints) rather
 * than the glass material: forty blurred cards would cost the canvas its frame
 * rate, and a card is read. The tone is the rim and a soft outer glow, never
 * the text, so every line keeps the ink's contrast (AA in both themes) and the
 * status is still said in words.
 *
 * Exported, so a `renderNode` can wrap it or put it beside its own content.
 */
export type FlowNodeCardProps = {
  title: ReactNode;
  tone?: FlowTone;
  /**
   * #109 — an identity hue: the border, the icon disc and the glow. The
   * status keeps its dot and word; identity beats state on the edge, as on
   * `NodeCard`.
   */
  hue?: Hue;
  /** Beside the dot. Defaults to the tone's English name; nothing without a tone. */
  status?: ReactNode;
  meta?: ReactNode;
  icon?: ReactNode;
  /**
   * One row: the dot, then the title. For a node too short for three lines
   * (`FlowGraph` picks it under 64px). The status word is dropped from view,
   * so the graph's node still names it to a screen reader.
   */
  compact?: boolean;
  className?: string;
};

export function FlowNodeCard({
  title,
  tone,
  hue,
  status,
  meta,
  icon,
  compact = false,
  className,
}: FlowNodeCardProps) {
  const classes = flowTone(tone);
  const edge = hue ? hueTone(hue) : classes;
  const statusText = status ?? (tone ? classes.label : null);
  if (compact) {
    return (
      <div
        data-flow-node-card
        data-tone={tone}
        data-hue={hue}
        className={cn(
          'flex h-full w-full items-center gap-2 overflow-hidden rounded-surface border bg-content px-3 text-left',
          'transition-[border-color,box-shadow] duration-(--dur-fast)',
          edge.rim,
          edge.glow,
          className,
        )}
      >
        {tone ? (
          <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full', classes.dot)} />
        ) : null}
        {icon ? (
          <span
            aria-hidden="true"
            className={cn('flex shrink-0 [&_svg]:size-4', hue ? hueClasses(hue).ink : 'text-ink-2')}
          >
            {icon}
          </span>
        ) : null}
        <span className="truncate text-sm font-semibold text-ink">{title}</span>
      </div>
    );
  }
  return (
    <div
      data-flow-node-card
      data-tone={tone}
      data-hue={hue}
      className={cn(
        'flex h-full w-full items-start gap-3 overflow-hidden rounded-surface border bg-content p-3 text-left',
        'transition-[border-color,box-shadow] duration-(--dur-fast)',
        edge.rim,
        edge.glow,
        className,
      )}
    >
      {icon ? (
        <span
          aria-hidden="true"
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-control [&_svg]:size-4',
            hue ? hueClasses(hue).soft : 'bg-hover text-ink-2',
          )}
        >
          {icon}
        </span>
      ) : null}
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-sm font-semibold text-ink">{title}</span>
        {statusText ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-ink-2">
            <span aria-hidden="true" className={cn('size-1.5 shrink-0 rounded-full', classes.dot)} />
            <span className="truncate">{statusText}</span>
          </span>
        ) : null}
        {meta ? <span className="truncate text-xs text-ink-2">{meta}</span> : null}
      </span>
    </div>
  );
}
