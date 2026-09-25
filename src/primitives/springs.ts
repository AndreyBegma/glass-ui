import type { Transition } from 'motion/react';

/**
 * FEAT-20260924-680 — the springs, named.
 *
 * Until now the design system's springs were numbers typed out at each call
 * site: the capsule that travels under a tab, the sheet that grows out of it,
 * the rail highlight that snaps to an item. Three springs, sixteen copies
 * across the package and Luna Watch, and nothing to say that `420/34/0.9` in
 * one file and `420/34/0.9` in another are meant to be the same motion rather
 * than a coincidence. A curve is a token (`--ease-sheet`); a spring is the same
 * kind of decision and now has the same kind of name.
 *
 * - `capsule` — a selection indicator travelling to its new item.
 * - `morph` — one surface becoming another: a circle opening into a sheet.
 * - `snap` — a small highlight that should arrive before the eye follows it.
 * - `bump` — a single visible overshoot and back, for a count or a badge that
 *   has just changed. Low damping is the point (ζ ≈ 0.47: about a fifth past
 *   the target, then under 4 % on the return): it is the one spring here meant
 *   to be seen overshooting.
 * - `arrive` — an item joining a group that is already on screen (an avatar
 *   entering a party, a row entering results). Close to critical (ζ ≈ 0.84),
 *   so it settles with a trace of give and no wobble that would read as the
 *   group rearranging.
 * - `reduced` — what every one of them becomes under reduced motion. Not a
 *   spring at all: the value is simply there.
 *
 * `motion.spec.ts` bans a hand-written curve; `springs.spec.ts` bans a
 * hand-written spring anywhere new. The existing call sites are an allowlist
 * that may shrink as they move onto these names, and may not grow.
 *
 * Only for Motion's JavaScript springs. The flight and the tilt in this
 * package read the CSS tokens instead: a spring needs `linear()` easing to
 * reach the compositor, and the Tizen engines Luna's television runs
 * (Chromium 94–108) do not have it, so a spring there is a main-thread loop.
 */
export const SPRINGS = {
  capsule: { type: 'spring', stiffness: 420, damping: 34, mass: 0.9 },
  morph: { type: 'spring', stiffness: 380, damping: 36, mass: 0.9 },
  snap: { type: 'spring', stiffness: 500, damping: 40, mass: 0.7 },
  bump: { type: 'spring', stiffness: 600, damping: 18, mass: 0.6 },
  arrive: { type: 'spring', stiffness: 320, damping: 30, mass: 1 },
  reduced: { duration: 0 },
} as const satisfies Record<string, Transition>;

export type SpringName = keyof typeof SPRINGS;
