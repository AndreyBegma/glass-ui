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

  const toggle = () => {
    const next = !wrapped;
    if (wrap === undefined) setInner(next);
    onWrapChange?.(next);
  };

  return (
    <div
      className={cn(
        'overflow-hidden rounded-control border border-line bg-raised text-sm text-ink',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-1">
        <span className="truncate text-xs text-ink-3">{language}</span>
        <div className="flex items-center gap-1">
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
          {copy ? (
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
          ) : null}
        </div>
      </div>
      <pre
        // biome-ignore lint/a11y/noNoninteractiveTabindex: a scroll region must be keyboard-reachable
        tabIndex={0}
        style={{
          maxHeight,
          whiteSpace: wrapped ? 'pre-wrap' : 'pre',
          overflowWrap: wrapped ? 'anywhere' : undefined,
        }}
        className="m-0 overflow-auto p-3 font-mono"
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}
