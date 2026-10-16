# SelectionBar

A floating action bar for multi-select: "3 selected", Clear, and the bulk
actions that apply to the selection. Added in #157 for AgentDock's Board (C-87).

| Import | What it is |
|---|---|
| `@andrewbehma/glass-ui` → `SelectionBar` | The bar. Renders nothing at `count = 0`. |

```tsx
import { SelectionBar } from '@andrewbehma/glass-ui';
import { Archive } from 'lucide-react';

<SelectionBar
  count={selected.size}
  onClear={() => setSelected(new Set())}
  bottomOffset={72}
  actions={[
    {
      id: 'complete',
      label: 'Move to Completed',
      onSelect: moveToCompleted,
      count: movable, // how many of the selection this applies to
      of: selected.size, // draws "40 of 42"; count 0 disables the action
    },
    { id: 'archive', label: 'Archive', icon: Archive, onSelect: archive },
    { id: 'delete', label: 'Delete', tone: 'danger', onSelect: remove },
  ]}
/>;
```

## Props

| Prop | |
|---|---|
| `count` | How many are selected. The bar is mounted only while this is above zero. |
| `onClear` | Called by the Clear button and by Escape with focus inside the bar. |
| `actions` | `{ id, label, icon?, onSelect, count?, of?, tone?, disabled? }[]`. `count` + `of` draw an "N of M" badge; `count: 0` disables the action. `tone: 'danger'` for a destructive one. |
| `label` | `(count) => ReactNode`, replacing "N selected". |
| `clearLabel` | "Clear" by default. |
| `aria-label` | The toolbar's name. "Selection actions" by default. |
| `anchor` | `'viewport'` (default, `fixed`) or `'container'` (`absolute` in the nearest positioned ancestor). |
| `bottomOffset` | Pixels above the bottom edge, plus the safe-area inset. 16 by default. Use it to clear a `BottomCapsule` or a toast region. |
| `className` | On the bar itself. |

## Behaviour

- **Holds no state about the selection.** The application owns what is selected,
  how many each action applies to and what an action does.
- **Motion.** The bar rises in and out on the `arrive` spring. Under
  `prefers-reduced-motion` it only fades; nothing is transformed.
- **Keyboard.** `role="toolbar"`: arrows, Home and End move focus across the
  enabled buttons, wrapping. Tab order stays native. Escape inside the bar
  calls `onClear`.
- **Announcements.** "N selected" is an `aria-live="polite"` region. The action
  badges are not live.
- **Narrow widths.** The actions wrap onto a second row; the bar never exceeds
  the width of its container and is at most two rows tall.
- **Theme.** `glass-strong` material and the existing tokens only, so light and
  dark follow the rest of the package.
