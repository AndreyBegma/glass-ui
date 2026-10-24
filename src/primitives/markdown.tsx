import { Children, type ComponentProps, isValidElement, type ReactElement, type ReactNode } from 'react';
import ReactMarkdown, { type Components, defaultUrlTransform, type ExtraProps } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { tv } from '../lib/tv';
import { cn } from '../lib/cn';
import { Checkbox } from './checkbox';
import { CodeBlock } from './code-block';
import {
  type LinkTarget,
  languageOf,
  rehypeHeadingIds,
  rehypeLinks,
  rehypeTaskItems,
  textOf,
} from './markdown-plugins';
import { Separator } from './separator';
import { Table, TableCell, TableHead, TableRow } from './table';

/**
 * #178 — markdown, styled by the kit, for agent replies, issue bodies and
 * release notes. Built on the optional peers `react-markdown` and
 * `remark-gfm`: tables, task lists, strikethrough, autolinks, footnotes.
 *
 * Security is two decisions, both react-markdown's defaults kept on purpose.
 * No `rehype-raw`, so a raw HTML node becomes a text node: `<script>` and
 * `<img onerror>` in the source are shown as the text they are. And every
 * `href` and `src` goes through `defaultUrlTransform`, which keeps only
 * http(s), mailto, irc(s), xmpp and relative URLs — `javascript:`, `data:` and
 * `vbscript:` come out empty, and the `a` and `img` here render an empty one
 * as a plain span and as nothing.
 *
 * No `'use client'`: nothing here has state or effects, and a server component
 * can then pass `linkTarget` and `components` (functions) straight in.
 * `CodeBlock` and `Checkbox` carry their own.
 *
 * The element components are module-level constants, not built per render —
 * a per-render component is a new type each time and would remount every
 * `CodeBlock` as a streamed reply grows. What would have needed a closure
 * (`linkTarget`, slug ids, task items) is done on the tree in
 * `markdown-plugins.ts`; `density` reaches the headings through
 * `data-density` and a `group-data-*` variant.
 *
 * Headings sit on the type scale: h1 `text-heading`, h2 `text-section`, h3 and
 * below `text-body`; `compact` (chat bubbles) takes h1 and h2 down to
 * `text-section`. `text-display` is never used — a reply is not a page title.
 */
export type MarkdownComponents = Components;

export type MarkdownLabels = {
  /** The footnotes' heading — visually hidden, announced. */
  footnotes: string;
  /** A footnote's back link; `index` is 1-based, `rereference` counts repeat calls from 1. */
  backToReference: (index: number, rereference: number) => string;
};

const DEFAULT_LABELS: MarkdownLabels = {
  footnotes: 'Footnotes',
  backToReference: (index, rereference) =>
    `Back to reference ${index}${rereference > 1 ? `-${rereference}` : ''}`,
};

export type MarkdownProps = {
  children: string;
  /** react-markdown overrides, merged over ours. */
  components?: Partial<MarkdownComponents>;
  /** `target` for a link; default none (same tab). External links get `rel` either way. */
  linkTarget?: LinkTarget;
  /** `compact` for chat bubbles. */
  density?: 'comfortable' | 'compact';
  labels?: Partial<MarkdownLabels>;
  className?: string;
};

const markdown = tv({
  base: 'group/markdown min-w-0 text-body text-ink [overflow-wrap:anywhere]',
  variants: {
    density: {
      comfortable: '[&>*+*]:mt-3',
      compact: '[&>*+*]:mt-2',
    },
  },
  defaultVariants: { density: 'comfortable' },
});

type Props<T extends keyof React.JSX.IntrinsicElements> = ComponentProps<T> & ExtraProps;

function heading<T extends 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'>(Tag: T, classes: string) {
  return function Heading({ node: _node, className, ...props }: Props<T>) {
    const Comp = Tag as 'h1';
    return <Comp className={cn(classes, className)} {...(props as ComponentProps<'h1'>)} />;
  };
}

const COMPONENTS: Components = {
  h1: heading('h1', 'text-heading group-data-[density=compact]/markdown:text-section'),
  h2: heading('h2', 'text-section'),
  h3: heading('h3', 'text-body font-semibold'),
  h4: heading('h4', 'text-body font-semibold'),
  h5: heading('h5', 'text-body font-medium text-ink-2'),
  h6: heading('h6', 'text-body font-medium text-ink-2'),

  a({ node: _node, href, className, children, ...props }: Props<'a'>) {
    // Emptied by `defaultUrlTransform`: an unsafe URL is not a link.
    if (!href) return <span className={className}>{children}</span>;
    return (
      <a
        href={href}
        className={cn(
          'font-medium text-accent-ink underline underline-offset-2 hover:decoration-2',
          className,
        )}
        {...props}
      >
        {children}
      </a>
    );
  },

  img({ node: _node, src, alt, className, ...props }: Props<'img'>) {
    if (!src) return null;
    return <img src={src} alt={alt ?? ''} className={cn('max-w-full rounded-control', className)} {...props} />;
  },

  pre({ node }: Props<'pre'>) {
    const code = node?.children.find((child) => child.type === 'element' && child.tagName === 'code');
    if (!code || code.type !== 'element') return null;
    return <CodeBlock code={textOf(code).replace(/\n$/, '')} language={languageOf(code)} />;
  },

  // Only inline code reaches here: `pre` renders its own child.
  code({ node: _node, className, ...props }: Props<'code'>) {
    return (
      <code
        className={cn('rounded-[4px] border border-line bg-raised px-1 font-mono', className)}
        {...props}
      />
    );
  },

  blockquote({ node: _node, className, ...props }: Props<'blockquote'>) {
    return (
      <blockquote
        className={cn('border-l-2 border-line-strong pl-3 text-ink-2 [&>*+*]:mt-2', className)}
        {...props}
      />
    );
  },

  hr() {
    return <Separator />;
  },

  ul({ node: _node, className, ...props }: Props<'ul'>) {
    const tasks = className?.includes('contains-task-list');
    return (
      <ul
        className={cn(tasks ? 'list-none' : 'list-disc pl-5', 'space-y-1 [li>&]:mt-1', className)}
        {...props}
      />
    );
  },

  ol({ node: _node, className, ...props }: Props<'ol'>) {
    return <ol className={cn('list-decimal pl-5', 'space-y-1 [li>&]:mt-1', className)} {...props} />;
  },

  li({ node: _node, className, children, ...props }: Props<'li'> & { 'data-task'?: string }) {
    const task = props['data-task'];
    if (!task) {
      return (
        <li className={cn('pl-0.5 marker:text-ink-3', className)} {...props}>
          {children}
        </li>
      );
    }
    // `rehypeTaskItems` made the first child the label span.
    const [label, ...rest] = Children.toArray(children);
    const text = isValidElement(label) ? (label as ReactElement<{ children?: ReactNode }>).props.children : label;
    return (
      <li className={className} {...props}>
        <Checkbox disabled readOnly checked={task === 'checked'}>
          {text}
        </Checkbox>
        {rest.length ? <div className="pl-6.5">{rest}</div> : null}
      </li>
    );
  },

  del({ node: _node, className, ...props }: Props<'del'>) {
    return <del className={cn('text-ink-3 line-through', className)} {...props} />;
  },

  strong({ node: _node, className, ...props }: Props<'strong'>) {
    return <strong className={cn('font-semibold', className)} {...props} />;
  },

  table({ node: _node, ...props }: Props<'table'>) {
    return <Table scroll {...props} />;
  },
  thead({ node: _node, ...props }: Props<'thead'>) {
    return <TableHead {...props} />;
  },
  tr({ node: _node, ...props }: Props<'tr'>) {
    return <TableRow {...props} />;
  },
  th({ node: _node, ...props }: Props<'th'>) {
    return <TableCell head {...(props as ComponentProps<'td'>)} />;
  },
  td({ node: _node, ...props }: Props<'td'>) {
    return <TableCell {...props} />;
  },

  section({ node: _node, className, ...props }: Props<'section'>) {
    const footnotes = 'data-footnotes' in props;
    return (
      <section
        className={cn(footnotes && 'border-t border-line pt-3 text-label text-ink-2 [&_ol]:mt-0', className)}
        {...props}
      />
    );
  },
};

export function Markdown({
  children,
  components,
  linkTarget,
  density = 'comfortable',
  labels: labelsProp,
  className,
}: MarkdownProps) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp };
  return (
    <div data-density={density} className={markdown({ density, className })}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHeadingIds, rehypeTaskItems, [rehypeLinks, { linkTarget }]]}
        remarkRehypeOptions={{
          footnoteLabel: labels.footnotes,
          footnoteBackLabel: (index, rereference) => labels.backToReference(index + 1, rereference),
        }}
        urlTransform={defaultUrlTransform}
        components={{ ...COMPONENTS, ...components }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
