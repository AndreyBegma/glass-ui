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

export { DepthOrigin } from './depth-origin';
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
  type UploadItem,
  type UploadState,
  type UseFileUpload,
  type UseFileUploadOptions,
  useFileUpload,
} from './hooks/use-file-upload';
export { useScrollEdges } from './hooks/use-scroll-edges';
export { useScrollIntoRow } from './hooks/use-scroll-into-row';
export { cn } from './lib/cn';
export type { Hue, HueClasses } from './lib/hue';
export { HUES, hueClasses, hueFor } from './lib/hue';
export { MaterialLight } from './material-light';
/**
 * FEAT-20260911-002 — the other six workspace patterns, from `v2-patterns`.
 * Appended after `Tree`'s block for the reason that block gives: the two were
 * built in parallel worktrees, and the merge kept both.
 */
export {
  AppRail,
  type AppRailItem,
  type AppRailProps,
} from './patterns/app-rail';
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
export {
  BottomCapsule,
  type BottomCapsuleAction,
  type BottomCapsuleMore,
  type BottomCapsuleProps,
  type BottomCapsuleTab,
} from './patterns/bottom-capsule';
export {
  Breadcrumb,
  type BreadcrumbItem,
  type BreadcrumbProps,
} from './patterns/breadcrumb';
/** #93 — `g93-material`'s canvas layer; the barrel is this slot's file. */
export { Canvas } from './patterns/canvas';
/**
 * #74 — the desk automation primitives. Appended, as every block above is.
 * `Chart` only: `CronInput` and `Terminal` are deliberately not here, because
 * they import the optional peers `cron-parser`, `cronstrue`, `@xterm/xterm` and
 * `@xterm/addon-fit`, and the barrel must never pull those in. Import them from
 * `glass-ui/cron-input` and `glass-ui/terminal`.
 */
export {
  Chart,
  type ChartLabels,
  type ChartPoint,
  type ChartProps,
  type ChartSeries,
  type ChartSeriesColor,
  type ChartTooltipContext,
} from './patterns/chart';
export {
  CommandPalette,
  type CommandPaletteGroup,
  type CommandPaletteItem,
  type CommandPaletteProps,
} from './patterns/command-palette';
export {
  type Column,
  DataTable,
  type DataTableProps,
  type DataTableSort,
  sortRows,
} from './patterns/data-table';
export {
  EmptyState,
  type EmptyStateAction,
  type EmptyStateProps,
} from './patterns/empty-state';
export {
  FileItem,
  type FileItemProps,
  type FileItemStatus,
  formatBytes,
} from './patterns/file-item';
/** #161 — the floating window and its geometry; `Launcher` is below, in order. */
export {
  FloatingWindow,
  type FloatingWindowLabels,
  type FloatingWindowProps,
} from './patterns/floating-window';
export {
  fit as fitFloatingWindow,
  type Rect as FloatingWindowRect,
  type ResizeEdge as FloatingWindowResizeEdge,
  type SizeLimits as FloatingWindowSizeLimits,
} from './patterns/floating-window-geometry';
export {
  isApplePlatform,
  KeyHint,
  type KeyHintProps,
  resolveKeys,
} from './patterns/key-hint';
export { Launcher, type LauncherProps } from './patterns/launcher';
export {
  type LogLine,
  LogViewer,
  type LogViewerLabels,
  type LogViewerProps,
} from './patterns/log-viewer';
export type { NavLinkRender } from './patterns/nav-link';
export {
  NavRail,
  type NavRailGroup,
  type NavRailItem,
  type NavRailProps,
} from './patterns/nav-rail';
export { PageHeader, type PageHeaderProps } from './patterns/page-header';
export { PeriodSwitcher, type PeriodSwitcherProps } from './patterns/period-switcher';
export {
  PopoverAnchor,
  PopoverContent,
  type PopoverContentProps,
  PopoverRoot,
  PopoverTrigger,
} from './patterns/popover';
/**
 * #139 — a controlled-width frame for a mockup iframe. Appended, as every block
 * above is.
 */
export {
  ResizableFrame,
  type ResizableFrameProps,
} from './patterns/resizable-frame';
export {
  type RowAction,
  RowActions,
  type RowActionsProps,
  rowActionsHost,
} from './patterns/row-actions';
export {
  SectionHeader,
  type SectionHeaderProps,
} from './patterns/section-header';
export { SectionUnavailable } from './patterns/section-unavailable';
/** #157 — the multi-select bar. Appended, for the reason every block above is. */
export {
  SelectionBar,
  type SelectionBarAction,
  type SelectionBarProps,
} from './patterns/selection-bar';
export {
  SidePanel,
  type SidePanelLabels,
  type SidePanelProps,
  type SidePanelState,
  useSidePanel,
} from './patterns/side-panel';
export { SplitPane, type SplitPaneProps } from './patterns/split-pane';
export {
  StatTile,
  type StatTileDelta,
  type StatTileProps,
} from './patterns/stat-tile';
/**
 * #93 — the controls slot. Appended, as every block above is: `g93-material`
 * appends its own block in a parallel worktree. `Select` is already exported
 * above, from `./primitives/field`; `./select` is the same component at its
 * own subpath.
 */
export {
  TabBar,
  type TabBarItem,
  type TabBarMore,
  type TabBarProps,
} from './patterns/tab-bar';
export {
  Timeline,
  type TimelineItem,
  type TimelineProps,
} from './patterns/timeline';
export { Toolbar, type ToolbarProps } from './patterns/toolbar';
export {
  type TraceNode,
  type TraceNodeKind,
  TraceTree,
  type TraceTreeLabels,
  type TraceTreeProps,
} from './patterns/trace-tree';
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
export { AutoTextarea } from './primitives/auto-textarea';
export { Avatar } from './primitives/avatar';
export { Badge } from './primitives/badge';
/**
 * FEAT-20260930-070 — the desk activity primitives. Appended, for the reason
 * every block above is: the four are built in parallel worktrees and the
 * barrel is the one file they would all otherwise collide on.
 */
export { Banner, type BannerProps } from './primitives/banner';
export { Button, buttonClassName } from './primitives/button';
export { Card } from './primitives/card';
export { Checkbox } from './primitives/checkbox';
export { Chip, ChipButton } from './primitives/chip';
export { CodeBlock, type CodeBlockProps } from './primitives/code-block';
/**
 * FEAT-20260911-003 — the data primitives (`E-104`, `V3`). Appended, for the
 * reason every block above it is: `v3-board` added `Board` to this same file
 * in its own worktree, and both sides keeping their lines at the end is what
 * makes the merge "keep both".
 */
export {
  Combobox,
  type ComboboxOption,
  type ComboboxProps,
} from './primitives/combobox';
export type { ConfirmDialogProps } from './primitives/confirm-dialog';
export { ConfirmDialog } from './primitives/confirm-dialog';
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
export { DateField, type DateFieldProps } from './primitives/date-field';
export { DateInput } from './primitives/date-input';
export { DialogContent, DialogRoot } from './primitives/dialog';
export { Disclosure } from './primitives/disclosure';
export {
  Field,
  Input,
  SearchField,
  Select,
  Textarea,
} from './primitives/field';
export { fieldClassName } from './primitives/field-class-name';
/**
 * #110 — file input. Appended, as every block above is. `FileDropzone` and
 * `FileItem` hold no product copy; `useFileUpload` holds no UI.
 */
export {
  FileDropzone,
  type FileDropzoneProps,
  type FileDropzoneState,
  type FileRejection,
  sortFiles,
} from './primitives/file-dropzone';
export {
  FlightLayer,
  type FlightOptions,
  useFlight,
} from './primitives/flight';
export { InlineEdit } from './primitives/inline-edit';
export {
  type KeyValueItem,
  KeyValueList,
  type KeyValueListProps,
} from './primitives/key-value-list';
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
export { NumberInput } from './primitives/number-input';
export { Progress } from './primitives/progress';
export { Radio, RadioGroup } from './primitives/radio-group';
/**
 * FEAT-20260916-608 — the range slider. Appended, for the reason every block
 * above is.
 */
export { RangeSlider, type RangeSliderProps } from './primitives/range-slider';
export { ScrollHintColumn } from './primitives/scroll-hint-column';
export { ScrollHintRow } from './primitives/scroll-hint-row';
export {
  SegmentedControl,
  SegmentedControlItem,
} from './primitives/segmented-control';
export { Separator } from './primitives/separator';
export { SheetContent, SheetRoot } from './primitives/sheet';
export { Skeleton } from './primitives/skeleton';
export { Slider } from './primitives/slider';
export { Sparkline, type SparklineProps } from './primitives/sparkline';
/**
 * FEAT-20260930-067 — the desk dashboard primitives. Appended, for the reason
 * every block above is: the seven are built in parallel worktrees and the
 * barrel is the one file they would all otherwise collide on.
 */
export { Spinner, type SpinnerProps } from './primitives/spinner';
/**
 * FEAT-20260924-680 — the motion vocabulary's JavaScript half (`G2`): named
 * springs, the flight layer and the tilt. Appended, for the reason every
 * block above is: `G1` is adding the CSS half beside it in its own worktree.
 */
export { SPRINGS, type SpringName } from './primitives/springs';
export { Table, TableCell, TableHead, TableRow } from './primitives/table';
/**
 * FEAT-20260902-004 — the Tier-2 primitives, one file each, against `U4`'s
 * mapping table. Appended after the shell patterns for the same reason those
 * are appended after everything before them: this block and the one above it
 * were built in parallel worktrees, and keeping additions at the end is what
 * lets a merge conflict resolve as "keep both" rather than a judgment call.
 */
export {
  NavTab,
  NavTabs,
  Tab,
  TabGroup,
  TabList,
  TabPanel,
  Tabs,
  TabsItem,
} from './primitives/tabs';
export {
  type TiltDirection,
  tiltFromDirection,
  useTilt,
} from './primitives/tilt';
export { TimeField, type TimeFieldProps } from './primitives/time-field';
export { ACHIEVEMENTS_TOASTER, Toaster, toast } from './primitives/toast';
export { Toggle } from './primitives/toggle';
export { Tooltip } from './primitives/tooltip';
