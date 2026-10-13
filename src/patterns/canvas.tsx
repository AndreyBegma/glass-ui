import { cn } from '../lib/cn';

/**
 * #93 — something behind the glass to refract.
 *
 * Three soft radial gradients of the accent, fixed behind the whole app. The
 * drawing is `.canvas` in `material.css`, which says why it costs nothing on
 * scroll and when it switches itself off. This is that class as a component,
 * so an application mounts it by name.
 *
 * Mount it once, outside `#main-content`. The depth effect transforms that
 * element, and a fixed layer inside a transformed element is re-anchored to
 * it (`base.css`). Decorative, so it is hidden from the accessibility tree.
 */
export function Canvas({ className }: { className?: string }) {
  return <div aria-hidden="true" data-canvas="" className={cn('canvas', className)} />;
}
