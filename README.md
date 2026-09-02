# glass-ui

The Liquid Glass design system, lifted out of Luna Watch so that more than one
application can be built from the same material.

Three layers, imported separately so an application can take the first two and
decline the third:

| Import | What it is |
|---|---|
| `glass-ui/tokens.css` | The palette, the radius, motion and type scales, and the z-index ladder. Declares its own `@source`, so a consumer does not have to know that Tailwind cannot see into `node_modules`. |
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
`text-ink` `text-ink-2` `text-ink-3`, `ok` `warn` `danger`, `rounded-control`
`rounded-surface` `rounded-sheet`. No hex, no `rgb()`, no `zinc-*`,
`violet-*`, `emerald-*`, `rose-*`, `yellow-*` or `blue-*`. This is enforced by a
test, not by review.

**New chrome is glass. Cards, grid items and rows are not.** Header, bottom bar,
sheets, dialogs, menus, overlays and player controls use `glass` or
`glass-strong`; anything carrying body text uses `glass-strong`. Glass on a card
is invisible against the flat ground and it costs a television its frame rate —
two hundred glass tiles on one page is why this rule is written down.

**The primary action is white** (`bg-ink text-ground`). The system was built for
an interface that sits on top of other people's artwork, where every poster on
screen is already competing for attention. Colour comes from the content.

**Do not define a focus ring, and never write `focus-visible:outline-none`.**
`base.css` puts a 3px white outline on `:focus-visible`, sized to be read across
a room from a television. Every hand-written ring that preceded it was thinner
and dimmer.

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
