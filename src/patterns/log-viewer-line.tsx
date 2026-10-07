import { CircleAlert, TriangleAlert } from 'lucide-react';
import { Fragment, memo, type ReactNode } from 'react';
import { type AnsiSegment, ansiClassName, parseAnsi } from '../lib/ansi';
import { cn } from '../lib/cn';
import type { LogLine } from './log-viewer';

/**
 * FEAT-20260930-070 — one `LogViewer` line: the gutter, the number and the
 * ANSI runs, with search matches cut across them.
 *
 * Parsing is cached per `LogLine` object. Lines are append-only by convention,
 * so a stream of 50 000 parses each line once — for the window, for search and
 * for copy alike — and the cache goes when the consumer drops the line.
 */
type Parsed = { text: string; segments: AnsiSegment[]; plain: string };

const cache = new WeakMap<LogLine, Parsed>();

function parsed(line: LogLine): Parsed {
  const hit = cache.get(line);
  if (hit && hit.text === line.text) return hit;
  const segments = parseAnsi(line.text);
  const entry = { text: line.text, segments, plain: segments.map((s) => s.text).join('') };
  cache.set(line, entry);
  return entry;
}

/** The line as a person reads it: ANSI stripped. Search offsets index this. */
export function plainText(line: LogLine): string {
  return parsed(line).plain;
}

/** A search match on one line, in `plainText` offsets. */
export type MatchRange = { start: number; end: number; current: boolean };

const MARK = 'rounded-[2px] bg-warn/30 text-inherit';
const MARK_CURRENT = 'bg-warn/70';

/** The runs, each sliced at match boundaries so a match may span two colours. */
function renderSegments(segments: AnsiSegment[], ranges: MatchRange[]): ReactNode[] {
  const out: ReactNode[] = [];
  let pos = 0;
  let r = 0;
  segments.forEach((segment, index) => {
    const end = pos + segment.text.length;
    const parts: ReactNode[] = [];
    let at = pos;
    while (at < end) {
      while (r < ranges.length && ranges[r].end <= at) r++;
      const range = ranges[r];
      if (range && range.start <= at) {
        const stop = Math.min(end, range.end);
        parts.push(
          <mark
            key={at}
            data-current={range.current || undefined}
            className={cn(MARK, range.current && MARK_CURRENT)}
          >
            {segment.text.slice(at - pos, stop - pos)}
          </mark>,
        );
        at = stop;
      } else {
        const stop = Math.min(end, range ? range.start : end);
        parts.push(segment.text.slice(at - pos, stop - pos));
        at = stop;
      }
    }
    const className = ansiClassName(segment.style);
    out.push(
      className ? (
        // biome-ignore lint/suspicious/noArrayIndexKey: runs have no identity beyond their order
        <span key={index} className={className}>
          {parts}
        </span>
      ) : (
        // biome-ignore lint/suspicious/noArrayIndexKey: runs have no identity beyond their order
        <Fragment key={index}>{parts}</Fragment>
      ),
    );
    pos = end;
  });
  return out;
}

const LEVEL_ICON = {
  error: { Icon: CircleAlert, className: 'text-danger', name: 'Error' },
  warn: { Icon: TriangleAlert, className: 'text-warn', name: 'Warning' },
} as const;

type LogViewerRowProps = {
  line: LogLine;
  /** The line's index in the consumer's array; the number shown is one more. */
  index: number;
  lineHeight: number;
  wrap: boolean;
  /** Width of the number column, in `ch`; 0 hides it. */
  numberWidth: number;
  ranges: MatchRange[];
};

/**
 * The gutter mark is the signal that does not depend on colour: an icon with
 * an accessible name for `error` and `warn`, so a red line is never the only
 * thing that says "error". It is an `aria-label`, not hidden text, so a
 * selection copied out of the log does not pick up the word.
 */
export const LogViewerRow = memo(function LogViewerRow({
  line,
  index,
  lineHeight,
  wrap,
  numberWidth,
  ranges,
}: LogViewerRowProps) {
  const level = line.level === 'error' || line.level === 'warn' ? LEVEL_ICON[line.level] : null;
  return (
    <div
      data-line-index={index}
      data-level={line.level}
      className={cn(
        'flex',
        line.level === 'error' && 'bg-danger/8',
        line.level === 'warn' && 'bg-warn/8',
        line.level === 'debug' && 'text-ink-3',
      )}
      style={wrap ? { minHeight: lineHeight, lineHeight: `${lineHeight}px` } : { height: lineHeight, lineHeight: `${lineHeight}px` }}
    >
      <span className="flex w-6 shrink-0 select-none items-center justify-center" style={{ height: lineHeight }}>
        {level ? (
          <level.Icon role="img" aria-label={level.name} className={cn('size-3.5', level.className)} />
        ) : null}
      </span>
      {numberWidth > 0 ? (
        <span
          data-line-number=""
          className="shrink-0 select-none pr-3 text-right text-ink-3"
          style={{ width: `${numberWidth + 1}ch` }}
        >
          {index + 1}
        </span>
      ) : null}
      <span
        className={cn(
          'pr-3',
          wrap ? 'min-w-0 flex-1 whitespace-pre-wrap [overflow-wrap:anywhere]' : 'whitespace-pre',
        )}
      >
        {renderSegments(parsed(line).segments, ranges)}
      </span>
    </div>
  );
});
