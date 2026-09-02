import { cn } from '../lib/cn';

/**
 * FEAT-20260902-004 — the field base, as a function.
 *
 * The analogue of `buttonClassName()` (`button.tsx`): a call site that
 * cannot yet become a real `Input` needs another element to carry the same
 * border, radius and focus ring, and gets the class string instead of a
 * wrapped component. `U1` decision 4 names Denitsa's `U2` as the consumer —
 * a local copy it keeps until this ships.
 *
 * **Reproduced, not imported.** `field.tsx`'s `base` constant (`field.tsx`
 * lines 17-23) is not exported, and `field.tsx` is outside this slot's fence
 * (`.orchestrator-brief.md`) — exporting it there is a change for whoever
 * owns that file, not one made here. Flagged to the orchestrator per the
 * brief's own instruction.
 *
 * **One substitution, and it is deliberate.** `field.tsx`'s ring is the
 * literal `ring-white/22`, and `tokens.spec.ts`'s raw-colour ban allows that
 * string in `field.tsx` alone — a second file writing it fails the build.
 * `ring-ink/22` is the token-built equivalent: `--color-ink` is itself
 * near-white (`#f2f2f6`), so the ring reads the same against this package's
 * dark ground today. Everything else below is `field.tsx`'s string,
 * unchanged.
 */
export function fieldClassName(className?: string): string {
  return cn(
    'w-full bg-surface text-ink placeholder:text-ink-3',
    'border border-line-strong rounded-control',
    'transition-[border-color,box-shadow] duration-(--dur-fast)',
    'focus:border-ink/70 focus:ring-2 focus:ring-ink/22 focus:outline-none',
    'disabled:opacity-40',
    className,
  );
}
