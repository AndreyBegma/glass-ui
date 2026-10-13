import { describe, expect, test } from 'bun:test';
import { HUES, hueClasses, hueFor } from './hue';

// #109 — the identity hues.
describe('hueFor', () => {
  test('is FNV-1a: the reference vectors land where the hash says', () => {
    // FNV-1a("") is 0x811c9dc5 and FNV-1a("a") is 0xe40c292c; their low three
    // bits are 5 and 4, so hues 6 and 5.
    expect(hueFor('')).toBe(6);
    expect(hueFor('a')).toBe(5);
  });

  test('is pinned: changing the hash re-colours every consumer', () => {
    expect(
      ['main', 'explore', 'g109', 'slot-1', 'slot-2', 'agentdock', 'Ж'].map(hueFor),
    ).toEqual([1, 5, 3, 8, 3, 2, 2]);
  });

  test('is deterministic', () => {
    for (const key of ['main', 'slot-7', 'a much longer key with spaces']) {
      expect(hueFor(key)).toBe(hueFor(key));
    }
  });

  test('always lands on one of the eight', () => {
    for (let i = 0; i < 500; i++) expect(HUES).toContain(hueFor(`key-${i}`));
  });

  test('spreads similar keys over every hue', () => {
    const counts = new Map<number, number>();
    for (let i = 0; i < 64; i++) {
      const hue = hueFor(`slot-${i}`);
      counts.set(hue, (counts.get(hue) ?? 0) + 1);
    }
    expect([...counts.keys()].sort()).toEqual([...HUES]);
    for (const n of counts.values()) expect(n).toBeGreaterThanOrEqual(4);
  });
});

describe('hueClasses', () => {
  test.each([...HUES])('hue %d reads its own tokens and no other hue', (hue) => {
    const classes = Object.values(hueClasses(hue)).join(' ');
    for (const match of classes.matchAll(/hue-(\d)/g)) expect(Number(match[1])).toBe(hue);
    expect(hueClasses(hue).soft).toBe(`bg-hue-${hue}-soft text-hue-${hue}-ink`);
    expect(hueClasses(hue).rim).toBe(`border-hue-${hue}-line`);
    expect(hueClasses(hue).glow).toContain(`var(--color-hue-${hue}-glow)`);
  });
});
