import { extendTailwindMerge } from 'tailwind-merge';


/**
 * #123 - tailwind-merge assumes every `text-*` it cannot resolve is a text
 * colour. The token type scale (`text-display`, `text-heading`, `text-section`,
 * `text-body`, `text-label`) resolves to nothing it knows, so a size merged
 * through `cn` next to a colour was silently dropped:
 *
 *     twMerge('px-2 text-body text-ink-2')   // -> 'px-2 text-ink-2'
 *
 * Registering the scale in the font-size group makes size and colour
 * orthogonal: `cn('text-body', 'text-ink-2')` keeps both, in either order,
 * while two sizes still settle last-wins. Kept in sync with the `--text-*`
 * definitions in `src/tokens.css`.
 */
const merge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['display', 'heading', 'section', 'body', 'label'] }],
    },
  },
});
/**
 * FEAT-20260823-362 — join class names and let the last one win.
 *
 * Every primitive in `components/ui` takes a `className` so a call site can
 * override one thing without rebuilding the component. Plain string
 * concatenation cannot do that: `"px-4" + " " + "px-6"` leaves both in the
 * attribute and the winner is whichever Tailwind happened to emit later in the
 * stylesheet, which is not something a call site can reason about.
 * `tailwind-merge` understands that the two belong to the same property group
 * and keeps the caller's.
 *
 * Deliberately not `clsx`: nothing here needs its object syntax, and one level
 * of array — enough to pass a `tailwind-variants` slot straight through —
 * costs a `.flat()`.
 */
type ClassValue = string | false | null | undefined;

export function cn(...parts: Array<ClassValue | ClassValue[]>): string {
  return merge(parts.flat().filter(Boolean).join(' '));
}
