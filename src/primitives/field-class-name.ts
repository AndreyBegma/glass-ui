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
 * W254 — `field.tsx` and this string now spell the ring the same way,
 * `ring-ink/22`, so the two agree in light and dark: `--color-ink` follows the
 * theme where the literal white it replaced did not.
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
