import type { ChartLayout } from './layout';

/**
 * #74 — gridlines and axis labels. Gridlines are `--color-line`, labels are
 * `ink-3` in `tabular-nums` so a column of numbers lines up. Both are
 * decoration for sighted readers: the table carries the same values for
 * everyone else, so the whole group is `aria-hidden`.
 */
export function ChartAxes({
  layout,
  formatX,
  formatY,
}: {
  layout: ChartLayout;
  formatX: (x: Date | string | number) => string;
  formatY: (y: number) => string;
}) {
  const { plot, y, yTicks, xTicks } = layout;
  return (
    <g aria-hidden data-chart-axes className="fill-ink-3 text-[11px] tabular-nums">
      {yTicks.map((t) => (
        <g key={`y${t}`}>
          <line
            x1={plot.left}
            x2={plot.right}
            y1={y(t)}
            y2={y(t)}
            className="stroke-line"
            strokeWidth={1}
            shapeRendering="crispEdges"
          />
          <text x={plot.left - 6} y={y(t)} textAnchor="end" dominantBaseline="middle">
            {formatY(t)}
          </text>
        </g>
      ))}
      {xTicks.map((t) => (
        <text
          key={`x${t.px}`}
          x={t.px}
          y={plot.bottom + 16}
          textAnchor="middle"
        >
          {formatX(t.value)}
        </text>
      ))}
    </g>
  );
}
