'use client';

import { Check, Copy } from 'lucide-react';
import { Fragment, type ReactNode, useId, useMemo, useState } from 'react';
import { tv } from 'tailwind-variants';
import { useBreakpoint } from '../hooks/use-breakpoint';
import { cn } from '../lib/cn';
import { Button } from '../primitives/button';
import { useCopy } from '../primitives/code-block-copy';
import {
  SegmentedControl,
  SegmentedControlItem,
} from '../primitives/segmented-control';
import {
  buildDiff,
  type DiffGap,
  type DiffLine,
  expandRows,
  splitRows,
} from './diff-view-model';

/**
 * #176 — DiffView: a line diff of two texts, or a rendered unified patch, on a
 * solid surface. Exported only from `glass-ui/diff-view`, never the barrel: it
 * imports the optional peer `diff` (through `diff-view-model.ts`).
 *
 * Two modes, `unified` and `split`, controllable (`mode` + `onModeChange`) or
 * uncontrolled (`defaultMode`). Below the tablet edge there is no room for two
 * columns, so it renders unified and the switch is hidden; the mode itself is
 * kept and comes back on a wider viewport.
 *
 * An added or removed line is tinted from `ok` / `danger` *and* carries its
 * `+` / `−` sign, so colour is never the only signal; a modified pair also
 * emphasises the words that changed. Long unchanged runs fold into a button
 * that expands in place — which runs are open is view state, like focus, and
 * stays internal. A run between two hunks of a `patch` has no content to show,
 * so it is a plain row with its count.
 *
 * The rows are a `<table>` (APG Table). The gutters and signs are hidden from
 * assistive technology; each line cell starts with a visually hidden prefix,
 * so a screen reader hears "added line 12: …", "removed line 9: …".
 */
export interface DiffViewLabels {
  noChanges: string;
  unified: string;
  split: string;
  /** The mode switch's accessible name. */
  viewMode: string;
  copy: string;
  copied: string;
  /** The table's accessible name. */
  table: string;
  unchangedLines: (count: number) => string;
  added: (line: number) => string;
  removed: (line: number) => string;
  unchanged: (line: number) => string;
  /** Spoken in place of the visible `+a −d`. */
  counts: (additions: number, deletions: number) => string;
}

const DEFAULT_LABELS: DiffViewLabels = {
  noChanges: 'No changes',
  unified: 'Unified',
  split: 'Split',
  viewMode: 'Diff layout',
  copy: 'Copy new text',
  copied: 'Copied',
  table: 'Diff',
  unchangedLines: (count) =>
    `${count} unchanged ${count === 1 ? 'line' : 'lines'}`,
  added: (line) => `added line ${line}: `,
  removed: (line) => `removed line ${line}: `,
  unchanged: (line) => `line ${line}: `,
  counts: (a, d) =>
    `${a} ${a === 1 ? 'addition' : 'additions'}, ${d} ${d === 1 ? 'deletion' : 'deletions'}`,
};

export type DiffViewMode = 'unified' | 'split';

export type DiffViewProps = {
  oldText: string;
  newText: string;
  /** A unified diff; when given, `oldText` / `newText` are ignored. */
  patch?: string;
  mode?: DiffViewMode;
  defaultMode?: DiffViewMode;
  onModeChange?: (mode: DiffViewMode) => void;
  fileName?: ReactNode;
  /** Header label only, no highlighting. */
  language?: string;
  /** Unchanged lines kept around a hunk. Default 3. */
  context?: number;
  wrap?: boolean;
  maxHeight?: number;
  labels?: Partial<DiffViewLabels>;
  className?: string;
};

const lineCell = tv({
  base: 'px-2 align-top',
  variants: {
    kind: {
      add: 'bg-ok/10',
      del: 'bg-danger/10',
      context: '',
      filler: 'bg-surface',
    },
  },
});

const gutterCell = tv({
  base: 'w-px select-none px-2 text-right align-top tabular-nums text-ink-3',
  variants: {
    kind: {
      add: 'bg-ok/14',
      del: 'bg-danger/14',
      context: '',
      filler: 'bg-surface',
    },
  },
});

const word = tv({
  variants: {
    kind: {
      add: 'rounded-sm bg-ok/30',
      del: 'rounded-sm bg-danger/30',
      context: '',
    },
  },
});

const SIGN = { add: '+', del: '−', context: ' ' } as const;

function prefix(line: DiffLine, labels: DiffViewLabels) {
  if (line.kind === 'add') return labels.added(line.newNo ?? 0);
  if (line.kind === 'del') return labels.removed(line.oldNo ?? 0);
  return labels.unchanged(line.newNo ?? 0);
}

function LineText({ line, labels }: { line: DiffLine; labels: DiffViewLabels }) {
  return (
    <>
      <span className="sr-only">{prefix(line, labels)}</span>
      {line.words
        ? line.words.map((part, i) =>
            part.changed ? (
              // biome-ignore lint/suspicious/noArrayIndexKey: the parts are a fixed split of one line
              <mark key={i} className={cn('text-ink', word({ kind: line.kind }))}>
                {part.text}
              </mark>
            ) : (
              // biome-ignore lint/suspicious/noArrayIndexKey: the parts are a fixed split of one line
              <Fragment key={i}>{part.text}</Fragment>
            ),
          )
        : line.text}
    </>
  );
}

/** Gutter, sign and text for one side of a line; a `null` line is a filler. */
function Side({
  line,
  number,
  labels,
  echo = false,
}: {
  line: DiffLine | null;
  number: 'oldNo' | 'newNo';
  labels: DiffViewLabels;
  /** The right half of an unchanged pair: already read from the left. */
  echo?: boolean;
}) {
  if (!line) {
    return (
      <>
        <td aria-hidden="true" className={gutterCell({ kind: 'filler' })} />
        <td aria-hidden="true" className={gutterCell({ kind: 'filler' })} />
        <td data-filler="" className={lineCell({ kind: 'filler' })} />
      </>
    );
  }
  return (
    <>
      <td aria-hidden="true" className={gutterCell({ kind: line.kind })}>
        {line[number]}
      </td>
      <td aria-hidden="true" className={gutterCell({ kind: line.kind, className: 'px-1' })}>
        {SIGN[line.kind]}
      </td>
      <td
        data-kind={line.kind}
        aria-hidden={echo || undefined}
        className={lineCell({ kind: line.kind })}
      >
        <LineText line={line} labels={labels} />
      </td>
    </>
  );
}

function GapRow({
  gap,
  span,
  labels,
  onExpand,
}: {
  gap: DiffGap;
  span: number;
  labels: DiffViewLabels;
  onExpand: (id: string) => void;
}) {
  const text = labels.unchangedLines(gap.count);
  return (
    <tr data-gap="">
      <td colSpan={span} className="border-y border-line bg-surface px-2 py-0.5 font-sans text-xs text-ink-3">
        {gap.lines ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onExpand(gap.id)}
            className="h-7"
          >
            {text}
          </Button>
        ) : (
          <span className="inline-block px-3 py-1">{text}</span>
        )}
      </td>
    </tr>
  );
}

export function DiffView({
  oldText,
  newText,
  patch,
  mode: modeProp,
  defaultMode = 'unified',
  onModeChange,
  fileName,
  language,
  context = 3,
  wrap = false,
  maxHeight,
  labels: labelsProp,
  className,
}: DiffViewProps) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp };
  const [innerMode, setInnerMode] = useState(defaultMode);
  const mode = modeProp ?? innerMode;
  const narrow = useBreakpoint() === 'phone';
  const shown: DiffViewMode = narrow ? 'unified' : mode;
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const layoutId = useId();

  const model = useMemo(
    () =>
      buildDiff(
        patch !== undefined ? { patch } : { oldText, newText },
        context,
      ),
    [patch, oldText, newText, context],
  );
  const rows = useMemo(
    () => expandRows(model.rows, expanded),
    [model.rows, expanded],
  );
  // With a patch there is no new text to copy, so the button copies nothing.
  const { copied, copy } = useCopy(patch !== undefined ? '' : newText);

  const choose = (next: DiffViewMode) => {
    if (next === mode) return;
    if (modeProp === undefined) setInnerMode(next);
    onModeChange?.(next);
  };
  const expand = (id: string) =>
    setExpanded((prev) => new Set(prev).add(id));

  const span = shown === 'split' ? 6 : 4;

  return (
    <div
      className={cn(
        'overflow-hidden rounded-surface border border-line bg-raised text-sm text-ink',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line px-3 py-1.5">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {fileName ? (
            <span className="truncate font-mono text-xs text-ink">{fileName}</span>
          ) : null}
          {language ? (
            <span className="shrink-0 text-xs text-ink-3">{language}</span>
          ) : null}
          {model.empty ? null : (
            <span className="shrink-0 text-xs tabular-nums">
              <span aria-hidden="true">
                <span className="text-ok">+{model.additions}</span>{' '}
                <span className="text-danger">−{model.deletions}</span>
              </span>
              <span className="sr-only">
                {labels.counts(model.additions, model.deletions)}
              </span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {narrow ? null : (
            <SegmentedControl
              aria-label={labels.viewMode}
              variant="on-glass"
              size="sm"
            >
              {(['unified', 'split'] as const).map((m) => (
                <SegmentedControlItem key={m} active={mode === m} layoutId={layoutId}>
                  <button
                    type="button"
                    aria-pressed={mode === m}
                    onClick={() => choose(m)}
                    className="relative z-1 w-full rounded-control px-3 text-xs"
                  >
                    {m === 'unified' ? labels.unified : labels.split}
                  </button>
                </SegmentedControlItem>
              ))}
            </SegmentedControl>
          )}
          {patch === undefined ? (
            <Button
              variant="ghost"
              size="sm"
              icon
              aria-label={copied ? labels.copied : labels.copy}
              onClick={copy}
              className="size-7"
            >
              {copied ? (
                <>
                  <Check aria-hidden="true" className="size-4" />
                  <span className="sr-only">{labels.copied}</span>
                </>
              ) : (
                <Copy aria-hidden="true" className="size-4" />
              )}
            </Button>
          ) : null}
        </div>
      </div>
      {model.empty ? (
        <p className="m-0 px-3 py-6 text-center text-ink-3">{labels.noChanges}</p>
      ) : (
        <div
          // biome-ignore lint/a11y/noNoninteractiveTabindex: a scroll region must be keyboard-reachable
          tabIndex={0}
          style={{ maxHeight }}
          className="overflow-auto"
        >
          <table
            aria-label={labels.table}
            data-mode={shown}
            className={cn(
              'w-full border-collapse font-mono text-xs leading-5',
              shown === 'split' && 'table-fixed',
              wrap
                ? '[&_td]:whitespace-pre-wrap [&_td]:[overflow-wrap:anywhere]'
                : '[&_td]:whitespace-pre',
            )}
          >
            {shown === 'split' ? (
              <colgroup>
                <col className="w-12" />
                <col className="w-5" />
                <col />
                <col className="w-12" />
                <col className="w-5" />
                <col />
              </colgroup>
            ) : null}
            <tbody>
              {shown === 'unified'
                ? rows.map((row, i) =>
                    row.type === 'gap' ? (
                      <GapRow
                        key={row.id}
                        gap={row}
                        span={span}
                        labels={labels}
                        onExpand={expand}
                      />
                    ) : (
                      // biome-ignore lint/suspicious/noArrayIndexKey: rows have no identity beyond their place
                      <tr key={i} data-kind={row.line.kind}>
                        <td aria-hidden="true" className={gutterCell({ kind: row.line.kind })}>
                          {row.line.oldNo}
                        </td>
                        <Side line={row.line} number="newNo" labels={labels} />
                      </tr>
                    ),
                  )
                : splitRows(rows).map((row, i) =>
                    row.type === 'gap' ? (
                      <GapRow
                        key={row.id}
                        gap={row}
                        span={span}
                        labels={labels}
                        onExpand={expand}
                      />
                    ) : (
                      // biome-ignore lint/suspicious/noArrayIndexKey: rows have no identity beyond their place
                      <tr key={i}>
                        <Side line={row.left} number="oldNo" labels={labels} />
                        <Side
                          line={row.right}
                          number="newNo"
                          labels={labels}
                          echo={row.left === row.right}
                        />
                      </tr>
                    ),
                  )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
