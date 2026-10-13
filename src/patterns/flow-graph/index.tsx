'use client';

import '@xyflow/react/dist/base.css';
import {
  Background,
  BackgroundVariant,
  type Edge,
  type EdgeProps,
  getBezierPath,
  getSmoothStepPath,
  Handle,
  type Node,
  type NodeProps,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import { Maximize, Minus, Plus } from 'lucide-react';
import {
  type CSSProperties,
  createContext,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { cn } from '../../lib/cn';
import { Button } from '../../primitives/button';
import { type FlowEdgeStyle, edgeStyle } from './edge-style';
import { isArrow, nearestInDirection } from './keyboard';
import { type FlowLayoutResult, layoutFlow } from './layout';
import { DEFAULT_KIND_LABELS } from './legend';
import { flowTone, hueTone, STATUS_TONE_LABELS, STATUS_TONES } from './tone';
import { HUES } from '../../lib/hue';
import type {
  FlowDirection,
  FlowEdge,
  FlowGraphLabels,
  FlowGraphProps,
  FlowLayout,
  FlowNode,
  FlowNodeData,
  FlowNodeState,
  FlowTone,
} from './types';
import { FlowNodeCard } from './node-card';

export { edgeDash, edgeHue, edgeStyle, edgeTone } from './edge-style';
export type { FlowEdgeStyle } from './edge-style';
export { nearestInDirection } from './keyboard';
export { DEFAULT_NODE_SIZE, layoutFlow } from './layout';
export type { Box, FlowLayoutOptions, FlowLayoutResult } from './layout';
export { FlowLegend } from './legend';
export type { FlowLegendProps } from './legend';
export { FlowNodeCard } from './node-card';
export type { FlowNodeCardProps } from './node-card';
export {
  flowTone,
  hueTone,
  NEUTRAL_TONE,
  STATUS_TONE_LABELS,
  STATUS_TONES,
  statusTone,
} from './tone';
export type { FlowToneClasses, StatusTone, StatusToneClasses } from './tone';
export type {
  FlowDirection,
  FlowEdge,
  FlowEdgeKind,
  FlowEdgeKnownKind,
  FlowGraphLabels,
  FlowGraphProps,
  FlowLayout,
  FlowNode,
  FlowNodeData,
  FlowNodeSize,
  FlowNodeState,
  FlowTone,
} from './types';

/**
 * #94 — FlowGraph: an interactive node graph. A tree of agent cards, or a
 * layered "depends on / delegates to" graph, with pan, zoom and fit-to-view.
 *
 * The parts live beside this file, one each: `layout` and `tree-layout`
 * (where nodes go, pure and synchronous), `edge-style` (kind → dash, target
 * tone → colour), `keyboard` (which node an arrow reaches), `tone` (the status
 * palette), `node-card` (the default node) and `legend`. This file maps them
 * onto `@xyflow/react`, which owns the viewport: pan, zoom, culling, and the
 * edge endpoints.
 *
 * Positions are computed here, not by xyflow or a measuring pass, so the first
 * frame is already laid out. A node is never dragged: the layout is the
 * picture.
 *
 * Edges are our own `<path>`, not xyflow's `BaseEdge`: its stylesheet paints
 * `.react-flow__edge-path` outside any cascade layer, which would beat every
 * token class Tailwind writes. The arrowheads are shared `<marker>`s, one per
 * tone.
 *
 * xyflow's attribution link stays, bottom-left and without its plate: the
 * library asks that it is hidden only under a React Flow Pro subscription.
 *
 * Accessibility. The graph is a named group, and one tab stop: the nodes rove.
 * ←↑→↓ move to the nearest node that way (`keyboard.ts`), Home and End to the
 * first and last, Enter or Space selects (and calls `onNodeClick`), Escape
 * clears the selection. Each node is announced by its name and status, and
 * describes where its edges go, in words — never by colour alone. The
 * travelling pulse is off under `prefers-reduced-motion`, and so is the pan
 * animation.
 */

const DEFAULT_LABELS: FlowGraphLabels = {
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  fitView: 'Fit to view',
  summary: (nodes, edges) =>
    `${nodes} ${nodes === 1 ? 'node' : 'nodes'}, ${edges} ${edges === 1 ? 'connection' : 'connections'}`,
  instructions:
    'Arrow keys move between nodes, Home and End go to the first and last. Enter selects, Escape clears the selection.',
  empty: 'Nothing to show yet.',
  kinds: DEFAULT_KIND_LABELS as FlowGraphLabels['kinds'],
  tones: STATUS_TONE_LABELS,
};

const FIT_OPTIONS = { padding: 0.12, maxZoom: 1 };

type GraphContext = {
  layout: FlowLayout;
  direction: FlowDirection;
  markerPrefix: string;
  instructionsId: string;
  reducedMotion: boolean;
  selectedId: string | null;
  tabStop: string | null;
  renderNode: ((node: FlowNode<unknown>, state: FlowNodeState) => ReactNode) | undefined;
  nodeName: (node: FlowNode<unknown>) => string;
  describe: (id: string) => string;
  tones: Record<FlowTone, string>;
  activate: (id: string) => void;
  onNodeKeyDown: (id: string, event: KeyboardEvent<HTMLDivElement>) => void;
  onNodeFocus: (id: string) => void;
};

const Ctx = createContext<GraphContext | null>(null);

type NodeData = { node: FlowNode<unknown> };
type EdgeData = { style: FlowEdgeStyle };
type XyNode = Node<NodeData, 'flow'>;
type XyEdge = Edge<EdgeData, 'flow'>;

/** A node shorter than this gets the one-row card. */
const COMPACT_BELOW = 64;

function FlowNodeView({ id, data, height }: NodeProps<XyNode>) {
  const ctx = useContext(Ctx)!;
  const { node } = data;
  const selected = ctx.selectedId === id;
  const descId = `${ctx.markerPrefix}-desc-${useId().replace(/[^\w-]/g, '')}`;
  const description = ctx.describe(id);
  const name = ctx.nodeName(node);
  const vertical = ctx.direction === 'TB';
  const card = node.data as Partial<FlowNodeData> | undefined;

  return (
    // biome-ignore lint/a11y/useSemanticElements: a node is a focusable, clickable group that may hold its own controls; a fieldset is a form part and cannot be the roving tab stop
    <div
      role="group"
      aria-roledescription="node"
      aria-label={node.tone ? `${name}, ${ctx.tones[node.tone]}` : name}
      aria-describedby={cn(description && descId, ctx.instructionsId)}
      aria-current={selected ? 'true' : undefined}
      tabIndex={ctx.tabStop === id ? 0 : -1}
      data-flow-node={id}
      data-selected={selected || undefined}
      onClick={() => ctx.activate(id)}
      onKeyDown={(event) => ctx.onNodeKeyDown(id, event)}
      onFocus={(event) => {
        if (event.target === event.currentTarget) ctx.onNodeFocus(id);
      }}
      className={cn(
        'relative h-full w-full cursor-pointer rounded-surface',
        'transition-shadow duration-(--dur-fast)',
        selected &&
          'shadow-[0_0_0_2px_var(--color-accent),0_0_0_6px_var(--color-accent-soft),0_0_32px_-4px_var(--color-accent)]',
      )}
    >
      <Handle
        type="target"
        position={vertical ? Position.Top : Position.Left}
        isConnectable={false}
        style={HIDDEN_HANDLE}
      />
      {ctx.renderNode ? (
        ctx.renderNode(node, { selected, focused: ctx.tabStop === id })
      ) : (
        <FlowNodeCard
          title={card?.title ?? node.id}
          tone={node.tone}
          hue={node.hue}
          status={card?.status}
          meta={card?.meta}
          icon={card?.icon}
          compact={(height ?? 0) < COMPACT_BELOW}
        />
      )}
      {description ? (
        <span id={descId} className="sr-only">
          {description}
        </span>
      ) : null}
      <Handle
        type="source"
        position={vertical ? Position.Bottom : Position.Right}
        isConnectable={false}
        style={HIDDEN_HANDLE}
      />
    </div>
  );
}

const HIDDEN_HANDLE = { opacity: 0, pointerEvents: 'none' as const, border: 0, minWidth: 1, minHeight: 1 };

function FlowEdgeView({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps<XyEdge>) {
  const ctx = useContext(Ctx)!;
  const geometry = { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition };
  const [path] =
    ctx.layout === 'tree'
      ? getSmoothStepPath({ ...geometry, borderRadius: 12 })
      : getBezierPath(geometry);
  if (!data) return null;
  const { style } = data;
  return (
    <g data-flow-edge data-tone={style.tone} data-hue={style.hue}>
      <path
        d={path}
        fill="none"
        strokeWidth={1.5}
        strokeLinecap={style.linecap}
        strokeDasharray={style.dash}
        markerEnd={`url(#${ctx.markerPrefix}-arrow-${style.marker})`}
        className={style.classes.stroke}
      />
      {style.animated ? (
        <circle r={3} className={style.classes.fill} data-flow-pulse>
          <animateMotion dur="2.4s" repeatCount="indefinite" path={path} />
        </circle>
      ) : null}
    </g>
  );
}

const NODE_TYPES = { flow: FlowNodeView };
const EDGE_TYPES = { flow: FlowEdgeView };

/** Arrowheads, one per tone and one per hue (#109), shared by every edge of the graph. */
function Markers({ prefix }: { prefix: string }) {
  const tones: (FlowTone | undefined)[] = [...STATUS_TONES, undefined];
  const heads = [
    ...tones.map((tone) => ({ key: tone ?? 'none', fill: flowTone(tone).fill })),
    ...HUES.map((hue) => ({ key: `hue-${hue}`, fill: hueTone(hue).fill })),
  ];
  return (
    <svg aria-hidden="true" width={0} height={0} className="absolute">
      <defs>
        {heads.map(({ key, fill }) => (
          <marker
            key={key}
            id={`${prefix}-arrow-${key}`}
            viewBox="0 0 10 10"
            refX={9}
            refY={5}
            markerWidth={6}
            markerHeight={6}
            orient="auto-start-reverse"
          >
            <path d="M1 1 L9 5 L1 9 z" className={fill} />
          </marker>
        ))}
      </defs>
    </svg>
  );
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return reduced;
}

/** Drops self-loops and edges to unknown nodes, and makes every id unique. */
function drawableEdges(edges: readonly FlowEdge[], known: ReadonlySet<string>) {
  const used = new Set<string>();
  const out: (FlowEdge & { id: string })[] = [];
  for (const e of edges) {
    if (e.source === e.target || !known.has(e.source) || !known.has(e.target)) continue;
    const base = e.id ?? `${e.source}->${e.target}:${e.kind}`;
    let id = base;
    for (let i = 2; used.has(id); i++) id = `${base}#${i}`;
    used.add(id);
    out.push({ ...e, id });
  }
  return out;
}

export function FlowGraph<T = FlowNodeData>(props: FlowGraphProps<T>) {
  return (
    <ReactFlowProvider>
      <FlowGraphInner {...props} />
    </ReactFlowProvider>
  );
}

function FlowGraphInner<T>({
  label,
  nodes: inputNodes,
  edges: inputEdges,
  renderNode,
  nodeLabel,
  layout = 'tree',
  direction = 'TB',
  nodeSize,
  gap,
  animated = false,
  selectedId: controlledSelected,
  defaultSelectedId = null,
  onSelectionChange,
  onNodeClick,
  height = 480,
  minZoom = 0.25,
  maxZoom = 2,
  background = true,
  controls = true,
  emptyState,
  labels: labelOverrides,
  className,
}: FlowGraphProps<T>) {
  const labels: FlowGraphLabels = useMemo(
    () => ({
      ...DEFAULT_LABELS,
      ...labelOverrides,
      kinds: { ...DEFAULT_LABELS.kinds, ...labelOverrides?.kinds },
      tones: { ...DEFAULT_LABELS.tones, ...labelOverrides?.tones },
    }),
    [labelOverrides],
  );
  const rf = useReactFlow<XyNode, XyEdge>();
  const boxRef = useRef<HTMLDivElement>(null);
  const prefix = `flow${useId().replace(/[^\w-]/g, '')}`;
  const instructionsId = `${prefix}-help`;
  const reducedMotion = usePrefersReducedMotion();

  const [ownSelected, setOwnSelected] = useState<string | null>(defaultSelectedId);
  const selectedId = controlledSelected === undefined ? ownSelected : controlledSelected;
  const [focusId, setFocusId] = useState<string | null>(null);

  // Duplicate ids keep the first, as the layout does.
  const nodes = useMemo(() => {
    const seen = new Set<string>();
    return inputNodes.filter((n) => {
      if (seen.has(n.id)) return false;
      seen.add(n.id);
      return true;
    });
  }, [inputNodes]);
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const edges = useMemo(() => drawableEdges(inputEdges, new Set(byId.keys())), [inputEdges, byId]);

  const placed: FlowLayoutResult = useMemo(
    () =>
      layoutFlow(nodes, edges, {
        layout,
        direction,
        nodeSize,
        nodeGap: gap?.node,
        rankGap: gap?.rank,
      }),
    [nodes, edges, layout, direction, nodeSize, gap?.node, gap?.rank],
  );

  const xyNodes: XyNode[] = useMemo(
    () =>
      nodes.map((node) => {
        const box = placed.boxes.get(node.id)!;
        return {
          id: node.id,
          type: 'flow',
          position: { x: box.x, y: box.y },
          width: box.width,
          height: box.height,
          data: { node: node as FlowNode<unknown> },
          draggable: false,
          selectable: false,
          focusable: false,
          connectable: false,
        };
      }),
    [nodes, placed],
  );

  const xyEdges: XyEdge[] = useMemo(
    () =>
      edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: 'flow',
        focusable: false,
        selectable: false,
        data: { style: edgeStyle(edge, byId, { animated, reducedMotion }) },
      })),
    [edges, byId, animated, reducedMotion],
  );

  const name = useCallback(
    (node: FlowNode<unknown>) =>
      nodeLabel?.(node as FlowNode<T>) ??
      ((node.data as Partial<FlowNodeData> | undefined)?.title || node.id),
    [nodeLabel],
  );

  // "Delegates to Backend, UI; Depends on Database": where each node's edges go.
  const descriptions = useMemo(() => {
    const out = new Map<string, Map<string, string[]>>();
    for (const e of edges) {
      const byKind = out.get(e.source) ?? new Map<string, string[]>();
      const target = byId.get(e.target)!;
      byKind.set(e.kind, [...(byKind.get(e.kind) ?? []), name(target as FlowNode<unknown>)]);
      out.set(e.source, byKind);
    }
    const text = new Map<string, string>();
    for (const [id, byKind] of out) {
      text.set(
        id,
        [...byKind]
          .map(([kind, names]) => `${labels.kinds[kind] ?? kind} ${names.join(', ')}`)
          .join('; '),
      );
    }
    return text;
  }, [edges, byId, name, labels.kinds]);

  const select = useCallback(
    (id: string | null) => {
      if (controlledSelected === undefined) setOwnSelected(id);
      onSelectionChange?.(id);
    },
    [controlledSelected, onSelectionChange],
  );

  const activate = useCallback(
    (id: string) => {
      select(id);
      setFocusId(id);
      const node = byId.get(id);
      if (node) onNodeClick?.(node);
    },
    [select, byId, onNodeClick],
  );

  /** Moves focus to a node, and pans it into view when it is off-screen. */
  const focusNode = useCallback(
    (id: string) => {
      setFocusId(id);
      const el = boxRef.current?.querySelector<HTMLElement>(`[data-flow-node="${CSS.escape(id)}"]`);
      el?.focus({ preventScroll: true });
      const box = placed.boxes.get(id);
      const frame = boxRef.current?.getBoundingClientRect();
      if (!box || !frame || frame.width === 0) return;
      const { x, y, zoom } = rf.getViewport();
      const left = box.x * zoom + x;
      const top = box.y * zoom + y;
      const inside =
        left >= 0 &&
        top >= 0 &&
        left + box.width * zoom <= frame.width &&
        top + box.height * zoom <= frame.height;
      if (!inside) {
        rf.setCenter(box.x + box.width / 2, box.y + box.height / 2, {
          zoom,
          duration: reducedMotion ? 0 : 200,
        });
      }
    },
    [placed, rf, reducedMotion],
  );

  const onNodeKeyDown = useCallback(
    (id: string, event: KeyboardEvent<HTMLDivElement>) => {
      // Keys typed into a node's own input are the input's.
      if (event.target !== event.currentTarget) return;
      let next: string | null = null;
      if (isArrow(event.key)) next = nearestInDirection(id, placed.boxes, event.key);
      else if (event.key === 'Home') next = nodes[0]?.id ?? null;
      else if (event.key === 'End') next = nodes.at(-1)?.id ?? null;
      else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        activate(id);
        return;
      } else if (event.key === 'Escape') {
        if (selectedId !== null) {
          event.preventDefault();
          select(null);
        }
        return;
      } else return;
      event.preventDefault();
      if (next) focusNode(next);
    },
    [placed, nodes, activate, select, selectedId, focusNode],
  );

  const tabStop =
    (focusId && byId.has(focusId) && focusId) ||
    (selectedId && byId.has(selectedId) && selectedId) ||
    nodes[0]?.id ||
    null;

  const context: GraphContext = {
    layout,
    direction,
    markerPrefix: prefix,
    instructionsId,
    reducedMotion,
    selectedId,
    tabStop,
    renderNode: renderNode as GraphContext['renderNode'],
    nodeName: name,
    describe: (id) => descriptions.get(id) ?? '',
    tones: labels.tones,
    activate,
    onNodeKeyDown,
    onNodeFocus: setFocusId,
  };

  // Refit when the picture changes: new nodes, a new layout or direction.
  // The first fit is the `fitView` prop's.
  const fitted = useRef(false);
  // Set once the reader pans or zooms: from then on the view is theirs.
  const moved = useRef(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: `reducedMotion` only shapes the animation; turning it on is no reason to refit
  useEffect(() => {
    moved.current = false;
    if (!fitted.current) {
      fitted.current = true;
      return;
    }
    if (placed.boxes.size === 0) return;
    void rf.fitView({ ...FIT_OPTIONS, duration: reducedMotion ? 0 : 200 });
  }, [placed, rf]);

  // Refit when the frame changes size — a panel opening beside it, or a fit
  // that ran before the frame had its final width — until the reader has
  // taken the view over.
  useEffect(() => {
    const el = boxRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    let last = '';
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (!r || r.width === 0 || r.height === 0) return;
      const size = `${Math.round(r.width)}x${Math.round(r.height)}`;
      if (size === last) return;
      const first = last === '';
      last = size;
      if (!first && !moved.current) void rf.fitView(FIT_OPTIONS);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [rf]);

  // Pan no further than a margin past the graph.
  const margin = Math.max(240, Math.max(placed.width, placed.height) * 0.5);
  const translateExtent: [[number, number], [number, number]] = [
    [-margin, -margin],
    [placed.width + margin, placed.height + margin],
  ];

  const summary = labels.summary(nodes.length, edges.length);

  return (
    <Ctx.Provider value={context}>
      {/* biome-ignore lint/a11y/useSemanticElements: the graph is a named group of nodes, not a form; a fieldset would put a form part around a canvas */}
      <div
        ref={boxRef}
        role="group"
        aria-label={`${label}. ${summary}`}
        data-flow-graph
        data-layout={layout}
        className={cn('relative w-full overflow-hidden rounded-surface', className)}
        style={{ height, '--xy-attribution-background-color': 'transparent' } as CSSProperties}
      >
        <p id={instructionsId} className="sr-only">
          {labels.instructions}
        </p>
        {nodes.length === 0 ? (
          <div className="flex h-full items-center justify-center p-6 text-sm text-ink-2">
            {emptyState ?? labels.empty}
          </div>
        ) : (
          <>
            <Markers prefix={prefix} />
            <ReactFlow<XyNode, XyEdge>
              nodes={xyNodes}
              edges={xyEdges}
              nodeTypes={NODE_TYPES}
              edgeTypes={EDGE_TYPES}
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable={false}
              nodesFocusable={false}
              edgesFocusable={false}
              disableKeyboardA11y
              minZoom={minZoom}
              maxZoom={maxZoom}
              translateExtent={translateExtent}
              fitView
              fitViewOptions={FIT_OPTIONS}
              onPaneClick={() => select(null)}
              onMoveStart={(event) => {
                // `null` is a programmatic move: a fit, or a pan to a focused node.
                if (event) moved.current = true;
              }}
              attributionPosition="bottom-left"
            >
              {background ? (
                <Background
                  variant={BackgroundVariant.Dots}
                  gap={20}
                  size={1.2}
                  color="var(--color-line-strong)"
                />
              ) : null}
            </ReactFlow>
            {controls ? (
              <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5">
                <Button
                  size="sm"
                  icon
                  aria-label={labels.zoomIn}
                  title={labels.zoomIn}
                  onClick={() => void rf.zoomIn({ duration: reducedMotion ? 0 : 150 })}
                >
                  <Plus aria-hidden="true" className="size-4" />
                </Button>
                <Button
                  size="sm"
                  icon
                  aria-label={labels.zoomOut}
                  title={labels.zoomOut}
                  onClick={() => void rf.zoomOut({ duration: reducedMotion ? 0 : 150 })}
                >
                  <Minus aria-hidden="true" className="size-4" />
                </Button>
                <Button
                  size="sm"
                  icon
                  aria-label={labels.fitView}
                  title={labels.fitView}
                  onClick={() =>
                    void rf.fitView({ ...FIT_OPTIONS, duration: reducedMotion ? 0 : 200 })
                  }
                >
                  <Maximize aria-hidden="true" className="size-4" />
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </Ctx.Provider>
  );
}
