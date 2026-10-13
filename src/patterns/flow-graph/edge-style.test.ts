import { describe, expect, test } from 'bun:test';
import { edgeDash, edgeStyle, edgeTone } from './edge-style';
import { NEUTRAL_TONE, statusTone } from './tone';
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
    expect(style.classes).toBe(statusTone('blocked'));
    expect(style.classes.stroke).toBe('stroke-danger');
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
