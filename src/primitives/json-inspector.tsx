'use client';

import { Check, ChevronRight, Copy, Link2 } from 'lucide-react';
import {
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { cn } from '../lib/cn';
import { Button } from './button';
import { COPIED_MS } from './code-block-copy';

/**
 * v0.38.0 wave — a collapsible viewer for JSON-like values: event payloads,
 * MCP responses, log fields. `Tree` is for navigation; this is for data.
 *
 * It is the WAI-ARIA `tree` pattern with the keyboard map `Tree` uses: arrows
 * move and expand, Home/End jump, `*` opens the siblings, Enter and Space
 * toggle. The whole viewer is **one tab stop** (roving `tabIndex`), and the
 * rows are flat — `aria-level`, `aria-setsize` and `aria-posinset` carry the
 * hierarchy, so a row never wraps its own subtree. With `copyable`, `c` copies
 * the focused row's value and `p` its path; the per-row buttons are pointer
 * affordances and stay out of the tab order.
 *
 * Paths are the dollar form: `$`, `$.items[3].id`, `$["odd key"]`. A `Map` or
 * `Set` entry is addressed by its position, `$.tags[0]`.
 *
 * **Expansion is a fact the consumer may own.** `expanded` (+
 * `onExpandedChange`) controls it; without it the viewer keeps its own set,
 * starting from `defaultExpandDepth` (the root is depth 0; default 1, so the
 * root is open and its children are collapsed). Which row has focus, how many
 * siblings are shown and which long strings are unfolded are internal — facts
 * about this render, not about the data.
 *
 * Only open containers are walked, so a large value costs what is on screen.
 * A container with more than 100 children renders the first 100 and a
 * "Show N more" row. A reference back to an ancestor renders as
 * `[Circular]` and is never followed.
 *
 * Type is told by shape and by colour: strings are quoted, `null` and
 * `undefined` are italic, numbers are `tabular-nums`, a `bigint` ends in `n`.
 * Rows are a solid surface; there is no glass here.
 */
export interface JsonInspectorLabels {
  /** The tree's accessible name. Default "JSON". */
  tree: string;
  /** Default "Copy value". */
  copyValue: string;
  /** Default "Copy path". */
  copyPath: string;
  /** Default "Copied". */
  copied: string;
  /** Unfolds a truncated string. Default "Show full string". */
  showFullString: string;
  /** Re-truncates it. Default "Show less". */
  showLessString: string;
  /** The "show more" row. Default "Show N more". */
  showMore: (count: number) => string;
  /** What a reference back to an ancestor reads as. Default "[Circular]". */
  circular: string;
}

const DEFAULT_LABELS: JsonInspectorLabels = {
  tree: 'JSON',
  copyValue: 'Copy value',
  copyPath: 'Copy path',
  copied: 'Copied',
  showFullString: 'Show full string',
  showLessString: 'Show less',
  showMore: (count) => `Show ${count} more`,
  circular: '[Circular]',
};

export type JsonInspectorProps = {
  value: unknown;
  /** Expanded paths, like `$.items[3].id`. Controlled when given. */
  expanded?: ReadonlySet<string>;
  /** Containers shallower than this start open. Default 1 (the root). */
  defaultExpandDepth?: number;
  onExpandedChange?: (expanded: ReadonlySet<string>) => void;
  rootLabel?: ReactNode;
  sortKeys?: boolean;
  /** Longer strings truncate with an expand control. Default 120. */
  maxStringLength?: number;
  /** Copy value / copy path per row. */
  copyable?: boolean;
  labels?: Partial<JsonInspectorLabels>;
  className?: string;
};

/** Children rendered per container before the "show more" row. */
const PAGE = 100;
const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

type Shape = 'object' | 'array' | 'map' | 'set';
type LeafKind =
  | 'string'
  | 'number'
  | 'bigint'
  | 'boolean'
  | 'null'
  | 'undefined'
  | 'date'
  | 'circular'
  | 'other';

type Entry = { label: string; value: unknown; path: string };

type NodeRow = {
  type: 'node';
  id: string;
  path: string;
  label: ReactNode;
  value: unknown;
  depth: number;
  setSize: number;
  pos: number;
  parentId: string | null;
  shape: Shape | null;
  count: number;
  open: boolean;
  leaf: LeafKind;
  /** The preview of a collapsed container's first children. */
  preview: string;
};

type MoreRow = {
  type: 'more';
  id: string;
  /** The container this row extends. */
  path: string;
  depth: number;
  setSize: number;
  pos: number;
  parentId: string;
  /** How many the next click reveals. */
  next: number;
};

type Row = NodeRow | MoreRow;

function shapeOf(v: unknown): Shape | null {
  if (v === null || typeof v !== 'object') return null;
  if (Array.isArray(v)) return 'array';
  if (v instanceof Map) return 'map';
  if (v instanceof Set) return 'set';
  if (v instanceof Date || v instanceof Error || v instanceof RegExp) {
    return null;
  }
  return 'object';
}

function leafKindOf(v: unknown): LeafKind {
  if (v === null) return 'null';
  switch (typeof v) {
    case 'string':
      return 'string';
    case 'number':
      return 'number';
    case 'bigint':
      return 'bigint';
    case 'boolean':
      return 'boolean';
    case 'undefined':
      return 'undefined';
    default:
      return v instanceof Date ? 'date' : 'other';
  }
}

function countOf(v: unknown, shape: Shape): number {
  if (shape === 'array') return (v as unknown[]).length;
  if (shape === 'map' || shape === 'set') {
    return (v as Map<unknown, unknown> | Set<unknown>).size;
  }
  return Object.keys(v as object).length;
}

function summaryOf(shape: Shape, count: number): string {
  if (shape === 'array') return `[${count}]`;
  if (shape === 'map') return `Map(${count})`;
  if (shape === 'set') return `Set(${count})`;
  return `{${count}}`;
}

function dateText(d: Date): string {
  return Number.isNaN(d.getTime()) ? 'Invalid Date' : d.toISOString();
}

/** A short single-line rendering of any value, for previews and Map keys. */
function brief(v: unknown): string {
  const kind = leafKindOf(v);
  if (kind === 'string') {
    const s = v as string;
    return JSON.stringify(s.length > 20 ? `${s.slice(0, 20)}…` : s);
  }
  if (kind === 'bigint') return `${String(v)}n`;
  if (kind === 'date') return dateText(v as Date);
  const shape = shapeOf(v);
  if (shape === 'array') return '[…]';
  if (shape === 'object') return '{…}';
  if (shape === 'map') return 'Map';
  if (shape === 'set') return 'Set';
  return String(v);
}

function entriesOf(
  value: unknown,
  shape: Shape,
  path: string,
  sortKeys: boolean,
): Entry[] {
  if (shape === 'array') {
    return Array.from(value as unknown[], (v, i) => ({
      label: String(i),
      value: v,
      path: `${path}[${i}]`,
    }));
  }
  if (shape === 'map') {
    return Array.from(value as Map<unknown, unknown>, ([k, v], i) => ({
      label: typeof k === 'string' ? k : brief(k),
      value: v,
      path: `${path}[${i}]`,
    }));
  }
  if (shape === 'set') {
    return Array.from(value as Set<unknown>, (v, i) => ({
      label: String(i),
      value: v,
      path: `${path}[${i}]`,
    }));
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj);
  if (sortKeys) keys.sort();
  return keys.map((k) => ({
    label: k,
    value: obj[k],
    path: IDENTIFIER.test(k) ? `${path}.${k}` : `${path}[${JSON.stringify(k)}]`,
  }));
}

function previewOf(
  value: unknown,
  shape: Shape,
  path: string,
  sortKeys: boolean,
  count: number,
): string {
  if (count === 0) return '';
  const head = entriesOf(value, shape, path, sortKeys).slice(0, 3);
  const items =
    shape === 'object' || shape === 'map'
      ? head.map((e) => e.label)
      : head.map((e) => brief(e.value));
  return `${items.join(', ')}${count > head.length ? ', …' : ''}`;
}

/** Containers shallower than `limit` — what the uncontrolled viewer starts open. */
function defaultOpenPaths(
  value: unknown,
  limit: number,
  sortKeys: boolean,
): Set<string> {
  const out = new Set<string>();
  const visit = (v: unknown, path: string, depth: number, stack: unknown[]) => {
    const shape = shapeOf(v);
    if (!shape || depth >= limit || stack.includes(v)) return;
    if (countOf(v, shape) === 0) return;
    out.add(path);
    const next = [...stack, v];
    for (const e of entriesOf(v, shape, path, sortKeys)) {
      visit(e.value, e.path, depth + 1, next);
    }
  };
  visit(value, '$', 0, []);
  return out;
}

function buildRows(
  value: unknown,
  rootLabel: ReactNode,
  isOpen: (path: string, depth: number) => boolean,
  limits: ReadonlyMap<string, number>,
  sortKeys: boolean,
): Row[] {
  const rows: Row[] = [];

  const visit = (
    v: unknown,
    label: ReactNode,
    path: string,
    depth: number,
    stack: unknown[],
    parentId: string | null,
    setSize: number,
    pos: number,
  ) => {
    const found = shapeOf(v);
    const circular = found !== null && stack.includes(v);
    const shape = circular ? null : found;
    const count = shape ? countOf(v, shape) : 0;
    const open = shape !== null && count > 0 && isOpen(path, depth - 1);
    rows.push({
      type: 'node',
      id: path,
      path,
      label,
      value: v,
      depth,
      setSize,
      pos,
      parentId,
      shape,
      count,
      open,
      leaf: circular ? 'circular' : leafKindOf(v),
      preview: shape && !open ? previewOf(v, shape, path, sortKeys, count) : '',
    });
    if (!shape || !open) return;

    const entries = entriesOf(v, shape, path, sortKeys);
    const limit = limits.get(path) ?? PAGE;
    const next = [...stack, v];
    entries.slice(0, limit).forEach((e, i) => {
      visit(
        e.value,
        e.label,
        e.path,
        depth + 1,
        next,
        path,
        entries.length,
        i + 1,
      );
    });
    if (entries.length > limit) {
      rows.push({
        type: 'more',
        id: `${path}\u0000more`,
        path,
        depth: depth + 1,
        setSize: entries.length,
        pos: limit + 1,
        parentId: path,
        next: Math.min(PAGE, entries.length - limit),
      });
    }
  };

  visit(value, rootLabel, '$', 1, [], null, 1, 1);
  return rows;
}

/** A JSON-safe copy of `v`: circular refs, bigints, dates, maps and sets included. */
function toPlain(v: unknown, stack: unknown[], circular: string): unknown {
  const shape = shapeOf(v);
  if (shape && stack.includes(v)) return circular;
  if (typeof v === 'bigint') return `${v}n`;
  if (v instanceof Date) return dateText(v);
  if (v === undefined || typeof v === 'function' || typeof v === 'symbol') {
    return String(v);
  }
  if (v instanceof Error || v instanceof RegExp) return String(v);
  if (!shape) return v;
  const next = [...stack, v];
  if (shape === 'array' || shape === 'set') {
    return Array.from(v as Iterable<unknown>, (x) =>
      toPlain(x, next, circular),
    );
  }
  if (shape === 'map') {
    return Array.from(v as Map<unknown, unknown>, ([k, x]) => [
      toPlain(k, next, circular),
      toPlain(x, next, circular),
    ]);
  }
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(v as object)) {
    out[k] = toPlain((v as Record<string, unknown>)[k], next, circular);
  }
  return out;
}

function serialize(v: unknown, circular: string): string {
  if (typeof v === 'string') return v;
  const plain = toPlain(v, [], circular);
  return typeof plain === 'string'
    ? plain
    : (JSON.stringify(plain, null, 2) ?? String(plain));
}

const LEAF_CLASS: Record<LeafKind, string> = {
  string: 'text-ok',
  number: 'text-info tabular-nums',
  bigint: 'text-info tabular-nums',
  boolean: 'text-warn',
  null: 'text-ink-3 italic',
  undefined: 'text-ink-3 italic',
  date: 'text-ink-2',
  circular: 'text-danger',
  other: 'text-ink-2',
};

export function JsonInspector({
  value,
  expanded,
  defaultExpandDepth = 1,
  onExpandedChange,
  rootLabel,
  sortKeys = false,
  maxStringLength = 120,
  copyable = false,
  labels: labelsProp,
  className,
}: JsonInspectorProps) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp };
  const uid = useId();

  const [inner, setInner] = useState<ReadonlySet<string> | null>(null);
  const [limits, setLimits] = useState<ReadonlyMap<string, number>>(
    () => new Map(),
  );
  const [unfolded, setUnfolded] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [copied, setCopied] = useState<{
    id: string;
    kind: 'value' | 'path';
  } | null>(null);

  const rowEls = useRef(new Map<string, HTMLDivElement>());
  const pendingFocus = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const current = expanded ?? inner;

  const rows = useMemo(
    () =>
      buildRows(
        value,
        rootLabel,
        (path, depth) =>
          current ? current.has(path) : depth < defaultExpandDepth,
        limits,
        sortKeys,
      ),
    [value, rootLabel, current, defaultExpandDepth, limits, sortKeys],
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  // A "show more" row that revealed its last page is gone; focus follows to
  // the first row it revealed instead of dropping to the page.
  useEffect(() => {
    const id = pendingFocus.current;
    if (!id) return;
    pendingFocus.current = null;
    rowEls.current.get(id)?.focus();
  });

  const tabStopId = rows.some((r) => r.id === focusedId)
    ? focusedId
    : (rows[0]?.id ?? null);

  const moveTo = (id: string) => {
    setFocusedId(id);
    rowEls.current.get(id)?.focus();
  };

  const commit = (next: Set<string>) => {
    if (expanded === undefined) setInner(next);
    onExpandedChange?.(next);
  };

  const base = () =>
    new Set(current ?? defaultOpenPaths(value, defaultExpandDepth, sortKeys));

  const setOpen = (path: string, open: boolean) => {
    const next = base();
    if (open) next.add(path);
    else next.delete(path);
    commit(next);
  };

  const expandSiblings = (row: Row) => {
    const next = base();
    for (const r of rows) {
      if (r.type === 'node' && r.parentId === row.parentId && r.count > 0) {
        next.add(r.path);
      }
    }
    commit(next);
  };

  const showMore = (row: MoreRow) => {
    const shown = limits.get(row.path) ?? PAGE;
    const nextLimits = new Map(limits);
    nextLimits.set(row.path, shown + row.next);
    if (row.setSize - shown - row.next <= 0) {
      // The row is about to unmount; land on the first row it revealed.
      const container = rows.find((r) => r.id === row.path);
      if (container?.type === 'node') {
        pendingFocus.current = entriesOfRow(container, shown, sortKeys);
      }
    }
    setLimits(nextLimits);
  };

  const isTruncated = (row: NodeRow) =>
    row.leaf === 'string' && (row.value as string).length > maxStringLength;

  const toggleString = (path: string) => {
    const next = new Set(unfolded);
    if (!next.delete(path)) next.add(path);
    setUnfolded(next);
  };

  const activate = (row: Row) => {
    if (row.type === 'more') showMore(row);
    else if (row.shape && row.count > 0) setOpen(row.path, !row.open);
    else if (isTruncated(row)) toggleString(row.path);
  };

  const copy = async (row: NodeRow, kind: 'value' | 'path') => {
    const text =
      kind === 'path' ? row.path : serialize(row.value, labels.circular);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return;
    }
    setCopied({ id: row.id, kind });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(null), COPIED_MS);
  };

  const onRowKeyDown = (row: Row, event: KeyboardEvent<HTMLDivElement>) => {
    // Keys from the row's own buttons belong to those buttons.
    if (event.target !== event.currentTarget || event.defaultPrevented) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    const index = rows.findIndex((r) => r.id === row.id);
    const { key } = event;
    const expandable = row.type === 'node' && row.count > 0 && row.shape;
    let handled = true;

    if (key === 'ArrowDown') {
      const next = rows[index + 1];
      if (next) moveTo(next.id);
    } else if (key === 'ArrowUp') {
      const prev = rows[index - 1];
      if (prev) moveTo(prev.id);
    } else if (key === 'ArrowRight') {
      if (row.type === 'node' && expandable) {
        if (!row.open) {
          setOpen(row.path, true);
        } else {
          const first = rows[index + 1];
          if (first && first.parentId === row.id) moveTo(first.id);
        }
      }
    } else if (key === 'ArrowLeft') {
      if (row.type === 'node' && expandable && row.open) {
        setOpen(row.path, false);
      } else if (row.parentId !== null) {
        moveTo(row.parentId);
      }
    } else if (key === 'Home') {
      if (rows[0]) moveTo(rows[0].id);
    } else if (key === 'End') {
      const last = rows[rows.length - 1];
      if (last) moveTo(last.id);
    } else if (key === 'Enter' || key === ' ') {
      activate(row);
    } else if (key === '*') {
      expandSiblings(row);
    } else if (copyable && row.type === 'node' && key === 'c') {
      void copy(row, 'value');
    } else if (copyable && row.type === 'node' && key === 'p') {
      void copy(row, 'path');
    } else {
      handled = false;
    }

    if (handled) event.preventDefault();
  };

  const onRowClick = (row: Row, event: MouseEvent<HTMLDivElement>) => {
    if ((event.target as Element).closest('button')) return;
    activate(row);
  };

  return (
    <div
      role="tree"
      aria-label={labels.tree}
      className={cn(
        'rounded-control border border-line bg-raised p-1 font-mono text-sm text-ink',
        className,
      )}
    >
      {rows.map((row, i) => {
        const indent = `calc(${row.depth - 1} * 1rem + 0.25rem)`;

        if (row.type === 'more') {
          return (
            <div
              key={row.id}
              ref={(el) => {
                if (el) rowEls.current.set(row.id, el);
                else rowEls.current.delete(row.id);
              }}
              role="treeitem"
              aria-level={row.depth}
              aria-setsize={row.setSize}
              aria-posinset={row.pos}
              tabIndex={row.id === tabStopId ? 0 : -1}
              onFocus={(event) => {
                if (event.target === event.currentTarget) setFocusedId(row.id);
              }}
              onKeyDown={(event) => onRowKeyDown(row, event)}
              onClick={(event) => onRowClick(row, event)}
              style={{ paddingInlineStart: indent }}
              className={cn(
                'flex min-h-7 cursor-pointer select-none items-center rounded-control ps-5 pe-1.5 py-0.5 text-ink-2 hover:bg-hover hover:text-ink',
                'motion-safe:transition-colors duration-(--dur-fast)',
              )}
            >
              <span className="ps-5 underline underline-offset-2">
                {labels.showMore(row.next)}
              </span>
            </div>
          );
        }

        const labelId = `${uid}-${i}`;
        const expandable = row.shape !== null && row.count > 0;
        const truncated = isTruncated(row);
        const full = unfolded.has(row.path);
        const isCopied = copied?.id === row.id ? copied.kind : null;
        const hasLabel = row.label !== undefined && row.label !== null;

        let body: ReactNode;
        if (row.shape) {
          body = (
            <>
              <span className="text-ink-2">
                {summaryOf(row.shape, row.count)}
              </span>
              {row.preview ? (
                <span className="ms-2 text-ink-3">{row.preview}</span>
              ) : null}
            </>
          );
        } else if (row.leaf === 'string') {
          const text = row.value as string;
          const shown =
            truncated && !full ? `${text.slice(0, maxStringLength)}…` : text;
          body = (
            <>
              <span className={LEAF_CLASS.string}>{`"${shown}"`}</span>
              {truncated ? (
                <button
                  type="button"
                  tabIndex={-1}
                  aria-expanded={full}
                  onClick={() => toggleString(row.path)}
                  className="ms-2 cursor-pointer text-xs text-ink-3 underline underline-offset-2 hover:text-ink"
                >
                  {full ? labels.showLessString : labels.showFullString}
                </button>
              ) : null}
            </>
          );
        } else {
          const text =
            row.leaf === 'circular'
              ? labels.circular
              : row.leaf === 'bigint'
                ? `${String(row.value)}n`
                : row.leaf === 'date'
                  ? `Date(${dateText(row.value as Date)})`
                  : String(row.value);
          body = <span className={LEAF_CLASS[row.leaf]}>{text}</span>;
        }

        return (
          <div
            key={row.id}
            ref={(el) => {
              if (el) rowEls.current.set(row.id, el);
              else rowEls.current.delete(row.id);
            }}
            role="treeitem"
            aria-labelledby={labelId}
            aria-level={row.depth}
            aria-setsize={row.setSize}
            aria-posinset={row.pos}
            aria-expanded={expandable ? row.open : undefined}
            tabIndex={row.id === tabStopId ? 0 : -1}
            onFocus={(event) => {
              if (event.target === event.currentTarget) setFocusedId(row.id);
            }}
            onKeyDown={(event) => onRowKeyDown(row, event)}
            onClick={(event) => onRowClick(row, event)}
            style={{ paddingInlineStart: indent }}
            className={cn(
              'group relative flex min-h-7 select-none items-start gap-1 rounded-control pe-1.5 py-0.5 hover:bg-hover',
              'motion-safe:transition-colors duration-(--dur-fast)',
              expandable && 'cursor-pointer',
            )}
          >
            <span
              aria-hidden="true"
              className="mt-0.5 flex size-4 shrink-0 items-center justify-center text-ink-3"
            >
              {expandable ? (
                <ChevronRight
                  className={cn(
                    'size-4 motion-safe:transition-transform duration-(--dur-fast)',
                    row.open && 'rotate-90',
                  )}
                />
              ) : null}
            </span>
            <span id={labelId} className="min-w-0 flex-1 break-words">
              {hasLabel ? (
                <>
                  <span className="text-ink-2">{row.label}</span>
                  <span className="text-ink-3">: </span>
                </>
              ) : null}
              {body}
            </span>
            {copyable ? (
              <span
                className={cn(
                  'flex shrink-0 items-center gap-0.5',
                  isCopied
                    ? 'opacity-100'
                    : 'opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100',
                )}
              >
                <CopyButton
                  label={labels.copyValue}
                  copiedLabel={labels.copied}
                  copied={isCopied === 'value'}
                  onCopy={() => copy(row, 'value')}
                />
                <CopyButton
                  label={labels.copyPath}
                  copiedLabel={labels.copied}
                  copied={isCopied === 'path'}
                  onCopy={() => copy(row, 'path')}
                  path
                />
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/** The path of the first row a "show more" reveals under `container`. */
function entriesOfRow(
  container: NodeRow,
  shown: number,
  sortKeys: boolean,
): string | null {
  if (!container.shape) return null;
  return (
    entriesOf(container.value, container.shape, container.path, sortKeys)[shown]
      ?.path ?? null
  );
}

function CopyButton({
  label,
  copiedLabel,
  copied,
  onCopy,
  path = false,
}: {
  label: string;
  copiedLabel: string;
  copied: boolean;
  onCopy: () => void;
  path?: boolean;
}) {
  const Icon = path ? Link2 : Copy;
  return (
    <Button
      variant="ghost"
      size="sm"
      icon
      tabIndex={-1}
      aria-label={copied ? copiedLabel : label}
      onClick={onCopy}
      className="size-6"
    >
      {copied ? (
        <>
          <Check aria-hidden="true" className="size-3.5" />
          <span className="sr-only">{copiedLabel}</span>
        </>
      ) : (
        <Icon aria-hidden="true" className="size-3.5" />
      )}
    </Button>
  );
}
