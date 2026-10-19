import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * #168 — the workspace profile, `data-profile="workspace"` beside
 * `data-scale="desk"`: maint/v0.8's desk, forward-ported.
 *
 * Three promises, each asserted rather than reviewed:
 *
 *   1. It is opt-in. Unset — at the sofa, at the desk, under navy, under any
 *      accent preset, at either pointer — no block under it reaches a page,
 *      so every token resolves exactly as it does without the profile.
 *      AgentDock renders `data-scale="desk"` and Luna Watch renders nothing;
 *      neither moves. And it refines the desk: without the desk it is inert.
 *   2. It changes exactly what it says: a fixed list of overrides, each of a
 *      token the base set already has, plus the eight marks it defines.
 *   3. The marks can be seen: 3:1 on ground, surface and raised, both themes.
 *
 * Its own file rather than a section of `tokens.spec.ts`, which is past the
 * size ceiling. The parser and the resolver are that file's, repeated: a spec
 * cannot import another spec without registering its tests twice.
 */

const TOKENS = readFileSync(
  join(new URL('.', import.meta.url).pathname, 'tokens.css'),
  'utf8',
).replace(/\/\*[\s\S]*?\*\//g, ' ');

/** Every custom property a block body declares, in source order, as `name: value`. */
function declarations(body: string): string[] {
  return [...body.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)].map(
    (m) => `${m[1]}: ${m[2].replace(/\s+/g, ' ').trim()}`,
  );
}

const names = (decls: string[]) => decls.map((d) => d.split(':')[0]);

type Rule = { selector: string; media?: string; body: string; at: number };

/** Every innermost rule in `tokens.css`, in source order, with its `@media`. */
const RULES: Rule[] = (() => {
  const out: Rule[] = [];
  const open: { at: number; head: string }[] = [];
  for (let i = 0; i < TOKENS.length; i++) {
    if (TOKENS[i] === '{') {
      const before = TOKENS.slice(0, i);
      const from = Math.max(
        before.lastIndexOf('{'),
        before.lastIndexOf('}'),
        before.lastIndexOf(';'),
      );
      open.push({ at: i, head: before.slice(from + 1).trim() });
    } else if (TOKENS[i] === '}') {
      const rule = open.pop();
      if (!rule) throw new Error('unbalanced braces in tokens.css');
      const body = TOKENS.slice(rule.at + 1, i);
      if (body.includes('{')) continue;
      out.push({ selector: rule.head, media: open.at(-1)?.head, body, at: rule.at });
    }
  }
  return out;
})();

type Attrs = {
  theme?: 'light' | 'dark';
  scale?: 'desk';
  accent?: string;
  palette?: string;
  profile?: 'workspace';
  prefersLight: boolean;
  coarse?: boolean;
};

function matches(selector: string, a: Attrs): boolean {
  if (selector === '@theme static' || selector === ':root') return true;
  const where = /^:root:where\((.*)\)$/.exec(selector);
  if (!where) throw new Error(`the resolver does not know \`${selector}\``);
  const attrs: Record<string, string | undefined> = {
    'data-theme': a.theme,
    'data-scale': a.scale,
    'data-accent': a.accent,
    'data-palette': a.palette,
    'data-profile': a.profile,
  };
  for (const m of where[1].matchAll(/:not\(\[([a-z-]+)="([^"]+)"\]\)/g)) {
    if (attrs[m[1]] === m[2]) return false;
  }
  const rest = where[1].replace(/:not\(\[[^\]]+\]\)/g, '');
  for (const m of rest.matchAll(/\[([a-z-]+)="([^"]+)"\]/g)) {
    if (!(m[1] in attrs)) throw new Error(`the resolver does not know \`${m[1]}\``);
    if (attrs[m[1]] !== m[2]) return false;
  }
  return true;
}

const MEDIA: Record<string, (a: Attrs) => boolean> = {
  '@media (prefers-color-scheme: light)': (a) => a.prefersLight,
  '@media (pointer: coarse)': (a) => a.coarse === true,
};

/** The cascade for a page with these attributes: every matching rule, in order. */
function resolve(a: Attrs, rules: Rule[] = RULES): Map<string, string> {
  const live = new Map<string, string>();
  for (const rule of rules) {
    if (rule.media) {
      const holds = MEDIA[rule.media];
      if (!holds) throw new Error(`the resolver does not know \`${rule.media}\``);
      if (!holds(a)) continue;
    }
    if (!matches(rule.selector, a)) continue;
    for (const d of declarations(rule.body)) {
      const at = d.indexOf(':');
      live.set(d.slice(0, at), d.slice(at + 1).trim());
    }
  }
  return live;
}

function luminance(h: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = Number.parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function hex(page: Map<string, string>, token: string): string {
  const v = page.get(token);
  if (!v || !/^#[0-9a-f]{6}$/i.test(v)) throw new Error(`\`${token}\` is \`${v}\`, not an opaque hex`);
  return v.toLowerCase();
}

const WORKSPACE = RULES.filter((r) => r.selector.includes('[data-profile="workspace"]'));
const WORKSPACE_PLAIN = WORKSPACE.filter((r) => !r.media && !r.selector.includes('data-theme'));
const WORKSPACE_LIGHT = WORKSPACE.filter((r) => r.selector.includes('data-theme'));
const WORKSPACE_COARSE = WORKSPACE.filter((r) => r.media === '@media (pointer: coarse)');
const WITHOUT = RULES.filter((r) => !WORKSPACE.includes(r));

/** Tokens the plain block re-values. Each already exists in `@theme static`. */
const OVERRIDES = [
  '--radius-control', '--radius-surface', '--radius-sheet',
  '--size-row', '--size-control', '--size-control-sm', '--size-field', '--size-nav', '--size-chip',
  '--focus-width', '--focus-offset', '--color-focus',
  '--color-card-line',
];

/** FEAT-20261013-709 (W359) — the eight categorical marks, the profile's own. */
const MARKS = Array.from({ length: 8 }, (_, i) => `--color-mark-${i + 1}`);

/** The theme-dependent half, repeated in the light pair. */
const LIGHT = ['--color-focus', '--color-card', '--color-card-line', ...MARKS];

/** Under a coarse pointer: the targets with no invisible hit area of their own. */
const COARSE = ['--size-field', '--size-row', '--size-nav'];

const LIGHTING: Pick<Attrs, 'theme' | 'prefersLight'>[] = [
  { prefersLight: false },
  { prefersLight: true },
  { theme: 'dark', prefersLight: true },
  { theme: 'light', prefersLight: false },
];

const PRESETS = [
  ...new Set(
    RULES.flatMap((r) => [...r.selector.matchAll(/\[data-accent="([^"]+)"\]/g)].map((m) => m[1])),
  ),
];

const BASE = resolve({ prefersLight: false });

describe('the workspace profile is opt-in, and refines the desk (#168)', () => {
  // Every page an application without the profile can render: AgentDock is
  // `scale: 'desk'` (with navy in its designs), Luna Watch is nothing at all.
  const pages: Attrs[] = LIGHTING.flatMap((lighting) =>
    [undefined, 'desk' as const].flatMap((scale) =>
      [undefined, 'navy'].flatMap((palette) =>
        [undefined, ...PRESETS].flatMap((accent) =>
          [false, true].map((coarse) => ({ ...lighting, scale, palette, accent, coarse })),
        ),
      ),
    ),
  );

  test('there are pages to check, and presets among them', () => {
    expect(PRESETS.length).toBeGreaterThan(0);
    expect(pages.length).toBeGreaterThanOrEqual(64);
  });

  test('without the attribute, every token resolves as if the profile did not exist', () => {
    const moved = pages.filter(
      (a) => JSON.stringify([...resolve(a)]) !== JSON.stringify([...resolve(a, WITHOUT)]),
    );
    expect(moved).toEqual([]);
  });

  test('without the desk, the attribute does nothing', () => {
    const moved = pages
      .filter((a) => a.scale === undefined)
      .map((a) => ({ ...a, profile: 'workspace' as const }))
      .filter((a) => JSON.stringify([...resolve(a)]) !== JSON.stringify([...resolve(a, WITHOUT)]));
    expect(moved).toEqual([]);
  });

  test('every block names the desk as well as the profile', () => {
    for (const rule of WORKSPACE) expect(rule.selector).toContain('[data-scale="desk"]');
  });
});

describe('the workspace profile changes exactly what it says (#168)', () => {
  test('one plain block, a light pair and a coarse-pointer block', () => {
    expect(WORKSPACE_PLAIN).toHaveLength(1);
    expect(WORKSPACE_LIGHT).toHaveLength(2);
    expect(WORKSPACE_COARSE).toHaveLength(1);
    expect(WORKSPACE).toHaveLength(4);
  });

  test('the plain block re-values these tokens and defines the marks, and nothing else', () => {
    expect(names(declarations(WORKSPACE_PLAIN[0].body)).sort()).toEqual(
      [...OVERRIDES, ...MARKS].sort(),
    );
  });

  test('every token it re-values exists in the base set to be re-valued', () => {
    for (const token of [...OVERRIDES, ...LIGHT.filter((t) => !MARKS.includes(t)), ...COARSE]) {
      expect(BASE.has(token)).toBe(true);
    }
  });

  test('the marks are its own: no other block defines one', () => {
    for (const rule of WITHOUT) {
      for (const name of names(declarations(rule.body))) expect(MARKS).not.toContain(name);
    }
  });

  test('each light block turns over the theme-dependent half, and only that', () => {
    for (const rule of WORKSPACE_LIGHT) {
      expect(names(declarations(rule.body)).sort()).toEqual([...LIGHT].sort());
    }
  });

  test('the two light blocks are the same block twice', () => {
    expect(declarations(WORKSPACE_LIGHT[0].body)).toEqual(declarations(WORKSPACE_LIGHT[1].body));
  });

  test('a coarse pointer gives the field, the row and the rail item 44px, and nothing else', () => {
    expect(declarations(WORKSPACE_COARSE[0].body).sort()).toEqual(
      COARSE.map((t) => `${t}: 44px`).sort(),
    );
  });

  test('it never declares the accent, the ink or a hue (#93, #109)', () => {
    for (const rule of WORKSPACE) {
      for (const name of names(declarations(rule.body))) {
        expect(name).not.toMatch(/^--color-(accent|on-accent|ink|hue-|status-|series-)/);
      }
    }
  });

  test('its blocks come after the desk, which is what makes them win, and before the presets', () => {
    const lastDesk = Math.max(
      ...WITHOUT.filter((r) => r.selector.includes('[data-scale="desk"]')).map((r) => r.at),
    );
    const firstPreset = Math.min(
      ...RULES.filter((r) => r.selector.includes('[data-accent=')).map((r) => r.at),
    );
    for (const rule of WORKSPACE) {
      expect(rule.at).toBeGreaterThan(lastDesk);
      expect(rule.at).toBeLessThan(firstPreset);
    }
    // And the coarse block is the profile's last, so it wins the sizes.
    expect(WORKSPACE_COARSE[0].at).toBe(Math.max(...WORKSPACE.map((r) => r.at)));
  });

  test('a preset still wins the ring over the profile', () => {
    for (const lighting of LIGHTING) {
      for (const accent of PRESETS) {
        const a: Attrs = { ...lighting, scale: 'desk', profile: 'workspace', accent };
        const preset = resolve({ ...lighting, accent }).get('--color-focus');
        expect(resolve(a).get('--color-focus')).toBe(preset);
      }
    }
  });
});

/**
 * FEAT-20261013-709 (W359) — a mark can be found on every ground it is drawn
 * on. A categorical dot is not text, so the bar is WCAG 1.4.11's 3:1. The
 * table in `tokens.css` records the values; this keeps them true when somebody
 * retunes a hue. Light has the least room (`mark-6`, 3.71:1 on raised).
 */
describe('the marks clear 3:1 in both themes (#168)', () => {
  const GROUNDS = ['--color-ground', '--color-surface', '--color-raised'];

  test.each(LIGHTING.map((l) => [JSON.stringify(l), l] as const))(
    '%s: every mark on ground, surface and raised',
    (_n, lighting) => {
      const page = resolve({ ...lighting, scale: 'desk', profile: 'workspace' });
      const failing = MARKS.flatMap((mark) =>
        GROUNDS.map((g) => [`${mark} on ${g}`, contrast(hex(page, mark), hex(page, g))] as const),
      ).filter(([, ratio]) => ratio < 3);
      expect(failing).toEqual([]);
    },
  );

  test('the eight are eight colours, in each theme', () => {
    for (const lighting of LIGHTING) {
      const page = resolve({ ...lighting, scale: 'desk', profile: 'workspace' });
      expect(new Set(MARKS.map((m) => hex(page, m))).size).toBe(8);
    }
  });

  test('outside the profile a mark resolves to nothing', () => {
    for (const lighting of LIGHTING) {
      for (const scale of [undefined, 'desk' as const]) {
        const page = resolve({ ...lighting, scale });
        for (const mark of MARKS) expect(page.has(mark)).toBe(false);
      }
    }
  });
});
