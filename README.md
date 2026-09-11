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
values the components already produce, named so the desk profile can move them
— it takes them to 32/28/28/28. `--size-tap` is 44px in both profiles and is
not one of them; see the next rule.

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
| `glass-ui/toolbar` | `Toolbar` — the bar above a collection: a view switcher, a filter area and a trailing action area, three slots and no more. Holds no state about the collection; the view switcher and filters scroll under `ScrollHintRow` at a narrow width while the trailing action stays reachable. |

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

## The data primitives

`E-104`, `V3`. Two of the four controls a list of records needs and the
package did not have — `Toolbar`, above, is the third; `Board` is the fourth
and arrives from its own slot.

| Import | What it is |
|---|---|
| `glass-ui/combobox` | `Combobox` — a typeahead over options, single and multiple. Controlled value, an async option source debounced with its pending state announced, a "no matches" sentence, and full keyboard operation: type to filter, arrows to move, Enter to select, Escape to close, Backspace to remove the last chip in multiple mode. `Select` stays — this does not replace it. |
| `glass-ui/inline-edit` | `InlineEdit` — text that becomes an input on click or on Enter, commits on Enter and on blur, reverts on Escape. The row's height is identical in both states, asserted in a test — the one difficulty this component exists to solve once. |

**`Combobox`'s keyboard model is `CommandPalette`'s, not `MenuContent`'s.**
Inside a listbox the keyboard stays on the field and moves the highlight
through `aria-activedescendant`; a `Menu` gives its rows roving focus and
`role="menuitem"`, which would give a screen reader two places to be at once.
The popup is a plain listbox for the same reason `CommandPalette`'s is, and
the highlight is clamped to the list that is actually rendered so
`aria-activedescendant` never names a row that has disappeared underneath it
(`BUG-20260823-306`, the same guard, applied a second time).

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
