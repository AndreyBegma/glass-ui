import { cn } from '../lib/cn';

/**
 * v0.38.0 wave, Markdown. Scaffold stub: the final prop types and a plain text
 * box. `react-markdown` + `remark-gfm` (peers) and the element mapping are its
 * slot's.
 */
export type MarkdownComponents = Record<string, unknown>;

export type MarkdownProps = {
  children: string;
  /** react-markdown overrides, merged over ours. */
  components?: Partial<MarkdownComponents>;
  linkTarget?: (href: string) => '_blank' | undefined;
  /** `compact` for chat bubbles. */
  density?: 'comfortable' | 'compact';
  className?: string;
};

export function Markdown({ children, className }: MarkdownProps) {
  return <div className={cn('whitespace-pre-wrap', className)}>{children}</div>;
}
