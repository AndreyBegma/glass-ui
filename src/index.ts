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
export { EmptyState } from './patterns/empty-state';
export { SectionUnavailable } from './patterns/section-unavailable';
export {
  Field,
  Input,
  SearchField,
  Select,
  Textarea,
} from './primitives/field';
export {
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuRoot,
  MenuSeparator,
  MenuTrigger,
} from './primitives/menu';
export { ScrollHintRow } from './primitives/scroll-hint-row';
export { Skeleton } from './primitives/skeleton';
export {
  SegmentedControl,
  SegmentedControlItem,
} from './primitives/segmented-control';
export { SheetContent, SheetRoot } from './primitives/sheet';
export { Slider } from './primitives/slider';
export { ACHIEVEMENTS_TOASTER, toast, Toaster } from './primitives/toast';
export { Toggle } from './primitives/toggle';

/**
 * FEAT-20260902-004 — the shell patterns (`E-92`).
 *
 * Appended rather than filed alphabetically, and deliberately: `u1-tier2` is
 * appending to this same block in its own worktree, and two writers keeping
 * their additions at the end is what makes the merge a conflict either side can
 * resolve by keeping both. Sorting this list is a separate pull request, on a
 * day when nobody else is in it.
 */
export { useCommandPaletteShortcut } from './hooks/use-command-palette-shortcut';
export {
  BottomCapsule,
  type BottomCapsuleAction,
  type BottomCapsuleMore,
  type BottomCapsuleProps,
  type BottomCapsuleTab,
} from './patterns/bottom-capsule';
export {
  CommandPalette,
  type CommandPaletteGroup,
  type CommandPaletteItem,
  type CommandPaletteProps,
} from './patterns/command-palette';
export type { NavLinkRender } from './patterns/nav-link';
export {
  NavRail,
  type NavRailGroup,
  type NavRailItem,
  type NavRailProps,
} from './patterns/nav-rail';
export {
  PopoverAnchor,
  PopoverContent,
  type PopoverContentProps,
  PopoverRoot,
  PopoverTrigger,
} from './patterns/popover';

/**
 * FEAT-20260902-004 — the Tier-2 primitives, one file each, against `U4`'s
 * mapping table. Appended after the shell patterns for the same reason those
 * are appended after everything before them: this block and the one above it
 * were built in parallel worktrees, and keeping additions at the end is what
 * lets a merge conflict resolve as "keep both" rather than a judgment call.
 */
export { Tabs, TabsItem } from './primitives/tabs';
export { Badge } from './primitives/badge';
export { Progress } from './primitives/progress';
export { Table, TableCell, TableHead, TableRow } from './primitives/table';
export { Checkbox } from './primitives/checkbox';
export { Radio, RadioGroup } from './primitives/radio-group';
export { Disclosure } from './primitives/disclosure';
export { Tooltip } from './primitives/tooltip';
export { Avatar } from './primitives/avatar';
export { Separator } from './primitives/separator';
export { NumberInput } from './primitives/number-input';
export { DateInput } from './primitives/date-input';
export { AutoTextarea } from './primitives/auto-textarea';
export { fieldClassName } from './primitives/field-class-name';
