// biome-ignore-all lint/a11y/useSemanticElements: a vertical divider has no semantic HTML element; see the block comment below.
// biome-ignore-all lint/a11y/useAriaPropsForRole: aria-valuenow only applies to the movable separator variant; see the block comment below.
import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';

/**
 * FEAT-20260902-004 — a hairline with a role.
 *
 * One site in the gap document's tally (`glass-ui-second-consumer-gap.md`
 * Tier 2, item 11) with no single file named there; wherever a divider is
 * currently a bare `border-t`/`border-l`, this replaces it with the token and
 * the ARIA a decorative `<hr>`-shaped `<div>` never had.
 *
 * WAI-ARIA 1.2 gives `role="separator"` two shapes: static (this one — it
 * groups content, takes no focus, needs no value) and the *movable* variant
 * — a resizable divider a user drags, which is the one that must be
 * focusable and carry `aria-valuenow`. Biome's a11y rules assume the second
 * shape unconditionally; the file-level suppressions above are the first two
 * of that. `<hr>` is not a substitute here — it has no vertical orientation,
 * and this primitive's own spec asks for one.
 */
type SeparatorProps = Omit<ComponentProps<'div'>, 'className'> & {
  className?: string;
  orientation?: 'horizontal' | 'vertical';
};

export function Separator({ orientation = 'horizontal', className, ...props }: SeparatorProps) {
  return (
    // biome-ignore lint/a11y/useFocusableInteractive: a static separator is deliberately not focusable — only the movable variant is.
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn(orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px', 'bg-line', className)}
      {...props}
    />
  );
}
