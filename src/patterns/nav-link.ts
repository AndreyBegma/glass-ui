import type { ReactNode } from 'react';

/**
 * FEAT-20260902-004 — how a consumer's anchor gets into a navigation pattern.
 *
 * `BottomCapsule` and `NavRail` both draw chrome around things that navigate,
 * and neither may import the thing that navigates. Luna Watch's bottom bar
 * imports `@/i18n/navigation`; Denitsa's rail would import `next/link`; a
 * package that imported either would point its dependency at exactly one
 * application and stop being a package.
 *
 * `SegmentedControlItem` already settled the shape of the answer: the pattern
 * renders the travelling capsule, the consumer renders the interactive element.
 * What it did not settle is how that scales past one item. A render prop per
 * item means the consumer writes the same anchor six times for six sections,
 * and a `Link` component prop means the package has an opinion about that
 * component's props.
 *
 * So: one function, given once, called for every item that carries an `href`.
 * The pattern computes the class name and the `aria-current`, because those are
 * the pattern's business; the consumer decides what element receives them.
 *
 * An item with no `href` is not a destination and renders a `button` — the
 * `More` tab, or a rail entry that opens something rather than going somewhere.
 * That case needs no function at all, which is why the prop is optional and why
 * a pattern used entirely for in-page state has no ceremony around it.
 */
export type NavLinkRender = (props: {
  href: string;
  className: string;
  /** Set on the item the consumer marked `active`. */
  'aria-current'?: 'page';
  /**
   * Set only where the pattern has hidden the visible label and owes the eye a
   * name — a collapsed `NavRail`. Forward it to the element; the accessible
   * name comes from the `sr-only` text inside `children`, so this is for the
   * pointer and nothing else.
   */
  title?: string;
  children: ReactNode;
}) => ReactNode;
