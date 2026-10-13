'use client';

import {
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { cn } from '../../lib/cn';
import { Button } from '../../primitives/button';
import { ChartAxes } from './axes';
import { buildModel, hasData, pickIndices } from './data';
import { downsampleIndices, shouldDownsample } from './downsample';
import { DEFAULT_LABELS, defaultFormatX, defaultFormatY, summarize } from './format';
import { layoutChart } from './layout';
import { ChartLegend } from './legend';
import { seriesDash, seriesStyle } from './series-style';
import { ChartTable } from './table';
import { ChartTooltip } from './tooltip';
import type { ChartProps, ChartTooltipContext } from './types';

export type {
  ChartLabels,
  ChartPoint,
  ChartProps,
  ChartSeries,
  ChartSeriesColor,
  ChartTooltipContext,
} from './types';

/**
 * #74 — Chart: area, line and bar time series on hand-rolled SVG, no
 * dependency (D3). Series colours are tokens, so a theme change needs no
 * re-read. Colour is never the only signal: the legend and tooltip name each
 * series and line series differ in dash from series 4 onwards (D5).
 *
 * The parts live beside this file, one each: `data` (one model for every
 * part), `scale` and `time-ticks`, `path` and `layout` (the geometry, pure),
 * `downsample` (LTTB, D4), `axes`, `legend`, `tooltip` and `table`. This file
 * only measures, holds the focused x, and maps the layout onto elements.
 *
 * Accessibility (D6). The SVG is `role="img"`, named by `label` plus an auto
 * summary, and focusable: ←/→ move the focused x, Home/End jump to the ends,
 * Escape lets go, and each move is read out by a polite live region. The same
 * data follows as a table, visually hidden until "Show table".
 *
 * The plot is a solid surface, never glass (D12). Only the tooltip wears the
 * popover material.
 */

/** Before the first measurement — on the server, and in a headless DOM. */
const DEFAULT_WIDTH = 640;

export function Chart({
  label,
  series,
  x: kind,
  stacked = false,
  height = 240,
  yMin,
  yMax,
  formatX,
  formatY,
  formatTooltip,
  legend = 'top',
  emptyState,
  showTable,
  onShowTableChange,
  labels: labelOverrides,
  className,
}: ChartProps) {
  const labels = { ...DEFAULT_LABELS, ...labelOverrides };
  const id = useId();
  const tableId = `${id}-table`;
  const clipId = `${id}-clip`;
  const boxRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [ownTable, setOwnTable] = useState(false);
  const [focus, setFocus] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    const el = boxRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      const w = Math.round(entries[0]?.contentRect.width ?? 0);
      if (w > 0) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const full = useMemo(() => buildModel(series, kind), [series, kind]);
  const downsampled = shouldDownsample(full.xs.length, width);
  const model = useMemo(
    () => (downsampled ? pickIndices(full, downsampleIndices(full.xs, full.y, 2 * width)) : full),
    [full, downsampled, width],
  );

  const span = kind === 'time' ? (model.xs[model.xs.length - 1] ?? 0) - (model.xs[0] ?? 0) : 0;
  const fx = useMemo(() => formatX ?? defaultFormatX(kind, span), [formatX, kind, span]);
  const fy = formatY ?? defaultFormatY;

  const layout = useMemo(
    () => layoutChart(model, { kind, width, height, stacked, yMin, yMax, formatY: fy }),
    [model, kind, width, height, stacked, yMin, yMax, fy],
  );

  const tableOpen = showTable ?? ownTable;
  const toggleTable = () => {
    const next = !tableOpen;
    if (showTable === undefined) setOwnTable(next);
    onShowTableChange?.(next);
  };

  // The focused x can outlive the data it pointed at.
  const n = model.xs.length;
  const focused = focus !== null && focus < n ? focus : null;

  const contextAt = (i: number): ChartTooltipContext => ({
    x: model.xValues[i] as Date | string | number,
    entries: model.series.map((s, k) => ({ series: s, y: model.y[k]?.[i] ?? null })),
  });

  const announce = (i: number) => {
    const c = contextAt(i);
    setAnnouncement(
      `${fx(c.x)}: ${c.entries.map((e) => `${e.series.name} ${e.y === null ? labels.noValue : fy(e.y)}`).join(', ')}`,
    );
  };

  const onKeyDown = (e: KeyboardEvent<SVGSVGElement>) => {
    if (n === 0) return;
    let next: number | null;
    if (e.key === 'ArrowRight') next = focused === null ? 0 : Math.min(n - 1, focused + 1);
    else if (e.key === 'ArrowLeft') next = focused === null ? n - 1 : Math.max(0, focused - 1);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = n - 1;
    else if (e.key === 'Escape' && focused !== null) next = null;
    else return;
    e.preventDefault();
    setFocus(next);
    if (next === null) setAnnouncement('');
    else announce(next);
  };

  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const scale = rect.width > 0 ? width / rect.width : 1;
    setFocus(layout.indexAt((e.clientX - rect.left) * scale));
  };

  const max = model.y.reduce<number | null>((m, row) => {
    for (const v of row) if (v !== null && (m === null || v > m)) m = v;
    return m;
  }, null);
  const summary = summarize({
    seriesCount: model.series.length,
    first: model.xValues[0],
    last: model.xValues[n - 1],
    max,
    formatX: fx,
    formatY: fy,
    labels,
  });

  const legendNode = legend ? <ChartLegend series={model.series} /> : null;
  const { plot } = layout;
  const cx = focused === null ? null : (layout.centers[focused] as number);

  return (
    <div
      data-chart
      className={cn('w-full rounded-(--radius-surface) bg-surface p-3 text-ink', className)}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 empty:hidden">
        {legend === 'top' ? legendNode : <span />}
        <Button
          variant="ghost"
          size="sm"
          aria-expanded={tableOpen}
          aria-controls={tableId}
          onClick={toggleTable}
          className="pointer-coarse:min-h-(--size-tap)"
        >
          {tableOpen ? labels.hideTable : labels.showTable}
        </Button>
      </div>

      <div ref={boxRef} className="relative w-full" style={{ height }}>
        {hasData(model) ? (
          <>
            <svg
              role="img"
              aria-label={`${label}. ${summary}`}
              // biome-ignore lint/a11y/noNoninteractiveTabindex: D6 — the arrow keys move the focused x, so the chart must take focus
              tabIndex={0}
              width="100%"
              height={height}
              viewBox={`0 0 ${width} ${height}`}
              onKeyDown={onKeyDown}
              onPointerMove={onPointerMove}
              onPointerLeave={() => setFocus(null)}
              onBlur={() => setFocus(null)}
              // The focus ring is the global `:focus-visible` one, as for every primitive.
              className="block overflow-visible rounded-control"
            >
              <defs>
                <clipPath id={clipId}>
                  <rect
                    x={plot.left}
                    y={plot.top}
                    width={Math.max(plot.right - plot.left, 0)}
                    height={Math.max(plot.bottom - plot.top, 0)}
                  />
                </clipPath>
              </defs>
              <ChartAxes layout={layout} formatX={fx} formatY={fy} />
              <g clipPath={`url(#${clipId})`}>
                {/* Bars first, then areas, then lines: the thinnest mark stays on top. */}
                {layout.bars.map((r) => (
                  <rect
                    key={`b${r.seriesIndex}-${r.index}`}
                    data-series={model.series[r.seriesIndex]?.id}
                    x={r.x}
                    y={r.y}
                    width={r.width}
                    height={r.height}
                    rx={Math.min(2, r.width / 4)}
                    className={seriesStyle(model.series[r.seriesIndex]!, r.seriesIndex).fill}
                  />
                ))}
                {layout.areas.map((a) => {
                  const style = seriesStyle(model.series[a.seriesIndex]!, a.seriesIndex);
                  return (
                    <path
                      key={`a${a.seriesIndex}`}
                      data-series={model.series[a.seriesIndex]?.id}
                      data-kind="area"
                      d={a.d}
                      fillOpacity={0.24}
                      strokeWidth={1.5}
                      strokeLinejoin="round"
                      className={cn(style.fill, style.stroke)}
                    />
                  );
                })}
                {layout.lines.map((l) => {
                  const s = model.series[l.seriesIndex]!;
                  return (
                    <path
                      key={`l${l.seriesIndex}`}
                      data-series={s.id}
                      data-kind="line"
                      d={l.d}
                      fill="none"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray={seriesDash(s, l.seriesIndex)}
                      className={seriesStyle(s, l.seriesIndex).stroke}
                    />
                  );
                })}
              </g>
              {cx !== null && focused !== null ? (
                <g aria-hidden data-chart-focus>
                  <line
                    x1={cx}
                    x2={cx}
                    y1={plot.top}
                    y2={plot.bottom}
                    className="stroke-line-strong"
                    strokeWidth={1}
                  />
                  {model.series.map((s, k) => {
                    const top = layout.tops[k]?.[focused] ?? null;
                    if (top === null || s.kind === 'bar') return null;
                    return (
                      <circle
                        key={s.id}
                        cx={cx}
                        cy={layout.y(top)}
                        r={3.5}
                        strokeWidth={2}
                        className={cn('fill-surface', seriesStyle(s, k).stroke)}
                      />
                    );
                  })}
                </g>
              ) : null}
            </svg>
            {cx !== null && focused !== null ? (
              <ChartTooltip
                context={contextAt(focused)}
                left={cx / width}
                flip={cx > width / 2}
                formatX={fx}
                formatY={fy}
                formatTooltip={formatTooltip}
              />
            ) : null}
          </>
        ) : (
          <div
            data-chart-empty
            className="flex h-full items-center justify-center text-sm text-ink-3"
          >
            {emptyState ?? labels.empty}
          </div>
        )}
      </div>

      {legend === 'bottom' ? <div className="mt-2">{legendNode}</div> : null}

      <p aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </p>

      <ChartTable
        id={tableId}
        label={label}
        model={model}
        kind={kind}
        labels={labels}
        visible={tableOpen}
        downsampledFrom={downsampled ? full.xs.length : null}
        formatX={fx}
        formatY={fy}
      />
    </div>
  );
}
