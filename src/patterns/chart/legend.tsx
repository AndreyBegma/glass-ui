import { cn } from '../../lib/cn';
import { seriesDash, seriesStyle } from './series-style';
import type { ChartSeries } from './types';

/**
 * #74 — one swatch and one name per series. A line's swatch is drawn with its
 * own dash, so the legend matches the chart even for a reader who cannot tell
 * the colours apart (D5).
 */
export function ChartLegend({ series }: { series: ChartSeries[] }) {
  return (
    <ul data-chart-legend className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-2">
      {series.map((s, i) => {
        const style = seriesStyle(s, i);
        return (
          <li key={s.id} className="inline-flex items-center gap-1.5">
            <svg aria-hidden="true" width={16} height={10} viewBox="0 0 16 10" className="shrink-0">
              {s.kind === 'line' ? (
                <line
                  x1={1}
                  x2={15}
                  y1={5}
                  y2={5}
                  strokeWidth={2}
                  strokeDasharray={seriesDash(s, i)}
                  className={style.stroke}
                />
              ) : (
                <rect
                  x={2}
                  y={1}
                  width={12}
                  height={8}
                  rx={2}
                  className={cn(style.fill, s.kind === 'area' && 'opacity-60')}
                />
              )}
            </svg>
            {s.name}
          </li>
        );
      })}
    </ul>
  );
}
