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
