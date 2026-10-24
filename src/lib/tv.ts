import { createTV } from 'tailwind-variants';
import { twMergeConfig } from './cn';

/**
 * #123 — `tailwind-variants` with the merger `cn` uses.
 *
 * `tv` merges a component's base, variants and `class` through its own
 * tailwind-merge, which knows nothing of the type scale either. Every
 * component imports `tv` from here, never from the package, so the two
 * mergers cannot disagree about what `text-body` is.
 */
export const tv = createTV({ twMergeConfig });

export type { VariantProps } from 'tailwind-variants';
