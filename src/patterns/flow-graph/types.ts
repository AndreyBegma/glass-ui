import type { ReactNode } from 'react';
import type { Hue } from '../../lib/hue';
import type { StatusTone } from './tone';

/**
 * #94 — FlowGraph's public types. They live apart from `index.tsx` so the pure
 * parts (layout, edge style, keyboard) can name them without importing React
 * components or `@xyflow/react`; `index.tsx` re-exports every one.
 */
export type FlowTone = StatusTone;

/** The three kinds the legend and the edge styles know. Any other string draws solid. */
export type FlowEdgeKnownKind = 'delegates' | 'depends' | 'returns';

// `string & {}` keeps the three known kinds in autocomplete.
export type FlowEdgeKind = FlowEdgeKnownKind | (string & {});

export type FlowNodeSize = { width: number; height: number };

/** What the default node card reads. A `renderNode` graph may carry anything. */
export type FlowNodeData = {
  title: string;
  /** Shown beside the status dot. Defaults to the tone's name. */
  status?: string;
  /** One quiet line under the title: "2 agents · 1 worktree". */
  meta?: ReactNode;
  /** A small tile before the title. */
  icon?: ReactNode;
};

export type FlowNode<T = FlowNodeData> = {
  id: string;
  data: T;
  /** The status colour: the card's rim and glow, and every edge into this node. */
  tone?: FlowTone;
  /**
   * #109 — the node's identity hue: the default card's border, icon disc and
   * glow, and every edge out of it that no status colours.
   */
  hue?: Hue;
  /** The node's box. Defaults to the graph's `nodeSize`. Layout needs it before render. */
  size?: FlowNodeSize;
};

export type FlowEdge = {
  /** Defaults to `source->target:kind`, de-duplicated. */
  id?: string;
  source: string;
  target: string;
  kind: FlowEdgeKind;
  /** Overrides the tint, which is otherwise the target node's tone. */
  tone?: FlowTone;
  /** A pulse travels the edge. Off under reduced motion. Overrides the graph's `animated`. */
  animated?: boolean;
};

export type FlowLayout = 'tree' | 'layered';
export type FlowDirection = 'TB' | 'LR';

/** What `renderNode` is told besides the node itself. */
export type FlowNodeState = {
  selected: boolean;
  /** The node holds keyboard focus. The focus ring is drawn around it already. */
  focused: boolean;
};

/** Every string the graph renders or announces, with English defaults. */
export type FlowGraphLabels = {
  zoomIn: string;
  zoomOut: string;
  fitView: string;
  /** The summary appended to `label`: "13 nodes, 12 connections". */
  summary: (nodes: number, edges: number) => string;
  /** How to drive it, read once when focus enters a node. */
  instructions: string;
  /** Shown when there is no node to draw and no `emptyState` is given. */
  empty: string;
  /** One phrase per edge kind, for the legend and for each node's description. */
  kinds: Record<FlowEdgeKnownKind, string> & Record<string, string>;
  tones: Record<FlowTone, string>;
};

export type FlowGraphProps<T = FlowNodeData> = {
  /** Names the graph; screen readers hear it with an auto summary. */
  label: string;
  nodes: FlowNode<T>[];
  edges: FlowEdge[];
  /**
   * Draws a node's content. Without it the node is a `FlowNodeCard`, which
   * reads `FlowNodeData`. Interactive content inside (an input, a menu) takes
   * the `nodrag nopan nowheel` classes so the canvas leaves it alone.
   */
  renderNode?: (node: FlowNode<T>, state: FlowNodeState) => ReactNode;
  /** The name a node is announced by. Defaults to `data.title`, then the id. */
  nodeLabel?: (node: FlowNode<T>) => string;
  /** Defaults to `'tree'`. */
  layout?: FlowLayout;
  /** Defaults to `'TB'`. */
  direction?: FlowDirection;
  /** The size of a node without its own `size`. Defaults to 240 × 96. */
  nodeSize?: FlowNodeSize;
  /** Space between siblings, and between ranks. */
  gap?: { node?: number; rank?: number };
  /** Every edge carries a travelling pulse unless it says otherwise. */
  animated?: boolean;
  /** The selected node's id. Controlled with the next prop. */
  selectedId?: string | null;
  defaultSelectedId?: string | null;
  onSelectionChange?: (id: string | null) => void;
  onNodeClick?: (node: FlowNode<T>) => void;
  /** Height of the viewport. Defaults to 480. */
  height?: number | string;
  /** Defaults to 0.25 and 2. */
  minZoom?: number;
  maxZoom?: number;
  /** A dot grid behind the graph. Defaults to `true`. */
  background?: boolean;
  /** The zoom and fit buttons. Defaults to `true`. */
  controls?: boolean;
  emptyState?: ReactNode;
  labels?: Partial<FlowGraphLabels>;
  className?: string;
};
