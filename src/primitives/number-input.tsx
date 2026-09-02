import type { ComponentProps } from 'react';
import { Input } from './field';

/**
 * FEAT-20260902-004 — `Input`, with the type set. No custom widget.
 *
 * Five sites in the gap document's tally reach for a numeric field today
 * with a copied class string. `Input` already carries the border, radius and
 * focus ring; this fixes `type="number"` and defaults `inputMode` for the
 * on-screen keyboard a touch device shows, and forwards `step`/`min`/`max`
 * straight through — the browser's own spinner and validation do the rest.
 */
type NumberInputProps = Omit<ComponentProps<typeof Input>, 'type'>;

export function NumberInput({ inputMode = 'numeric', ...props }: NumberInputProps) {
  return <Input type="number" inputMode={inputMode} {...props} />;
}
