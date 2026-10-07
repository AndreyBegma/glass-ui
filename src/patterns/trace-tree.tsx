// biome-ignore-all lint/a11y/useSemanticElements: `table` elements cannot be `subgrid` items, and a treegrid of flat rows needs them to be; the roles say what the elements are. See the block comment below.
// biome-ignore-all lint/a11y/useFocusableInteractive: a row-focus treegrid — only `row` takes focus (roving `tabIndex`); cells, headers and rowgroups are deliberately not focusable.
'use client';

import {
  Bot,
  ChevronRight,
  Circle,
  CircleAlert,
  LoaderCircle,
  type LucideIcon,
  MessageSquare,
  Sparkles,
  Wrench,
} from 'lucide-react';
import {
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { cn } from '../lib/cn';

/**
 * FEAT-20261007-067 — the trace tree. Issue #67, decision D7.
 *
 * An agent run is a tree of spans — a turn holds model calls and tool calls,
 * a tool call may start another agent — and what a person reads off it is two
 * things at once: the nesting, and where each span sat in time. So this is the
 * WAI-ARIA `treegrid`: the rows are `Tree`'s rows, with `Tree`'s keyboard
 * contract, and the columns are the label, the caller's meta, a waterfall bar
 * and the caller's totals.
 *
 * **Row focus, not cell focus.** The APG lets a treegrid rove over cells; this
 * one roves over rows only, because none of its cells is interactive and the
 * contract a person already knows from `Tree` — Right opens, Left closes,
 * Home/End, Enter activates, one tab stop — is the one D7 asks for. Exactly one
 * `row` carries `tabIndex=0`: the last row that had focus, else the selected
 * row, else the first.
 *
 * **Flat rows, nested data.** Every visible row is a sibling in one rowgroup;
 * the indent is read off `aria-level`, as in `Tree`. Columns line up because
 * the treegrid is a CSS grid and every row is a `subgrid` of it, so an `auto`
 * meta or totals column is as wide as its widest cell across all rows.
 *
 * **The waterfall is relative to the roots.** The span runs from the earliest
 * root `start` to the latest root end. A root without an `end` ends at the
 * latest time anything under it mentions. A running node — no `end` — extends
 * to its own root's end, which is how the caller passes "now": it sets the
 * root's `end` to the current time and re-renders.
 *
 * **Colour is never the only signal.** Each kind has a token for its bar and an
 * icon with a name beside the label; an error is the danger token *and* an
 * icon *and* text. The mapping is in the README.
 *
 * **Controlled.** Expansion and selection are facts about the consumer's data,
 * the rule `Tree` follows. Children render only for ids in `expanded`; asking
 * to expand calls `onExpandedChange` with a new set and renders nothing until
 * the set comes back. Focus position is the one thing kept here.
 *
 * Not virtualized (out of scope for #67); tested at 500 visible rows.
 */
export type TraceNodeKind = 'turn' | 'llm' | 'tool' | 'agent' | 'other';

export type TraceNode = {
  /** Also used to build DOM ids — characters outside `[\w-]` are replaced. */
  id: string;
  label: ReactNode;
  kind: TraceNodeKind;
  start: number;
  /** Absent while running; extends to "now", which the caller passes via the root's `end`. */
  end?: number;
  meta?: ReactNode;
  totals?: ReactNode;
  status?: 'ok' | 'error' | 'running';
  children?: TraceNode[];
};

export type TraceTreeLabels = {
  /** The label column's header. */
  name?: string;
  /** The chevron's tooltip on a closed parent. */
  expand?: string;
  /** The chevron's tooltip on an open parent. */
  collapse?: string;
  meta?: string;
  totals?: string;
  timeline?: string;
  /** The name read beside each kind's icon. */
  kinds?: Partial<Record<TraceNodeKind, string>>;
  error?: string;
  running?: string;
};

export type TraceTreeProps = {
  nodes: TraceNode[];
  /** Controlled. The ids of the nodes whose children are shown. */
  expanded: ReadonlySet<string>;
  onExpandedChange: (expanded: ReadonlySet<string>) => void;
  /** Controlled. */
  selected?: string;
  /** Enter, Space and a click on the row. */
  onSelect?: (id: string) => void;
  /**
   * Which optional columns to draw. A column left unset is drawn when any node
   * in the tree carries that field.
   */
  columns?: { meta?: boolean; totals?: boolean };
  labels?: TraceTreeLabels;
  'aria-label'?: string;
  className?: string;
};

const DEFAULT_KINDS: Record<TraceNodeKind, string> = {
  turn: 'Turn',
  llm: 'Model call',
  tool: 'Tool call',
  agent: 'Agent',
  other: 'Span',
};

const KIND_ICON: Record<TraceNodeKind, LucideIcon> = {
  turn: MessageSquare,
  llm: Sparkles,
  tool: Wrench,
  agent: Bot,
  other: Circle,
};

/**
 * The bar's fill by kind. Tokens only. `--color-accent` exists only under
 * `data-scale="desk"`, so a tool call falls back to full ink elsewhere —
 * still distinct from a model call's `ink-2`, and the icon carries the kind
 * either way.
 */
const KIND_BAR: Record<TraceNodeKind, string> = {
  turn: 'bg-ink-3',
  llm: 'bg-ink-2',
  tool: 'bg-[var(--color-accent,var(--color-ink))]',
  agent: 'bg-ok',
  other: 'bg-line-strong',
};

/** One visible row, in document order, with what the keyboard needs to know. */
interface Row {
  node: TraceNode;
  /** 1-based, `aria-level`. */
  depth: number;
  parentId: string | null;
  /** 0-based position among its siblings. */
  index: number;
  setSize: number;
  hasChildren: boolean;
  expanded: boolean;
  /** The resolved end of the root this row descends from. */
  rootEnd: number;
}

/** The latest time a node or anything under it mentions. */
function latest(node: TraceNode): number {
  let max = node.end ?? node.start;
  for (const child of node.children ?? []) max = Math.max(max, latest(child));
  return max;
}

function rootEndOf(root: TraceNode): number {
  return root.end ?? latest(root);
}

function flatten(nodes: TraceNode[], expanded: ReadonlySet<string>): Row[] {
  const rows: Row[] = [];
  const walk = (
    list: TraceNode[],
    depth: number,
    parentId: string | null,
    rootEnd: number | null,
  ) => {
    list.forEach((node, index) => {
      const end = rootEnd ?? rootEndOf(node);
      const hasChildren = (node.children?.length ?? 0) > 0;
      const isOpen = hasChildren && expanded.has(node.id);
      rows.push({
        node,
        depth,
        parentId,
        index,
        setSize: list.length,
        hasChildren,
        expanded: isOpen,
        rootEnd: end,
      });
      if (isOpen && node.children) walk(node.children, depth + 1, node.id, end);
    });
  };
  walk(nodes, 1, null, null);
  return rows;
}

function someNode(nodes: TraceNode[], has: (node: TraceNode) => boolean): boolean {
  return nodes.some(
    (node) => has(node) || someNode(node.children ?? [], has),
  );
}

function domSafe(id: string): string {
  return id.replace(/[^\w-]/g, '_');
}

/** A fraction of the span as a CSS percentage, clamped to the track. */
function percent(value: number): string {
  const clamped = Math.min(1, Math.max(0, value));
  return `${clamped * 100}%`;
}

export function TraceTree({
  nodes,
  expanded,
  onExpandedChange,
  selected,
  onSelect,
  columns,
  labels,
  'aria-label': ariaLabel = 'Trace',
  className,
}: TraceTreeProps) {
  const uid = useId();
  const rows = useMemo(() => flatten(nodes, expanded), [nodes, expanded]);
  const rowById = useMemo(
    () => new Map(rows.map((row) => [row.node.id, row])),
    [rows],
  );

  const span = useMemo(() => {
    if (nodes.length === 0) return { start: 0, length: 0 };
    const start = Math.min(...nodes.map((n) => n.start));
    const end = Math.max(...nodes.map(rootEndOf));
    return { start, length: Math.max(0, end - start) };
  }, [nodes]);

  const showMeta = columns?.meta ?? someNode(nodes, (n) => n.meta != null);
  const showTotals =
    columns?.totals ?? someNode(nodes, (n) => n.totals != null);

  const text = {
    name: labels?.name ?? 'Name',
    expand: labels?.expand ?? 'Expand',
    collapse: labels?.collapse ?? 'Collapse',
    meta: labels?.meta ?? 'Details',
    totals: labels?.totals ?? 'Totals',
    timeline: labels?.timeline ?? 'Timeline',
    error: labels?.error ?? 'Error',
    running: labels?.running ?? 'Running',
  };
  const kindName = (kind: TraceNodeKind) =>
    labels?.kinds?.[kind] ?? DEFAULT_KINDS[kind];

  const [focusedId, setFocusedId] = useState<string | null>(null);
  const rowEls = useRef(new Map<string, HTMLDivElement>());

  const visible = (id: string | null | undefined): id is string =>
    id != null && rowById.has(id);
  const tabStopId = visible(focusedId)
    ? focusedId
    : visible(selected)
      ? selected
      : (rows[0]?.node.id ?? null);

  const moveTo = useCallback((id: string) => {
    setFocusedId(id);
    rowEls.current.get(id)?.focus();
  }, []);

  const setOpen = (id: string, open: boolean) => {
    if (open === expanded.has(id)) return;
    const next = new Set(expanded);
    if (open) next.add(id);
    else next.delete(id);
    onExpandedChange(next);
  };

  const onRowKeyDown = (row: Row, event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || event.defaultPrevented) return;

    const index = rows.findIndex((r) => r.node.id === row.node.id);
    const { key } = event;
    let handled = true;

    if (key === 'ArrowDown') {
      const next = rows[index + 1];
      if (next) moveTo(next.node.id);
    } else if (key === 'ArrowUp') {
      const prev = rows[index - 1];
      if (prev) moveTo(prev.node.id);
    } else if (key === 'ArrowRight') {
      if (!row.hasChildren) {
        // A leaf: nothing happens.
      } else if (!row.expanded) {
        setOpen(row.node.id, true);
      } else {
        const first = rows[index + 1];
        if (first && first.parentId === row.node.id) moveTo(first.node.id);
      }
    } else if (key === 'ArrowLeft') {
      if (row.hasChildren && row.expanded) {
        setOpen(row.node.id, false);
      } else if (row.parentId !== null) {
        moveTo(row.parentId);
      }
    } else if (key === 'Home') {
      const first = rows[0];
      if (first) moveTo(first.node.id);
    } else if (key === 'End') {
      const last = rows[rows.length - 1];
      if (last) moveTo(last.node.id);
    } else if (key === 'Enter' || key === ' ') {
      onSelect?.(row.node.id);
    } else if (key === '*') {
      // Open every parent among this row's siblings — the row included.
      const next = new Set(expanded);
      for (const r of rows) {
        if (r.parentId === row.parentId && r.hasChildren) next.add(r.node.id);
      }
      if (next.size !== expanded.size) onExpandedChange(next);
    } else {
      handled = false;
    }

    if (handled) event.preventDefault();
  };

  const onRowClick = (row: Row, event: MouseEvent<HTMLDivElement>) => {
    // The chevron toggles and does not select, as in `Tree`.
    if ((event.target as Element).closest('[data-trace-chevron]')) {
      setOpen(row.node.id, !row.expanded);
      moveTo(row.node.id);
      return;
    }
    moveTo(row.node.id);
    onSelect?.(row.node.id);
  };

  const template = [
    'minmax(12rem, 2fr)',
    showMeta ? 'auto' : null,
    'minmax(8rem, 3fr)',
    showTotals ? 'auto' : null,
  ]
    .filter(Boolean)
    .join(' ');

  const cellClassName = 'flex min-w-0 items-center px-2';

  const renderRow = (row: Row) => {
    const { node } = row;
    const isSelected = node.id === selected;
    const labelId = `${uid}-${domSafe(node.id)}-label`;
    const KindIcon = KIND_ICON[node.kind];
    const end = node.end ?? row.rootEnd;
    const left =
      span.length > 0 ? (node.start - span.start) / span.length : 0;
    const width =
      span.length > 0 ? (Math.max(end, node.start) - node.start) / span.length : 0;
    const running = node.status === 'running' || node.end === undefined;

    return (
      <div
        key={node.id}
        ref={(el) => {
          if (el) rowEls.current.set(node.id, el);
          else rowEls.current.delete(node.id);
        }}
        role="row"
        id={`${uid}-${domSafe(node.id)}`}
        aria-labelledby={labelId}
        aria-level={row.depth}
        aria-setsize={row.setSize}
        aria-posinset={row.index + 1}
        aria-expanded={row.hasChildren ? row.expanded : undefined}
        aria-selected={isSelected}
        tabIndex={node.id === tabStopId ? 0 : -1}
        data-kind={node.kind}
        onFocus={(event) => {
          if (event.target === event.currentTarget) setFocusedId(node.id);
        }}
        onKeyDown={(event) => onRowKeyDown(row, event)}
        onClick={(event) => onRowClick(row, event)}
        className={cn(
          // Solid, never glass (D3). `--size-row` is 32 px under desk; a
          // coarse pointer gets the full tap height whatever the density.
          'col-span-full grid min-h-(--size-row) grid-cols-subgrid select-none rounded-control text-sm pointer-coarse:min-h-(--size-tap)',
          'motion-safe:transition-colors duration-(--dur-fast)',
          isSelected
            ? 'bg-[var(--color-accent-soft,var(--color-hover))] text-ink'
            : 'text-ink-2 hover:bg-hover',
        )}
      >
        <div
          role="gridcell"
          className={cn(cellClassName, 'gap-1.5')}
          style={{ paddingInlineStart: `calc(${row.depth - 1} * 1rem + 0.25rem)` }}
        >
          <span
            data-trace-chevron={row.hasChildren ? '' : undefined}
            aria-hidden="true"
            title={
              row.hasChildren
                ? row.expanded
                  ? text.collapse
                  : text.expand
                : undefined
            }
            className={cn(
              'flex size-5 shrink-0 items-center justify-center rounded-control text-ink-3',
              row.hasChildren &&
                'hover:bg-hover hover:text-ink pointer-coarse:size-11',
            )}
          >
            {row.hasChildren ? (
              <ChevronRight
                size={14}
                className={cn(
                  'motion-safe:transition-transform duration-(--dur-fast)',
                  row.expanded && 'rotate-90',
                )}
              />
            ) : null}
          </span>
          <span
            data-trace-kind={node.kind}
            title={kindName(node.kind)}
            className="flex shrink-0 items-center text-ink-3"
          >
            <KindIcon size={14} aria-hidden="true" />
            <span className="sr-only">{kindName(node.kind)}</span>
          </span>
          <span id={labelId} className="min-w-0 flex-1 truncate">
            {node.label}
          </span>
          {node.status === 'error' ? (
            <span className="flex shrink-0 items-center text-danger">
              <CircleAlert size={14} aria-hidden="true" />
              <span className="sr-only">{text.error}</span>
            </span>
          ) : running ? (
            <span className="flex shrink-0 items-center text-ink-3">
              <LoaderCircle
                size={14}
                aria-hidden="true"
                className="motion-safe:animate-spin"
              />
              <span className="sr-only">{text.running}</span>
            </span>
          ) : null}
        </div>

        {showMeta ? (
          <div
            role="gridcell"
            className={cn(cellClassName, 'text-ink-3 tabular-nums')}
          >
            <span className="truncate">{node.meta}</span>
          </div>
        ) : null}

        <div role="gridcell" className={cellClassName}>
          <div className="relative h-2 w-full">
            <div
              data-trace-bar=""
              className={cn(
                'absolute inset-y-0 min-w-px rounded-full',
                node.status === 'error' ? 'bg-danger' : KIND_BAR[node.kind],
                running && 'motion-safe:animate-pulse',
              )}
              style={{ left: percent(left), width: percent(width) }}
            />
          </div>
        </div>

        {showTotals ? (
          <div
            role="gridcell"
            className={cn(cellClassName, 'justify-end text-ink-2 tabular-nums')}
          >
            {node.totals}
          </div>
        ) : null}
      </div>
    );
  };

  const headerClassName =
    'flex items-center px-2 text-xs font-medium text-ink-3';

  return (
    <div
      role="treegrid"
      aria-label={ariaLabel}
      aria-colcount={2 + (showMeta ? 1 : 0) + (showTotals ? 1 : 0)}
      className={cn(
        'grid gap-px rounded-surface border border-line bg-surface p-1',
        className,
      )}
      style={{ gridTemplateColumns: template }}
    >
      <div role="rowgroup" className="col-span-full grid grid-cols-subgrid">
        <div
          role="row"
          className="col-span-full grid min-h-(--size-row) grid-cols-subgrid border-b border-line"
        >
          <div role="columnheader" className={headerClassName}>
            {text.name}
          </div>
          {showMeta ? (
            <div role="columnheader" className={headerClassName}>
              {text.meta}
            </div>
          ) : null}
          <div role="columnheader" className={headerClassName}>
            {text.timeline}
          </div>
          {showTotals ? (
            <div
              role="columnheader"
              className={cn(headerClassName, 'justify-end')}
            >
              {text.totals}
            </div>
          ) : null}
        </div>
      </div>
      <div role="rowgroup" className="col-span-full grid grid-cols-subgrid gap-px">
        {rows.map(renderRow)}
      </div>
    </div>
  );
}
