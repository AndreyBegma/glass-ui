import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * FEAT-20260916-604 — the two scroll hints, held to one contract.
 *
 * Source-level, like `motion.spec.ts`: happy-dom does not resolve a
 * stylesheet, so what is asserted is what a reader of the two files is
 * promised — that both read the one hook rather than measuring on their own,
 * that the only thing that animates is opacity over the fast token, that the
 * fades are invisible to assistive technology and to the pointer, and that no
 * colour is written by hand.
 */
const SRC = new URL('..', import.meta.url).pathname;
const ROW = readFileSync(join(SRC, 'primitives/scroll-hint-row.tsx'), 'utf8');
const COLUMN = readFileSync(
  join(SRC, 'primitives/scroll-hint-column.tsx'),
  'utf8',
);
const HOOK = readFileSync(join(SRC, 'hooks/use-scroll-edges.ts'), 'utf8');

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
}

const FILES = { row: stripComments(ROW), column: stripComments(COLUMN) };

describe('one measurement, two axes', () => {
  test.each(
    Object.entries(FILES),
  )('%s reads useScrollEdges', (_name, source) => {
    expect(source).toContain("from '../hooks/use-scroll-edges'");
    expect(source).not.toContain('ResizeObserver');
    expect(source).not.toContain('scrollWidth');
    expect(source).not.toContain('scrollHeight');
  });

  test('the row measures x and the column measures y', () => {
    expect(FILES.row).toContain("useScrollEdges('x')");
    expect(FILES.column).toContain("useScrollEdges('y')");
  });

  test('the hook is the only place the geometry is read', () => {
    expect(HOOK).toContain('scrollWidth - el.clientWidth');
    expect(HOOK).toContain('scrollHeight - el.clientHeight');
  });
});

describe('the fades', () => {
  test.each(
    Object.entries(FILES),
  )('%s: two fades, hidden from the tree and the pointer', (_name, source) => {
    expect(source.match(/aria-hidden="true"/g)?.length).toBe(2);
    expect(source.match(/pointer-events-none/g)?.length).toBe(2);
  });

  test.each(
    Object.entries(FILES),
  )('%s: only opacity moves, over the fast token', (_name, source) => {
    expect(
      source.match(/transition-opacity duration-\(--dur-fast\)/g)?.length,
    ).toBe(2);
    expect(source).not.toMatch(/transition-(all|transform|colors)/);
    expect(source).not.toMatch(/duration-\d/);
  });

  test.each(
    Object.entries(FILES),
  )('%s: the default fade colour is a token', (_name, source) => {
    expect(source).toContain("edgeClassName = 'from-ground'");
    expect(source).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(source).not.toMatch(
      /\b(zinc|violet|emerald|rose|yellow|blue|gray|slate)-/,
    );
  });

  test('the row fades on the sides and the column on the ends', () => {
    expect(FILES.row).toContain('inset-y-0 left-0 w-8 bg-gradient-to-r');
    expect(FILES.row).toContain('inset-y-0 right-0 w-8 bg-gradient-to-l');
    expect(FILES.column).toContain('inset-x-0 top-0 h-8 bg-gradient-to-b');
    expect(FILES.column).toContain('inset-x-0 bottom-0 h-8 bg-gradient-to-t');
  });
});

describe('the row’s public props are unchanged', () => {
  test('className, edgeClassName, children and the div attributes', () => {
    expect(FILES.row).toContain('className?: string;');
    expect(FILES.row).toContain('edgeClassName?: string;');
    expect(FILES.row).toContain('children: React.ReactNode;');
    expect(FILES.row).toContain(
      "Omit<React.HTMLAttributes<HTMLDivElement>, 'className' | 'children'>",
    );
  });
});
