import { cn } from '../../lib/cn';
import { Table, TableCell, TableHead, TableRow } from '../../primitives/table';
import type { ChartModel } from './data';
import type { ChartLabels } from './types';

/**
 * #74 — the same data as a table (D6): one row per x, one column per series.
 * It is always in the document, so a screen reader can reach it, and it is
 * visually hidden unless "Show table" is on. When the chart was down-sampled
 * the caption says so, because the rows are the down-sampled ones too.
 */
export function ChartTable({
  id,
  label,
  model,
  kind,
  labels,
  visible,
  downsampledFrom,
  formatX,
  formatY,
}: {
  id: string;
  label: string;
  model: ChartModel;
  kind: 'time' | 'category';
  labels: Pick<ChartLabels, 'time' | 'category' | 'downsampled'>;
  visible: boolean;
  /** The x count before down-sampling, or `null` when nothing was dropped. */
  downsampledFrom: number | null;
  formatX: (x: Date | string | number) => string;
  formatY: (y: number) => string;
}) {
  return (
    <div id={id} data-chart-table className={visible ? 'mt-3 max-h-80 overflow-y-auto' : 'sr-only'}>
      <Table scroll={visible}>
        <caption className={cn('text-left text-xs text-ink-3', visible ? 'pb-2' : undefined)}>
          {label}
          {downsampledFrom !== null
            ? ` — ${labels.downsampled(model.xs.length, downsampledFrom)}`
            : null}
        </caption>
        <TableHead>
          <tr>
            <TableCell head scope="col">
              {kind === 'time' ? labels.time : labels.category}
            </TableCell>
            {model.series.map((s) => (
              <TableCell head scope="col" key={s.id} className="text-right">
                {s.name}
              </TableCell>
            ))}
          </tr>
        </TableHead>
        <tbody>
          {model.xValues.map((x, i) => (
            <TableRow key={model.xs[i]}>
              <TableCell head scope="row" className="text-left font-normal text-ink-2">
                {formatX(x)}
              </TableCell>
              {model.series.map((s, k) => {
                const y = model.y[k]?.[i] ?? null;
                return (
                  <TableCell key={s.id} className="text-right tabular-nums">
                    {y === null ? '—' : formatY(y)}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
