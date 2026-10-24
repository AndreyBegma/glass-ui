import { extendTailwindMerge } from 'tailwind-merge';

/**
 * #123 — tailwind-merge files every `text-*` it cannot resolve under text
 * colour. The token type scale resolves to nothing it knows, so a size merged
 * next to a colour was silently dropped:
 *
 *     twMerge('px-2 text-body text-ink-2')   // -> 'px-2 text-ink-2'
 *
 * Registering the scale in the font-size group makes size and colour
 * orthogonal: both survive in either order, while two sizes still settle
 * last-wins. The steps are the `--text-*` entries in `src/tokens.css`, and
 * `cn.test.ts` fails if the two drift apart.
 *
 * Exported because `tv` (`lib/tv.ts`) runs its own merger and needs the same
 * extension — without it a variant's `text-section` drops the base's
 * `text-ink`, and a base of `text-body text-ink` loses the size.
 */
export const TYPE_SCALE = ['display', 'heading', 'section', 'body', 'label'];

export const twMergeConfig = {
  extend: {
    classGroups: {
      'font-size': [{ text: TYPE_SCALE }],
    },
  },
};

const merge = extendTailwindMerge(twMergeConfig);

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
