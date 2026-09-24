import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { SPRINGS } from './springs';

/**
 * FEAT-20260924-680 — a spring is written once.
 *
 * Source-level, like `motion.spec.ts`'s guard against a hand-written curve:
 * what is asserted is that `stiffness:` appears in `springs.ts` and nowhere
 * new. The files below held a literal spring before the names existed; they
 * are an allowlist with a count each, so a site that moves onto `SPRINGS`
 * lowers its number here and a new literal in any file fails.
 */

const SRC = new URL('..', import.meta.url).pathname;

const ALLOWED: Record<string, number> = {
  'patterns/app-rail.tsx': 1,
  'patterns/bottom-capsule.tsx': 2,
  'patterns/command-palette.tsx': 1,
  'patterns/nav-rail.tsx': 1,
  'primitives/segmented-control.tsx': 1,
  'primitives/sheet.tsx': 1,
  'primitives/tabs.tsx': 1,
};

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return ['.ts', '.tsx'].includes(extname(full)) && !full.endsWith('.spec.ts')
      ? [full]
      : [];
  });
}

const SITES = sourceFiles(SRC)
  .map((path) => ({
    name: path.slice(SRC.length),
    count: readFileSync(path, 'utf8').match(/\bstiffness\s*:/g)?.length ?? 0,
  }))
  .filter(({ name, count }) => count > 0 && name !== 'primitives/springs.ts');

describe('no spring is written by hand', () => {
  test.each(
    SITES.map((s) => [s.name, s.count] as const),
  )('%s holds no more literal springs than it did', (name, count) => {
    expect(ALLOWED[name] ?? 0).toBeGreaterThanOrEqual(count);
  });

  test('the allowlist only shrinks: every entry is still a real site', () => {
    // A file that moved onto `SPRINGS` must leave the list, or the room it
    // left behind is room for a new literal.
    for (const [name, allowed] of Object.entries(ALLOWED)) {
      expect({
        name,
        count: SITES.find((s) => s.name === name)?.count ?? 0,
      }).toEqual({ name, count: allowed });
    }
  });
});

describe('the names', () => {
  test('the three that existed keep their numbers', () => {
    expect(SPRINGS.capsule).toMatchObject({
      stiffness: 420,
      damping: 34,
      mass: 0.9,
    });
    expect(SPRINGS.morph).toMatchObject({
      stiffness: 380,
      damping: 36,
      mass: 0.9,
    });
    expect(SPRINGS.snap).toMatchObject({
      stiffness: 500,
      damping: 40,
      mass: 0.7,
    });
  });

  test('bump overshoots and arrive barely does', () => {
    const ratio = (s: { stiffness: number; damping: number; mass: number }) =>
      s.damping / (2 * Math.sqrt(s.stiffness * s.mass));
    expect(ratio(SPRINGS.bump)).toBeLessThan(0.5);
    expect(ratio(SPRINGS.arrive)).toBeGreaterThan(0.8);
    expect(ratio(SPRINGS.arrive)).toBeLessThan(1);
  });

  test('reduced is no motion at all', () => {
    expect(SPRINGS.reduced).toEqual({ duration: 0 });
  });
});
