'use client';

import { Check, Copy, WrapText } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../lib/cn';
import { Button } from './button';
import { useCopy } from './code-block-copy';

/**
 * FEAT-20260930-067 — a read-only block of code or log text on a solid
 * surface (never glass). No syntax highlighting: `language` is a label only.
 *
 * Wrap is controllable (`wrap` + `onWrapChange`) or uncontrolled
 * (`defaultWrap`), the same split the package's other controls use. Copy
 * (D10) writes `code` and confirms inline for 1.5 s — no `toast`, so this
 * module never loads sonner. The block scrolls inside `maxHeight` (px).
 *
 * #93 — the chrome is only there when it has something to hold. A one-line
 * command has no lines to wrap, so it gets no wrap toggle (a trailing
 * newline does not make a second line). With no `language` and no toggle
 * the header bar would be an empty strip with a hairline under it, so it is
 * dropped and the copy button floats in the block's top-right corner: a
 * one-line command is one row. `wrap` and `defaultWrap` still apply to the
 * text either way.
 */
export type CodeBlockProps = {
  code: string;
  /** A label only; no syntax highlighting. */
  language?: string;
  wrap?: boolean;
  defaultWrap?: boolean;
  onWrapChange?: (wrap: boolean) => void;
  maxHeight?: number;
  /** Default true. */
  copy?: boolean;
  className?: string;
};

export function CodeBlock({
  code,
  language,
  wrap,
  defaultWrap = false,
  onWrapChange,
  maxHeight,
  copy = true,
  className,
}: CodeBlockProps) {
  const [inner, setInner] = useState(defaultWrap);
  const wrapped = wrap ?? inner;
  const { copied, copy: doCopy } = useCopy(code);
  const multiline = code.replace(/\n+$/, '').includes('\n');
  const header = Boolean(language) || multiline;

  const toggle = () => {
    const next = !wrapped;
    if (wrap === undefined) setInner(next);
    onWrapChange?.(next);
  };

  const copyButton = copy ? (
    <Button
      variant="ghost"
      size="sm"
      icon
      aria-label={copied ? 'Copied' : 'Copy code'}
      onClick={doCopy}
      className="size-7"
    >
      {copied ? (
        <>
          <Check aria-hidden="true" className="size-4" />
          <span className="sr-only">Copied</span>
        </>
      ) : (
        <Copy aria-hidden="true" className="size-4" />
      )}
    </Button>
  ) : null;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-control border border-line bg-raised text-sm text-ink',
        className,
      )}
    >
      {header ? (
        <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-1">
          <span className="truncate text-xs text-ink-3">{language}</span>
          <div className="flex items-center gap-1">
            {multiline ? (
              <Button
                variant="ghost"
                size="sm"
                icon
                aria-label="Wrap lines"
                aria-pressed={wrapped}
                onClick={toggle}
                className={cn('size-7', wrapped && 'bg-hover text-ink')}
              >
                <WrapText aria-hidden="true" className="size-4" />
              </Button>
            ) : null}
            {copyButton}
          </div>
        </div>
      ) : copyButton ? (
        <div className="absolute top-1.5 right-1.5 z-1">{copyButton}</div>
      ) : null}
      <pre
        // biome-ignore lint/a11y/noNoninteractiveTabindex: a scroll region must be keyboard-reachable
        tabIndex={0}
        style={{
          maxHeight,
          whiteSpace: wrapped ? 'pre-wrap' : 'pre',
          overflowWrap: wrapped ? 'anywhere' : undefined,
        }}
        // Clear of the floating copy button when there is no header to hold it.
        className={cn('m-0 overflow-auto p-3 font-mono', !header && copy && 'pr-12')}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}
