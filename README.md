# glass-ui

The Liquid Glass design system, lifted out of Luna Watch so that more than one
application can be built from the same material.

Three layers, imported separately so an application can take the first two and
decline the third:

| Import | What it is |
|---|---|
| `glass-ui/tokens.css` | The palette, the radius, motion, density and type scales, the z-index ladder, and the three axes below. Declares its own `@source`, so a consumer does not have to know that Tailwind cannot see into `node_modules`. |
| `glass-ui/material.css` | `glass`, `glass-strong` and `lit`, and every fallback they need. |
| `glass-ui/base.css` | Opinions that apply to a whole document: the focus ring, the reduced-motion override, the depth effect under a sheet. Optional. |
| `glass-ui` | The primitives and `cn`. |

## The rules

These are not style preferences. Each one replaced something a codebase was
already doing badly, and the reason is worth more than the rule.

**Reach for a primitive before writing an element.** If none fits, extend the
primitive rather than writing a one-off. The point of the layer is that the next
change costs one file.

**Use tokens, never a raw colour.** `bg-ground` `bg-surface` `bg-raised`,
`bg-canvas` `bg-paper`, `text-ink` `text-ink-2` `text-ink-3`, `ok` `warn`
`danger`, `rounded-control` `rounded-surface` `rounded-sheet`. No hex, no
`rgb()`, no `zinc-*`, `violet-*`, `emerald-*`, `rose-*`, `yellow-*` or
`blue-*`. This is enforced by a test, not by review.

The accent tokens are the one part of the palette that is conditional — they
exist only under `data-scale="desk"`, and the rule about where they may be used
is below. `--size-*` is not a Tailwind namespace, so the density scale is read
as `h-[var(--size-row)]` rather than as a utility.

**A document is not a rung on the surface ladder.** `ground`, `surface` and
`raised` say how far a panel sits from the back of the window. A page is a
different kind of thing — a sheet with an edge, lying on a desk — and an editor
built out of `raised` on `ground` never quite reads as one. Two tokens say it
instead:

| Token | Role | Light | Dark |
|---|---|---|---|
| `canvas` | What a page lies on — the desk, not a panel. | `#ececef` | `#09090c` |
| `paper` | The page itself. Body text goes on this. | `#ffffff` | `#1a1a21` |

Each theme grounds one end of the pair, which is the symmetry and not an
oversight: in light the page *is* the ground and the desk is darkened behind
it; in dark the desk is the ground and the page is lifted off it. Both lift it
by about the same amount — ΔL\* 6.53 in light, 7.02 in dark — so a document
carries the same weight in either theme. `ink` on `paper` measures 17.72:1 in
light and 15.50:1 in dark, and `tokens.spec.ts` holds that above 12:1 in every
value set.

**New chrome is glass. Cards, grid items and rows are not.** Header, bottom bar,
sheets, dialogs, menus, overlays and player controls use `glass` or
`glass-strong`; anything carrying body text uses `glass-strong`. Glass on a card
is invisible against the flat ground and it costs a television its frame rate —
two hundred glass tiles on one page is why this rule is written down.

**The primary action is white** (`bg-ink text-ground`). The system was built for
an interface that sits on top of other people's artwork, where every poster on
screen is already competing for attention. Colour comes from the content. Under
the desk profile it is the accent instead — see the two rules below.

**Three axes, each unset by default.** The document carries `data-theme`,
`data-material` and `data-scale`, and every one of them does nothing until an
application sets it. That is not politeness, it is how two products share one
token layer without either being able to move the other.

| Attribute | Unset | Set | What it changes |
|---|---|---|---|
| `data-theme` | follows the system | `light` / `dark` | the palette |
| `data-material` | glass | `flat` | the material, and nothing else |
| `data-scale` | the sofa | `desk` | radii, motion, hairlines, density, and the accent |

`data-scale="desk"` is Denitsa's. Luna Watch never sets it and is therefore
untouched by everything under it — structurally, not by agreement.
`tokens.spec.ts` holds every token in the base set to its value at `3d1c78e`
and holds the desk profile to exactly the list it is allowed to change, so both
halves of that claim fail a build rather than a review.

What the desk profile is for: this system was designed to be read across a room
from a television, and Denitsa is read at 60cm. A radius that gives a card a
silhouette at four metres reads as a toy at arm's length; a 420ms sheet that
feels considered from a sofa is a wait at a desk. Radii go 6/8/12, durations
100/150/260, hairlines get heavier and hover gets lighter, and the density
scale drops a row from 40px to 32.

**The accent is desk-only, and it has four places.** `--color-accent`,
`--color-accent-ink` and `--color-accent-soft` are defined under
`data-scale="desk"` and are **undefined everywhere else** — a component that
reads one outside the desk profile gets nothing, loudly, which is deliberate.
The four places, and there is no fifth:

| Where | Which token |
|---|---|
| The active navigation item | `--color-accent`, or `--color-accent-soft` behind it |
| A selection — a chosen row, a picked option | `--color-accent-soft` |
| The primary action's fill | `--color-accent`, label in `--color-accent-ink` |
| A link | `--color-accent` |

It is not a decorative colour. It does not go on a chart, a badge, an icon that
is merely present, an empty state, or a border that wants to look important.
`--color-ok`, `--color-warn` and `--color-danger` keep their meanings and the
accent does not join them — **an accent is not a semantic**, and a colour that
means both "primary" and "this one is fine" means neither.

`--color-accent-ink` flips with the theme and is near-black in dark. That is
not a slip: in dark, "white text on the accent" and "the accent readable on
`--color-raised`" cannot both be true of any colour of any hue, so the accent
sits where `ink` already sits in each theme — a bright fill with dark text in
dark, a dark fill with white text in light. Never write anything on the accent
in a colour of your own choosing; `--color-accent-ink` is the only one measured
against it.

**Hit area, visual size and the density scale are three different things.**
`--size-row` (40px, a list row), `--size-control` (40px, a button),
`--size-field` (44px, an input) and `--size-nav` (40px, a rail item) are the
values the components produce, named so the desk profile can move them — it
takes them to 32/28/28/28. `--size-tap` is 44px in both profiles and is not
one of them; see the next rule.

- `Button`'s `md` reads `h-(--size-control)`; `lg` stays one documented step
  above it, `calc(var(--size-control) + 8px)`, and is not part of the scale.
- `Field`'s `Input`, `Select` and `SearchField` read `h-(--size-field)`.
- `Menu`'s rows read `h-(--size-row)`, the line box centred rather than
  pinned by padding, so it still centres at the desk rung's 32px.

**Do not define a focus ring, and never write `focus-visible:outline-none`.**
`base.css` puts a 3px white outline on `:focus-visible`, sized to be read across
a room from a television. Every hand-written ring that preceded it was thinner
and dimmer. Form elements and `contenteditable` editors are the only exemption
— they draw their own focus indicator (a caret, or a consumer's selected-node
state), and `base.css` already exempts them.

**Hit area and visual size are separate.** `Button` carries an invisible `after:`
pseudo-element that extends the touch target to 44px and disappears on a fine
pointer. Forcing every control to 44px instead makes a dense toolbar look like a
phone keyboard.

**No emoji as iconography.** `lucide-react` is the icon set. Emoji render as
somebody else's artwork at an unpredictable weight and cannot be recoloured or
aligned.

## Consuming it

The package ships TypeScript source and is not built. A bundler must be told to
transpile it — in Next, `transpilePackages: ['glass-ui']`.

`lucide-react` is a peer dependency on a permissive range on purpose: its icon
names have moved between major versions, and an application should be able to
upgrade its icons without waiting for this package.

## The shell patterns

Four components that draw an application's chrome, and one hook. They are in
the package rather than in an application because `E-92` settles that the
shell's *parts* are shared even though its *information architecture* is not:
Luna Watch has four places to be and Denitsa has twenty-one, and both draw them
with the same capsule, the same rail and the same palette.

| Import | What it is |
|---|---|
| `glass-ui/bottom-capsule` | `BottomCapsule` — the floating glass capsule for narrow widths: up to four tabs, an optional round action button, an overflow `More` sheet. |
| `glass-ui/nav-rail` | `NavRail` — the vertical glass rail for wide widths: groups with headings, an optional collapse to icons. |
| `glass-ui/command-palette` | `CommandPalette` — a dialog with a search field, grouped results and arrow-key roving. |
| `glass-ui/use-command-palette-shortcut` | `useCommandPaletteShortcut` — ⌘K / Ctrl-K, bound once by the shell. |
| `glass-ui/popover` | `PopoverRoot` / `PopoverTrigger` / `PopoverContent` — an anchored, non-modal `glass-strong` panel. |
| `glass-ui/nav-link` | The `NavLinkRender` type the two navigation patterns take. |
| `glass-ui/tree` | `Tree` — the WAI-ARIA tree: nested rows, controlled expansion and selection, one tab stop, arrows / Home / End / type-ahead, a per-row actions slot, and drag-to-reorder that is off until `enableReorder` says otherwise. |

Three rules run through all of them, and each one is the answer to something
that went wrong before the pattern existed.

**The pattern draws the chrome; the consumer draws the anchor.** No routed
`Link` is imported here — `BottomCapsule` and `NavRail` take one `link`
function and call it for every item that carries an `href`. An item with no
`href` renders a `button`. This is `SegmentedControlItem`'s contract, scaled
past one item. A package that imported `next/link` would be a package for
exactly one application.

**They hold no state.** Which tab is selected, whether the overflow sheet is
open, whether the palette is open, whether the action's surface is up — all of
it is the consumer's, because all of it is a fact about routing and panels
rather than about a bar. It is also what makes the morph work: the action
circle has to unmount at the exact moment the sheet carrying its `layoutId`
mounts, and only the thing that owns both can promise that.

**Exactly one element carries a `layoutId` at a time.** Two is the single case
Motion cannot resolve — it crossfades, which looks exactly like no animation
having been written, and it fails silently. `BottomCapsule` enforces it: while
the `More` sheet is open, `More` holds the selection and the tabs do not.

`CommandPalette` knows nothing about content. It takes one function from a
query to groups and calls it; ranking, debouncing, budgets and which sources
are consulted are all product decisions and all the consumer's. A promise puts
the list into a pending state that draws `Skeleton` rows, and a result that
arrives after a newer one is dropped.

**Every string a pattern writes itself can be replaced, and English is only
the default.** The palette's hidden live region reads `'Searching'` and
`` `${n} results` `` unless `liveStatus={{ searching, results: (n) => … }}` says
otherwise. Pass both strings, because a region that is half translated is
worse than one that is all English. `Toaster` hands `containerAriaLabel` to
sonner, whose own default is `'Notifications'`. Neither prop changes anything
for a consumer that leaves it out.

**`BottomCapsule`'s `tabSizing` decides how the row shares its width.** The
default is `'equal'`: every tab and `More` gets the same slice, and a label
that does not fit its slice is truncated. `'content'` sizes each one to its
label (`flex-auto`, `px-1.5`) and never truncates; a label that still cannot
fit wraps instead. This is for languages whose words are longer than "Today".

`Popover` is **not** a menu. A menu is a list of commands and Radix gives it
roving focus, type-ahead and `role="menuitem"`; a popover is a panel whose
content has structure of its own — a heading, a list, an action, an empty
state. If the content is a list of commands, `MenuContent` is the right
component. It is also non-modal by default, for the reason `MenuRoot` is:
Radix's `modal` locks the page's scroll, and the scroll lock is the mark
`base.css` reads to push the page back behind a sheet.

### Render tests

The package's first. `bun test` gains a DOM through `bunfig.toml`'s preload of
`src/test-setup.ts` (happy-dom, plus the handful of browser APIs Radix calls
unconditionally). One `*.test.tsx` per pattern covers the behaviour the
specification asks for: the capsule travelling, the action circle unmounting,
group headings and the collapsed rail's names, ⌘K, filtering, arrow roving,
Enter, Escape and focus return, and the popover's four dismissal paths.

The primitives are not back-filled; they arrive with their own row.

## Fixes from the second consumer

Six contracts Denitsa's shell hit and worked around consumer-side, filed as
[#11](https://github.com/AndreyBegma/glass-ui/issues/11) (`FEAT-20260902-004`)
and closed by this pull request. Each package answer:

- `NavRail`'s collapsed items name themselves through `Tooltip`, not a native
  `title=`.
- `Badge`'s `dot` variant paints the solid semantic token, not a 14 % tint;
  `NavRail`'s unavailable marker is `Badge dot` rather than its own span.
- `SegmentedControl` takes a `role` passthrough, dropping its own `<ul>` for
  a `<div>` carrying that role, and the items follow the wrapper; `menu.tsx`
  gains `MenuRadioGroup` / `MenuRadioItem` on Radix's `RadioGroup`/`RadioItem`,
  so a one-of-many row inside a menu roves and reads correctly.
- `SheetContent` takes a `pad` prop (`md` default, `none` for a body that
  carries its own row padding) — the `Card` `pad` shape.
- `Checkbox` takes `children` as a rich label and a `description` slot; the
  plain-string `label` keeps working.
- `Progress` takes a `tone: neutral | ok | warn | danger` — the `Badge` set —
  on its fill; `neutral` is today's `bg-ink`.

## The workspace patterns

`E-104` makes Denitsa a workspace, and a workspace needs a two-level shell and
the parts a dense list of objects is worked with. Seven components, none of
which had an ancestor in this package (`V2`). `E-92`'s line holds: these are
*parts*; the layout that arranges them is the application's.

| Import | What it is |
|---|---|
| `glass-ui/app-rail` | `AppRail` — the strip of applications above the rail: icon-only, always visible, the active item carrying the accent. |
| `glass-ui/side-panel` | `SidePanel` — a collapsible, resizable column with its width and collapse state persisted; `useSidePanel()` for a consumer's own control. |
| `glass-ui/breadcrumb` | `Breadcrumb` — the trail, with a measured collapsing middle behind an overflow `Menu` and the last item as the page. |
| `glass-ui/row-actions` | `RowActions` and `rowActionsHost` — a row's affordances, revealed on hover, focus-within, selection, and always on a coarse pointer. |
| `glass-ui/context-menu` | `ContextMenuRoot` / `Trigger` / `Content` / `Item` / `Separator` / `Label` / `RadioGroup` / `RadioItem` — the right-click menu on `Menu`'s exported styling. |
| `glass-ui/key-hint` | `KeyHint` — a shortcut as key caps; `Mod` is `⌘` on Apple and `Ctrl` elsewhere. |

Five rules, each the answer to something that was already going wrong.

**The accent's first place is `AppRail`'s active item, and only under the
desk.** The glyph reads `--color-accent` and the capsule `--color-accent-soft`,
each through a `var()` whose fallback is the sofa's look for the same place —
`NavRail`'s `bg-hover` capsule and `ink`. Under `data-scale="desk"` it is the
accent; under nothing it is exactly `NavRail`. That is not a fifth use: it is
the same place, drawn the way that profile already draws it. Note that the
accent tokens are declared under the desk selector rather than in `@theme`, so
Tailwind emits no `bg-accent-*` utility for them — every read is an arbitrary
`var()`, as the density scale already is.

**Unavailable is marked, still navigable, never hidden — one level up.**
`AppRail` keeps `NavRail`'s rule to the letter (`E-50`): a `warn` dot on the
glyph, the consumer's phrase after the label for a reader, and the item keeps
its `href`. This is the first time a failing service is legible at a glance
rather than as one dimmed row in a list of twenty-three, and `V4` inherits it
from here.

`AppRail` takes `footerApps?: readonly AppRailItem[]` for the application that
belongs in the rail's footer rather than its body — `memory`, in `V4` D2.
It is drawn under a separator, pinned under the scroll, with the same item
the body uses: `activeId`, `link`, `unavailable` and the travelling capsule
all behave exactly as they do above, because it is the same rendering code
and not a second copy of the item. `footer?: ReactNode` still renders below
it, for the avatar or the settings door that is not an application. Tab order
follows the DOM: body items, then `footerApps`, then `footer`.

**Revealing is a visual state, never a DOM state.** `RowActions` is
`opacity-0` until the row is hovered, focused within, selected (the prop, or
`aria-selected` on the row) or the pointer is coarse — and it is *never*
`hidden`, `invisible`, `sr-only` or `aria-hidden`. The buttons are in the
accessibility tree at all times, Tab lands on them, and a phone sees them
always, because a hover-only affordance on a phone is an affordance that does
not exist. The row wears `rowActionsHost`; the cluster cannot select its own
parent.

**Every right-click action has a visible affordance.** `ContextMenuContent`
and `RowActions` take the same `actions` list, so a row built from one list
offers the same commands under the pointer as in its cluster — a property of
the shape rather than a promise about it. A consumer composing
`ContextMenuItem`s by hand keeps the obligation by hand, and a reviewer checks
it. Shift+F10 and the Menu key fire the same `contextmenu` event a mouse does,
so the keyboard opens it with nothing added.

**Collapsing to zero is not possible.** `SidePanel`'s `minWidth` is a prop;
dragging past half of it produces the strip, which carries the expand button
and never goes away, and the handle — the WAI-ARIA window splitter: arrows,
Home, End, Enter — stays with it, so a keyboard has the same way back a
pointer does. The panel owns and persists `{ width, collapsed }` under a
required `storageKey`; it does not own its contents and does not know what an
application is.

A route that needs the panel collapsed for as long as it is mounted — over
the stored preference, without writing it — passes `override?: boolean`:
`true` collapsed, `false` open, `undefined` (the default) today's behaviour
exactly. While `override` is set, the stored preference is neither read for
`collapsed` nor written to; the handle and the collapse/expand controls may
still move the visible state, but none of it reaches storage, and `width`
keeps persisting as it always did. `useSidePanel().collapsed` reports this
effective state. When `override` goes back to `undefined`, the stored
preference applies again on the next render.

`Breadcrumb` measures rather than counts: the list is `overflow-hidden`, a
layout effect folds one more middle item while `scrollWidth` exceeds
`clientWidth`, and a `ResizeObserver` unfolds on resize. The trail lives in a
column whose width a `SidePanel` decides, so a breakpoint would be measuring
the wrong thing. The first and last items never fold; the last is
`aria-current="page"` and not a link whether or not it was given an `href`.

## The data primitives

`V3`. `V2` gives the shell its parts; this row gives the *contents* theirs —
the controls a list of records needs and the package did not have.

| Import | What it is |
|---|---|
| `glass-ui/board` | `Board` — columns with a scrollable stack of cards in each, a header and a footer slot per column, drag between and within columns, and a card menu that moves the card without a pointer. `resolveBoardMove` is the reducer; `applyBoardMove` is the remove-then-insert a consumer's state needs. |
| `glass-ui/toolbar` | `Toolbar` — the bar above a collection: a view switcher, a filter area and a trailing action area, three slots and no more. Holds no state about the collection; the view switcher and filters scroll under `ScrollHintRow` at a narrow width while the trailing action stays reachable. |
| `glass-ui/combobox` | `Combobox` — a typeahead over options, single and multiple. Controlled value, an async option source debounced with its pending state announced, a "no matches" sentence, and full keyboard operation: type to filter, arrows to move, Enter to select, Escape to close, Backspace to remove the last chip in multiple mode. `Select` stays — this does not replace it. |
| `glass-ui/inline-edit` | `InlineEdit` — text that becomes an input on click or on Enter, commits on Enter and on blur, reverts on Escape. The row's height is identical in both states, asserted in a test — the one difficulty this component exists to solve once. |

Three rules, and the first is the acceptance criterion the specification
says gets dropped.

**The keyboard path is not drag.** Every card carries a `RowActions` cluster
with one `Menu` trigger — in the DOM and the tab order at all times, revealed
for the eye on hover, focus-within and a coarse pointer — and the menu moves
the card: up, down, top, bottom, and one item per other column. A drop and a
menu item are two *intents* to one pure reducer, `resolveBoardMove`; both are
normalised there and both reach `onMove` through the same exit, so the two
paths cannot produce different moves, and the test file asserts they do not.
The result is read by an `aria-live` region after every move, whichever input
produced it, and focus follows the card into its new column.

**Cards are not glass.** The card is `Card raised`'s surface and the variant
is not a prop. The rule above — new chrome is glass; cards, grid items and
rows are not — is the one a board is most likely to break, because a column
of translucent cards is the screenshot everybody wants and the frame rate
nobody does. A test walks every card and everything inside it. The card's
menu is glass, because it is a menu.

**It holds no state that is a fact about the data.** `columns` is controlled
and `onMove` reports `{ id, fromColumnId, toColumnId, index }`, where `index`
is the position the card takes **after** it has left where it was —
`TreeReorder`'s convention — so a move that changes nothing is never
reported. `labels` is optional with English defaults, and the defaults are
for this package's own tests: Denitsa's consumers pass every one of them.

Three more, one per remaining component.

**`Toolbar` holds no state about the collection either.** What a view *means*,
which filters are active, what the trailing action does are all the
application's — `Toolbar` is layout and slots, the same contract `BottomCapsule`
and `NavRail` keep for the shell.

**`Combobox`'s keyboard model is `CommandPalette`'s, not `MenuContent`'s.**
Inside a listbox the keyboard stays on the field and moves the highlight
through `aria-activedescendant`; a `Menu` gives its rows roving focus and
`role="menuitem"`, which would give a screen reader two places to be at once.
The popup is a plain listbox for the same reason `CommandPalette`'s is, and
the highlight is clamped to the list that is actually rendered so
`aria-activedescendant` never names a row that has disappeared underneath it
(`BUG-20260823-306`, the same guard, applied a second time).

**`InlineEdit`'s row height is identical in both states, asserted in a test.**
One class, `h-[var(--size-field)]`, shared byte-for-byte by the display button
and the edit input — that is the whole difficulty, and the reason this is a
component rather than a pattern repeated per screen.

## The widget grid

`W1`. Denitsa's Today becomes a grid of widgets that the person arranges.
`Board` is a column kanban and cannot be bent into a grid that resizes. So
this is a pattern of its own, tagged on `maint/v0.8` (`v0.8.6`) and carried
to `develop`.

| Import | What it is |
|---|---|
| `glass-ui/widget-grid` | `WidgetGrid` is a controlled grid of 1–4 columns. The person reorders its items with a grip (pointer and touch) or a menu, and makes them wider or narrower with a separator (pointer and keys) or the same menu. `resolveWidgetMove` and `resolveWidgetResize` are the reducers. `applyWidgetMove` is the remove-then-insert that a consumer's state needs. |

```tsx
const columns = useColumns(); // the consumer's breakpoint: 4 · 2 · 1
const [widgets, setWidgets] = useState(layout);

<WidgetGrid
  aria-label="Today"
  items={widgets}               // { id, label, span, minSpan? }[], in order
  columns={columns}
  arranging={arranging}
  resizable={columns > 1}
  renderItem={(w) => <WidgetFrame kind={w.id} />}
  renderItemMenu={(w) => <MenuItem onSelect={() => hide(w.id)}>Hide from Today</MenuItem>}
  onMove={(move) => setWidgets((ws) => applyWidgetMove(ws, move))}
  onResize={({ id, span }) =>
    setWidgets((ws) => ws.map((w) => (w.id === id ? { ...w, span } : w)))}
  labels={{ moved: (w, n, of) => t('announceMoved', { widget: w.label, n, of }) }}
/>
```

Five rules.

**Width is what resizes, and height follows content.** The grid is
`repeat(columns, minmax(0, 1fr))` with `align-items: start`, and an item spans
`min(span, columns)`. Nothing writes a height and nothing scrolls inside an
item. A short item beside a tall one leaves a gap under it, and that is
accepted. There is no `dense` packing, so reading order is layout order. The
stored `span` is the consumer's, and it never changes because the viewport
did.

**One reducer per axis, two inputs each.**
- A grip drag is a `drop` intent with the raw slot under the pointer. A menu
  item is a `command` intent. Both become a `WidgetMove` in
  `resolveWidgetMove` and nowhere else.
- A separator drag is a `set` intent, snapped to the grid's measured columns.
  The separator's keys and *Wider* / *Narrower* are `step` intents. Both
  become a `WidgetResize` in `resolveWidgetResize`.
- The test file asserts that the two inputs produce deep-equal results from
  the same state.
- Every committed change is read out by an `aria-live` region, and after a
  move focus returns to the item's menu trigger.
- The resize bounds are the *drawn* ones, `min(minSpan, columns)` to
  `columns`. At two columns *Wider* never offers a step that changes nothing
  on screen.

**Arrange mode is where the controls are, and the keyboard path is not
drag.** With `arranging` off, an item is its content and nothing else. With it
on, the content is `inert` and dimmed, and three controls appear:
- a grip;
- a menu: move up, down, to the top and to the bottom, *Wider*, *Narrower*,
  then the consumer's own items;
- a trailing-edge `role="separator"`, `SidePanel`'s window splitter stepped
  in columns (arrows, Home, End).

With `resizable` off (the phone), there is no separator and no *Wider* /
*Narrower*.

**Touch is Pointer Events, not HTML5 drag and drop, and only the grip takes
the touch.** The grip alone is `touch-action: none`, so a swipe that starts on
an item's body scrolls the page. A drag moves no DOM node: pointer capture
would be lost with it. The preview is drawn with CSS `order`, with a dashed
placeholder at the slot, and the slot is read against the boxes measured when
the drag began. Escape abandons a drag. Hit areas are `--size-row` at the desk
and 44px on a coarse pointer.

**Grid items are not glass.** In arrange mode an item is `Card raised`'s
surface. A test walks every item and everything inside it. The menu is glass,
because it is a menu.
