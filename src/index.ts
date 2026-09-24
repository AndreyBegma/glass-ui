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
export { DepthOrigin } from './depth-origin';
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
  MenuRadioGroup,
  MenuRadioItem,
  MenuRoot,
  MenuSeparator,
  MenuTrigger,
} from './primitives/menu';
export { ScrollHintRow } from './primitives/scroll-hint-row';
export { ScrollHintColumn } from './primitives/scroll-hint-column';
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
export { useScrollEdges } from './hooks/use-scroll-edges';
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

/**
 * FEAT-20260911-002 — the workspace patterns (`E-104`, `V2`). Appended, for
 * the reason the two blocks above are: `v2-patterns` is adding its six to
 * this same file in its own worktree, and both sides keeping their lines at
 * the end is what makes the merge "keep both".
 */
export {
  Tree,
  type TreeItem,
  type TreeLinkRender,
  type TreeProps,
  type TreeReorder,
} from './patterns/tree';

/**
 * FEAT-20260911-002 — the other six workspace patterns, from `v2-patterns`.
 * Appended after `Tree`'s block for the reason that block gives: the two were
 * built in parallel worktrees, and the merge kept both.
 */
export { AppRail, type AppRailItem, type AppRailProps } from './patterns/app-rail';
export {
  SidePanel,
  type SidePanelLabels,
  type SidePanelProps,
  type SidePanelState,
  useSidePanel,
} from './patterns/side-panel';
export {
  Breadcrumb,
  type BreadcrumbItem,
  type BreadcrumbProps,
} from './patterns/breadcrumb';
export {
  type RowAction,
  RowActions,
  type RowActionsProps,
  rowActionsHost,
} from './patterns/row-actions';
export {
  type ContextMenuAction,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuRoot,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from './primitives/context-menu';
export {
  isApplePlatform,
  KeyHint,
  type KeyHintProps,
  resolveKeys,
} from './patterns/key-hint';

/**
 * FEAT-20260911-003 — the board (`E-104`, `V3` decisions 4 and 5). Appended
 * for the reason every block above is: `v3-controls` is adding its three to
 * this same file in its own worktree, and both sides keeping their lines at
 * the end is what makes the merge "keep both".
 */
export {
  applyBoardMove,
  Board,
  type BoardCardItem,
  type BoardColumn,
  type BoardLabels,
  type BoardMove,
  type BoardMoveCommand,
  type BoardMoveIntent,
  type BoardProps,
  resolveBoardMove,
} from './patterns/board';

/**
 * FEAT-20260911-003 — the data primitives (`E-104`, `V3`). Appended, for the
 * reason every block above it is: `v3-board` added `Board` to this same file
 * in its own worktree, and both sides keeping their lines at the end is what
 * makes the merge "keep both".
 */
export { Combobox, type ComboboxOption, type ComboboxProps } from './primitives/combobox';
export { InlineEdit } from './primitives/inline-edit';
export { Toolbar, type ToolbarProps } from './patterns/toolbar';

/**
 * FEAT-20260916-608 — the range slider. Appended, for the reason every block
 * above is.
 */
export { RangeSlider, type RangeSliderProps } from './primitives/range-slider';

/**
 * FEAT-20260923-003 — the widget grid (`W1` decision 5). Appended, for the
 * reason every block above is: `maint/v0.8` and `develop` both carry it, and
 * keeping it at the end is what makes the cherry-pick "keep both".
 */
export {
  applyWidgetMove,
  resolveWidgetMove,
  resolveWidgetResize,
  WidgetGrid,
  type WidgetGridItem,
  type WidgetGridLabels,
  type WidgetGridProps,
  type WidgetMove,
  type WidgetMoveCommand,
  type WidgetMoveIntent,
  type WidgetResize,
  type WidgetResizeIntent,
} from './patterns/widget-grid';

/**
 * FEAT-20260924-680 — the motion vocabulary's JavaScript half (`G2`): named
 * springs, the flight layer and the tilt. Appended, for the reason every
 * block above is: `G1` is adding the CSS half beside it in its own worktree.
 */
export { SPRINGS, type SpringName } from './primitives/springs';
export {
  type FlightOptions,
  FlightLayer,
  useFlight,
} from './primitives/flight';
export {
  type TiltDirection,
  tiltFromDirection,
  useTilt,
} from './primitives/tilt';
