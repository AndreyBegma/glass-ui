/**
 * `glass-ui` — the barrel.
 *
 * Convenience, not the recommended door. Every module is also reachable on its
 * own subpath (`glass-ui/button`, `glass-ui/cn`), and that is what an
 * application should import.
 *
 * The reason is not taste. A bundler tree-shakes this away, but a test runner
 * evaluates it: importing `cn` through here loads every primitive, which loads
 * sonner, which writes a stylesheet into `document.head` the moment it is
 * imported — and in a test environment with no real DOM that throws before a
 * single assertion runs. FEAT-20260831-501 broke fifteen of Luna Watch's tests
 * exactly that way, in files that only ever wanted a class-name helper.
 *
 * Explicit rather than `export *`, so what leaves this package is a decision
 * each time.
 */

export { cn } from './lib/cn';
export { MaterialLight } from './material-light';
export { Button, buttonClassName } from './primitives/button';
export { Card } from './primitives/card';
export { Chip, ChipButton } from './primitives/chip';
export { DialogContent, DialogRoot } from './primitives/dialog';
export { Input, SearchField, Select, Textarea } from './primitives/field';
export {
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuRoot,
  MenuSeparator,
  MenuTrigger,
} from './primitives/menu';
export { ScrollHintRow } from './primitives/scroll-hint-row';
export {
  SegmentedControl,
  SegmentedControlItem,
} from './primitives/segmented-control';
export { SheetContent, SheetRoot } from './primitives/sheet';
export { Slider } from './primitives/slider';
export { ACHIEVEMENTS_TOASTER, toast, Toaster } from './primitives/toast';
export { Toggle } from './primitives/toggle';
