'use client';

import { Check, ChevronDown, ChevronUp, Copy, WrapText } from 'lucide-react';
import {
  type KeyboardEvent,
  type ReactNode,
  type UIEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { cn } from '../lib/cn';
import { Button } from '../primitives/button';
import { SearchField } from '../primitives/field';
import { prefersReducedMotion, useLogCopy, useLogSearch } from './log-viewer-hooks';
import { LogViewerRow, type MatchRange } from './log-viewer-line';

/**
 * FEAT-20260930-070 — LogViewer: the lines a worker prints, as they arrive.
 *
 * **The consumer owns the stream; the viewer owns the view (D4).** `lines` is
 * append-only by convention. What the component keeps is follow mode, the
 * scroll position, the search cursor, and wrap when it is uncontrolled.
 *
 * **Windowing is hand-rolled and fixed-height (D6)**, like `DataTable`'s:
 * every line is exactly `lineHeight` pixels, so the window is arithmetic over
 * `scrollTop` between two spacers. With `wrap` on, heights vary and the window
 * is off; the lines kept are capped at 5 000 instead of `maxLines` (20 000),
 * and anything older is one "N earlier lines hidden" row.
 *
 * **Follow-tail (D7).** Following, the window is computed from the bottom and
 * a layout effect pins `scrollTop` there before paint, so an append never shows
 * a frame of the old position. A scroll more than one line above the bottom —
 * or a wheel or key that heads up — pauses; scrolling back down, `End` or the
 * "Jump to latest" pill resume. While paused, appends do not move the viewport:
 * when retention trims lines off the top, `scrollTop` is moved back by exactly
 * the rows that left (wrap leaves that to the browser's scroll anchoring).
 *
 * **ARIA.** The scroll region is `role="log"` with `aria-live="off"` — a
 * stream would otherwise read every line aloud — and the pill sits in a
 * `aria-live="polite"` region, which is the one announcement worth making.
 *
 * **Search (D8)** is a case-insensitive substring over the ANSI-stripped text
 * of every kept line, counted in occurrences. **Copy (D12)** takes the
 * selection inside the log, or every line of `lines` stripped, with an inline
 * "Copied" and no `toast`.
 */
export type LogLine = {
  id: string | number;
  text: string;
  level?: 'info' | 'warn' | 'error' | 'debug';
  ts?: string;
};

/** Every string the viewer renders. English by default. */
export type LogViewerLabels = {
  newLines: (count: number) => string;
  jumpToLatest: string;
  earlierHidden: (count: number) => string;
  copy: string;
  copied: string;
  wrap: string;
  search: string;
  previousMatch: string;
  nextMatch: string;
  /** Shown when `lines` is empty and no `emptyState` is given. */
  empty: string;
};

export type LogViewerProps = {
  /** Append-only by convention; the consumer owns the stream. */
  lines: LogLine[];
  follow?: boolean;
  onFollowChange?: (follow: boolean) => void;
  wrap?: boolean;
  defaultWrap?: boolean;
  onWrapChange?: (wrap: boolean) => void;
  query?: string;
  onQueryChange?: (query: string) => void;
  /** Default 20 000 unwrapped; 5 000 when `wrap` is on. */
  maxLines?: number;
  /** Fixed line height in px, for virtualization. */
  lineHeight?: number;
  showLineNumbers?: boolean;
  emptyState?: ReactNode;
  /** Extra actions beside the wrap toggle, copy and search. */
  toolbar?: ReactNode;
  /** Accessible name of the log region. */
  label: string;
  labels?: Partial<LogViewerLabels>;
  className?: string;
};

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

const DEFAULT_LABELS: LogViewerLabels = {
  newLines: (count) => plural(count, 'new line'),
  jumpToLatest: 'Jump to latest',
  earlierHidden: (count) => `${plural(count, 'earlier line')} hidden`,
  copy: 'Copy',
  copied: 'Copied',
  wrap: 'Wrap lines',
  search: 'Search log',
  previousMatch: 'Previous match',
  nextMatch: 'Next match',
  empty: 'No output yet',
};

const LINE_HEIGHT = 20;
const OVERSCAN = 10;
const MAX_LINES = 20_000;
const WRAP_MAX_LINES = 5_000;
/** The viewport before it is measured — and always, in a DOM without layout. */
const VIEWPORT_FALLBACK = 400;
/** A smooth jump that never reports landing is given up after this. */
const JUMP_MS = 600;

const NO_RANGES: MatchRange[] = [];

export function LogViewer({
  lines,
  follow: followProp,
  onFollowChange,
  wrap: wrapProp,
  defaultWrap = false,
  onWrapChange,
  query: queryProp,
  onQueryChange,
  maxLines,
  lineHeight = LINE_HEIGHT,
  showLineNumbers = false,
  emptyState,
  toolbar,
  label,
  labels: labelsProp,
  className,
}: LogViewerProps) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp };
  const scrollRef = useRef<HTMLDivElement>(null);

  const [followState, setFollowState] = useState(true);
  const follow = followProp ?? followState;
  const setFollow = useCallback(
    (next: boolean) => {
      if (next === follow) return;
      if (followProp === undefined) setFollowState(next);
      onFollowChange?.(next);
    },
    [follow, followProp, onFollowChange],
  );

  const [wrapState, setWrapState] = useState(defaultWrap);
  const wrap = wrapProp ?? wrapState;

  const [queryState, setQueryState] = useState('');
  const query = queryProp ?? queryState;

  // Retention: the last `cap` lines are kept; older ones are one marker row.
  const cap = wrap ? Math.min(maxLines ?? WRAP_MAX_LINES, WRAP_MAX_LINES) : (maxLines ?? MAX_LINES);
  const offset = Math.max(0, lines.length - cap);
  const count = lines.length - offset;
  const markerRows = offset > 0 ? 1 : 0;
  const totalHeight = (markerRows + count) * lineHeight;

  const [viewport, setViewport] = useState(VIEWPORT_FALLBACK);
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => setViewport(el.clientHeight || VIEWPORT_FALLBACK);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const [scrollTop, setScrollTop] = useState(0);
  const [jumping, setJumping] = useState(false);
  const jumpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bottom = Math.max(0, totalHeight - viewport);
  const pinned = follow && !jumping;
  const top = pinned && !wrap ? bottom : scrollTop;

  let start = 0;
  let end = count;
  if (!wrap) {
    start = Math.max(0, Math.floor(top / lineHeight) - markerRows - OVERSCAN);
    end = Math.min(count, Math.ceil((top + viewport) / lineHeight) - markerRows + OVERSCAN);
    end = Math.max(start, end);
  }

  const bottomOf = useCallback(
    (el: HTMLElement) => (wrap ? Math.max(0, el.scrollHeight - el.clientHeight) : bottom),
    [wrap, bottom],
  );

  const scrollTo = useCallback((el: HTMLElement, target: number) => {
    el.scrollTop = target;
    setScrollTop(target);
  }, []);

  // Pin to the bottom while following — before paint, so no frame shows the
  // old position. After every render: with wrap on, an append moves
  // `scrollHeight` without changing anything this component holds.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!pinned || !el) return;
    const target = bottomOf(el);
    if (el.scrollTop !== target || scrollTop !== target) scrollTo(el, target);
  });

  // Paused: retention dropping lines off the top must not move the viewport.
  const shift = offset - markerRows;
  const lastShift = useRef(shift);
  useLayoutEffect(() => {
    const delta = shift - lastShift.current;
    lastShift.current = shift;
    const el = scrollRef.current;
    if (follow || wrap || delta === 0 || !el) return;
    scrollTo(el, Math.max(0, el.scrollTop - delta * lineHeight));
  }, [shift, follow, wrap, lineHeight, scrollTo]);

  // The length last seen while following; the pill counts past it.
  const seen = useRef(lines.length);
  useLayoutEffect(() => {
    if (follow || lines.length < seen.current) seen.current = lines.length;
  });
  const newCount = follow ? 0 : Math.max(0, lines.length - seen.current);

  const endJump = useCallback(() => {
    if (jumpTimer.current) clearTimeout(jumpTimer.current);
    jumpTimer.current = null;
    setJumping(false);
  }, []);

  useEffect(
    () => () => {
      if (jumpTimer.current) clearTimeout(jumpTimer.current);
    },
    [],
  );

  const jump = useCallback(() => {
    const el = scrollRef.current;
    setFollow(true);
    if (!el) return;
    const target = bottomOf(el);
    const far = target - el.scrollTop > lineHeight;
    if (far && !prefersReducedMotion() && typeof el.scrollTo === 'function') {
      // The window follows the real `scrollTop` until the jump lands, so the
      // lines it passes are rendered rather than a blank spacer.
      setJumping(true);
      if (jumpTimer.current) clearTimeout(jumpTimer.current);
      jumpTimer.current = setTimeout(endJump, JUMP_MS);
      el.scrollTo({ top: target, behavior: 'smooth' });
    } else {
      scrollTo(el, target);
    }
  }, [setFollow, bottomOf, lineHeight, endJump, scrollTo]);

  const onScroll = (event: UIEvent<HTMLDivElement>) => {
    const el = event.currentTarget;
    setScrollTop(el.scrollTop);
    const distance = bottomOf(el) - el.scrollTop;
    if (jumping) {
      if (distance <= lineHeight) endJump();
      return;
    }
    if (distance > lineHeight) setFollow(false);
    else setFollow(true);
  };

  /** Heading up pauses at once, so a fast stream cannot pin the user down. */
  const pause = () => {
    if (jumping) endJump();
    setFollow(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'End') {
      event.preventDefault();
      jump();
    } else if (event.key === 'Home' || event.key === 'PageUp' || event.key === 'ArrowUp') {
      pause();
    }
  };

  const { needle, matches, byLine, cursor, setCursor } = useLogSearch(lines, offset, query);
  const { copied, copy } = useLogCopy(scrollRef, lines);

  const pendingReveal = useRef<number | null>(null);
  useLayoutEffect(() => {
    const k = pendingReveal.current;
    pendingReveal.current = null;
    if (k === null || !wrap) return;
    scrollRef.current
      ?.querySelector(`[data-line-index="${offset + k}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  });

  const step = (direction: 1 | -1) => {
    if (matches.length === 0) return;
    const next = (cursor + direction + matches.length) % matches.length;
    setCursor(next);
    setFollow(false);
    if (jumping) endJump();
    const k = matches[next].line;
    const el = scrollRef.current;
    if (wrap || !el) {
      pendingReveal.current = k;
      return;
    }
    const rowTop = (markerRows + k) * lineHeight;
    if (rowTop < top || rowTop > top + viewport - lineHeight) {
      const target = Math.min(bottom, Math.max(0, rowTop - viewport / 2 + lineHeight / 2));
      scrollTo(el, target);
    } else if (pinned) {
      // Leaving follow keeps the viewport where following had put it.
      scrollTo(el, top);
    }
  };

  const setQuery = (next: string) => {
    if (queryProp === undefined) setQueryState(next);
    onQueryChange?.(next);
  };


  const toggleWrap = () => {
    const next = !wrap;
    if (wrapProp === undefined) setWrapState(next);
    onWrapChange?.(next);
  };

  const CopyIcon = copied ? Check : Copy;
  const numberWidth = showLineNumbers ? String(lines.length).length : 0;
  const rowStyle = wrap ? { minHeight: lineHeight } : { height: lineHeight };

  const rows: ReactNode[] = [];
  for (let k = start; k < end; k++) {
    const indices = byLine.get(k);
    const ranges = indices
      ? indices.map((i) => ({
          start: matches[i].start,
          end: matches[i].start + needle.length,
          current: i === cursor,
        }))
      : NO_RANGES;
    const line = lines[offset + k];
    rows.push(
      <LogViewerRow
        key={line.id}
        line={line}
        index={offset + k}
        lineHeight={lineHeight}
        wrap={wrap}
        numberWidth={numberWidth}
        ranges={ranges}
      />,
    );
  }

  return (
    <div
      data-log-viewer=""
      className={cn(
        'flex h-96 flex-col overflow-hidden rounded-surface border border-line bg-raised text-ink',
        className,
      )}
    >
      <div className="flex shrink-0 items-center justify-end gap-1 border-b border-line px-2 py-1.5">
        {toolbar}
        <SearchField
          aria-label={labels.search}
          placeholder={labels.search}
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            step(event.shiftKey ? -1 : 1);
          }}
          className="w-56 min-w-0"
          trailing={
            needle ? (
              <span data-match-count="" aria-live="polite" className="px-1 text-xs tabular-nums text-ink-3">
                {matches.length === 0 ? '0' : `${cursor + 1} / ${matches.length}`}
              </span>
            ) : null
          }
        />
        <Button
          variant="ghost"
          size="sm"
          icon
          aria-label={labels.previousMatch}
          disabled={matches.length === 0}
          onClick={() => step(-1)}
        >
          <ChevronUp aria-hidden="true" className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon
          aria-label={labels.nextMatch}
          disabled={matches.length === 0}
          onClick={() => step(1)}
        >
          <ChevronDown aria-hidden="true" className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon
          aria-label={labels.wrap}
          aria-pressed={wrap}
          onClick={toggleWrap}
          className="aria-pressed:bg-hover aria-pressed:text-ink"
        >
          <WrapText aria-hidden="true" className="size-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={copy}>
          <CopyIcon aria-hidden="true" className="size-4" />
          {copied ? labels.copied : labels.copy}
        </Button>
      </div>
      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          role="log"
          aria-live="off"
          aria-label={label}
          // biome-ignore lint/a11y/noNoninteractiveTabindex: a scroll region must be keyboard-reachable
          tabIndex={0}
          data-log-scroll=""
          onScroll={onScroll}
          onWheel={(event) => {
            if (event.deltaY < 0) pause();
          }}
          onKeyDown={onKeyDown}
          onPointerDown={(event) => {
            // A press on the scrollbar itself, which a re-pin would fight.
            const el = event.currentTarget;
            if (event.target === el && el.clientWidth > 0 && event.nativeEvent.offsetX >= el.clientWidth)
              pause();
          }}
          className={cn(
            'absolute inset-0 overflow-auto font-mono text-xs tabular-nums',
            !wrap && '[overflow-anchor:none]',
          )}
        >
          {lines.length === 0 ? (
            <div className="flex h-full items-center justify-center p-4 font-sans text-sm text-ink-3">
              {emptyState ?? labels.empty}
            </div>
          ) : (
            <div className={cn(!wrap && 'w-max min-w-full')}>
              {markerRows ? (
                <div
                  data-log-hidden=""
                  className="flex select-none items-center px-3 italic text-ink-3"
                  style={rowStyle}
                >
                  {labels.earlierHidden(offset)}
                </div>
              ) : null}
              {start > 0 ? <div aria-hidden="true" style={{ height: start * lineHeight }} /> : null}
              {rows}
              {end < count ? (
                <div aria-hidden="true" style={{ height: (count - end) * lineHeight }} />
              ) : null}
            </div>
          )}
        </div>
        <div
          aria-live="polite"
          className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center"
        >
          {newCount > 0 ? (
            <Button
              variant="solid"
              size="sm"
              data-log-jump=""
              onClick={jump}
              className="pointer-events-auto rounded-full"
            >
              {labels.newLines(newCount)} — {labels.jumpToLatest}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
