import { describe, expect, test } from 'bun:test';
import type { ModelLink } from './normalize';
import { linkKey, pathOf } from './path';

//   a ─┬─ c ─┬─ e
//   b ─┘     └─ f
//   b ──── d ─── f
const LINKS: ModelLink[] = [
  { source: 'a', target: 'c', value: 1 },
  { source: 'b', target: 'c', value: 1 },
  { source: 'b', target: 'd', value: 1 },
  { source: 'c', target: 'e', value: 1 },
  { source: 'c', target: 'f', value: 1 },
  { source: 'd', target: 'f', value: 1 },
];

const keys = (...pairs: string[]) =>
  new Set(pairs.map((p) => linkKey({ source: p[0]!, target: p[1]! })));

describe('pathOf', () => {
  test('nothing active is no path', () => {
    expect(pathOf(null, LINKS)).toBeNull();
  });

  test('a node lights everything upstream and downstream of it, and nothing beside it', () => {
    const p = pathOf({ kind: 'node', id: 'c' }, LINKS)!;
    expect(p.nodes).toEqual(new Set(['a', 'b', 'c', 'e', 'f']));
    expect(p.links).toEqual(keys('ac', 'bc', 'ce', 'cf'));
  });

  test('a link lights itself, what feeds its source and what its target feeds', () => {
    const p = pathOf({ kind: 'link', key: linkKey({ source: 'b', target: 'd' }) }, LINKS)!;
    expect(p.nodes).toEqual(new Set(['b', 'd', 'f']));
    expect(p.links).toEqual(keys('bd', 'df'));
  });

  test('an unknown link is no path', () => {
    expect(pathOf({ kind: 'link', key: 'x' }, LINKS)).toBeNull();
  });
});
