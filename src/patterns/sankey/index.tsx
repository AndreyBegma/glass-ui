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
import { collapse } from './collapse';
import { DEFAULT_LABELS, defaultValueFormat } from './format';
import { type LayoutNode, layoutSankey } from './layout';
import { type ModelNode, normalize } from './normalize';
import { type Active, pathOf } from './path';
import { SankeyTable } from './table';
import { TONE } from './tone';
import { SankeyTooltip } from './tooltip';
import type { SankeyNodeInfo, SankeyProps } from './types';

export type {
  SankeyColumn,
  SankeyLabels,
  SankeyLink,
  SankeyNode,
  SankeyNodeInfo,
  SankeyProps,
  SankeyTone,
} from './types';

/**
 * #94 — Sankey: a flow through named columns, left to right, on hand-rolled
 * SVG with no dependency (approved on #94, as `Chart` is). A link is as wide
 * as its value; a node is a card of one size that prints its value.
 *
 * The parts live beside this file, one each: `normalize` (the one model, and
 * what cannot be drawn), `collapse` ("+N more"), `layout` (the geometry,
 * pure), `path` (what hovering lights), `tone`, `tooltip` and `table`. This
 * file only measures, holds what is active, and maps the layout onto elements.
 *
 * Accessibility. The graph is a `figure` named by `label` plus a summary and
 * described by a sentence that says how it reads and that a table follows.
 * Every link is an `img` with its own name ("Main agent to Explore, 45"), and
 * every node is a button (with `onNodeClick`) or a focusable `img` named
 * "Explore, Subagent types, 45". The nodes are one tab stop: ↑/↓ move within
 * a column, ←/→ to the nearest node of the next column, Home/End to the
 * ends, Escape lets go. Focus does what hover does. The table holds every
 * link before "+N more" folding, visually hidden until "Show table".
 *
 * Colour is never the only signal: every node is named, and the tones only
 * repeat what the name says ("Completed", "Error"). The graph is a solid
 * surface, never glass; only the readout wears the popover material.
 */

/** Before the first measurement — on the server, and in a headless DOM. */
const DEFAULT_WIDTH = 960;

type Arrow = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight' | 'Home' | 'End';

/** The node an arrow key moves to from `from`, or `null` at an edge. */
function neighbour(nodes: LayoutNode[], from: LayoutNode, key: Arrow): LayoutNode | null {
  if (key === 'Home') return nodes[0] ?? null;
  if (key === 'End') return nodes.at(-1) ?? null;
  const column = nodes.filter((n) => n.column === from.column);
  const at = column.indexOf(from);
  if (key === 'ArrowUp') return column[at - 1] ?? null;
  if (key === 'ArrowDown') return column[at + 1] ?? null;
  // Left and right skip a column with no node, and land on the nearest card.
  const ahead = nodes.filter((n) =>
    key === 'ArrowRight' ? n.column > from.column : n.column < from.column,
  );
  if (ahead.length === 0) return null;
  const next =
    key === 'ArrowRight'
      ? Math.min(...ahead.map((n) => n.column))
      : Math.max(...ahead.map((n) => n.column));
  const mid = (n: LayoutNode) => n.y + n.height / 2;
  return ahead
    .filter((n) => n.column === next)
    .reduce((best, n) => (Math.abs(mid(n) - mid(from)) < Math.abs(mid(best) - mid(from)) ? n : best));
}

export function Sankey({
  label,
  columns,
  nodes,
  links,
  valueFormat = defaultValueFormat,
  onNodeClick,
  maxPerColumn = 8,
  height,
  emptyState,
  showTable,
  onShowTableChange,
  labels: labelOverrides,
  className,
}: SankeyProps) {
  const labels = { ...DEFAULT_LABELS, ...labelOverrides };
  const id = useId();
  const tableId = `${id}-table`;
  const descriptionId = `${id}-description`;
  const boxRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef(new Map<string, HTMLElement>());
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [ownTable, setOwnTable] = useState(false);
  const [active, setActive] = useState<Active>(null);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [current, setCurrent] = useState<string | null>(null);

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

  const { more } = labels;
  const full = useMemo(() => normalize(columns, nodes, links), [columns, nodes, links]);
  const model = useMemo(() => collapse(full, maxPerColumn, more), [full, maxPerColumn, more]);
  const layout = useMemo(() => layoutSankey(model, { width, height }), [model, width, height]);
  const path = useMemo(() => pathOf(active, model.links), [active, model.links]);

  const tableOpen = showTable ?? ownTable;
  const toggleTable = () => {
    const next = !tableOpen;
    if (showTable === undefined) setOwnTable(next);
    onShowTableChange?.(next);
  };

  const byId = useMemo(() => new Map(layout.nodes.map((n) => [n.id, n])), [layout.nodes]);
  // The one tab stop: the node last focused, while it still exists, else the first.
  const stop = current !== null && byId.has(current) ? current : (layout.nodes[0]?.id ?? null);
  const columnLabel = (n: ModelNode) => model.columns[n.column]?.label ?? '';
  const info = (n: ModelNode): SankeyNodeInfo => ({
    id: n.id,
    label: n.label,
    column: model.columns[n.column]?.id ?? '',
    tone: n.tone,
    value: n.value,
    collapsed: n.collapsed,
  });

  const onNodeKeyDown = (e: KeyboardEvent<HTMLElement>, from: LayoutNode) => {
    if (e.key === 'Escape') {
      setActive(null);
      return;
    }
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const to = neighbour(layout.nodes, from, e.key as Arrow);
    if (to) nodeRefs.current.get(to.id)?.focus();
  };

  // One handler on the SVG rather than one per link: the link under the pointer
  // is the hit path the event came from.
  const onLinkPointer = (e: PointerEvent<SVGSVGElement>) => {
    const key = (e.target as Element).getAttribute('data-sankey-link');
    if (key === null) {
      if (active?.kind === 'link') setActive(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    if (active?.kind !== 'link' || active.key !== key) setActive({ kind: 'link', key });
    setPointer({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const summary = labels.summary(model.columns.length, full.nodes.length, full.links.length);
  const description = labels.description(model.columns.map((c) => c.label));

  const tooltip = (() => {
    if (active?.kind === 'node') {
      const n = byId.get(active.id);
      if (!n) return null;
      const flip = n.x + n.width / 2 > layout.width / 2;
      return (
        <SankeyTooltip
          title={n.label}
          detail={columnLabel(n)}
          value={valueFormat(n.value)}
          left={flip ? n.x : n.x + n.width}
          top={n.y + n.height / 2}
          flip={flip}
        />
      );
    }
    if (active?.kind === 'link' && pointer) {
      const l = layout.links.find((k) => k.key === active.key);
      if (!l) return null;
      return (
        <SankeyTooltip
          title={`${byId.get(l.source)?.label ?? ''} → ${byId.get(l.target)?.label ?? ''}`}
          value={valueFormat(l.value)}
          left={pointer.x}
          top={pointer.y}
          flip={pointer.x > layout.width / 2}
        />
      );
    }
    return null;
  })();

  const lit = (on: boolean) => (path === null ? undefined : on ? 'lit' : 'dim');

  return (
    <div
      data-sankey
      className={cn('w-full rounded-(--radius-surface) bg-surface p-3 text-ink', className)}
    >
      <div className="mb-1 flex items-center justify-end">
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

      <div ref={boxRef} className="w-full overflow-x-auto">
        {layout.nodes.length > 0 ? (
          <figure
            aria-label={`${label}. ${summary}`}
            aria-describedby={descriptionId}
            className="relative m-0"
            style={{ width: layout.width, height: layout.height }}
          >
            <p id={descriptionId} className="sr-only">
              {description}
            </p>

            {layout.columns.map((c) => (
              <div
                key={c.id}
                aria-hidden
                data-sankey-column={c.id}
                style={{ left: c.x, width: layout.nodeWidth }}
                className="absolute top-2 -translate-x-1/2 truncate text-center font-medium text-[11px] text-ink-3 uppercase tracking-wider"
              >
                {c.label}
              </div>
            ))}

            {/* biome-ignore lint/a11y/noSvgWithoutTitle: a container, not a picture — each link inside is its own named img, and the figure names the whole */}
            <svg
              width={layout.width}
              height={layout.height}
              viewBox={`0 0 ${layout.width} ${layout.height}`}
              className="absolute inset-0 block overflow-visible"
              onPointerOver={onLinkPointer}
              onPointerMove={onLinkPointer}
              onPointerLeave={() => {
                setActive(null);
                setPointer(null);
              }}
            >
              {layout.links.map((l) => {
                const state = lit(path?.links.has(l.key) ?? false);
                return (
                  // biome-ignore lint/a11y/noInteractiveElementToNoninteractiveRole: an SVG `g` has no interactive role to lose; the rule reads it as one
                  <g
                    key={l.key}
                    role="img"
                    aria-label={labels.link(
                      byId.get(l.source)?.label ?? l.source,
                      byId.get(l.target)?.label ?? l.target,
                      valueFormat(l.value),
                    )}
                  >
                    <path
                      data-sankey-link={l.key}
                      data-state={state}
                      d={l.d}
                      fill="none"
                      // A thin link is hard to point at: the hit area is never under 8px.
                      stroke="transparent"
                      strokeWidth={Math.max(l.width, 8)}
                    />
                  </g>
                );
              })}
              <g aria-hidden className="pointer-events-none">
                {layout.links.map((l) => {
                  const state = lit(path?.links.has(l.key) ?? false);
                  return (
                    <path
                      key={l.key}
                      d={l.d}
                      fill="none"
                      strokeWidth={l.width}
                      strokeOpacity={state === 'lit' ? 0.75 : state === 'dim' ? 0.08 : 0.35}
                      className="stroke-accent motion-safe:transition-[stroke-opacity] motion-safe:duration-150"
                    />
                  );
                })}
              </g>
            </svg>

            {layout.nodes.map((n) => {
              const state = lit(path?.nodes.has(n.id) ?? false);
              const tone = TONE[n.tone];
              const name = labels.node(n.label, columnLabel(n), valueFormat(n.value));
              const shared = {
                ref: (el: HTMLElement | null) => {
                  if (el) nodeRefs.current.set(n.id, el);
                  else nodeRefs.current.delete(n.id);
                },
                'aria-label': name,
                'data-sankey-node': n.id,
                'data-state': state,
                tabIndex: n.id === stop ? 0 : -1,
                style: { left: n.x, top: n.y, width: n.width, height: n.height },
                className: cn(
                  'absolute flex items-center gap-2 rounded-control border px-2.5 text-left text-ink text-xs',
                  'motion-safe:transition-opacity motion-safe:duration-150',
                  tone.card,
                  state === 'dim' && 'opacity-40',
                  onNodeClick && 'cursor-pointer hover:brightness-110',
                ),
                onPointerEnter: () => setActive({ kind: 'node', id: n.id }),
                onPointerLeave: () => setActive(null),
                onFocus: () => {
                  setCurrent(n.id);
                  setActive({ kind: 'node', id: n.id });
                },
                onBlur: () => setActive(null),
                onKeyDown: (e: KeyboardEvent<HTMLElement>) => onNodeKeyDown(e, n),
              };
              const content = (
                <>
                  <span className="min-w-0 flex-1 truncate">{n.label}</span>
                  <span
                    aria-hidden
                    className={cn(
                      'shrink-0 rounded-full px-1.5 py-0.5 font-medium text-[10px] tabular-nums leading-none',
                      tone.badge,
                    )}
                  >
                    {valueFormat(n.value)}
                  </span>
                </>
              );
              return onNodeClick ? (
                <button key={n.id} type="button" {...shared} onClick={() => onNodeClick(info(n))}>
                  {content}
                </button>
              ) : (
                // Focusable without being a button: the arrow keys move between
                // nodes, and focus shows the readout that hover shows.
                <div key={n.id} role="img" {...shared}>
                  {content}
                </div>
              );
            })}

            {tooltip}
          </figure>
        ) : (
          <div
            data-sankey-empty
            style={{ height: height ?? 160 }}
            className="flex items-center justify-center text-sm text-ink-3"
          >
            {emptyState ?? labels.empty}
          </div>
        )}
      </div>

      <SankeyTable
        id={tableId}
        label={label}
        model={full}
        labels={labels}
        visible={tableOpen}
        valueFormat={valueFormat}
      />
    </div>
  );
}
