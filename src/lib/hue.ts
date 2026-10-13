/**
 * #109 — the identity hues, as classes and as a key-to-hue function.
 *
 * Eight hues (`--color-hue-1` … `--color-hue-8` in `tokens.css`: blue, teal,
 * green, amber, orange, red, violet, pink) for telling things apart — an
 * agent, a slot, a node. An identity, not a state: a state is `statusTone`.
 *
 * A module of its own, without `'use client'`, for the reason
 * `node-card-tile.ts` gives: a server-rendered component importing a plain
 * object from a client module receives a client reference instead.
 *
 * Every class is spelled out in full: Tailwind finds utilities by scanning
 * source text, so a class assembled from a number at run time is a class
 * that is never generated.
 */
export type Hue = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export const HUES: readonly Hue[] = [1, 2, 3, 4, 5, 6, 7, 8];

export interface HueClasses {
  /** The mark, solid: a dot, a swatch. */
  dot: string;
  /** The tint with text on it: an icon disc, a badge, a pill. AA in both themes. */
  soft: string;
  /** Text in the hue, on any band: an icon on its own. AA in both themes. */
  ink: string;
  /** A 1px border in the hue — use with `border`. */
  rim: string;
  /** A soft outer glow in the hue. */
  glow: string;
  /** An SVG stroke: an edge, a link. */
  stroke: string;
  /** An SVG fill: an arrowhead. */
  fill: string;
}

const HUE_CLASSES: Record<Hue, HueClasses> = {
  1: {
    dot: 'bg-hue-1',
    soft: 'bg-hue-1-soft text-hue-1-ink',
    ink: 'text-hue-1-ink',
    rim: 'border-hue-1-line',
    glow: 'shadow-[0_0_24px_-6px_var(--color-hue-1-glow)]',
    stroke: 'stroke-hue-1',
    fill: 'fill-hue-1',
  },
  2: {
    dot: 'bg-hue-2',
    soft: 'bg-hue-2-soft text-hue-2-ink',
    ink: 'text-hue-2-ink',
    rim: 'border-hue-2-line',
    glow: 'shadow-[0_0_24px_-6px_var(--color-hue-2-glow)]',
    stroke: 'stroke-hue-2',
    fill: 'fill-hue-2',
  },
  3: {
    dot: 'bg-hue-3',
    soft: 'bg-hue-3-soft text-hue-3-ink',
    ink: 'text-hue-3-ink',
    rim: 'border-hue-3-line',
    glow: 'shadow-[0_0_24px_-6px_var(--color-hue-3-glow)]',
    stroke: 'stroke-hue-3',
    fill: 'fill-hue-3',
  },
  4: {
    dot: 'bg-hue-4',
    soft: 'bg-hue-4-soft text-hue-4-ink',
    ink: 'text-hue-4-ink',
    rim: 'border-hue-4-line',
    glow: 'shadow-[0_0_24px_-6px_var(--color-hue-4-glow)]',
    stroke: 'stroke-hue-4',
    fill: 'fill-hue-4',
  },
  5: {
    dot: 'bg-hue-5',
    soft: 'bg-hue-5-soft text-hue-5-ink',
    ink: 'text-hue-5-ink',
    rim: 'border-hue-5-line',
    glow: 'shadow-[0_0_24px_-6px_var(--color-hue-5-glow)]',
    stroke: 'stroke-hue-5',
    fill: 'fill-hue-5',
  },
  6: {
    dot: 'bg-hue-6',
    soft: 'bg-hue-6-soft text-hue-6-ink',
    ink: 'text-hue-6-ink',
    rim: 'border-hue-6-line',
    glow: 'shadow-[0_0_24px_-6px_var(--color-hue-6-glow)]',
    stroke: 'stroke-hue-6',
    fill: 'fill-hue-6',
  },
  7: {
    dot: 'bg-hue-7',
    soft: 'bg-hue-7-soft text-hue-7-ink',
    ink: 'text-hue-7-ink',
    rim: 'border-hue-7-line',
    glow: 'shadow-[0_0_24px_-6px_var(--color-hue-7-glow)]',
    stroke: 'stroke-hue-7',
    fill: 'fill-hue-7',
  },
  8: {
    dot: 'bg-hue-8',
    soft: 'bg-hue-8-soft text-hue-8-ink',
    ink: 'text-hue-8-ink',
    rim: 'border-hue-8-line',
    glow: 'shadow-[0_0_24px_-6px_var(--color-hue-8-glow)]',
    stroke: 'stroke-hue-8',
    fill: 'fill-hue-8',
  },
};

/** The classes a surface wearing `hue` reads. */
export function hueClasses(hue: Hue): HueClasses {
  return HUE_CLASSES[hue];
}

/**
 * A stable key — a slot name, an agent id — onto one of the eight hues, the
 * same one on every render, in every process and in every release.
 *
 * FNV-1a (32-bit) over the key's UTF-16 code units, then modulo 8. Not a
 * cryptographic hash and not meant to be: it spreads short similar strings
 * (`slot-1`, `slot-2`) across the hues, and it is a dozen lines nobody has to
 * install. **Changing it re-colours every consumer's agents**, so it does not
 * change.
 */
export function hueFor(key: string): Hue {
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (((hash >>> 0) % 8) + 1) as Hue;
}
