import { describe, expect, test } from 'bun:test';
import { edgeDash, edgeHue, edgeStyle, edgeTone } from './edge-style';
import { flowTone, hueTone, NEUTRAL_TONE, STATUS_TONES, statusTone } from './tone';
import type { FlowEdge, FlowNode } from './types';

const node = (id: string, tone?: FlowNode['tone']): FlowNode => ({
  id,
  data: { title: id },
  tone,
});

const nodes = new Map<string, FlowNode>([
  ['pm', node('pm', 'running')],
  ['qa', node('qa', 'blocked')],
  ['db', node('db')],
]);

const edge = (over: Partial<FlowEdge> = {}): FlowEdge => ({
  source: 'pm',
  target: 'qa',
  kind: 'delegates',
  ...over,
});

describe('edgeDash — the kind is the line', () => {
  test('delegates is solid', () => {
    expect(edgeDash('delegates')).toBeUndefined();
  });

  test('returns is dashed', () => {
    expect(edgeDash('returns')).toBe('6 5');
  });

  test('depends is dotted: a near-zero dash that round caps turn into dots', () => {
    expect(edgeDash('depends')).toBe('0.1 5');
  });

  test('an unknown kind is solid', () => {
    expect(edgeDash('spawns')).toBeUndefined();
  });

  test('the three known kinds all differ', () => {
    const dashes = ['delegates', 'returns', 'depends'].map(edgeDash);
    expect(new Set(dashes).size).toBe(3);
  });
});

describe('edgeTone — the colour is the target node’s', () => {
  test('takes the target’s tone, not the source’s', () => {
    expect(edgeTone(edge(), nodes)).toBe('blocked');
  });

  test('edge.tone overrides the target', () => {
    expect(edgeTone(edge({ tone: 'done' }), nodes)).toBe('done');
  });

  test('a target without a tone leaves the edge neutral', () => {
    expect(edgeTone(edge({ target: 'db' }), nodes)).toBeUndefined();
  });

  test('a target that does not exist leaves the edge neutral', () => {
    expect(edgeTone(edge({ target: 'nope' }), nodes)).toBeUndefined();
  });
});

describe('edgeStyle', () => {
  test('carries the dash, the round cap and the tone’s classes', () => {
    const style = edgeStyle(edge({ kind: 'returns' }), nodes);
    expect(style.dash).toBe('6 5');
    expect(style.linecap).toBe('round');
    expect(style.tone).toBe('blocked');
    expect(style.classes).toBe(flowTone('blocked'));
    expect(style.classes.stroke).toBe('stroke-status-blocked');
  });

  test('the edge reads StatusPill’s palette, plus the SVG classes of its state', () => {
    for (const tone of STATUS_TONES) {
      const flow = flowTone(tone);
      const pill = statusTone(tone);
      expect(flow.dot).toBe(pill.dot);
      expect(flow.rim).toBe(pill.rim);
      expect(flow.glow).toBe(pill.glow);
      expect(flow.stroke).toMatch(/^stroke-/);
      expect(flow.fill).toMatch(/^fill-/);
    }
    expect(flowTone('waiting').stroke).toBe('stroke-status-waiting');
    // #109 — the stroke is the dot's token, per state, not per family.
    for (const tone of STATUS_TONES.filter((t) => t !== 'idle')) {
      expect(flowTone(tone).stroke).toBe(`stroke-status-${tone}`);
      expect(flowTone(tone).dot).toBe(`bg-status-${tone}`);
    }
    expect(flowTone('idle').stroke).toBe('stroke-ink-2');
  });

  test('neutral when no tone applies', () => {
    expect(edgeStyle(edge({ target: 'db' }), nodes).classes).toBe(NEUTRAL_TONE);
  });

  test('not animated by default', () => {
    expect(edgeStyle(edge(), nodes).animated).toBe(false);
  });

  test('the graph-level flag animates every edge', () => {
    expect(edgeStyle(edge(), nodes, { animated: true }).animated).toBe(true);
  });

  test('an edge’s own flag beats the graph’s, both ways', () => {
    expect(edgeStyle(edge({ animated: false }), nodes, { animated: true }).animated).toBe(false);
    expect(edgeStyle(edge({ animated: true }), nodes, { animated: false }).animated).toBe(true);
  });

  test('reduced motion stops every pulse', () => {
    expect(
      edgeStyle(edge({ animated: true }), nodes, { animated: true, reducedMotion: true }).animated,
    ).toBe(false);
  });
});

// #109 — state beats identity: edge.tone, the target's status, the source's
// hue, neutral.
describe('edgeStyle — the source’s hue when no status applies', () => {
  const hued = new Map<string, FlowNode>([
    ['lead', { id: 'lead', data: { title: 'lead' }, hue: 4 }],
    ['busy', { id: 'busy', data: { title: 'busy' }, tone: 'blocked' }],
    ['plain', { id: 'plain', data: { title: 'plain' } }],
  ]);
  const from = (over: Partial<FlowEdge>) =>
    edgeStyle({ source: 'lead', target: 'plain', kind: 'delegates', ...over }, hued);

  test('an edge into a node with no status takes its source’s hue', () => {
    const style = from({});
    expect(style.tone).toBeUndefined();
    expect(style.hue).toBe(4);
    expect(style.classes).toBe(hueTone(4));
    expect(style.classes.stroke).toBe('stroke-hue-4');
    expect(style.marker).toBe('hue-4');
    expect(edgeHue({ source: 'lead', target: 'plain' }, hued)).toBe(4);
  });

  test('the target’s status wins over the source’s hue', () => {
    const style = from({ target: 'busy' });
    expect(style.tone).toBe('blocked');
    expect(style.hue).toBeUndefined();
    expect(style.marker).toBe('blocked');
  });

  test('edge.tone wins over both', () => {
    expect(from({ tone: 'done' }).marker).toBe('done');
    expect(from({ tone: 'done' }).hue).toBeUndefined();
  });

  test('no hue and no status is neutral, with the `none` arrowhead', () => {
    const style = from({ source: 'plain', target: 'plain' });
    expect(style.classes).toBe(NEUTRAL_TONE);
    expect(style.marker).toBe('none');
  });
});
