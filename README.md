# glass-ui

**The Liquid Glass design system for React 19 and Tailwind CSS 4: tokens, a glass material, and the components built from them.**

[![npm](https://img.shields.io/npm/v/@andrewbehma/glass-ui)](https://www.npmjs.com/package/@andrewbehma/glass-ui)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Live demo](https://img.shields.io/badge/demo-glass.luna--realm.com-5b5bf6)](https://glass.luna-realm.com)
[![Discord](https://img.shields.io/badge/Discord-join%20the%20community-5865F2?logo=discord&logoColor=white)](https://discord.gg/mkQARkBs4C)

Two applications that want the same frosted-glass look usually end up with two
copies of it: drifting colours, hand-tuned blurs, and buttons that are almost the
same. glass-ui is the one copy. It was lifted out of Luna Watch so that more than
one product can be built from the same material, and it now also carries
[AgentDock](https://github.com/AndreyBegma/AgentDock)'s whole web UI.

**Who it is for:** React 19 applications on Tailwind CSS 4 (Next.js included)
that want a consistent glass look, from a television-style "sofa" interface to a
dense desktop dashboard, without writing their own primitives.

- **Live demo:** [glass.luna-realm.com](https://glass.luna-realm.com): every component rendered live, with a props playground, its states, copyable code and a JSX editor. Source: [glass-ui-showcase](https://github.com/AndreyBegma/glass-ui-showcase).
- **npm:** [`@andrewbehma/glass-ui`](https://www.npmjs.com/package/@andrewbehma/glass-ui) — `npm i @andrewbehma/glass-ui`
- **Used by:** [AgentDock](https://github.com/AndreyBegma/AgentDock), whose UI is built only from glass-ui components.

## What is in it

- **Tokens** — palette, radius, motion, density and type scales, three
  named widths (phone, tablet, desktop), a z-index ladder, eight identity hues and six status colours, and six independent
  switches (`data-theme`, `data-material`, `data-scale`, `data-accent`,
  `data-palette`, `data-profile`) for light/dark, glass/flat, sofa/desk
  density, a named accent preset, a named surface palette and the desk's
  workspace profile.
- **The material** — `glass`, `glass-strong`, `glass-clear` and `lit` for
  chrome, `surface-content` for content, and the `.canvas` behind them, with
  the fallbacks they need.
- **Primitives** — Button, Card, Chip, Badge, Banner, Avatar, Field, Input,
  Select, Combobox, Checkbox, Radio group, Toggle, Slider and Range slider,
  Number, Date and Cron inputs, Dialog, Sheet, Menu, Context menu, Tooltip,
  Tabs, Segmented control, Table, Progress, Spinner, Skeleton, Sparkline,
  Toast, Code block, File dropzone and more.
- **Patterns** — app and nav rails, bottom capsule, breadcrumb, command
  palette, toolbar, popover, side panel, split pane, data table, tree, trace
  tree, timeline, board, stat tile, widget grid, log viewer, terminal, a file
  upload row, a dependency-free SVG chart, and the calm page set — page
  header, section, empty state and list/detail.
- **Shipped as compiled ESM** with type declarations and one subpath per
  module; client components keep `'use client'`, so they render from React
  Server Components with no `transpilePackages`.

Three layers, imported separately so an application can take the first two and
decline the third:

| Import | What it is |
|---|---|
| `@andrewbehma/glass-ui/tokens.css` | The palette, the radius, motion, density and type scales, the z-index ladder, and the four axes below. Declares its own `@source`, so a consumer does not have to know that Tailwind cannot see into `node_modules`. |
| `@andrewbehma/glass-ui/material.css` | `glass`, `glass-strong`, `glass-clear` and `lit`, `surface-content`, the `.canvas` layer, and every fallback they need. |
| `@andrewbehma/glass-ui/base.css` | Opinions that apply to a whole document: the focus ring, the reduced-motion override, the depth effect under a sheet. Optional. |
| `@andrewbehma/glass-ui` | The primitives and `cn`. |

**Contents:** [Install](#install) · [Quick start](#quick-start) ·
[The look](#the-look) · [The rules](#the-rules) · [Motion](#motion) ·
[The shell patterns](#the-shell-patterns) ·
[The workspace patterns](#the-workspace-patterns) ·
[The data primitives](#the-data-primitives) ·
[The widget grid](#the-widget-grid) ·
[Desk dashboard primitives](#desk-dashboard-primitives) ·
[Desk activity primitives](#desk-activity-primitives) ·
[Desk automation primitives](#desk-automation-primitives) ·
[File input](#file-input) ·
[Calm pages](#calm-pages-agentdock-s-7) ·
[Developing](#developing) · [Releasing](#releasing) · [License](#license)

## Install

```sh
npm i @andrewbehma/glass-ui
# or: bun add @andrewbehma/glass-ui / pnpm add @andrewbehma/glass-ui
```

The package ships compiled ESM and type declarations in `dist/`, one file per
source module, with every subpath (`@andrewbehma/glass-ui/button`,
`@andrewbehma/glass-ui/dialog`, `@andrewbehma/glass-ui/tokens.css`, …) in its
`exports` map. The client components keep their `'use client'` directive, so
they can be rendered straight from a React Server Component. **No
`transpilePackages` is needed** in Next.

**Peer dependencies.** The application provides these:

```sh
npm i react react-dom tailwindcss lucide-react motion sonner \
  @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-popover \
  @radix-ui/react-tooltip @radix-ui/react-context-menu @radix-ui/react-slider
```

`cron-parser`, `cronstrue`, `@xterm/xterm` and `@xterm/addon-fit` are optional,
needed only by `@andrewbehma/glass-ui/cron-input` and
`@andrewbehma/glass-ui/terminal` — see [Desk automation
primitives](#desk-automation-primitives).

`lucide-react` is a peer dependency on a permissive range on purpose: its icon
names have moved between major versions, and an application should be able to
upgrade its icons without waiting for this package.

**Stylesheets and Tailwind 4.** Import the layers from the application's global
stylesheet, after Tailwind:

```css
@import "tailwindcss";
@import "@andrewbehma/glass-ui/tokens.css";
@import "@andrewbehma/glass-ui/material.css";
@import "@andrewbehma/glass-ui/base.css"; /* optional */
```

The components carry Tailwind class names, and Tailwind does not scan
`node_modules` on its own. `tokens.css` declares `@source "."` relative to
itself, so importing it is enough: Tailwind scans the package's `dist/`. An
application that does not import `tokens.css` adds the scan path itself,
relative to its own stylesheet:

```css
@source "../node_modules/@andrewbehma/glass-ui/dist";
```

Both were verified against a Next 16.4 + Tailwind 4.3 application installing the
packed tarball: with either, the classes used only inside the package's
components are generated; with neither, they are not.

**Git dependencies.** Up to `v0.22.0` the package was consumed as
`github:AndreyBegma/glass-ui#v0.22.0` and shipped its TypeScript source. A git
dependency on any later commit gets no `dist/` — it is built at publish time and
is not in the repository — so use the npm package.

## Quick start

With the stylesheets imported as above, import each component from its own
subpath (the barrel works too, but loads every module — see `src/index.ts`):

```tsx
import { Button } from '@andrewbehma/glass-ui/button';
import { Card } from '@andrewbehma/glass-ui/card';

export function Welcome() {
  return (
    <Card variant="glass" pad="lg">
      <h2 className="text-ink">Hello</h2>
      <p className="text-ink-2">Built from tokens, not hex codes.</p>
      <Button variant="solid">Continue</Button>
      <Button variant="ghost">Later</Button>
    </Card>
  );
}
```

`Button` has five variants (`solid`, `glass`, `ghost`, `danger`, `link`) and three sizes
(`sm`, `md`, `lg`); `Card` has `content` (the default), `raised`, `surface`,
`glass` and `plain`. Mount `<Canvas />` once behind the app so the glass has
something to refract; see [The look](#the-look). To
switch the look for the whole document, set the axes on `<html>`, for example
`<html data-theme="dark" data-scale="desk">` for a dense dark dashboard. Every
axis does nothing until it is set; [the rules](#the-rules) explain each one.

## The look

#93. A UI audit of AgentDock found glass-ui reading as a flat grey admin
template rather than as glass: the material sat on a plain page with nothing
behind it to refract, every card was the same grey, there was no colour of its
own, and modal scrims blurred the page into mud. The direction since 0.24.0,
in both themes, minimal and cheap to render:

**A canvas behind everything.** `<Canvas />` (`@andrewbehma/glass-ui/canvas`),
or any element with the `.canvas` class, paints three large, soft radial
gradients of the accent behind the app: `--canvas-glow` of the accent, 18 % in
dark and 10 % in light. It is `position: fixed` at `z-index: -1`, with no
`filter` and no animation, so it costs one composited layer and nothing on
scroll. Mount it once, **outside `#main-content`** (the depth effect transforms
that element), and do not give `body` a background of its own: `html` paints
`--color-ground` beneath it. Under `prefers-reduced-transparency`,
`data-material="flat"` and forced colours it is not drawn, and the page is the
flat ground.

```tsx
<body>
  <Canvas />
  <div id="main-content">…</div>
</body>
```

**Two surface levels.** Pick one by what the surface holds:

| Level | Utility | For | Looks like |
|---|---|---|---|
| Chrome | `glass`, `glass-strong`, `glass-clear` | what moves you around the content: rails, the top bar, sheets, dialogs, menus, the command palette, popovers | the full seven-layer material, refracting the canvas |
| Content | `surface-content` | what is read: `Card` (its default variant `content`), `DataTable`'s frame | `--color-content`, which is `paper` at 96 %, with a 1px `--color-line` hairline and the faintest lift. No blur, no grey fill. |

The flat rung makes content opaque `paper`.

**The accent.** An electric indigo, `--color-accent`, with `--color-on-accent`,
`--color-accent-soft` and `--color-accent-ink`. It goes on the primary button,
the selected segment, the active rail item, the toggle's on-state, the focus
ring, links, and chart series 1. The rule and the contrast table are under
[The rules](#the-rules).

**Scrims are a film, not a wall.** `Dialog` and `Sheet` lay `bg-scrim` (`--color-scrim`:
0.3 in dark, 0.22 in light) over a 2px `backdrop-blur-scrim`. The page already
goes back under a sheet (the depth effect in `base.css`), so blurring it as
well only greyed it out. The command palette keeps its stronger scrim, because
it is a mode rather than a question about the page.

**A type scale.** Font sizes as Tailwind `--text-*` tokens, each carrying its
line height, weight and tracking:

| Utility | Size / line | Weight | Tracking | For |
|---|---|---|---|---|
| `text-display` | 28 / 32 | 600 | -0.02em | the page title |
| `text-heading` | 20 / 28 | 600 | -0.01em | a section heading |
| `text-section` | 15 / 22 | 600 | | a card or panel title |
| `text-body` | 14 / 20 | | | running text |
| `text-label` | 12 / 16 | 500 | | a field label, a column header, metadata |

`--font-sans` and `--font-mono` are the font-family tokens. glass-ui ships no
font files: an application that self-hosts a face sets either one at `:root`.
Numbers that sit in columns use `tabular-nums` (Tailwind's) or `.tabular`;
`base.css` already applies it to every `table`, `time` and `output`, so `Table`
and `DataTable` get it without asking, and `StatTile` carries it on its
surface.

**Motion.** A press is visible: anything `lit` (`Button`, the rails, `Chip`)
scales to `--press-scale` (0.97) over `--dur-press` (100ms). Full-width rows
(menu items, listbox options, an expanded `NavRail` item marked `press-row`)
keep 0.985, because 3 % of a 300px row reads as a glitch. A dialog enters on a
critically damped spring of about 0.3s (`--ease-spring`, a `linear()` easing,
over `--dur-spring`; engines without `linear()` get `--ease-out-expo`). A sheet
enters on Motion's spring with `bounce: 0` and a 0.3s visual duration. The
command palette fades and scales up from 0.98 (`lunaDialogIn`). All of it is
off under `prefers-reduced-motion`.

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

The accent (`bg-accent`, `text-on-accent`, `bg-accent-soft`, `text-accent-ink`)
is defined in every theme; the rule about where it may be used is below.
`--size-*` is not a Tailwind namespace, so the density scale is read as
`h-[var(--size-row)]` rather than as a utility.

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

**New chrome is glass. Cards, grid items and rows are content.** Header, bottom
bar, rails, sheets, dialogs, menus, the palette, popovers and player controls
use `glass` or `glass-strong`; anything carrying body text uses `glass-strong`.
A card, a table frame or a grid item uses `surface-content` (`Card`'s default):
near-opaque paper with a hairline and no blur. Glass on a card makes text harder
to read and costs a television its frame rate. Two hundred glass tiles on one
page is why this rule is written down.

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

**The primary action is the accent** (`bg-accent text-on-accent`). Until #93 it
was white, for an interface laid over other people's artwork; for a workspace
with no artwork, a black primary button made the system read as a grey
template. One primary per screen.

**Six axes, each unset by default.** The document carries `data-theme`,
`data-material`, `data-scale`, `data-accent`, `data-palette` and
`data-profile`, and every one of them does nothing until an application sets
it. That is not politeness, it is how two products share one
token layer without either being able to move the other.

| Attribute | Unset | Set | What it changes |
|---|---|---|---|
| `data-theme` | follows the system | `light` / `dark` | the palette |
| `data-material` | glass | `flat` | the material, and nothing else |
| `data-scale` | the sofa | `desk` | radii, motion, hairlines and density |
| `data-accent` | the indigo accent | a preset name: `amber` | the four accent tokens and the focus ring, and nothing else |
| `data-palette` | the neutral near-black / white surfaces | a palette name: `navy` | the surface family, the hairlines' colour, the scrim and the canvas aurora, and nothing else |
| `data-profile` | the desk as it is | `workspace`, beside `data-scale="desk"` | the desk's corners, density, ring and card, the ink primary, and eight mark colours — see below |

Under `navy` the `glass` button is a control, not chrome: `Button`'s `glass`
variant carries `glass-control`, which re-values the material on the button
to the opaque `--color-raised` fill, the `--color-line-strong` hairline and a
faint top highlight — no rim, meniscus, blur or shadow. On a navy rail or
ground the full material read as a grey bevelled pill. Without `navy` the
class changes nothing.

`data-scale="desk"` is Denitsa's. Luna Watch never sets it and is therefore
untouched by everything under it — structurally, not by agreement.
`tokens.spec.ts` holds every token in the base set to `tokens.baseline.json`
(its value at `3d1c78e`, except where a named decision moved it, such as #93's
focus ring) and holds the desk profile to exactly the list it is allowed to
change, so both halves of that claim fail a build rather than a review.

What the desk profile is for: this system was designed to be read across a room
from a television, and Denitsa is read at 60cm. A radius that gives a card a
silhouette at four metres reads as a toy at arm's length; a 420ms sheet that
feels considered from a sofa is a wait at a desk. Radii go 6/8/12, durations
100/150/260, hairlines get heavier and hover gets lighter, and the density
scale drops a row from 40px to 32.

**The workspace profile (#168).** `<html data-scale="desk"
data-profile="workspace">` is the desk as Denitsa's `maint/v0.8` line moved it
on, forward-ported without moving the desk anyone else renders — AgentDock
sets `data-scale="desk"` too. It refines the desk and does nothing without it.
Under it:

- radii 8/12/16; a row 36px, a control 32, `Button sm` 28, a field 32, a rail
  item 32, `Chip md` 24; on a coarse pointer a field, a row and a rail item
  are 44px (`--size-tap`), because none has an invisible hit area of its own;
- the focus ring is 2px at a 2px offset (`--focus-width`, `--focus-offset`),
  in a softened ink (`--color-focus` at 0.72), gated at 3:1 by `desk.spec.ts`;
  an accent preset still wins the ring;
- the primary is ink with an `ink/90` hover; the danger label is ink, not
  `danger`, which reads 3.0–3.4:1 on its own tint in light; the field's focus
  ring is `ring-ink/22`; at the flat material the `glass` button is an ink
  tint with a hairline ring (see [From maint/v0.8](#from-maintv08-168));
- a light `Card raised` is the ground's white with a 17% black edge
  (`--color-card`, `--color-card-line`), so it does not read as sunken;
- `EmptyState` draws its icon in a 40px disc and its title at 16/600;
  `CommandPalette` draws one border and 12/500 headings; `KeyHint` is 12px and
  hidden under a coarse pointer; a `SegmentedControl` without `full` is as wide
  as its labels;
- `--color-mark-1` … `--color-mark-8` exist, below.

The accent is not re-valued: there is one accent (#93). `workspace.spec.ts`
proves that every page without the attribute — sofa or desk, navy or not,
any preset, either pointer — resolves every token exactly as it would if the
profile did not exist, and holds the profile to its list. A component reads
it through the `workspace:` Tailwind variant, which `tokens.css` declares.

**Eight marks, for categories.** `--color-mark-1` … `--color-mark-8` exist
under the workspace profile only and are undefined everywhere else. Eight hues
45° apart, at one lightness per theme, each at least 3:1 on ground, surface and
raised (WCAG 1.4.11 — a mark is not text). They are for a dot or a swatch that
tells one category from another, picked by index:
``style={{ backgroundColor: `var(--color-mark-${n})` }}``. There is no
`bg-mark-*` utility, because a class built from an index is one Tailwind cannot
see. They are not `--color-hue-*`, which are #109's identity colours for tinted
surfaces. Never write text in a mark, and never give one a meaning — they are
not `ok`/`warn`/`danger`.

**The accent has a short list of places.** Four tokens, in every theme
(#93), each with one job:

| Token | Is | Goes on |
|---|---|---|
| `--color-accent` | the fill | the primary button, the toggle's on-state, a selected segment, chart series 1 and the default sparkline |
| `--color-on-accent` | text and icons on the fill | the primary button's label, the toggle's knob |
| `--color-accent-soft` | a tint, alpha | the active rail item's capsule, a selected row |
| `--color-accent-ink` | text on the tint, and links | the active rail item's label, a selected row's mark, an unstyled `<a>` |

The focus ring takes the accent too (`--color-focus`). It is not a decorative
colour: it does not go on a badge, an icon that is merely present, an empty
state, or a border that wants to look important. `--color-ok`,
`--color-warn` and `--color-danger` keep their meanings and the accent does not
join them — **an accent is not a semantic**, and a colour that means both
"primary" and "this one is fine" means neither.

Never write on the accent in a colour of your own choosing; `--color-on-accent`
is the one measured against it. The pairs, computed and held by
`tokens.spec.ts`:

| | dark | light |
|---|---|---|
| `accent` | `#5b5bf6` | `#4f46e5` |
| `on-accent` on `accent` | 4.92:1 | 6.29:1 |
| `accent` against `raised` (a graphic, 3:1) | 3.63:1 | 5.72:1 |
| `accent-ink` | `#b4b2ff`, 10.18:1 on the ground | `#4338ca`, 7.90:1 on white |
| `accent-ink` on `accent-soft` over `raised` | 7.47:1 | 5.87:1 |

**Accent presets: `data-accent` (#110).** An application that wants an accent
of its own sets `data-accent="<preset>"` on `<html>`. It never passes a colour
in: the presets are defined in `tokens.css`, so "no raw colour outside
`tokens.css`" stays true and `tokens.spec.ts` gates every preset in both
themes at the same bars as the indigo (fill 3:1 against every band, label and
ink 4.5:1, ink on the tint 4.5:1, ring 3:1). A preset re-values
`--color-accent`, `--color-on-accent`, `--color-accent-soft`,
`--color-accent-ink` and `--color-focus`; series 1 and the canvas glow follow
because they read `var(--color-accent)`. It is a separate axis rather than a
desk sub-mode because `data-scale="desk"` also changes radii, motion, hairlines
and density, which an app outside the desk must not inherit. A new preset is
a pull request to `tokens.css` with its measurements.

This amends FEAT-20260911-001 decision 6 a second time. The accent tokens are
defined in the base sets (the indigo, since #93) and re-valued only under
`data-accent="<preset>"`. With no `data-accent` set, no preset value reaches
the page, and `tokens.spec.ts` resolves the cascade to prove it. With
`data-scale="desk"` and `data-accent` both set, the preset wins for the accent
tokens and the desk keeps every other token. The short list of places above
holds under every preset. A second way to get an accent is a second place a
component can quietly start depending on one, so that list matters more now,
not less.

| `amber` | dark | light |
|---|---|---|
| `accent` | `#f2c14e` | `#b07a00` |
| `on-accent` on `accent` | 10.56:1 (`#18181b`) | 4.75:1 (`#18181b`) |
| `accent` against the worst band (3:1) | 10.31:1 (`paper`) | 3.16:1 (`canvas`) |
| `accent-ink` on the worst band | `#f7d47c`, 12.08:1 | `#7c4a03`, 6.28:1 |
| `accent-ink` on `accent-soft`, worst band | 7.67:1 | 5.44:1 |

`amber` is FilesDrop's, measured against its mascot's eye (`#e9d54a`). The dark
fill is 1.13:1 from it. The light fill is darker, because an amber that shows
on white at 3:1 is a brown-gold. White text fails on amber in both themes, so
the label is near-black.

### Palette, identity hues and status colours (#109)

Before this change, every screen built on glass-ui read grey: a neutral
near-black canvas, neutral surfaces and one accent. This change adds three
things. Each can be used without the others.

**`data-palette="navy"`** puts a dark navy canvas under the app (`#0a1022`
canvas, `#111a33` surface, `#1b2647` paper), tints the hairlines blue, and
paints the canvas aurora blue and violet instead of the accent. In light it is
a faint blue paper: the page stays white, and the desk and panels behind it
take the tint. It is opt-in. With no `data-palette` set, no navy value reaches
the page. `palette.spec.ts` resolves the cascade for every combination of
lighting, desk and accent preset, and proves that every token resolves exactly
as it did before.

| Unset, dark | `navy`, dark | Unset, light | `navy`, light |
|---|---|---|---|
| ![default dark](docs/palette/after-dark.png) | ![navy dark](docs/palette/after-dark-navy.png) | ![default light](docs/palette/after-light.png) | ![navy light](docs/palette/after-light-navy.png) |

How it combines with the other axes:
- It owns the surfaces, the hairlines' colour, the scrim and the aurora.
- **`data-scale="desk"` wins the hairlines and `ink-3`**, because the desk
  blocks come after the navy ones.
- **`data-accent` owns the accent and the ring**, which the palette never
  declares. So `data-palette="navy" data-accent="amber"` gives navy surfaces,
  an amber accent and a blue-violet aurora.
- The `--glass-*` material is not retuned for navy yet.

| `navy` | dark | light |
|---|---|---|
| `ink` on `paper` | 13.29:1 | 17.72:1 |
| indigo `accent` against the worst band (3:1) | 3.02:1 (`paper`) | 5.40:1 (`canvas`) |
| amber `accent` against the worst band (3:1) | 8.84:1 | 3.21:1 (`canvas`) |

**Eight identity hues.** `--color-hue-1` … `--color-hue-8` are blue, teal,
green, amber, orange, red, violet and pink. They are defined in both themes,
under every palette, and are meant for telling things apart: an agent, a slot,
a node. Each hue has five tokens:

| Token | Is | Gate |
|---|---|---|
| `--color-hue-N` | the mark: a dot, an edge, a chart series | 3:1 on every band |
| `--color-hue-N-soft` | a tint: the icon disc, a badge | — |
| `--color-hue-N-line` | a border | — |
| `--color-hue-N-ink` | text, on any band and on the tint | 4.5:1 |
| `--color-hue-N-glow` | a `box-shadow` colour | — |

`palette.spec.ts` gates every hue in both themes and both palettes.

- **Components.** `NodeCard`, `Card`, `StatTile`, `Badge` and `FlowNodeCard`
  take `hue?: 1..8`, which tints the border, the icon disc and the glow. On a
  badge it is the tint and its ink.
  - On `NodeCard` the hue beats the status for the card's edge, and the status
    is then shown by the pill alone.
  - The `NodeCard` progress fill takes the pill's status colour
    (`running` … `error`), in both themes, at 3:1 or better against its track.
    An `idle` or status-less card fills in `ink-2`, never `ink`. Cover per-status
    behaviour in `node-card.test.tsx`; there is no story system here.
  - `FlowNode` and `SankeyNode` take `hue` too.
- **Edges.** A FlowGraph edge takes, in this order: `edge.tone`, the target's
  status, the source's hue, then neutral. A Sankey link takes its source's hue,
  else the accent.
- **`hueFor(key)`.** It maps a stable key, such as a slot name or an agent id,
  onto a hue (FNV-1a, pinned by test). Import it from the barrel or from
  `@andrewbehma/glass-ui/hue`, with `hueClasses(hue)` for the class strings.

```tsx
import { hueFor } from '@andrewbehma/glass-ui/hue';

<NodeCard title={slot.name} hue={hueFor(slot.name)} status={slot.status} />
```

**The chart colours did not move.** Series 2, 3, 4 and 6 are now references to
the amber, teal, pink and orange hues. Those hues carry the series' exact
values, so a chart and a node in the same hue match.
- Series 1 stays the accent.
- Series 5, the yellow, stays a literal: there is no yellow hue.
- Resolved, all six series are the hex they were. `palette.spec.ts` pins them.

**Status colours.** `--color-status-{running,waiting,paused,blocked,done,error}`
each have `-soft`, `-ink` and `-glow`, and each is a reference to one hue:

| Status | Hue |
|---|---|
| running | teal |
| waiting | blue |
| paused | amber |
| blocked | orange |
| done | green |
| error | red |

`statusTone` (StatusPill, NodeCard, FlowGraph) reads these tokens.

**A visible change in the release that ships #109, in every palette:**
- `running` and `done` no longer share a mint;
- `blocked` is orange, no longer the same red as `error`;
- `waiting` and `paused` move to the blue and amber hues.

`StatusToneClasses` keeps its shape. Its `tone` family (`ok` / `warn` /
`danger` / `info` / `neutral`) is unchanged, so `Progress` and any consumer
that maps the family read the same.

| Before (develop, dark) | Before (develop, light) |
|---|---|
| ![before dark](docs/palette/before-dark.png) | ![before light](docs/palette/before-light.png) |

**Breaking in 0.24.0.** Under the desk profile, `--color-accent-ink` used to be
the text *on* the accent fill (near-black in dark). It is now the text on the
*tint*, and text on the fill is `--color-on-accent`. Replace
`bg-accent text-accent-ink` with `bg-accent text-on-accent`. The desk's own
accent values (`#806ffc` / `#5b4bd1`) are gone: there is one accent.

**Hit area, visual size and the density scale are three different things.**
`--size-row` (40px, a list row), `--size-control` (40px, a button),
`--size-field` (44px, an input) and `--size-nav` (40px, a rail item) are the
values the components produce, named so the desk profile can move them — it
takes them to 32/28/28/28. `--size-control-sm` (32px, a small button) and
`--size-chip` (28px) are named so the workspace profile can move them too.
`--size-tap` is 44px in every profile and is not one of them; see the next
rule.

- `Button`'s `md` reads `h-(--size-control)` and `sm` reads
  `h-(--size-control-sm)` — 32px, the `h-8` it was, at the sofa and the desk;
  28 under a 32 `md` in the workspace. `lg` stays one documented step above
  `md`, `calc(var(--size-control) + 8px)`, and is not part of the scale.
- `Field`'s `Input`, `Select` and `SearchField` read `h-(--size-field)`.
- `Chip`'s `md` reads `h-(--size-chip)`.
- `Menu`'s rows read `min-h-(--size-row)`, the line box centred rather than
  pinned by padding, so it still centres at the desk rung's 32px. It is a
  minimum: a label that wraps grows its row rather than overlapping the next.

**Do not define a focus ring, and never write `focus-visible:outline-none`.**
`base.css` puts a `--color-focus` outline on `:focus-visible` (the accent
since #93), `--focus-width` wide at `--focus-offset`: 3px at 4px, sized to be
read across a room from a television, and 2px at 2px in a softened ink under
the workspace profile. Every hand-written ring that preceded it was thinner
and dimmer. Form elements and `contenteditable` editors are the only exemption
— they draw their own focus indicator (a caret, or a consumer's selected-node
state), and `base.css` already exempts them.

**The ring follows the input, not the browser's guess.** A Radix menu moves
DOM focus to the item under the pointer, and in Chromium that script focus
inherits `:focus-visible` from the menu content, which got it on open because
nothing was focused before — so the ring framed every hovered item, mouse or
keyboard (BUG-20260919-625). `Menu` and `ContextMenu` content therefore carry
`data-input="pointer"` after a `pointermove` and `data-input="keyboard"` after
a `keydown` (`hooks/use-input-modality.ts`), and `base.css` strips the ring
from everything under a `pointer` surface — a hovered item is `bg-hover` only,
an arrowed item rings, and one keystroke after a hover brings it back. A
primitive that roves focus on hover spreads the same hook on its surface;
nothing is written on the item, and no consumer adds a class.

**Hit area and visual size are separate.** `Button` carries an invisible `after:`
pseudo-element that extends the touch target to 44px, in height and in width,
centred on the button, so a 28px icon button at the desk is still 44 by 44
under a thumb. It disappears on a fine pointer. Forcing every control to 44px instead makes a dense toolbar look like a
phone keyboard.

**No emoji as iconography.** `lucide-react` is the icon set. Emoji render as
somebody else's artwork at an unpredictable weight and cannot be recoloured or
aligned.

## Motion

FEAT-20260916-598. Motion is a vocabulary, not a set of effects: a load, a
list and a swap are the same gesture in every application built on this
package, and the gesture is declared once, in `@andrewbehma/glass-ui/motion.css`.

**The rule.** Only `opacity` and `transform` animate — both are composited,
so a television pays one layer per animated item and nothing per frame after
the entrance. Every duration and every curve is a token. Everything that
moves is inside `prefers-reduced-motion: no-preference`; under `reduce`
nothing translates or scales, and nothing can stay hidden. Keyframes are
declared in `motion.css` and nowhere else, under the `luna` prefix — and in
the two files it imports first (FEAT-20260924-680): `motion-drift.css`, the
closed ambient paths, and `motion-scroll.css`, the scroll-linked family.
Importing `@andrewbehma/glass-ui/motion.css` brings all three.

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
| `--dur-scene` | 640ms (420 at the desk) | FEAT-20260924-680: a change that covers the whole viewport — a fade to black, a flight across the screen, a bar filling from nothing. Nothing smaller uses it |
| `--tilt-angle` `--tilt-depth` | 4deg, 900px | the most `.luna-tilt` leans, and the perspective it leans in |

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
| `lunaDriftK` | the Ken Burns: closed, scale 1.00 → 1.06 → 1.00, travel ≤ 1.5%, no rotation | a full-bleed backdrop (FEAT-20260924-680); the consumer supplies the duration (Luna: 90s) |
| `lunaFillIn` | `scaleX(0)` → the bar's own width, `from` only | `.luna-fill-in` |
| `lunaSheen` | a band crossing left to right, opacity 0 → 0.28 → 0; ends invisible, so it may have a `to` | `.luna-sheen` |
| `lunaBump` | scale 1 → 1.12 → 1, `none` at both ends; no class — the consumer applies it with a duration token | an entry that just received something |
| `lunaScrollShift` / `lunaScrollFade` | to `translateY(--parallax-shift) scale(--parallax-scale)` / to `opacity: --parallax-fade`; bound to a timeline | `.luna-parallax`, `.luna-parallax-fade` |
| `lunaWindowPan` | `translateX(--window-pan)` → `translateX(-(--window-pan))`; bound to a timeline | `.luna-window` |

| Class | What it is for | Under `reduce` |
|---|---|---|
| `.luna-rise-in` | content replacing a skeleton: a transition from `@starting-style`, no mounted flag needed | shortened to nothing by `base.css` |
| `.luna-stagger` | a row or grid arriving as a cascade; the consumer sets `--i` per item, delay is `min(--i, 12) × 30ms`, `backwards` fill so an item is invisible until its turn and nothing stays applied after; runs once per insertion, so stable keys mean a re-render does not replay it | absent — the list is simply there |
| `.luna-img-in` | artwork fading in on load: `data-loaded="false"` hides it while pending, `"true"` plays the fade, no attribute is simply visible. An **animation**, not a transition, so it coexists with a hover transition on the same `<img>`; `.motion-reduce-keep` therefore does not apply and is not needed | absent — the image appears when loaded, never hidden |
| `.luna-focus-lift` | `scale(1.04)` on `:focus-visible` over `--dur-fast` `--ease-sheet`, for a television whose only focus feedback was the outline; no hover gate, no ring of its own. **Owns the element's `transition` shorthand** — do not put it on an element that already transitions (`transition` does not merge across rules) | absent |
| `.luna-fill-in` | a progress bar filling to its width over `--dur-scene`, from the start of the line (`right` under `dir="rtl"`); honours `--i` like `.luna-stagger`, `backwards` fill | absent — the bar is at its width |
| `.luna-sheen` | one band of light across the host as it is inserted, on its `::after`. **The host is the consumer's to shape:** `relative overflow-hidden rounded-*`, so the band is clipped by its radius | absent — no band |
| `.luna-tilt` | a card leaning in 3D towards the pointer or the direction focus came from, lifted 1.04. Rests at `transform: none`; the lean is written only on `:focus-visible` and on hover under a fine pointer. The script writes four **unitless** numbers in [-1, 1]: `--tilt-x`/`--tilt-y` (× `--tilt-angle`) and `--tilt-sx`/`--tilt-sy` (the highlight); `--tilt-dur` slows the settle, `--tilt-lift` changes the lift. **Replaces `.luna-focus-lift`** on the element — both own `transition` | absent — no lean, no lift |
| `.luna-tilt-sheen` | the tilt's highlight: a child inside the artwork's `overflow-hidden` box, an oversized radial gradient **moved by `transform`**, never repainted | absent |
| `.luna-parallax` | a header or hero layer moving at its own rate as it scrolls away: `lunaScrollShift` on `view()` over the `exit` range, so a layer at the top of the page rests untransformed at scroll 0. `--parallax-timeline` / `--parallax-range` override (`scroll(root)` + `normal` for a layer inside something fixed) | absent — still |
| `.luna-parallax-fade` | the same, fading to `--parallax-fade`: a title travelling faster than its backdrop | absent — still |
| `.luna-window` | artwork panning by `--window-pan` inside a card as a row scrolls past, on `view(inline)` over `cover`. Rests transformed by design, so it goes only on a leaf wrapper around the image, with the image scaled up enough to hide the edge | absent — still |

**The scroll-linked family** (the last three) is bound to a timeline, not a
clock: longhands with `animation-duration: auto`, never the `animation`
shorthand (which resets the timeline), and only inside
`@supports (animation-timeline: view())` and `no-preference`. Where the
engine has no scroll timelines the element is simply still — that is the
fallback, and there is nothing to detect. Each goes only on an element with
**no `position: fixed` descendant**, and on its own wrapper: one element, one
of these, no other animation.

**Which of these a television runs is the application's decision.** The
package has no notion of a television beyond `material.css`'s coarse-pointer
rung. Luna Watch switches the scroll-linked family off under its own
television query and keeps the rest.

No `color-mix()` anywhere in the motion files: the sheen's and the tilt's
strength is opacity over a plain `--color-ink` gradient, because the engines
of some televisions (Chromium 94–108) do not have it.

`motion.spec.ts` holds all of this: every name declared, everything that
moves gated, no literal curve or duration anywhere in `src/`, `base.css` with
no keyframes of its own; and since FEAT-20260924-680 the tilt resting flat,
the one-shots with a `to` ending invisible, the closed paths closed, and the
scroll-linked family only where a timeline can drive it.

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
| `@andrewbehma/glass-ui/slider` | `Slider` — one thumb, the native `<input type="range">` with its props untouched: `value`, `onChange(event)`, `min`/`max`/`step`, `disabled`, `aria-*`, and the caller's `className` on the element itself. A remote and a screen reader already understand it. |
| `@andrewbehma/glass-ui/range-slider` | `RangeSlider` — two thumbs on one track, on Radix `Slider` (a peer). `value: [lo, hi]`, `onValueChange`, `onValueCommit` (the release, and every keyboard step — fetch on this one), `min`/`max`/`step`, `thumbLabels` (required, the two accessible names in the application's language), `formatValue(value, thumb)` for `aria-valuetext`, `disabled`. |

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
| `@andrewbehma/glass-ui/scroll-hint-row` | `ScrollHintRow` — a horizontal scroll box with `scrollbar-hide` that fades its left and right edges only while there is more on that side. |
| `@andrewbehma/glass-ui/scroll-hint-column` | `ScrollHintColumn` — the same on the vertical axis: a capped scroll box (a sticky filter rail) that fades its top and bottom edges only while there is more. `wrapperClassName` takes a `rounded-*` so the fades stay inside a card's corners. |
| `@andrewbehma/glass-ui/use-scroll-edges` | `useScrollEdges(axis)` — the one measurement both read: `{ ref, edges: { start, end }, onScroll }`, under a `ResizeObserver` on the box and its children, with four pixels of slack for rounding. |

The fades are `aria-hidden`, `pointer-events-none`, always mounted, and move
only their opacity over `--dur-fast`; `edgeClassName` is the `from-*` token of
the surface behind the box. `scroll-hint.spec.ts` holds that contract for
both.

## The shell patterns

Four components that draw an application's chrome, and one hook. They are in
the package rather than in an application because `E-92` settles that the
shell's *parts* are shared even though its *information architecture* is not:
Luna Watch has four places to be and Denitsa has twenty-one, and both draw them
with the same capsule, the same rail and the same palette.

| Import | What it is |
|---|---|
| `@andrewbehma/glass-ui/bottom-capsule` | `BottomCapsule` — the floating glass capsule for narrow widths: up to four tabs, an optional round action button, an overflow `More` sheet. |
| `@andrewbehma/glass-ui/nav-rail` | `NavRail` — the vertical glass rail for wide widths: groups with headings, an optional collapse to icons. Its first scroll to the active item moves the rail's own `scrollTop` and never focus, so the first Tab after a load still reaches the page's skip link (#130). |
| `@andrewbehma/glass-ui/tab-bar` | `TabBar` — the edge-to-edge bottom bar for a phone shell: up to five places and a `More` sheet. Items take the rail's `badge` (a count or a dot on the glyph, spoken after the label; #130). From six slots (five places plus `More`) the label steps down to 10 px and wraps to a second line rather than truncating, so 9-character labels such as "Approvals" fit at 375 px; the accessible name is always the full label (#137). |
| `@andrewbehma/glass-ui/command-palette` | `CommandPalette` — a dialog with a search field, grouped results and arrow-key roving. Pass `hints` (`open`, `navigate`, `close`, in the reader's language) for one row of key hints under the list, which a coarse pointer never draws; `onInputKeyDown` sees the field's keys first, and `preventDefault` takes one; an item's `keys` draws its keycaps after the hint. |
| `@andrewbehma/glass-ui/use-command-palette-shortcut` | `useCommandPaletteShortcut` — ⌘K / Ctrl-K, bound once by the shell. |
| `@andrewbehma/glass-ui/popover` | `PopoverRoot` / `PopoverTrigger` / `PopoverContent` — an anchored, non-modal `glass-strong` panel. |
| `@andrewbehma/glass-ui/nav-link` | The `NavLinkRender` type the two navigation patterns take. |
| `@andrewbehma/glass-ui/tree` | `Tree` — the WAI-ARIA tree: nested rows, controlled expansion and selection, one tab stop, arrows / Home / End / type-ahead, a per-row actions slot, and drag-to-reorder that is off until `enableReorder` says otherwise. |

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

`Tooltip` takes a `container` (FEAT-20260924-679) for a trigger inside an
element that goes fullscreen, where only that element is drawn. `Badge` takes a
`label` for a short value that is not a count (a player's `1.5×`, not capped),
and a `tone="ink"`, the primary pair, for a badge on glass over a picture.

`SegmentedControlItem` and `TabsItem` both take a `className`, merged after
their own `relative min-w-0 flex-1`. `flex-none whitespace-nowrap` is the
opt-out for a row whose width nobody set — the item keeps its label whole
instead of collapsing to the narrowest width `min-w-0` allows (BUG-20260914-578
for `TabsItem`, BUG-20260916-607 for `SegmentedControlItem`).

`SegmentedControl` takes `variant: 'glass' | 'on-glass'`, and `glass` is
the default (FEAT-20260919-624; the variant arrived as FEAT-20260916-612).
`glass` is the header's material as a pill: the `glass` utility at
`rounded-full`, and the travelling capsule as `bg-hover`, the same lift
`BottomCapsule` and an active header section use on glass — `bg-raised` was
measured within 1/255 of the glass composite at idle and does not read;
`bg-hover` is +19 to +22/255 over the pill's shell on a flat ground, an
ambience and a bright poster wash alike. It is for a switch that sits on the
page, beside a glass header or on the flat ground. Two things it is not: a
row that wraps (two rows inside a pill put their corners outside its curve —
a wrapped control takes `on-glass`), and a control inside another glass
surface (it carries a `backdrop-filter`; one blur per stack). The default's
strings are held to the byte by its test.

`surface` — the opaque `bg-surface` well the primitive started with, and the
default until v0.18 — is folded into `glass`. It is still accepted, marked
`@deprecated`, and renders exactly what the default renders, so a consumer
written against v0.18 keeps compiling and gets the pill; it goes in the next
major. Two variants that render identical strings under different names
would be a lie the next reader has to unlearn, so there is one, and the old
name is a spelling of it.

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
goes inside a glass panel, not a second one; its test asserts that none of
the material's utilities is on its wrapper. The field family's `surface`
tone is unchanged by FEAT-624 — a field's opaque fill on the flat ground is
still the honest one.

`SegmentedControl` takes `size: 'sm' | 'md'` (#130), and `md` is the default
and renders what it always did. `sm` is for a toolbar: the shell is pinned to
`--size-control` with a 2px inset, and each item is a flex box so the caller's
button stretches to that height rather than choosing one. Under the desk
profile `--size-control` and `--size-field` are both 28px, so `sm` is flush
with a `Select`; under sofa it is 40px, `Button md`'s height. A child under
`sm` must not set its own `min-h` — a tap-sized `min-h-(--size-tap)` stays on
`md`.

**Tabs (#130).** `@andrewbehma/glass-ui/tabs` has two shapes, and which one is
a question about what a click does:

- **Panels on the same page** — `TabGroup` / `TabList` / `Tab` / `TabPanel`,
  the WAI-ARIA Tabs pattern. `TabGroup` holds the controlled `value` /
  `onValueChange` and an id base (`useId()` unless `id` is given) and renders
  nothing; the tab and panel ids, `aria-controls` and `aria-labelledby` are
  derived, so the caller writes none of them. One Tab stop (a roving
  tabindex on the selected tab); Left/Right move focus and wrap, Home/End go
  to the ends, a `disabled` tab (`aria-disabled`) is passed over. Activation
  is **manual** — Enter, Space or a click selects, the arrows only move
  focus — because a consumer that writes `?tab=` to the URL would otherwise
  push a history entry for every tab the arrow passes. A hidden `TabPanel`
  keeps its element, so `aria-controls` never dangles, but not its children
  unless `keepMounted`.
- **Destinations** — `NavTabs` / `NavTab`: a `<nav>` landmark of links, and
  the component sets `aria-current="page"` on the `current` one. The anchor
  is the consumer's, through the same `link: NavLinkRender` function
  `NavRail` and `BottomCapsule` take; without one it is a plain `<a>`.

```tsx
<TabGroup value={tab} onValueChange={setTab}>
  <TabList aria-label="Project settings">
    <Tab value="general">General</Tab>
    <Tab value="members">Members</Tab>
  </TabList>
  <TabPanel value="general">…</TabPanel>
  <TabPanel value="members">…</TabPanel>
</TabGroup>

<NavTabs aria-label="Project" link={(p) => <Link {...p} />}>
  <NavTab href="/queue" current={path === '/queue'}>Queue</NavTab>
  <NavTab href="/fleet" current={path === '/fleet'}>Fleet</NavTab>
</NavTabs>
```

Both draw `Tabs`' well and capsule, so moving a screen over changes its
semantics, not its pixels. `Tabs` / `TabsItem` keep rendering exactly what
they did and are `@deprecated`: filled with `aria-pressed` buttons, as every
AgentDock screen did, they read as a row of toggles.

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
| `@andrewbehma/glass-ui/app-rail` | `AppRail` — the strip of applications above the rail: icon-only by default (`labels="below"` prints the names), always visible, the active item carrying the accent. |
| `@andrewbehma/glass-ui/side-panel` | `SidePanel` — a collapsible, resizable column with its width and collapse state persisted; `useSidePanel()` for a consumer's own control. `strip={false}` collapses it to nothing. |
| `@andrewbehma/glass-ui/breadcrumb` | `Breadcrumb` — the trail, with a measured collapsing middle behind an overflow `Menu` and the last item as the page. |
| `@andrewbehma/glass-ui/row-actions` | `RowActions` and `rowActionsHost` — a row's affordances, revealed on hover, focus-within, selection, and always on a coarse pointer. |
| `@andrewbehma/glass-ui/context-menu` | `ContextMenuRoot` / `Trigger` / `Content` / `Item` / `Separator` / `Label` / `RadioGroup` / `RadioItem` — the right-click menu on `Menu`'s exported styling. |
| `@andrewbehma/glass-ui/key-hint` | `KeyHint` — a shortcut as key caps; `Mod` is `⌘` on Apple and `Ctrl` elsewhere. Under the workspace profile it is not drawn under `(pointer: coarse)` — no keyboard, no hint — unless passed `always`. |

Five rules, each the answer to something that was already going wrong.

**The active rail item is the accent.** In `AppRail` and `NavRail` alike, the
capsule is `bg-accent-soft` and the label or glyph on it `text-accent-ink`
(#93). Before 0.24.0 this was desk-only, read through a `var()` with a
fallback to a grey `bg-hover` capsule; the accent is in `@theme` now, so these
are plain utilities.

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

**Collapsing to zero takes `strip={false}`** (see [From maint/v0.8](#from-maintv08-168)). By default `SidePanel`'s `minWidth` is a prop;
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
| `@andrewbehma/glass-ui/board` | `Board` — columns with a scrollable stack of cards in each, a header and a footer slot per column, drag between and within columns, and a card menu that moves the card without a pointer. `resolveBoardMove` is the reducer; `applyBoardMove` is the remove-then-insert a consumer's state needs. A card with `movable: false` (#146) cannot be dragged or moved from its menu, but still renders and opens. Each column scrolls on its own inside a height-bounded board, and with `collapsible` (#149) folds to a narrow strip; `count` on a column replaces the card count (`'1/3'`). With `menuPlacement="inline"` (#154) the card-menu trigger is handed to `renderCard` as `slots.menu` instead of taking a column of its own. |
| `@andrewbehma/glass-ui/page-header` | `PageHeader` — the page's one header: eyebrow, 28 px h1, a `status` beside it, description, a `meta` counter row and `actions` on the right (wrapping below the title at full width under `sm`). Put `<MetaBar counters={…} />` (no `title`) in `meta`; `MetaBar`'s own 20 px h1 is deprecated. No back link — that is the breadcrumb's job. |
| `@andrewbehma/glass-ui/section-header` | `SectionHeader` — the heading of one section: a 16/600 `h2`, an optional description and an actions slot on the right. |
| `@andrewbehma/glass-ui/toolbar` | `Toolbar` — the bar above a collection: a view switcher, a filter area and a trailing action area, three slots and no more. Holds no state about the collection; the view switcher and filters scroll under `ScrollHintRow` at a narrow width while the trailing action stays reachable. Optionally (#130): `activeFilters` + `onClearAll` draw removable chips under the bar, and `collapseBelow` folds `filters` into one "Filters (n)" button and a bottom `Sheet`. |
| `@andrewbehma/glass-ui/combobox` | `Combobox` — a typeahead over options, single and multiple. Controlled value, an async option source debounced with its pending state announced, a "no matches" sentence, and full keyboard operation: type to filter, arrows to move, Enter to select, Escape to close, Backspace to remove the last chip in multiple mode. `Select` stays — this does not replace it. |
| `@andrewbehma/glass-ui/inline-edit` | `InlineEdit` — text that becomes an input on click or on Enter, commits on Enter and on blur, reverts on Escape. The row's height is identical in both states, asserted in a test — the one difficulty this component exists to solve once. |

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

A card whose column is decided elsewhere carries `movable: false` (#146), and
both inputs drop it at once. It is not `draggable`, and its menu shows no move
entries but keeps the consumer's `renderCardMenu` items; with none of those,
the menu has no trigger at all. `resolveBoardMove` refuses any intent that
names the card, so `onMove` never hears about it. It still renders and opens,
and other cards still land beside it. Leaving the flag out means `true`.

By default the trigger is a column beside `renderCard`, and that column's
width comes out of the card's content. With `menuPlacement="inline"` (#154)
the board draws no column and hands the trigger to `renderCard` as its third
argument, `slots.menu`, for the consumer to put at the end of its own header
row; the content then takes the card's full width. It is the same cluster —
the same menu (the move items, `movable: false`, `renderCardMenu`), the same
`RowActions` reveal rule (hover and focus on a fine pointer, always drawn on a
coarse one), the same focus return after a move — with a 20×16 trigger, as
tall as a text line, that adds no height. `slots.menu` is `null` under the
default `'column'`, and for a fixed card with nothing of the consumer's to
offer. `'inline'` is a promise to place it: a card whose `renderCard` drops
`slots.menu` has no keyboard path.

```tsx
<Board
  aria-label="Board"
  columns={columns}
  menuPlacement="inline"
  renderCard={(card, _column, { menu }) => (
    <div className="flex flex-col gap-1">
      <div className="flex h-4 items-center gap-1.5 text-xs">
        <span className="font-mono">{card.label}</span>
        <span className="ms-auto flex items-center gap-1">
          {card.cost}
          {menu}
        </span>
      </div>
      <p className="text-sm">{card.title}</p>
    </div>
  )}
  onMove={(move) => setColumns((cs) => applyBoardMove(cs, move))}
/>
```

**A column is a header, a scroll region and a footer** (#149). The board is
`max-h-full`, so under a parent with a height it stops there and never grows
past it; under one without, nothing changes. Inside, each column's card list
scrolls on its own while the header (title, count, `header` slot) and the
`footer` slot — a "Show older" button, an "Add" row — stay put. The header
takes a hairline and a shadow only while its list is scrolled off the top
(`data-scrolled="true"` on the column). `count` on a column replaces the
default `cards.length`, so a filtered board can show `1/3`.

`collapsible` gives every header a toggle (`aria-expanded`, named by
`labels.collapse(column)` / `labels.expand(column)`) that folds the column to
a narrow strip: the toggle, the title set vertically, and the count. A click
anywhere on the strip opens it; the keyboard path is the toggle. Leave it
uncontrolled with `defaultCollapsed={['done']}`, or control it with
`collapsed` + `onCollapsedChange(ids)`. A folded column's list is `hidden`, so
it is not a drop target; the card menu's "Move to" still reaches it, and focus
then lands on that column's toggle. The strip's width is
`--board-column-collapsed` (default `2.75rem`), as an open column's is
`--board-column` (default `18rem`). Without `collapsible` there is no toggle
and `collapsed` / `defaultCollapsed` are ignored.

```tsx
<div className="h-[calc(100dvh-8rem)]">
  <Board
    aria-label="Board"
    columns={columns.map((c) => ({ ...c, count: `${c.cards.length}/${totals[c.id]}` }))}
    collapsible
    defaultCollapsed={['completed']}
    renderCard={(card) => <TaskCard task={card} />}
    onMove={(move) => setColumns((cs) => applyBoardMove(cs, move))}
    className="h-full"
  />
</div>
```

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
and `NavRail` keep for the shell. Its `activeFilters` (#130) follow the same
rule: the bar draws the label it is handed and calls `onRemove`; what removing
a filter means is still the application's.

**`EmptyState`'s action can be data** (#130): `{ label, onClick }` renders a
glass `Button`, and `{ label, href }` renders a link styled with
`buttonClassName()`, through the `link` render prop when one is given. A
`ReactNode` action still renders as given.

```tsx
<EmptyState
  title="No budgets yet"
  action={{ label: 'New budget', onClick: () => setEditing('new') }}
/>
<EmptyState title="Nothing queued" link={renderLink} action={{ label: 'Open sessions', href: '/sessions' }} />
```

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
| `@andrewbehma/glass-ui/widget-grid` | `WidgetGrid` is a controlled grid of 1–4 columns. The person reorders its items with a grip (pointer and touch) or a menu, and makes them wider or narrower with a separator (pointer and keys) or the same menu. `resolveWidgetMove` and `resolveWidgetResize` are the reducers. `applyWidgetMove` is the remove-then-insert that a consumer's state needs. |

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

## Desk dashboard primitives

`#67`. Seven components a desk dashboard needs, built here so the next desk
product starts with them. Each has its own subpath, tests beside it, and
behaviour under `data-scale="desk"`, light, dark and `data-material="flat"`.

| Import | What it is |
|---|---|
| `@andrewbehma/glass-ui/spinner` | `Spinner` — a rotating arc in `currentColor`, three sizes (12 / 16 / 24 px) and four tones. `role="status"` with a `label` (default "Loading"); `label={null}` hides it inside a control that already announces state. Under reduced motion it is a static three-dot indicator with the same name. |
| `@andrewbehma/glass-ui/confirm-dialog` | `ConfirmDialog { open, onOpenChange, title, consequence?, verb, tone?, onConfirm, busy? }` (#130) — the confirmation, on `Dialog`. The title is a question; Cancel is ghost on the left, the verb is `danger` (default) or `solid` on the right. Initial focus is Cancel for `danger`, the verb for `default`. `onConfirm` does not close it; `busy` disables both buttons, spins the verb and ignores Escape. |
| `@andrewbehma/glass-ui/badge` | `Badge` gained `size: 'sm' \| 'md'` (`md` is 12 px sentence case) and, with `hue`, `shape: 'dot' \| 'square'` (`square` is the identity swatch; dots stay for status). The `ok` / `warn` / `danger` count is now a solid fill with ground ink (4.5:1 in both themes; it was 3.86:1 on the tint). Defaults are unchanged. |
| `@andrewbehma/glass-ui/sparkline` | `Sparkline` — an inline SVG polyline in `currentColor`, optional area fill. With `label` it is `role="img"`; without, `aria-hidden`. An empty or one-value series draws a flat baseline, never a `NaN` path. |
| `@andrewbehma/glass-ui/stat-tile` | `StatTile` — label, value, optional delta, hint and a trend slot. Pressable only when given `href` or `onClick`. `loading` renders `Skeleton`s of the same height. |
| `@andrewbehma/glass-ui/key-value-list` | `KeyValueList` — a `dl` of `dt`/`dd`, one or two columns, optional per-item copy button; long values truncate with the full text in a `Tooltip`. |
| `@andrewbehma/glass-ui/code-block` | `CodeBlock` — `pre`/`code` in `font-mono`, a header with the language label, a wrap toggle (controlled or uncontrolled) and a copy button. No syntax highlighting. |
| `@andrewbehma/glass-ui/data-table` | `DataTable` — `<table>` semantics over `Table`, with controlled sort, selection and hidden columns, sticky header, skeleton and empty states, and fixed-row-height windowing (`virtualize`). `sortRows` is exported for client-side sorting. The frame is `surface-content` and rows have no fill of their own; a selected row is `bg-accent-soft` (#93). |
| `@andrewbehma/glass-ui/trace-tree` | `TraceTree` — a WAI-ARIA `treegrid` with `Tree`'s keyboard contract: a label column, a waterfall bar relative to the root's time span, and caller-supplied meta and totals. Bar colour by kind, tokens only: `turn` `ink-3`, `llm` `ink-2`, `tool` `accent`, `agent` `ok`, `other` `line-strong`; `status="error"` is `danger` on any kind. Colour is never alone: every row carries its kind's icon and name, an error its icon and "Error", a running node its icon and "Running". |

Five rules.

**Conventions are the package's own.** `tailwind-variants` for variants, `cn`
for merging, tokens only — no raw colour, which `tokens.spec.ts` enforces —
`'use client'` on anything with state or effects, every export on its own
subpath.

**Facts about the data are controlled.** Sort, selection, hidden columns and
the expanded and selected trace nodes belong to the consumer and arrive as
props with an `on…Change`. Only focus position and hover live inside, the rule
`Tree`, `Board` and the shell patterns already follow.

**Rows, tiles and cards are not glass.** They are solid surfaces. Glass
appears only in a component's menus and popovers, through the existing `Menu`
and `Popover`.

**Formatting is the consumer's.** Values, deltas and totals are `ReactNode`;
the components never format numbers, currency or durations. Numbers render
with `tabular-nums`. Copy is the consumer's too, as `Progress` already says.

**Colour is never the only signal.** A delta carries an arrow and its text, a
trace bar a kind icon and a label. A delta's colour follows its `sentiment`,
not its direction — cost going up is bad, merges going up are good.

`DataTable` windowing is hand-rolled and fixed-height — `rowHeight` defaults to
36 px at `data-scale="desk"` and 44 px elsewhere — so the package keeps its two
runtime dependencies. Variable heights are out of scope, and `TraceTree` does
not virtualize. `CodeBlock` copies through `navigator.clipboard.writeText` with
an inline "Copied" for 1.5 s and imports no `toast`, so it does not load sonner.

## Desk activity primitives

`#70`. Four components a desk activity view needs — a live worker pane, an
activity feed, notifications and a resizable layout — built here so the next
desk product starts with them. Each has its own subpath, tests beside it, and
behaviour under `data-scale="desk"`, light, dark and `data-material="flat"`.

| Import | What it is |
|---|---|
| `@andrewbehma/glass-ui/log-viewer` | `LogViewer` — a `role="log"` line viewer in `font-mono`: SGR-only ANSI colours mapped to tokens, fixed-height windowing, follow-tail with a "N new lines" pill, case-insensitive search and copy. Lines are `LogLine`s; the consumer owns the stream. Every string it renders is overridable through the optional `labels` prop (`LogViewerLabels`), with English defaults. |
| `@andrewbehma/glass-ui/timeline` | `Timeline` — items grouped by local calendar day ("Today", "Yesterday" or a date), each a link, a button or plain; tone as a dot plus icon; a "N new" pill and a "Load more" button. `dayHeadingLevel` (default 3) sets the day headers' level so the feed slots under the page's headings; `loadMoreLabel` and `newLabel` override the two English strings. An item's `actions` slot (e.g. a `#205` link chip) renders beside the row, outside its `<a>`/`<button>`, so an `href` row can carry its own links without nested anchors; tab order is the row, then its actions: `{ id, at, title, href: '/slots/1', actions: <a href={prUrl}>#205</a> }`. |
| `@andrewbehma/glass-ui/banner` | `Banner` — an inline, full-width tinted notice in `info`, `ok`, `warn` or `danger`. `role="alert"` for `warn` / `danger`, `role="status"` for the others; optional dismiss. |
| `@andrewbehma/glass-ui/split-pane` | `SplitPane` — two panes and a `role="separator"`, resizable by pointer or keyboard; the size persists under a required `storageKey`. |

Five rules.

**Conventions are the package's own.** `tailwind-variants` for variants, `cn`
for merging, tokens only — no raw colour, which `tokens.spec.ts` enforces, the
ANSI colour map included — `'use client'` on anything with state or effects,
every export on its own subpath.

**The consumer owns the data; the component owns the view.** `LogViewer`
receives `lines` and never owns the stream; its own state is follow mode,
scroll position, the search cursor and wrap when uncontrolled. `Timeline`
receives `items` and calls `onLoadMore`. `SplitPane` owns and persists its size,
the rule `SidePanel` follows.

**Lines, items and banners are not glass.** They are solid surfaces, and a
`SplitPane` has no material of its own — its panes carry whatever the consumer
puts in them. Glass appears only through `Menu`, `Popover` and `Tooltip`.

**Colour is never the only signal.** A log line carries a gutter mark from its
`level`, a timeline item a dot plus its icon, a banner an icon per tone. ANSI
sequences beyond SGR are stripped, and 256-colour and truecolour render as
default ink.

**Copy is the consumer's, and the components stay light.** `Timeline` formats
times through `formatTime`. `LogViewer` copies the selection, or all lines as
plain text, through `navigator.clipboard.writeText` with an inline "Copied" and
imports no `toast`. Virtualization is hand-rolled and fixed-height, so the
package keeps its two runtime dependencies; with `wrap` on it switches off above
5 000 lines.

## Desk automation primitives

`#74`. Three components a desk automation view needs — time-series charts, a
cron schedule field and a terminal — built here so the next desk product starts
with them. Each has its own subpath, tests beside it, and behaviour under
`data-scale="desk"`, light, dark and `data-material="flat"`.

| Import | What it is |
|---|---|
| `@andrewbehma/glass-ui/chart` | `Chart` — area, line and bar series (stacked or grouped) on a time or category x-axis, as hand-rolled SVG with no dependency: axes, gridlines, legend, tooltip, and an accessible table fallback. Series are `ChartSeries`; `color` is one of `series-1` … `series-6`, `ok`, `warn` or `danger`. Formatting is the consumer's (`formatX`, `formatY`, `formatTooltip`), and so is every string it renders or announces: `labels` (`ChartLabels`) overrides any of them, with English defaults. |
| `@andrewbehma/glass-ui/cron-input` | `CronInput` — a 5-field cron expression with presets, a plain-language description, the next runs in an IANA time zone and validation. `onChange` fires with `{ expression, valid }`, valid or not. Its peers load when it mounts, not when it is imported, so a static import of the subpath never fails at import time. When `cron-parser` or `cronstrue` is missing it shows an error naming them. Until the peers have loaded, the preview is empty and `onChange` reports `valid: false`. |
| `@andrewbehma/glass-ui/terminal` | `Terminal` — an xterm.js wrapper themed from tokens, with fit-to-container, read-only mode and an imperative `write` / `writeln` / `clear` / `focus` / `fit` handle. It renders bytes and emits keystrokes; the consumer wires the socket. The consumer must also import xterm's stylesheet, `@xterm/xterm/css/xterm.css`, or the terminal renders broken. |

**`CronInput` and `Terminal` are exported only from their subpaths.** The barrel
exports `Chart` and its types and nothing else here, because the other two
import optional peer dependencies and the barrel must never pull them in.

**The peers are optional.** Install them only for the components you import:

```sh
bun add cron-parser cronstrue            # @andrewbehma/glass-ui/cron-input
bun add @xterm/xterm @xterm/addon-fit    # @andrewbehma/glass-ui/terminal
```

They are declared in `peerDependencies` with `peerDependenciesMeta.optional`,
so a consumer who never imports those subpaths installs nothing extra.
`CronInput` loads its peers on mount and shows an error naming any that are
missing; importing the subpath never fails. `Terminal` loads xterm with a dynamic `import()` on mount, so the subpath
is safe to import during SSR.

**Series colours are tokens.** `--color-series-1` … `--color-series-6` exist in
dark and light, chosen to stay apart under common colour-vision deficiencies
and checked at 3:1 or better against `--color-surface` in `tokens.spec.ts`.
Colour is never the only signal: the legend and tooltip name each series, and
line series differ in dash pattern from series 4 onwards.

**Charts, the cron preview and the terminal are solid surfaces, never glass.**
A `Chart` tooltip is its own readout in the popover material (`glass-strong`). At most 6 series and
about 5 000 points per series render as SVG; above that the chart down-samples
and says so in the table caption.

## Controls (0.24.0)

### Select

`Select` is a native `<select>` drawn by the package: `appearance-none`, a caret in `ink-3`, the field's border, radius and focus ring. The keyboard, the option list and the screen reader are the browser's. Import it from `@andrewbehma/glass-ui/select` (or `/field`, or the root); `className` lands on the `<select>` itself, and `tone="on-glass"` works as it does for `Input`. Under forced colours the platform control comes back.

### DateInput

`DateInput` is `Input` with `type="date" | "time" | "datetime-local"`. Digits are `tabular-nums`; in Chromium the picker glyph is toned down to the caret's weight and the inner padding removed. It keeps its intrinsic width — give it a track wide enough for its value.

`locale` sets the input's `lang` (an explicit `lang` wins). Firefox and Safari order and name the date parts by it. **Chromium does not**: it draws the field and its picker in the browser's own UI language whatever `lang` says. That gap is accepted rather than covered here (`Q503`); for a date or a time in the interface's language in every browser, use `DateField` / `TimeField` (see [From maint/v0.8](#from-maintv08-168)).

### SegmentedControl — sizing and selection

A segment is never narrower than its label (`min-w-max flex-1`): it grows to fit and still shares spare width. The glass pill encloses its segments; if it is wider than its column it overflows the column — pass `overflow="scroll"` (or `wrap`) if that can happen; see [From maint/v0.8](#from-maintv08-168). The selected segment is `bg-accent-soft` with `text-accent-ink`, which a child that sets no colour of its own inherits. `className="flex-none"` still opts a segment out of sharing spare width.

### CodeBlock — chrome only when it holds something

A one-line `code` (a trailing newline does not count) has no wrap toggle. With no `language` and no toggle there is no header bar; the copy button floats in the top-right corner.

### TabBar

`TabBar` is the bottom tab bar for phones: a glass strip pinned to the bottom edge, full width, up to five `items` plus an optional `more` that opens a bottom sheet. The active item (`active: true`, rendered with `aria-current="page"`) is the accent: an `accent-soft` pill behind its icon and `accent-ink` text. The home-indicator inset is inside the bar and in the spacer it renders above itself. Items with `href` render through `link` (see `NavLinkRender`); items without render a `button` and call `onSelect`. It holds no state. It sets no breakpoint — hide it at the call site (`className="lg:hidden"`). Choose `BottomCapsule` for a floating capsule with an action button; choose `TabBar` for an application shell.

### Chart — sparse buckets

Send every bucket. The chart cannot know your bucket size: a missing day is not a gap, it is interpolated across by an area or a line. Send `0` for an empty day, or `null` to break the line. Bars are capped at 40 px per x, and a time axis with bars spans at least seven steps, so one or two buckets render as bars on a readable axis rather than as a block.

### Sparkline

The default `tone` is `accent`. `tone="neutral"` is the old `ink-2`.

## File input

`#110`. A drop zone, an upload hook and an upload row, built neutral so the
application brings its own illustration and copy through slots. Each has its
own subpath and tests beside it.

| Import | What it is |
|---|---|
| `@andrewbehma/glass-ui/file-dropzone` | `FileDropzone`: a `glass-strong` zone with a dashed hairline rim. It takes files by drop, by the native picker (click, Enter or Space) and by paste. `pasteTarget` is `'self'` (the default, while the zone has focus), `'document'` (Ctrl+V anywhere on the page) or `'none'`. `accept` (MIME types, `type/*` or extensions), `maxSize` (bytes per file) and `maxFiles` (per drop) split every drop into `onFiles(files)` and `onReject([{ file, reason }])`, where `reason` is `'type'`, `'too-large'` or `'too-many'`. A drag or paste of text or a link does nothing. `children` is a node or a function of `{ dragging, disabled }`, so each state can have its own art. `label` is required and is the zone's accessible name. |
| `@andrewbehma/glass-ui/use-file-upload` | `useFileUpload({ url, field, extraFields, headers, concurrency, withCredentials })` returns `{ items, add, cancel, retry, remove }`. It sends multipart `POST`s over `XMLHttpRequest`, because `fetch` has no upload progress. Each item's `state` is `queued`, `uploading` (`loaded`/`total`), `done` (`response`, JSON-parsed when it is JSON), `error` (`httpStatus`, `body`) or `canceled`. At most `concurrency` (3) run at once. Progress commits at most once per animation frame. Unmounting aborts what is running. |
| `@andrewbehma/glass-ui/file-item` | `FileItem`: one upload as a row. It shows the name, the size (formatted with `Intl` in the reader's locale) and a `role="progressbar"` in `Progress`'s fill while `uploading`, which is indeterminate when `progress` is omitted. It shows `errorText` when `status` is `error`. Thumbnails are a decorative `img`, with a `Skeleton` while an image's thumbnail is pending. `meta` and `actions` are slots, and the row wears `rowActionsHost` so a `RowActions` inside it reveals as in any row. |

```tsx
const upload = useFileUpload({ url: '/api/files' });

<FileDropzone label="Upload files" maxSize={200 * 1024 * 1024} onFiles={upload.add}>
  {({ dragging }) => (dragging ? <DropArt /> : <IdleArt />)}
</FileDropzone>;

{upload.items.map(({ id, file, state }) => (
  <FileItem
    key={id}
    name={file.name}
    size={file.size}
    mime={file.type}
    status={state.status === 'queued' ? 'uploading' : state.status}
    progress={state.status === 'uploading' ? state.loaded / state.total : undefined}
    errorText={state.status === 'error' ? 'Upload failed' : undefined}
  />
))}
```

**The row is not glass.** Rows are content. The zone is chrome that carries a
label, so it is `glass-strong`. Its lift while dragging is a scale and an
opacity, both `motion-safe`, so they are off under `prefers-reduced-motion`.
`dragging` is counted across `dragenter`/`dragleave`, so moving onto the art
inside the zone does not flicker it, and any `drop` or `dragend` resets it.

## Resizable frame

`#139`. A controlled-width box for a mockup in a sandboxed `<iframe>`, whose
width the application drives from viewport presets, a typed number and a drag.
`SplitPane` and `SidePanel` own and persist their size, so they cannot do this.

| Import | What it is |
|---|---|
| `@andrewbehma/glass-ui/resizable-frame` | `ResizableFrame` — a frame centred in its container, `width` px wide, with a drag handle on each side edge. Controlled only: `onWidthChange` fires during a drag (once per animation frame) and on each key step, `onWidthCommit` once when the gesture ends (pointer-up, or the key-up after a run of key presses); both get a width already clamped to `min` / `max`. `height` fixes the height in px; omitted, the frame fills its container. `showSizeHint` (default `true`) shows `width × height` by the handle while dragging. `labels.resize` is each handle's accessible name. |

```tsx
const [width, setWidth] = useState(1440);

// Default: fills the container's height, commits to the URL on release.
<ResizableFrame
  width={width}
  onWidthChange={setWidth}
  onWidthCommit={(w) => router.replace(`?w=${w}`)}
  min={320}
  max={3840}
  labels={{ resize: 'Resize the frame' }}
>
  <iframe title="Mockup" sandbox="allow-scripts" srcDoc={html} className="size-full" />
</ResizableFrame>;

// A phone preset: 390 × 844. In a container narrower than 390 px the frame
// scrolls sideways inside its own box; the page does not.
<ResizableFrame width={390} height={844} onWidthChange={setWidth} min={320} max={3840} labels={labels}>
  <iframe title="Mockup" srcDoc={html} className="size-full" />
</ResizableFrame>;
```

**Both handles are the WAI-ARIA window splitter**, as `SplitPane`'s is:
`role="separator"`, `aria-orientation="vertical"`, `aria-valuenow` / `min` /
`max`, `aria-valuetext="1440 pixels"`, focusable. Arrows step 16 px (Shift
1 px), Page Up / Page Down 160 px, Home / End go to `min` / `max`. On the left
handle the arrows mirror: ArrowLeft moves that edge out, so it widens.

**An iframe swallows the pointer, so the frame takes it back.** The handle holds
pointer capture, and while a drag is on the child is `pointer-events: none`. The
frame is centred, so an edge moved by `dx` changes the width by `2 × dx`; a
frame wider than its box is left-aligned and scrolls, and its right edge moves
by `dx`.

**It draws a hairline and nothing else.** The hairline is a ring, so the child
gets exactly `width` px. `max` is not capped by the container: a wider frame
scrolls inside its own box. Each handle's hit area is 24 px. The width animates
between presets only under `motion-safe`, and never while dragging.

## Floating window and launcher

`#161`, for AgentDock's assistant. A window that floats over the page, and
the round button that opens it.

| Import | What it is |
|---|---|
| `@andrewbehma/glass-ui/floating-window` | `FloatingWindow` — a non-modal `role="dialog"` named by `title`, dragged by its title bar and resized from all four edges and corners with pointer capture. `minWidth` / `minHeight` / `maxWidth` / `maxHeight` bound the size; the window is always drawn 8 px inside the viewport and re-clamps when the browser window shrinks (and goes back when it grows, because the person's rectangle is kept). Minimize collapses it to its bar with the content still mounted; Escape minimizes and never closes; maximize fills the viewport; a double-click on the bar toggles maximize. With `storageKey`, `{ x, y, width, height, minimized, maximized }` persist in `localStorage`. `open` / `onOpenChange` are the consumer's, as on `Sheet`; `actions` adds buttons to the bar. Below `md` the same `children` render in a bottom `Sheet`. |
| `@andrewbehma/glass-ui/launcher` | `Launcher` — a 48 px round `glass-strong` button fixed to the bottom-right corner, with an optional `badge` (a count capped at 99+, or a short label) and `expanded` (`aria-expanded`, drawn with the accent tint). Below `lg` it rises above the `BottomCapsule`'s 6 rem band; `clearCapsule={false}` for a screen without one. |

```tsx
const [open, setOpen] = useState(false);

<Launcher
  label="Assistant"
  icon={<Sparkles size={20} aria-hidden="true" />}
  badge={unread}
  badgeLabel={`${unread} unread`}
  expanded={open}
  onClick={() => setOpen((value) => !value)}
/>
<FloatingWindow
  open={open}
  onOpenChange={setOpen}
  title="Assistant"
  icon={<Sparkles size={16} aria-hidden="true" />}
  actions={<Button variant="ghost" size="sm" icon aria-label="Hide conversations">…</Button>}
  storageKey="agentdock.assistant.window"
  minWidth={520}
  minHeight={400}
  labels={{
    move: 'Move the window',
    minimize: 'Minimize',
    restore: 'Restore',
    maximize: 'Maximize',
    unmaximize: 'Restore size',
    close: 'Close',
  }}
>
  <Chat />
</FloatingWindow>;
```

**Keyboard.** The window takes focus when it opens. The grip at the start of
the bar is a button: arrows move the window by 16 px, Shift+arrows resize it by
16 px from the bottom-right corner. Minimize / Restore, Maximize / Restore size
and Close are named buttons. The edge handles are pointer-only and
`aria-hidden`; the grip is their keyboard alternative.

**Geometry.** `fitFloatingWindow(rect, limits, viewport)` is the clamp the
window draws through, exported for a consumer that places something beside it.
With no stored record and no `defaultPosition`, the window opens 24 px in from
the top-right corner at `defaultWidth` × `defaultHeight` (820 × 680).

## From maint/v0.8 (#168)

Denitsa's `maint/v0.8` line (v0.8.x) and develop diverged at `c59d84e`. What
maint added since is here, forward-ported so that nothing moves for an
application that does not ask: every new prop defaults to what shipped
before, and what maint changed by default lives under the workspace profile
(see [the rules](#the-rules)).

| Import | What it is |
|---|---|
| `@andrewbehma/glass-ui/date-field` | `DateField` — a date drawn from `Intl` in the interface's `locale`, a forgiving parser, and a month grid in a popover. |
| `@andrewbehma/glass-ui/time-field` | `TimeField` — a time on the locale's hour cycle; ArrowUp / ArrowDown step it. |
| `@andrewbehma/glass-ui/period-switcher` | `PeriodSwitcher` — `‹ label › Today`, one picker for every week, month and year. |
| `@andrewbehma/glass-ui/use-scroll-into-row` | `useScrollIntoRow(ref, active)` — the active item of a scrolling row brings itself to the middle, scrolling the row only. |

### Segments, tabs and the period switcher

**`SegmentedControl` takes `overflow`, `wrap` and `full`.** `overflow="scroll"`
scrolls a control wider than its row inside its own shell — bar hidden, a
`ScrollHintRow` fade on the side with more, the active item brought into view,
a label never wrapped. `wrap` breaks the row between items instead; a label
still never breaks, and there is no scroller and no fade. Both draw the shell
`rounded-control`, `glass` included: two rows in a pill put corners outside its
curve. `overflow="spill"`, the default, is the control as it was. `full`
shares the row in equal parts, never below a label — which is the default
width already; under the workspace profile a control without `full` is as wide
as its labels. Use the props — never a `[&>ul]:` selector in `className`,
which depends on markup this package is free to move.

**`Tabs scroll`** does the same for the deprecated `Tabs`: each item at least
its content's width and never wrapping its label, the row scrolling with a
fade, and the current item centred on mount (the row only — never the page).
With room to spare, items still share it equally. Without `scroll`, nothing
changes.

**`PeriodSwitcher`** — `‹ label › Today`. No date logic: the caller formats
`label`, moves the period in `onPrevious` / `onNext`, and supplies every string
(`previousLabel`, `nextLabel`, `todayLabel`). `onToday` omitted → no Today
button; `isCurrent` disables it. `headingLevel={2 | 3}` renders the label as a
heading instead of a `<span>`.

### One empty state

`EmptyState` takes `align` and `secondaryAction`. `align="center"` (the
default) suits a card or dialog; `align="start"` begins at the left edge, for a
page whose content does. `secondaryAction` sits on the action's row — a
`ReactNode`, or `{ label, onClick }` / `{ label, href }` drawn as a `ghost`.
Under the workspace profile the icon sits in a 40px `bg-hover` disc and the
title is 16/600; the title says the state ("No starred documents yet", never
the page name).

### Button: three tiers and a link

| Tier | Variant | Look |
|---|---|---|
| primary | `solid` | the accent with its label; ink with a ground label under the workspace profile. Disabled, the same fill at 40% opacity — not a grey fill. One per card. |
| secondary | `glass` | the material; under the workspace profile at `data-material="flat"`, `bg-ink/[0.06]` with a 1px inset `ring-line-strong`, `bg-ink/[0.10]` on hover — the same on a card and on the page. |
| ghost | `ghost` | toolbars, icon buttons, the quiet action in a row |
| destructive | `danger` | tinted; its label is ink under the workspace profile |
| link | `link` | `text-accent-ink`, the accent's gated text colour; underlines on hover. No height, no padding. For an `<a>` or a Next `<Link>`, use `buttonClassName({ variant: 'link' })`. |

### Dates and times in the interface's language

Chromium draws `<input type="date">` and `type="time"` in the browser's
language whatever `lang` says. `DateField` and `TimeField` draw everything from
`Intl` in the `locale` they are given, and speak the native inputs' strings, so
a call site swaps without logic changes. `DateInput` remains for
`datetime-local` and until every caller has moved.

**`DateField`** — `value` / `onValueChange` carry `YYYY-MM-DD` or `''`.
- At rest: `вт, 13 окт.` / `Tue, Oct 13` — the year only when it is not this
  one. Focused: the locale's numbers, `13.10.2026` / `10/13/2026`. Empty: the
  locale's pattern as the placeholder (`DD.MM.YYYY`, built from `Intl`, not
  hard-coded).
- Typed text is read on blur or Enter, in the locale's order with any
  separator: `13.10.2026`, `13/10/26`, `13 10`, `13102026`. No year → this
  year; a two-digit year → 20YY. A day that does not exist, or is outside
  `min` / `max`, keeps the text, sets `aria-invalid` and calls nothing.
  Clearing the text calls `onValueChange('')`.
- The calendar button (`calendarLabel`) opens a month grid in a popover:
  `PeriodSwitcher` header, `weekStartsOn` (default Monday), `role="grid"`.
  Arrows move a day, PageUp / PageDown a month (Shift: a year), Home / End the
  week's ends, Enter or Space picks, Escape closes and returns focus to the
  button. Today is ringed, the chosen day is ink. Days outside `min` / `max`
  are `aria-disabled` — reachable by keyboard, not pickable.
- The month arrows are named `previousMonthLabel` / `nextMonthLabel`; omitted,
  they are named after the month they go to (`September 2026`).

**`TimeField`** — `value` / `onValueChange` carry `HH:MM` (24-hour) or `''`.
- Shown on `hourCycle`, by default the locale's: `14:30` in ru and uk,
  `2:30 PM` in en.
- Accepts `1430`, `14:30`, `14.30`, `14 30`, `9`, `930`, `9:5` (→ `09:05`);
  under `h12` also an `a` / `p` / `am` / `pm` suffix or the locale's own.
  Without a suffix the hour is read on the 24-hour clock. Out of range keeps
  the text and sets `aria-invalid`.
- ArrowUp / ArrowDown move by `step` minutes (default 15), wrapping at
  midnight.

### A rail you can read and a panel that fits

**`AppRail labels`** — `'tooltip'` (default) or `'below'`.
- `'below'` prints each item's `label` under its icon: the item is `w-16
  flex-col gap-1 py-1.5`, the name `text-xs leading-4 max-w-14 truncate` (12px,
  the floor). Pass a short name as `label` — a long one is cut, and the
  `Tooltip` stays to read it. The `sr-only` copy is dropped, because the
  visible name is the accessible one; the `unavailable` phrase and a badge's
  spoken count stay `sr-only`.
- The capsule, the accent, the `warn` dot and `footerApps` are unchanged. The
  rail grows from one `--size-nav` square to a 64px item, so a layout that
  counted on the narrow rail should be looked at.

**`SidePanel strip`** — `true` (default) or `false`.
- `false` collapses to width 0: no strip, no `rail`, no material. Only the
  resize handle remains, keyboard-operable as before, sitting on the content's
  edge. Open, the panel is unchanged.
- The way back is the consumer's — `useSidePanel().expand` from a control that
  is on screen while the panel is not (a button in the `AppRail` `head`). A
  panel with no such control should keep its strip.

### Command palette: keys, hints and the first key

`CommandPaletteItem` takes `keys?: readonly string[]`, drawn after the hint as
one `kbd` keycap per key (`["G", "T"]`), `aria-hidden` because the label is what
is announced. Pass none on a coarse pointer. `hints` draws one row of key hints
under the list, in the consumer's words. `onInputKeyDown` is called with the
field's key events before the palette's own handling, including when the list
is empty; a handler that calls `preventDefault()` takes the key.

## Calm pages (AgentDock S-7)

AgentDock's stack S-7 redesigns the project pages around the Board: calmer,
less glass, fewer frames, more air, the navy palette kept. This is what the
package adds for it (card C-281). Every prop is optional and defaults to what
shipped before; the one change of default is scoped to `data-palette="navy"`.

| Import | What it is |
|---|---|
| `@andrewbehma/glass-ui/breakpoints` | `BREAKPOINTS` (`{ tablet: 640, desktop: 1024 }`), `PHONE_QUERY`, `TABLET_QUERY`, `DESKTOP_QUERY`, `BREAKPOINT_QUERIES`, `breakpointFor(width)` and the `Breakpoint` type (`'phone' \| 'tablet' \| 'desktop'`). Pure, safe on the server. |
| `@andrewbehma/glass-ui/use-breakpoint` | `useBreakpoint(serverFallback = 'desktop')` — the band the viewport is in; re-renders only when it crosses an edge. |
| `@andrewbehma/glass-ui/section` | `Section` — a titled block of content on the content surface. |
| `@andrewbehma/glass-ui/list-detail` | `ListDetail` — a list and its detail: stacked on a phone, side by side from a tablet up. |
| `@andrewbehma/glass-ui/page-header` | `PageHeader` gains `primaryAction`, `overflow` and `primaryActionOnPhone`. |
| `@andrewbehma/glass-ui/nav-rail` | `NavRail` gains `collapsed="tablet"` and `NavRailItem.primary`. |

### Three widths

| Band | Width | CSS | Script |
|---|---|---|---|
| phone | below 640px | the base, or `max-tablet:` | `'phone'`, `PHONE_QUERY` |
| tablet | 640–1023px | `tablet:` (and `max-desktop:`) | `'tablet'`, `TABLET_QUERY` |
| desktop | 1024px and up | `desktop:` | `'desktop'`, `DESKTOP_QUERY` |

`tokens.css` declares `--breakpoint-tablet: 40rem` and
`--breakpoint-desktop: 64rem`, which Tailwind turns into the `tablet:` and
`desktop:` variants. They are the values of `sm` and `lg`, so a component
written with `sm:` or `lg:` breaks at the same pixel as one written with the
new names. `breakpoints.ts` carries the same numbers for script and
`breakpoints.spec.ts` fails if the two disagree. Prefer the CSS variants when
only the look changes; reach for `useBreakpoint` when what is rendered changes.
The server has no viewport: `useBreakpoint` answers its `serverFallback` there
and on the first client render, then corrects itself after hydration.

### The rail on a tablet, and the primary entry

**`NavRail collapsed`** takes `true`, `false` or `'tablet'`. `'tablet'` draws
the 64px icon strip (`w-16`) while the viewport is in the tablet band and the
open rail on a desktop — the labels go to `sr-only`, exactly as with
`collapsed`. On a phone the application draws `BottomCapsule` instead; a rail
still drawn there stays open.

The fold is CSS, not JavaScript: in this mode the rail renders the open rail's
classes plus their folded counterparts under `tablet:max-desktop:` (width,
item padding, the primary entry's 44px square, the headings and labels going
`sr-only`, the group edges). Pieces that differ between the two states — a
badge inline beside the label or riding the glyph, the `unavailable` dot — are
rendered in both placements and toggled with `hidden` / `contents`, so a reader
hears one. The server's HTML is therefore already right at every width, and
hydration moves nothing. Only the label `Tooltip`s, which are invisible until
hovered or focused, are added after hydration through `useBreakpoint`. A
collapsible group is drawn open in the band (there is no heading to reopen it
with). The rail carries `data-collapsed="tablet"` in this mode and
`data-collapsed="true"` when `collapsed` is `true`; `collapsed={true}` and
`collapsed={false}` render the same classes as before.

**`NavRailItem.primary`** marks the one entry the product is built around (the
Board) and draws it in an accent frame: `bg-accent/8` with a `border-accent/40`
hairline, the glyph on a 24px solid `bg-accent` tile in `text-on-accent`, the
label in `ink` at 600, 38px tall with 6px under it; folded, a 44px square. It
stays `ink` when active — the frame already says "this one", the capsule says
"you are here". Its `link`, `aria-current`, badge and `unavailable` behave as on
any item, so a reader hears it as an ordinary entry. One per rail.

### PageHeader: one primary, one overflow

`PageHeader` keeps every prop it had and adds:

- `primaryAction` — `{ label, onClick, icon? }` or `{ label, href, icon? }`,
  drawn as the screen's single `solid` button at the end of the row (an `href`
  goes through `link`, like `EmptyState`'s action). A `ReactNode` renders as
  given.
- `primaryActionOnPhone` — `'inline'` (default) or `'hidden'`, which drops the
  primary below the tablet edge for a phone layout whose floating button
  already carries it.
- `overflow` — `{ id, label, onSelect, icon?, tone?, disabled? }[]`, drawn as a
  ghost `…` icon button after the primary that opens a `Menu`.
  `overflowLabel` names it (default "More actions"). An empty list draws
  nothing.

`actions` still renders first, for the one secondary glass button the calm
layout keeps beside the primary. Order in the row: `actions`, `primaryAction`,
`overflow`.

### Section, EmptyState and ListDetail

**`Section`** — `title`, `description?`, `actions?`, `headingLevel?` (2), and
the body as `children`. A `<section aria-labelledby>` whose `SectionHeader` sits
on the page and whose body sits on `surface-content` — one hairline per block,
no title bar inside a frame. `surface="none"` draws no box (for a body that is
already a surface — a `DataTable`, a grid of `Card`s); `pad="none"` runs rows
and their dividers edge to edge. `id` passes through, for an in-page table of
contents. Stack sections with a `gap-8` between them: more air between blocks
than inside them.

**`EmptyState`** is the one empty state, unchanged: put it in a `Section` body
(`align="center"`) or straight on the page (`surface="none"`,
`align="start"`).

**`ListDetail`** — `list`, `detail`, `phoneView?`, `listWidth?`, `stickyList?`,
`listLabel?`. Below the tablet edge it is one column: `phoneView="both"` (the
default) stacks the list above the detail, `'list'` or `'detail'` shows one
pane, for a flow where picking a row navigates and Back returns. From the tablet
edge up it is two columns, the list at `listWidth` (280px by default; a number
is pixels, a string any CSS length) and the detail taking the rest, and
`phoneView` no longer applies. Pure CSS, so the server renders it right at
every width. It draws no surface: the panes are the consumer's.

### The calm default under navy

Under `data-palette="navy"`, `material.css` sets the four optical layers liquid
glass added — `--glass-rim`, `--glass-rim-shade`, their `-strong` pair,
`--glass-meniscus` and `--glass-refract` — to `transparent`. The three glass
rungs keep their scrim, sheen, top highlight, blur and drop shadow, so a rail
still reads as a frosted pane over the canvas, without a bevel on every panel.
Only `transparent`, only tokens every flat route already sets to
`transparent`, so it composes with `data-material="flat"` and reduced
transparency in any order; no colour of the palette moves. Without navy nothing
changes. `calm.spec.ts` holds the block to exactly that.

## v0.38.0 wave

Sixteen components, scaffolded in `#175` and filled one slot each. Four new
optional peers carry the heavy parts: `react-markdown` and `remark-gfm`
(`Markdown`), `diff` (`DiffView`) and `@radix-ui/react-hover-card`
(`HoverCard`). Each section below is a placeholder until its slot lands.

### DiffView

`@andrewbehma/glass-ui/diff-view` — subpath only, never the barrel: it needs
the optional peer `diff` (jsdiff, >=7). A line diff of two texts, or a rendered
unified patch, on a solid surface: for pull requests, config changes and agent
reviews.

```tsx
import { DiffView } from '@andrewbehma/glass-ui/diff-view';

<DiffView
  fileName="config.yaml"
  language="yaml"
  oldText={before}
  newText={after}
  defaultMode="split"
  maxHeight={480}
/>;
```

| Prop | Default | |
|---|---|---|
| `oldText`, `newText` | — | The two texts, diffed by line (`diffLines`). |
| `patch` | — | A unified diff (`parsePatch`); when given, the texts are ignored. A multi-file patch renders its first file. |
| `mode` / `defaultMode` / `onModeChange` | `'unified'` | `'unified'` or `'split'`, controlled or not. Below the tablet edge it renders unified and the switch is hidden. |
| `fileName` | — | Header label. |
| `language` | — | Header label only, no highlighting. |
| `context` | `3` | Unchanged lines kept around a change; longer runs fold into an "N unchanged lines" button that expands in place. |
| `wrap` | `false` | Wrap long lines instead of scrolling sideways. |
| `maxHeight` | — | px; the rows scroll inside it. |
| `labels` | English | Every visible and spoken string: `noChanges`, `unified`, `split`, `viewMode`, `copy`, `copied`, `table`, `unchangedLines(n)`, `added(line)`, `removed(line)`, `unchanged(line)`, `counts(a, d)`. |

Added and removed lines get an `ok` / `danger` tint **and** a `+` / `−` sign.
In a modified pair the words that changed are also marked (`diffWordsWithSpace`).
The header shows `+a −d` and a copy-new-text button (not shown for a `patch`,
which does not hold the whole new text). Between the hunks of a patch, the lines
are not known, so that gap shows its count and cannot be expanded.

The rows are a `<table>` (APG Table). Gutters and signs are hidden from
assistive technology. Each line is read as "added line 12: …", "removed line
9: …" or "line 4: …", and an unchanged pair in split mode is read once.

| Key | |
|---|---|
| `Tab` | Moves through the mode switch, the copy button, the scroll region and each "N unchanged lines" button. |
| `Enter` / `Space` | Activates the focused switch segment, copy, or expand button. |
| Arrow keys | Scroll the focused rows region. |

### JsonInspector

`glass-ui/json-inspector` — a collapsible viewer for JSON-like values: event
payloads, MCP responses, log fields. `Tree` is for navigation; this is for
data. A solid surface, never glass.

```tsx
import { JsonInspector } from 'glass-ui/json-inspector';

<JsonInspector
  value={event.payload}
  rootLabel="payload"
  defaultExpandDepth={2}
  sortKeys
  copyable
/>;
```

| Prop | Meaning |
|---|---|
| `value` | Any value. `Date`, `Map`, `Set`, `bigint` and circular references are handled; a cycle renders as `[Circular]` and is never followed. |
| `expanded` / `onExpandedChange` | Controlled set of open paths (`$`, `$.items[3].id`, `$["odd key"]`; `Map`/`Set` entries by position, `$.tags[0]`). Without `expanded` the viewer keeps its own. |
| `defaultExpandDepth` | Containers shallower than this start open. Default `1` (the root). |
| `rootLabel` | The root row's key. |
| `sortKeys` | Sort object keys. |
| `maxStringLength` | Longer strings truncate with a show-full control. Default `120`. |
| `copyable` | Copy value / copy path per row, with the inline "Copied" confirmation. |
| `labels` | Every visible English string: `tree`, `copyValue`, `copyPath`, `copied`, `showFullString`, `showLessString`, `showMore(count)`, `circular`. |

A container with more than 100 children renders the first 100 and a
"Show N more" row. Types are told by shape and colour: strings are quoted,
`null`/`undefined` are italic, numbers are `tabular-nums`, a `bigint` ends in `n`.

Keyboard (WAI-ARIA `tree`, one tab stop): <kbd>↑</kbd> <kbd>↓</kbd> move,
<kbd>→</kbd> opens or enters, <kbd>←</kbd> closes or goes to the parent,
<kbd>Home</kbd> / <kbd>End</kbd> jump, <kbd>*</kbd> opens the siblings,
<kbd>Enter</kbd> / <kbd>Space</kbd> toggle (and unfold a truncated string or show
more). With `copyable`: <kbd>c</kbd> copies the value, <kbd>p</kbd> the path.

### Markdown

`@andrewbehma/glass-ui/markdown` — subpath only. Needs the optional peers
`react-markdown` and `remark-gfm`. Markdown for agent replies, issue bodies and
release notes, rendered through the kit, so you do not need your own
`react-markdown` setup or prose styles. It has no state and no
`'use client'`, so a server component can render it.

| Prop | What it does |
|---|---|
| `children` | The markdown source, a string. |
| `components` | react-markdown overrides (`Partial<MarkdownComponents>`), merged over the kit's mapping. Yours win, element by element. |
| `linkTarget` | `(href) => '_blank' \| undefined`, for each link's `target`. Default: no `target` (same tab). |
| `density` | `comfortable` (default) or `compact`, for chat bubbles: tighter block gaps, and `h1` steps down to `text-section`. |
| `labels` | `Partial<MarkdownLabels>`: `footnotes` (the visually hidden heading over GFM footnotes) and `backToReference(index, rereference)` (each footnote's back link). |
| `className` | Added to the root. |

**Mapping.** Fenced code renders as `CodeBlock` (language label, copy). Inline
code renders as a token-styled `<code>`. Tables render through `Table` /
`TableHead` / `TableRow` / `TableCell`, scroll horizontally, and keep GFM
column alignment. Task items render as a disabled `Checkbox` whose
accessible name is the item text. `hr` renders as `Separator`. Blockquotes get
a `line-strong` rule. Headings use the type scale (`h1` `text-heading`, `h2`
`text-section`, below that `text-body`) and get GitHub-style slug ids
(`## Next steps` → `#next-steps`, repeats get `-1`, `-2`). No
`@tailwindcss/typography`.

**Security.** Raw HTML is never rendered: there is no `rehype-raw`, so
`<script>` or `<img onerror>` in the source shows as literal text. Every `href`
and `src` passes react-markdown's `defaultUrlTransform`, which allows only
http(s), mailto, irc(s), xmpp and relative URLs. A `javascript:` or `data:`
link renders as plain text, and a `data:` image renders nothing. Absolute links
always get `rel="noreferrer noopener"`.

**Keyboard.** Markdown adds no key handling of its own. Links and the
`CodeBlock` copy and wrap buttons are in the tab order as usual, and a code
block's scroll region can take focus. Task checkboxes are disabled, so Tab
skips them.

```tsx
import { Markdown } from '@andrewbehma/glass-ui/markdown';
import { ChatThread } from '@andrewbehma/glass-ui/chat-thread';

<ChatThread
  messages={messages}
  renderBody={(message) => (
    <Markdown density="compact" linkTarget={(href) => (href.startsWith('http') ? '_blank' : undefined)}>
      {message.body}
    </Markdown>
  )}
/>;
```

### Pagination

In progress — see #179.

### DateRangePicker

`@andrewbehma/glass-ui/date-range-picker` — an arbitrary from–to range, for
log and analytics filters (`PeriodSwitcher` moves one fixed period,
`DateField` picks one day).

```tsx
import { type DateRange, DateRangePicker } from '@andrewbehma/glass-ui/date-range-picker';

const [range, setRange] = useState<DateRange | null>(null);

<DateRangePicker
  value={range}
  onValueChange={setRange}
  max={new Date()}
  placeholder="Any time"
/>;
```

| Prop | Type | Default | |
|---|---|---|---|
| `value` | `{ start: Date; end: Date } \| null` | — | Controlled. Both ends at local midnight, `end` inclusive. Omitted → uncontrolled |
| `onValueChange` | `(value) => void` | — | Called with the committed range |
| `defaultValue` | `DateRange \| null` | `null` | The uncontrolled start |
| `presets` | `{ id; label; range: () => DateRange }[]` | Today, Last 7 days, Last 30 days, This month | `range()` is read when the popover renders, so "today" is always today. This month = the 1st to today |
| `min` / `max` | `Date` | — | Days outside are `aria-disabled`; a preset reaching outside is disabled |
| `months` | `1 \| 2` | `2` | Two side by side from the tablet edge (640px) up, one below it |
| `weekStartsOn` | `0 \| 1` | `1` | Monday |
| `placeholder` | `string` | `labels.placeholder` | The trigger with no range |
| `disabled` | `boolean` | — | |
| `tone` | `'surface' \| 'on-glass'` | `'surface'` | The field tone, as `Input` |
| `labels` | `Partial<DateRangePickerLabels>` | English | Every visible and announced string: `placeholder`, `dialog`, `presets`, `today`, `last7Days`, `last30Days`, `thisMonth`, `previousMonth`, `nextMonth`, `startPicked(day)`, `rangeSelected(range)`, `cancelled` |
| `className` | `string` | — | Styles the trigger |

- The trigger is a field-family button showing the range in `Intl`'s own range
  format in the document's language (`<html lang>`, else the browser's):
  `12–19 Oct 2026` in en-GB, `Oct 12 – 19, 2026` in en-US.
- The popover is the glass `PopoverContent`: presets beside the months (above
  them on a phone), and the months are `DateField`'s grid (`MonthGrid` in
  `date-field-grid.tsx`), with the neighbouring months' days left blank so two
  months never show one day twice.
- First pick sets the start; the pointer, or the focused day, previews the
  range; the second pick commits it and closes. A pick before the start
  starts again from there; the same day twice is a one-day range. Range ends
  are ink, the days between are tinted, and every day in the range is
  `aria-selected` — colour is not the only signal. A polite live region
  announces the start and the chosen range.

| Key (in the grid) | |
|---|---|
| Arrows | A day / a week |
| PageUp / PageDown | A month (Shift: a year); the shown months follow |
| Home / End | The week's ends, from `weekStartsOn` |
| Enter / Space | Pick the start, then the end |
| Escape | Drops a pending start; with none, closes and returns focus to the trigger |
| Tab | One day is in the tab order across both months (roving `tabIndex`) |

### Stepper

`glass-ui/stepper` — steps for onboarding and multi-step forms. `Stepper` is the
progress display; `Wizard` is `Stepper` + the current step's panel + Back / Next /
Finish. Solid surfaces, never glass.

```tsx
import { Wizard } from 'glass-ui/stepper';

const steps = [
  { id: 'repo', label: 'Connect repository' },
  { id: 'secrets', label: 'Secrets', optional: true },
  { id: 'run', label: 'First run', description: 'Takes about a minute' },
];

<Wizard
  steps={steps}
  current={current}
  onStepChange={setCurrent}
  onFinish={start}
  canAdvance={repoConnected}
>
  {panelFor(current)}
</Wizard>;
```

| Prop | Meaning |
|---|---|
| `steps` | `{ id, label, description?, optional?, status?: 'error' }[]`. |
| `current` / `onStepChange` | The current step id; called with the id a click, Back or Next asks for. Both controlled — the stepper keeps only focus. |
| `completed` | `ReadonlySet<string>` of finished ids. Omitted → the steps before `current`; given → authoritative. |
| `navigable` | `none` (default, read-only), `completed` (finished steps are buttons) or `all` (every step but the current). |
| `orientation` | `horizontal` (default) or `vertical`, for side panels. |
| `canAdvance` | Wizard only. `false` disables Next and Finish. |
| `onFinish` | Wizard only. The Finish button on the last step. |
| `labels` | Every visible English string: `steps`, `completed`, `error`, `optional`, `stepOf(index, total, label)`, `back`, `next`, `finish`. |

The current step is `aria-current="step"`; completed shows a check, an error shows
an icon and the word, so colour is never the only signal. The connector fills up to
the current step. A horizontal stepper narrower than the `sm` container width
collapses to "Step 2 of 4 · Secrets" (the list stays available to screen readers).
`Wizard` moves focus to the panel heading when the step changes, not on mount.

Keyboard: no WAI-ARIA pattern covers a stepper. Clickable steps and the footer
buttons are plain buttons in the Tab order — <kbd>Tab</kbd> moves, <kbd>Enter</kbd> /
<kbd>Space</kbd> activates.

### Fieldset

In progress — see #182.

### TagInput

In progress — see #183.

### HoverCard

`@andrewbehma/glass-ui/hover-card` — a rich preview on hover: a user, a commit,
an issue. `Tooltip` is too small for it and `Popover` opens on click. Built on
`@radix-ui/react-hover-card`; the card has `PopoverContent`'s glass surface,
radius and motion (still under reduced motion).

| Part | Props |
|---|---|
| `HoverCard` | `openDelay` (500 ms), `closeDelay` (150 ms), `open`, `defaultOpen`, `onOpenChange` |
| `HoverCardTrigger` | Radix `Trigger`; use `asChild` on a link |
| `HoverCardContent` | `side` (`bottom`), `align` (`center`), `sideOffset`, `className`, `container` |

Keyboard: focusing the trigger opens the card, blurring or `Escape` closes it.
Touch: a tap does not open it — the link navigates. The card is never the only
route to its information, so the trigger must be a link to the same thing. It
takes no focus and has no visible English strings, so there are no `labels`.

```tsx
<HoverCard>
  <HoverCardTrigger asChild>
    <a href="/users/ada">Ada Lovelace</a>
  </HoverCardTrigger>
  <HoverCardContent side="top">
    <p className="font-semibold">Ada Lovelace</p>
    <p className="text-ink-2">Joined 2024 · 42 commits</p>
  </HoverCardContent>
</HoverCard>
```

### Meter

In progress — see #185.

### ActivityHeatmap

In progress — see #186.

### PinInput

In progress — see #187.

### Carousel

In progress — see #188.

### Rating

In progress — see #189.

### ColorPicker

In progress — see #190.

### Tour

In progress — see #191.

## Developing

```sh
bun install
bun run lint     # Biome, over src/ and scripts/
bun run test     # bun test, with the DOM from src/test-setup.ts
bun run build    # dist/: tsc emit, relative specifiers made Node-resolvable, CSS copied
bun run smoke    # packs the tarball and checks it as a consumer would get it
```

`bun run smoke` runs after `bun run build`. It packs the package with
`npm pack`, unpacks the tarball under `.smoke/` and checks it as a consumer
would see it:

- the tarball holds only `dist/`, `README.md`, `LICENSE` and `package.json`;
- every `exports` target exists;
- every built file whose source starts with `'use client'` starts with it
  too;
- every JS subpath imports under Node with `--conditions=import`.

Woodpecker runs lint, test, build and smoke on every pull request and every
push to `develop` and `main` (`.woodpecker/ci.yml`).

## Releasing

The version in `package.json` is the release. Merging a version bump into
`main` publishes it and tags it; there is no manual step.

1. Branch `release/vX.Y.Z` from `develop`, set `"version": "X.Y.Z"` in
   `package.json`, and open a pull request into `main`.
2. Merge it into `main`.
3. `.woodpecker/release.yml` does the rest. On the push to `main` it installs,
   lints, tests, builds and smoke-tests, then runs `npm publish` if X.Y.Z is
   not on npm yet, and pushes the tag `vX.Y.Z`. A push to `main` without a
   version bump publishes nothing and passes.

The tag push still works and is idempotent. Pushing `vX.Y.Z` yourself checks the
tag against `package.json` (a mismatch fails before anything is built) and
publishes that version; a version that is already on npm passes without
publishing again, which is also what the tag the pipeline pushes itself does.
When the registry has not caught up with a publish yet, the tag pipeline tries
again and gets a 409; `scripts/release/publish.sh` treats that as published.

**Maint lines never take `latest`.** A push to a `maint/*` branch (for example
`maint/v0.8`), or any version below the current `latest`, is published with
`npm publish --tag v<major>.<minor>` (`v0.8` for 0.8.14), so it cannot move the
`latest` dist-tag. `scripts/release/decide.sh` makes that decision and
`scripts/release/decide.test.ts` covers it. After a release, check with
`npm view @andrewbehma/glass-ui dist-tags`.

**Secrets.** `npm_token` must be available to the `push`, `tag` and `manual`
events. Without `push` the publish step says so and passes. The tag step needs
`github_token` (contents write on this repository), available to `push` only;
without it the step says so and passes, and the tag is pushed by hand:
`git tag vX.Y.Z && git push origin vX.Y.Z`.

**The tag follows the publish step's decision, not the registry.** The publish
step records `publish=yes|no` and `version` in `.release/decision`; the tag step
reads it (`scripts/release/should-tag.sh`, covered by `should-tag.test.ts`)
because `npm view` can still miss a version published a second earlier (#121).
Published now: tag. Already published and no tag yet (a re-run): tag. Already
published and tagged (no version bump), or no decision recorded: no tag.

To rehearse without a tag, start a manual pipeline in Woodpecker with
`[glass-release]` in its message. It runs the same steps and ends in
`npm publish --dry-run`. A manual run without that marker does not start the
release workflow.

## License

[MIT](LICENSE)
