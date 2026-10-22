import type { Element, ElementContent, Nodes, Root } from 'hast';
import { defaultUrlTransform } from 'react-markdown';

/**
 * The three rehype transforms `Markdown` runs over the tree before it is
 * rendered. They work on the tree rather than in the element components so the
 * components stay module-level constants: a component built per render is a
 * new type every render, and React would remount every `CodeBlock` (losing its
 * wrap and copied state) each time a streamed reply grows by a token.
 *
 * No `unist-util-visit`: it is only a transitive dependency of the peers, and
 * a walk over `children` is all these need.
 */

type Parent = Root | Element;

function walk(node: Parent, visit: (element: Element) => void) {
  for (const child of node.children) {
    if (child.type !== 'element') continue;
    visit(child);
    walk(child, visit);
  }
}

function isElement(node: ElementContent | undefined, tagName?: string): node is Element {
  return node?.type === 'element' && (tagName === undefined || node.tagName === tagName);
}

function classes(element: Element): string[] {
  const value = element.properties.className;
  return Array.isArray(value) ? value.map(String) : [];
}

/** The text of a node and everything under it. */
export function textOf(node: Nodes): string {
  if (node.type === 'text') return node.value;
  if (node.type !== 'element' && node.type !== 'root') return '';
  return (node.children as Nodes[]).map(textOf).join('');
}

/** The `language-x` class GFM puts on a fenced block's `<code>`, as `x`. */
export function languageOf(code: Element): string | undefined {
  const name = classes(code).find((c) => c.startsWith('language-'));
  return name ? name.slice('language-'.length) : undefined;
}

/**
 * GitHub's slug: lower case, everything but letters, numbers, spaces, `-` and
 * `_` dropped, each space a `-`. So a link to `#getting-started` copied from
 * the same document on GitHub lands here too.
 */
export function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\s_-]/gu, '')
    .replace(/\s/g, '-');
}

/**
 * Slug ids on `h1`–`h6`, per document, duplicates suffixed `-1`, `-2` the way
 * GitHub does. A heading that already has an id (the footnotes' own label) is
 * left alone.
 */
export function rehypeHeadingIds() {
  return (tree: Root) => {
    const taken = new Set<string>();
    const counts = new Map<string, number>();
    walk(tree, (element) => {
      if (element.properties.id != null) taken.add(String(element.properties.id));
    });
    walk(tree, (element) => {
      if (!/^h[1-6]$/.test(element.tagName) || element.properties.id != null) return;
      const base = slugify(textOf(element));
      if (!base) return;
      let n = counts.get(base) ?? 0;
      let slug = n ? `${base}-${n}` : base;
      while (taken.has(slug)) {
        n += 1;
        slug = `${base}-${n}`;
      }
      counts.set(base, n);
      taken.add(slug);
      element.properties.id = slug;
    });
  };
}

/** Elements that end a task item's label: what comes after is a nested block. */
const BLOCK = new Set(['ul', 'ol', 'p', 'pre', 'blockquote', 'table', 'div', 'hr']);

/**
 * GFM renders a task item as `<li class="task-list-item"><input type=checkbox
 * disabled> text</li>` — in a loose list, with the input inside a `<p>`. This
 * takes the input out, records its state as `data-task="checked|unchecked"` on
 * the `li`, and gathers the item's inline content into one leading `<span>`,
 * so the `li` component can hand that span to `Checkbox` as its label and
 * render any nested list after it.
 */
export function rehypeTaskItems() {
  return (tree: Root) => {
    walk(tree, (li) => {
      if (li.tagName !== 'li' || !classes(li).includes('task-list-item')) return;

      const first = li.children.find((child) => child.type === 'element');
      const container = isElement(first, 'p') ? first : li;
      const index = container.children.findIndex((child) => child.type === 'element');
      const input = container.children[index];
      if (!isElement(input, 'input')) return;

      container.children.splice(index, 1);
      const after = container.children[index];
      if (after?.type === 'text') after.value = after.value.replace(/^ /, '');

      // A loose item's first paragraph is its label: unwrap it into the li.
      if (container !== li) {
        const at = li.children.indexOf(container);
        li.children.splice(at, 1, ...container.children);
      }

      const end = li.children.findIndex((child) => isElement(child, undefined) && BLOCK.has(child.tagName));
      const inline = end === -1 ? li.children : li.children.slice(0, end);
      const rest = end === -1 ? [] : li.children.slice(end);
      li.properties.dataTask = input.properties.checked ? 'checked' : 'unchecked';
      li.children = [
        { type: 'element', tagName: 'span', properties: {}, children: trim(inline) },
        ...rest,
      ];
    });
  };
}

function trim(children: ElementContent[]): ElementContent[] {
  return children.filter(
    (child, i) => !(child.type === 'text' && !child.value.trim() && (i === 0 || i === children.length - 1)),
  );
}

export type LinkTarget = (href: string) => '_blank' | undefined;

/**
 * `rel="noreferrer noopener"` on every absolute link, and `target` from the
 * caller's `linkTarget`. A URL that `defaultUrlTransform` will drop is left
 * untouched: it is about to stop being a link at all.
 */
export function rehypeLinks(options: { linkTarget?: LinkTarget }) {
  return (tree: Root) => {
    walk(tree, (element) => {
      if (element.tagName !== 'a') return;
      const href = element.properties.href;
      if (typeof href !== 'string' || !defaultUrlTransform(href)) return;
      if (/^(https?:)?\/\//i.test(href)) element.properties.rel = ['noreferrer', 'noopener'];
      const target = options.linkTarget?.(href);
      if (target) {
        element.properties.target = target;
        element.properties.rel = ['noreferrer', 'noopener'];
      }
    });
  };
}
