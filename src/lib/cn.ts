import { twMerge } from 'tailwind-merge';

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
  return twMerge(parts.flat().filter(Boolean).join(' '));
}
