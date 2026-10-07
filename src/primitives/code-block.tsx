import { cn } from '../lib/cn';

/**
 * FEAT-20260930-067 — CodeBlock. Scaffold stub: the final prop types and a
 * bare `<pre><code>`. Header, wrap and copy are i67-small's.
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

export function CodeBlock({ code, className }: CodeBlockProps) {
  return (
    <pre className={cn('font-mono', className)}>
      <code>{code}</code>
    </pre>
  );
}
