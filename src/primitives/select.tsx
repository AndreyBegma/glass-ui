/**
 * #93 — `Select`, at its own import path.
 *
 * The control lives in `field.tsx` beside `Input`, because it is the same
 * field with a different tag and shares its one `base` string — the ring
 * that string carries is allowed in `field.tsx` alone. This module is the
 * door a consumer looks for first: `@andrewbehma/glass-ui/select`. It is a
 * styled native `<select>` (`appearance-none`, a token chevron), so the
 * keyboard, the option list and the screen reader are the browser's own.
 */
export { Select } from './field';
