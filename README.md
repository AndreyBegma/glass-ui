# glass-ui

The Liquid Glass design system, lifted out of Luna Watch so that more than one
application can be built from the same material.

Three layers, imported separately so an application can take the first two and
decline the third:

| Import | What it is |
|---|---|
| `glass-ui/tokens.css` | The palette, the radius, motion, density and type scales, the z-index ladder, and the three axes below. Declares its own `@source`, so a consumer does not have to know that Tailwind cannot see into `node_modules`. |
| `glass-ui/material.css` | `glass`, `glass-strong`, `glass-clear` and `lit`, and every fallback they need. |
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

The material has three rungs of scrim on one renderer (FEAT-20260919-618), and
the gate is what decides which one a surface may use — measured for
`--color-ink` on the worst of five bands, white being the worst for dark:

| Utility | Blur | Holds | For |
|---|---|---|---|
| `glass` | 26px | 4:1 | chrome that sits behind content and carries a label or a clock: the header, the bottom bar, the player's control bar, the catalogue rail |
| `glass-strong` | 40px | 5:1 | surfaces that carry a whole interaction and body text: sheets, dialogs, menus, toasts, popovers |
| `glass-clear` | 26px | 3:1 (a graphic) | icon-only chrome directly over a picture: the player's discs, the seek bar's time bubble, the skip pills |

All three carry the rim, the meniscus and the refraction ring, and all three
resolve to an opaque `raised` panel under `prefers-reduced-transparency`,
`data-material="flat"` and a browser without `backdrop-filter`. A paragraph
never goes on `glass-clear`. The rim scales with the surface
(BUG-20260919-626): on `glass-strong`, which is always a large rectangle, the
straight run reads the quieter `--glass-rim-strong` / `--glass-rim-shade-strong`
pair and the light is gathered on the top-left corner by a negative-spread
inset — the 1px offset that is a crescent on a disc is a ruler line on a
sheet.

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

## Motion

FEAT-20260916-598. Motion is a vocabulary, not a set of effects: a load, a
list and a swap are the same gesture in every application built on this
package, and the gesture is declared once, in `glass-ui/motion.css`.

**The rule.** Only `opacity` and `transform` animate — both are composited,
so a television pays one layer per animated item and nothing per frame after
the entrance. Every duration and every curve is a token. Everything that
moves is inside `prefers-reduced-motion: no-preference`; under `reduce`
nothing translates or scales, and nothing can stay hidden. Keyframes are
declared in `motion.css` and nowhere else, under the `luna` prefix.

**Nothing rests with a transform.** An entrance keyframe has a `from` and no
`to`, so it lands on the element's own computed values and leaves nothing
applied afterwards — a poster at `opacity-60` arrives at 0.6, a card keeps its
press. A class that rested at `translateY(0)` would be a permanent containing
block for every `position: fixed` descendant; `.luna-rise-in` rests at
`transform: none` for exactly that reason.

| Token | Value | Use |
|---|---|---|
| `--ease-sheet` | `cubic-bezier(0.32, 0.72, 0, 1)` | something sliding to a stop: a sheet, the page going back, a focus lift |
| `--ease-out-expo` | `cubic-bezier(0.23, 1, 0.32, 1)` | something appearing: a dialog, a menu, a popover, a row's cascade |
| `--dur-fast` `--dur-base` `--dur-sheet` | 140 / 220 / 420ms (100 / 150 / 260 at the desk) | the three durations |

| Keyframe | Motion | Used by |
|---|---|---|
| `lunaFadeIn` / `lunaFadeOut` | opacity | the scrim under a dialog or sheet |
| `lunaDialogIn` / `lunaDialogOut` | scale 0.96 → 1, centred | `Dialog`, `CommandPalette` |
| `lunaPopIn` / `lunaPopOut` | scale 0.94 → 1 from the trigger's origin | `Menu`, `Popover`, `Tooltip`, `ContextMenu` |
| `lunaRiseIn` | up 8px and in, `from` only | `.luna-stagger` |
| `lunaDropIn` | down 2px and in, `from` only | a disclosure body opening under its heading (was `base.css`'s `fadeIn`) |
| `lunaImgIn` | opacity, `from` only | `.luna-img-in` |
| `lunaPulseOut` | scale 1 → 1.4 and out | a one-shot centre confirmation in a player |
| `lunaDriftA` … `lunaDriftD` | four closed `transform` paths, `none` at both ends, no duration of their own | an aurora behind a page with no artwork (FEAT-20260916-609); the consumer supplies the tens-of-seconds duration |
| `lunaDriftE`, `lunaDriftF` | two more closed `transform` paths for a layer that fills the viewport: travel ≤ 2.5%, scale 1.00–1.07, no rotation | a drifting wash (FEAT-20260916-611); same contract as `A`–`D` |
| `lunaBreathe` | opacity 1 → 0.8 → 1, `from` and `to` at 1 | a second animation on a drifting blob (FEAT-20260916-611); the consumer supplies the duration |

| Class | What it is for | Under `reduce` |
|---|---|---|
| `.luna-rise-in` | content replacing a skeleton: a transition from `@starting-style`, no mounted flag needed | shortened to nothing by `base.css` |
| `.luna-stagger` | a row or grid arriving as a cascade; the consumer sets `--i` per item, delay is `min(--i, 12) × 30ms`, `backwards` fill so an item is invisible until its turn and nothing stays applied after; runs once per insertion, so stable keys mean a re-render does not replay it | absent — the list is simply there |
| `.luna-img-in` | artwork fading in on load: `data-loaded="false"` hides it while pending, `"true"` plays the fade, no attribute is simply visible. An **animation**, not a transition, so it coexists with a hover transition on the same `<img>`; `.motion-reduce-keep` therefore does not apply and is not needed | absent — the image appears when loaded, never hidden |
| `.luna-focus-lift` | `scale(1.04)` on `:focus-visible` over `--dur-fast` `--ease-sheet`, for a television whose only focus feedback was the outline; no hover gate, no ring of its own. **Owns the element's `transition` shorthand** — do not put it on an element that already transitions (`transition` does not merge across rules) | absent |

`motion.spec.ts` holds all of this: every name declared, everything that
moves gated, no literal curve or duration anywhere in `src/`, `base.css` with
no keyframes of its own.

### The sliders

FEAT-20260916-608. One look, two components, one stylesheet
(`src/primitives/slider.css`), in the iOS 26 shape: a 6px `line-strong`
track with an `ink` fill, a round `ink` thumb with a one-pixel `line` rim and
the material's shadow — 28px on the sofa, 20px at the desk, never under
`--size-tap` to a finger — that grows to 1.15 while it is being dragged and
brightens the track one step. `touch-action: pan-y`, so a thumb drag in a
sheet does not scroll it and a vertical swipe still does. The elastic
end-stretch iOS does is deliberately not built: it needs a frame loop.

| Import | What it is |
|---|---|
| `glass-ui/slider` | `Slider` — one thumb, the native `<input type="range">` with its props untouched: `value`, `onChange(event)`, `min`/`max`/`step`, `disabled`, `aria-*`, and the caller's `className` on the element itself. A remote and a screen reader already understand it. |
| `glass-ui/range-slider` | `RangeSlider` — two thumbs on one track, on Radix `Slider` (a peer). `value: [lo, hi]`, `onValueChange`, `onValueCommit` (the release, and every keyboard step — fetch on this one), `min`/`max`/`step`, `thumbLabels` (required, the two accessible names in the application's language), `formatValue(value, thumb)` for `aria-valuetext`, `disabled`. |

**The thumbs never cross.** `value[0] <= value[1]` always. With a pointer a
thumb dragged into the other stops there and the drag continues on the
other (Radix's model). With a keyboard the *focused* thumb moves — arrows by
`step`, PageUp/PageDown and Shift by ten, Home and End to its own end — and
stops at the other thumb. That keyboard layer is this package's, in front
of Radix, because Radix's Home and End move the first and last thumb
whichever one has focus, and its arrows hand focus across when the thumbs
meet; on a television both read as the wrong thumb moving.

**The focus ring is `base.css`'s.** On a `RangeSlider` thumb it lands as it
does on any focusable span. On the native `Slider` `base.css` blanks it
along with every other input, so `slider.css` restates the same ring —
the same variables, the same width and offset — on the thumb
pseudo-elements. A consumer declares none in either case.

`slider.test.tsx` and `range-slider.test.tsx` hold the markup, the keyboard
and the stylesheet's contract: only `transform` transitions, inside the
reduced-motion gate; every duration, curve and colour a token.

### The scroll hints

| Import | What it is |
|---|---|
| `glass-ui/scroll-hint-row` | `ScrollHintRow` — a horizontal scroll box with `scrollbar-hide` that fades its left and right edges only while there is more on that side. |
| `glass-ui/scroll-hint-column` | `ScrollHintColumn` — the same on the vertical axis: a capped scroll box (a sticky filter rail) that fades its top and bottom edges only while there is more. `wrapperClassName` takes a `rounded-*` so the fades stay inside a card's corners. |
| `glass-ui/use-scroll-edges` | `useScrollEdges(axis)` — the one measurement both read: `{ ref, edges: { start, end }, onScroll }`, under a `ResizeObserver` on the box and its children, with four pixels of slack for rounding. |

The fades are `aria-hidden`, `pointer-events-none`, always mounted, and move
only their opacity over `--dur-fast`; `edgeClassName` is the `from-*` token of
the surface behind the box. `scroll-hint.spec.ts` holds that contract for
both.

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

`SegmentedControlItem` and `TabsItem` both take a `className`, merged after
their own `relative min-w-0 flex-1`. `flex-none whitespace-nowrap` is the
opt-out for a row whose width nobody set — the item keeps its label whole
instead of collapsing to the narrowest width `min-w-0` allows (BUG-20260914-578
for `TabsItem`, BUG-20260916-607 for `SegmentedControlItem`).

`SegmentedControl` takes `variant: 'surface' | 'glass'` (FEAT-20260916-612).
`surface`, the default, is the opaque well it always was — the strings are
held to the byte by its test. `glass` is the header's material as a pill:
the `glass` utility at `rounded-full`, and the travelling capsule as
`bg-hover`, the same lift `BottomCapsule` and an active header section use
on glass — `bg-raised` was measured within 1/255 of the glass composite at
idle and does not read. It is for a switch that sits on the page beside a
glass header. Two things it is not: a row that wraps (two rows inside a
pill put their corners outside its curve — keep `surface` for a wrapped
control), and a control inside another glass surface (it carries a
`backdrop-filter`; one blur per stack).

For a control *inside* a glass surface there is `variant="on-glass"`
(BUG-20260916-613), and the field family — `Input`, `Textarea`, `Select`,
`SearchField`, and `fieldClassName(className, tone)` — takes
`tone: 'surface' | 'on-glass'` for the same reason. `surface` and `raised`
are the flat ground's lifts; on a glass composite they land below the
panel and read as holes. `on-glass` is the header's recipe turned inward:
the segmented well is a `line` hairline with no fill and its capsule is
`bg-hover`, measured +22/255 over the shell on `glass` and `glass-strong`
alike; a field's fill is `bg-hover` with its border and ring unchanged. A
`Select` on glass also paints its `<option>`s `bg-surface`, because Chrome
and Firefox draw the native list with the select's own background.
`on-glass` keeps `rounded-control`, wraps, and carries no blur — it is what
goes inside a glass panel, not a second one. The defaults render the
strings they always did, held to the byte by the tests.

`SheetContent` and `DialogContent` take `container` (FEAT-20260919-621), the
`MenuContent` shape: the element the Radix portal renders into, `document.body`
unless given. It exists for one place — a player in element fullscreen draws
nothing outside the fullscreen element, so a sheet opened over the picture has
to be portalled into it, as the player's menus have been since
FEAT-20260830-489. Nothing else changes: with no `container` both render the
DOM they always did, where they always did.

`AutoTextarea` composes a caller's `ref` with its own (FEAT-20260916-614).
`ref` was always in its props type — React 19 passes it as a prop — but it
replaced the internal ref the resize reads, so a chat composer that kept a
ref to focus its field after a suggestion silently stopped growing. Both
now receive the element; without a `ref` nothing changes.

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
