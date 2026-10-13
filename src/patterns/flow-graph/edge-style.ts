import { type StatusToneClasses, statusTone } from './tone';
import type { FlowEdge, FlowEdgeKind, FlowNode, FlowTone } from './types';

/**
 * #94 — how an edge is painted, as data. The edge component and the legend
 * both read it, so a legend swatch is drawn with the very dash its edges use.
 *
 * Kind is the line: `delegates` solid, `returns` dashed, `depends` dotted, and
 * any other kind solid. Tone is the colour: the **target** node's tone, so the
 * connector into a blocked node is red — the reference's reading, approved by
 * the orchestrator over the issue's "source" wording — and `edge.tone`
 * overrides it. Colour is never the only signal: the dash says the kind, and
 * the target card says its status in words.
 */

/** `undefined` is solid. The dotted dash is near-zero so round caps draw dots. */
const DASH: Record<string, string | undefined> = {
  delegates: undefined,
  returns: '6 5',
  depends: '0.1 5',
};

export function edgeDash(kind: FlowEdgeKind): string | undefined {
  return DASH[kind];
}

export function edgeTone<T>(
  edge: Pick<FlowEdge, 'tone' | 'target'>,
  nodesById: ReadonlyMap<string, FlowNode<T>>,
): FlowTone | undefined {
  return edge.tone ?? nodesById.get(edge.target)?.tone;
}

export type FlowEdgeStyle = {
  dash: string | undefined;
  /** `round` for every kind: it is what turns the dotted dash into dots. */
  linecap: 'round';
  tone: FlowTone | undefined;
  classes: StatusToneClasses;
  /** Whether a pulse travels it: asked for, and motion is allowed. */
  animated: boolean;
};

export function edgeStyle<T>(
  edge: FlowEdge,
  nodesById: ReadonlyMap<string, FlowNode<T>>,
  options: { animated?: boolean; reducedMotion?: boolean } = {},
): FlowEdgeStyle {
  const tone = edgeTone(edge, nodesById);
  const wantsMotion = edge.animated ?? options.animated ?? false;
  return {
    dash: edgeDash(edge.kind),
    linecap: 'round',
    tone,
    classes: statusTone(tone),
    animated: wantsMotion && !options.reducedMotion,
  };
}
