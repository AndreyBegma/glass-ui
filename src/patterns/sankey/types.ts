import type { ReactNode } from 'react';
import type { Hue } from '../../lib/hue';

/**
 * #94 — Sankey's public types. They live apart from `index.tsx` so the pure
 * parts (normalise, collapse, layout) can name them without importing React
 * components; `index.tsx` re-exports every one.
 */

/** A token, never a raw colour, so a theme change re-colours the graph. */
export type SankeyTone =
  | 'accent'
  | 'ok'
  | 'warn'
  | 'danger'
  | 'neutral'
  | 'series-1'
  | 'series-2'
  | 'series-3'
  | 'series-4'
  | 'series-5'
  | 'series-6';

/** A named stage of the flow, left to right in the order given. */
export type SankeyColumn = { id: string; label: string };

export type SankeyNode = {
  id: string;
  label: string;
  /** The `id` of the column it sits in. */
  column: string;
  /** Defaults to `'accent'`. */
  tone?: SankeyTone;
  /**
   * #109 — an identity hue: the node's tint, rim and badge (over `tone`), and
   * the colour of every link out of it. Without one, links are the accent.
   */
  hue?: Hue;
  /**
   * A floor for the node's value. The value shown is the largest of this, the
   * sum of its incoming links and the sum of its outgoing ones.
   */
  value?: number;
};

export type SankeyLink = {
  source: string;
  target: string;
  value: number;
};

/**
 * What `onNodeClick` and the readout are given. For a "+N more" node,
 * `collapsed` holds the nodes it stands for; for any other node it is empty.
 */
export type SankeyNodeInfo = {
  id: string;
  label: string;
  column: string;
  tone: SankeyTone;
  /** #109 — the node's identity hue, if it has one. */
  hue?: Hue;
  value: number;
  collapsed: SankeyNode[];
};

/** Every string the graph renders or announces, with English defaults. */
export type SankeyLabels = {
  showTable: string;
  hideTable: string;
  /** The table's column headers. */
  source: string;
  target: string;
  value: string;
  /** Shown when there is no link to draw and no `emptyState` is given. */
  empty: string;
  /** Added to the table caption when some input was not drawn. */
  ignored: (links: number, nodes: number) => string;
  /** The collapsed node's name: "+13 more". */
  more: (count: number) => string;
  /** The summary after the label: "5 columns, 14 nodes, 21 links". */
  summary: (columns: number, nodes: number, links: number) => string;
  /** The graph's ARIA description, given the column names in order. */
  description: (columns: string[]) => string;
  /** A link's accessible name: "Main agent to Explore, 45". */
  link: (source: string, target: string, value: string) => string;
  /** A node's accessible name: "Explore, Subagent types, 45". */
  node: (label: string, column: string, value: string) => string;
};

export type SankeyProps = {
  /** Names the graph; its accessible name is this plus an auto summary. */
  label: string;
  columns: SankeyColumn[];
  nodes: SankeyNode[];
  links: SankeyLink[];
  /** Defaults to a compact `Intl.NumberFormat` ("1.2K"). */
  valueFormat?: (value: number) => string;
  /** Makes every node a button. */
  onNodeClick?: (node: SankeyNodeInfo) => void;
  /**
   * The most nodes a column shows. A longer column keeps the top
   * `maxPerColumn - 1` by value and folds the rest into one "+N more" node.
   * Defaults to 8.
   */
  maxPerColumn?: number;
  /** Defaults to a height that fits the longest column. */
  height?: number;
  emptyState?: ReactNode;
  /** The visually hidden table becomes visible. Controlled with the next prop. */
  showTable?: boolean;
  onShowTableChange?: (show: boolean) => void;
  /** Overrides any of the strings above; the rest stay English. */
  labels?: Partial<SankeyLabels>;
  className?: string;
};
