import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * #109 — the palette axis, the identity hues and the status colours.
 *
 * Three promises, each asserted rather than reviewed:
 *
 *   1. `data-palette="navy"` is opt-in. Unset, no block under it reaches a
 *      page, in any lighting, at either distance, under any accent preset —
 *      so every token resolves exactly as it did before #109. Denitsa
 *      depends on that.
 *   2. The hues are readable. Eight hues × five tokens × two themes, gated in
 *      the default palette and in navy: the mark at 3:1 on every band, the
 *      ink at 4.5:1 on every band and on the tint over it.
 *   3. The series colours did not move. Four of them are references to hues
 *      now; resolved, all six are still the hex they were.
 *
 * Its own file rather than a section of `tokens.spec.ts`, which is past the
 * size ceiling. The parser and the resolver below are that file's, repeated:
 * a spec cannot import another spec without registering its tests twice.
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

type Rule = { selector: string; media?: string; body: string };

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
      out.push({ selector: rule.head, media: open.at(-1)?.head, body });
    }
  }
  return out;
})();

type Attrs = {
  theme?: 'light' | 'dark';
  scale?: 'desk';
  accent?: string;
  palette?: string;
  prefersLight: boolean;
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

/** A token's value with every `var(--x)` followed, as the browser computes it at `:root`. */
function computed(page: Map<string, string>, token: string): string {
  const v = page.get(token);
  if (v === undefined) throw new Error(`no \`${token}\` on this page`);
  const ref = /^var\((--[a-z0-9-]+)\)$/.exec(v);
  return ref ? computed(page, ref[1]) : v;
}

function hex(page: Map<string, string>, token: string): string {
  const v = computed(page, token);
  if (!/^#[0-9a-f]{6}$/i.test(v)) throw new Error(`\`${token}\` is \`${v}\`, not an opaque hex`);
  return v.toLowerCase();
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

/** An `rgb(r g b / a)` over an opaque `#rrggbb`, as the compositor would draw it. */
function over(rgba: string, under: string): string {
  const m = /^rgb\((\d+) (\d+) (\d+) \/ ([\d.]+)\)$/.exec(rgba);
  if (!m) throw new Error(`\`${rgba}\` is not an \`rgb(r g b / a)\``);
  const a = Number(m[4]);
  return `#${[1, 2, 3]
    .map((i, k) =>
      Math.round(Number(m[i]) * a + Number.parseInt(under.slice(1 + 2 * k, 3 + 2 * k), 16) * (1 - a))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

type Lighting = Pick<Attrs, 'theme' | 'prefersLight'>;

const LIGHTING: [string, Lighting][] = [
  ['dark (no attribute, dark OS)', { prefersLight: false }],
  ['light (no attribute, light OS)', { prefersLight: true }],
  ['dark (explicit, light OS)', { theme: 'dark', prefersLight: true }],
  ['light (explicit, dark OS)', { theme: 'light', prefersLight: false }],
];

const isLight = (l: Lighting) => l.theme === 'light' || (l.theme === undefined && l.prefersLight);

const BANDS = ['--color-ground', '--color-canvas', '--color-surface', '--color-raised', '--color-paper'];

const HUES = [1, 2, 3, 4, 5, 6, 7, 8] as const;
const VARIANTS = ['', '-soft', '-line', '-ink', '-glow'] as const;
const STATUSES = ['running', 'waiting', 'paused', 'blocked', 'done', 'error'] as const;

const PRESETS = [
  ...new Set(
    RULES.flatMap((r) => [...r.selector.matchAll(/\[data-accent="([^"]+)"\]/g)].map((m) => m[1])),
  ),
];

/** What `navy` re-values in both themes: the surface family, the hairlines' colour and the scrim. */
const NAVY_SURFACES = [
  '--color-ground',
  '--color-surface',
  '--color-raised',
  '--color-canvas',
  '--color-paper',
  '--color-content',
  '--color-line',
  '--color-line-strong',
  '--color-scrim',
];

/** And, in its plain block only, what the canvas glows are a glow of. */
const NAVY_AURORA = ['--canvas-aurora-1', '--canvas-aurora-2', '--canvas-aurora-3'];

const NAVY = RULES.filter((r) => r.selector.includes('[data-palette="navy"]'));
const NAVY_PLAIN = NAVY.filter((r) => !r.selector.includes('data-theme'));
const NAVY_LIGHT = NAVY.filter((r) => r.selector.includes('data-theme'));
const BASE = resolve({ prefersLight: false });

describe('data-palette="navy" changes exactly what it says (#109)', () => {
  test('navy is a palette, in three blocks: the plain one and a light pair', () => {
    expect(NAVY_PLAIN).toHaveLength(1);
    expect(NAVY_LIGHT).toHaveLength(2);
  });

  test('the plain block re-values the surfaces and the aurora, and nothing else', () => {
    expect(names(declarations(NAVY_PLAIN[0].body)).sort()).toEqual(
      [...NAVY_SURFACES, ...NAVY_AURORA].sort(),
    );
  });

  test('each light block turns over the surfaces, and only those', () => {
    for (const rule of NAVY_LIGHT) {
      expect(names(declarations(rule.body)).sort()).toEqual([...NAVY_SURFACES].sort());
    }
  });

  test('the two light blocks are the same block twice', () => {
    expect(declarations(NAVY_LIGHT[0].body)).toEqual(declarations(NAVY_LIGHT[1].body));
  });

  test('every token it re-values exists in the base set to be re-valued', () => {
    for (const token of [...NAVY_SURFACES, ...NAVY_AURORA]) expect(BASE.has(token)).toBe(true);
  });

  test('it never declares the accent, the ring, the ink, a hue or a status', () => {
    for (const rule of NAVY) {
      for (const name of names(declarations(rule.body))) {
        expect(name).not.toMatch(/^--color-(accent|on-accent|focus|ink|hue-|status-|series-)/);
      }
    }
  });

  /**
   * Source order is the precedence. After the light pair, so the light
   * palette's own values lose to navy's; before the desk, so the desk's
   * hairlines win; before the presets, which re-value only the accent.
   */
  test('it sits after the light pair and before the desk and the presets', () => {
    const at = (marker: string) => {
      const i = TOKENS.indexOf(marker);
      if (i < 0) throw new Error(`tokens.css no longer contains \`${marker}\``);
      return i;
    };
    const order = [
      at(':root:where([data-theme="light"])'),
      at(':root:where([data-palette="navy"])'),
      at(':root:where(:not([data-theme="dark"])[data-palette="navy"])'),
      at(':root:where([data-theme="light"][data-palette="navy"])'),
      at(':root:where([data-scale="desk"])'),
      at('[data-accent='),
    ];
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });
});

describe('unset, the palette is not there (#109)', () => {
  const WITHOUT_NAVY = RULES.filter((r) => !r.selector.includes('data-palette'));

  test('the resolver sees the navy blocks at all', () => {
    // Otherwise every comparison below agrees with itself by matching nothing.
    const navy = resolve({ prefersLight: false, palette: 'navy' });
    expect(navy.get('--color-surface')).not.toBe(BASE.get('--color-surface'));
  });

  const PAGES = LIGHTING.flatMap(([n, l]) =>
    [undefined, 'desk' as const].flatMap((scale) =>
      [undefined, ...PRESETS].map(
        (accent) =>
          [`${n}${scale ? ', desk' : ''}${accent ? `, ${accent}` : ''}`, { ...l, scale, accent }] as const,
      ),
    ),
  );

  test.each(PAGES)('%s: every token resolves as if the navy blocks did not exist', (_n, attrs) => {
    expect(Object.fromEntries(resolve(attrs))).toEqual(
      Object.fromEntries(resolve(attrs, WITHOUT_NAVY)),
    );
  });
});

/**
 * The series colours before #109, resolved, in each theme. Series 1 is the
 * accent and is compared with it; the other five are the hex they were.
 */
const SERIES_BEFORE = {
  dark: ['#e69f00', '#2fbf94', '#cc79a7', '#f0e442', '#e8743b'],
  light: ['#b36b00', '#00805e', '#b0457f', '#8a7d00', '#c24e00'],
};

describe('the chart colours did not move (#109)', () => {
  test.each(
    LIGHTING.flatMap(([n, l]) =>
      [undefined, 'navy'].map((palette) => [`${n}${palette ? ', navy' : ''}`, { ...l, palette }] as const),
    ),
  )('%s: series 1 is the accent and series 2-6 are their old values', (_n, attrs) => {
    const page = resolve(attrs);
    expect(page.get('--color-series-1')).toBe('var(--color-accent)');
    const expected = isLight(attrs) ? SERIES_BEFORE.light : SERIES_BEFORE.dark;
    expect([2, 3, 4, 5, 6].map((n) => hex(page, `--color-series-${n}`))).toEqual(expected);
  });

  test('series 2, 3, 4 and 6 are the amber, teal, pink and orange hues', () => {
    expect(BASE.get('--color-series-2')).toBe('var(--color-hue-4)');
    expect(BASE.get('--color-series-3')).toBe('var(--color-hue-2)');
    expect(BASE.get('--color-series-4')).toBe('var(--color-hue-8)');
    expect(BASE.get('--color-series-6')).toBe('var(--color-hue-5)');
  });
});

describe('eight hues, five tokens each, in both themes (#109)', () => {
  test.each(LIGHTING)('%s: every hue token is declared', (_n, lighting) => {
    const page = resolve(lighting);
    for (const n of HUES) for (const v of VARIANTS) expect(page.has(`--color-hue-${n}${v}`)).toBe(true);
  });

  test('the light values are not the dark ones', () => {
    // A hue forgotten in the light blocks would fall back to the dark value:
    // a pale ink on white. `tokens.spec.ts` checks the names; this the values.
    const dark = resolve({ prefersLight: false });
    const light = resolve({ prefersLight: true });
    for (const n of HUES) {
      for (const v of VARIANTS) {
        const token = `--color-hue-${n}${v}`;
        expect({ token, same: dark.get(token) === light.get(token) }).toEqual({ token, same: false });
      }
    }
  });

  const GATED = LIGHTING.flatMap(([n, l]) =>
    [undefined, 'navy'].map(
      (palette) => [`${n}${palette ? ', navy' : ''}`, resolve({ ...l, palette })] as const,
    ),
  );

  test.each(GATED)('%s: each mark clears 3:1 on every band', (_n, page) => {
    for (const n of HUES) {
      const mark = hex(page, `--color-hue-${n}`);
      for (const band of BANDS) {
        expect({ hue: n, band, ok: contrast(mark, hex(page, band)) >= 3 }).toEqual({
          hue: n,
          band,
          ok: true,
        });
      }
    }
  });

  test.each(GATED)('%s: each ink clears 4.5:1 on every band and on its soft over it', (_n, page) => {
    for (const n of HUES) {
      const ink = hex(page, `--color-hue-${n}-ink`);
      const soft = computed(page, `--color-hue-${n}-soft`);
      for (const band of BANDS) {
        const under = hex(page, band);
        expect({ hue: n, band, ok: contrast(ink, under) >= 4.5 }).toEqual({ hue: n, band, ok: true });
        expect({ hue: n, band, onSoft: contrast(ink, over(soft, under)) >= 4.5 }).toEqual({
          hue: n,
          band,
          onSoft: true,
        });
      }
    }
  });

  test.each(GATED)('%s: soft, line and glow are the mark at an alpha', (_n, page) => {
    for (const n of HUES) {
      const mark = hex(page, `--color-hue-${n}`);
      const channels = [1, 3, 5].map((i) => Number.parseInt(mark.slice(i, i + 2), 16)).join(' ');
      for (const v of ['-soft', '-line', '-glow']) {
        expect(computed(page, `--color-hue-${n}${v}`)).toMatch(
          new RegExp(`^rgb\\(${channels} / 0?\\.\\d+\\)$`),
        );
      }
    }
  });
});

describe('the status colours are hues (#109)', () => {
  test.each(LIGHTING)('%s: each status names one hue, for all four of its tokens', (_n, lighting) => {
    const page = resolve(lighting);
    const used = STATUSES.map((s) => {
      const ref = /^var\(--color-hue-(\d)\)$/.exec(page.get(`--color-status-${s}`) ?? '');
      expect({ status: s, ref: Boolean(ref) }).toEqual({ status: s, ref: true });
      const n = ref?.[1];
      for (const v of ['-soft', '-ink', '-glow']) {
        expect(page.get(`--color-status-${s}${v}`)).toBe(`var(--color-hue-${n}${v})`);
      }
      return n;
    });
    // Six states, six colours: a state that shares another's colour is told
    // apart by its word alone.
    expect(new Set(used).size).toBe(STATUSES.length);
  });
});

describe('everything the base set gates still holds under navy (#109)', () => {
  const PAGES = LIGHTING.flatMap(([n, l]) =>
    [undefined, ...PRESETS].map(
      (accent) =>
        [`navy, ${n}${accent ? `, ${accent}` : ''}`, resolve({ ...l, accent, palette: 'navy' })] as const,
    ),
  );

  test.each(PAGES)('%s: ink on paper clears 12:1', (_n, page) => {
    expect(contrast(hex(page, '--color-ink'), hex(page, '--color-paper'))).toBeGreaterThanOrEqual(12);
  });

  test.each(PAGES)('%s: the accent fill and the ring clear 3:1 on every band', (_n, page) => {
    for (const token of ['--color-accent', '--color-focus']) {
      for (const band of BANDS) {
        expect({ token, band, ok: contrast(hex(page, token), hex(page, band)) >= 3 }).toEqual({
          token,
          band,
          ok: true,
        });
      }
    }
  });

  test.each(PAGES)('%s: the label on the accent clears 4.5:1', (_n, page) => {
    expect(
      contrast(hex(page, '--color-on-accent'), hex(page, '--color-accent')),
    ).toBeGreaterThanOrEqual(4.5);
  });

  test.each(PAGES)('%s: accent ink and info read on every band and on their tints', (_n, page) => {
    for (const [ink, soft] of [
      ['--color-accent-ink', '--color-accent-soft'],
      ['--color-info', '--color-info-soft'],
    ]) {
      for (const band of BANDS) {
        const under = hex(page, band);
        expect({ ink, band, ok: contrast(hex(page, ink), under) >= 4.5 }).toEqual({ ink, band, ok: true });
        expect({
          ink,
          band,
          tinted: contrast(hex(page, ink), over(computed(page, soft), under)) >= 4.5,
        }).toEqual({ ink, band, tinted: true });
      }
    }
  });

  test.each(PAGES)('%s: the series clear 3:1 against surface', (_n, page) => {
    const surface = hex(page, '--color-surface');
    for (const n of [1, 2, 3, 4, 5, 6]) {
      const token = `--color-series-${n}`;
      expect({ token, ok: contrast(hex(page, token), surface) >= 3 }).toEqual({ token, ok: true });
    }
  });
});

describe('navy composes with the other axes (#109)', () => {
  test.each(LIGHTING)('%s: with the desk, the desk keeps its hairlines and ink-3', (_n, lighting) => {
    const both = resolve({ ...lighting, scale: 'desk', palette: 'navy' });
    const desk = resolve({ ...lighting, scale: 'desk' });
    const navy = resolve({ ...lighting, palette: 'navy' });
    for (const token of ['--color-line', '--color-line-strong', '--color-hover', '--color-ink-3']) {
      expect(both.get(token)).toBe(desk.get(token));
    }
    for (const token of ['--color-ground', '--color-surface', '--color-raised', '--color-canvas', '--color-paper']) {
      expect(both.get(token)).toBe(navy.get(token));
    }
    expect(both.get('--size-row')).toBe('32px');
  });

  test.each(LIGHTING)('%s: with amber, the accent is amber\'s and the surfaces are navy\'s', (_n, lighting) => {
    const both = resolve({ ...lighting, accent: 'amber', palette: 'navy' });
    const amber = resolve({ ...lighting, accent: 'amber' });
    const navy = resolve({ ...lighting, palette: 'navy' });
    for (const token of ['--color-accent', '--color-on-accent', '--color-accent-soft', '--color-accent-ink', '--color-focus']) {
      expect(both.get(token)).toBe(amber.get(token));
    }
    for (const token of [...NAVY_SURFACES, ...NAVY_AURORA]) expect(both.get(token)).toBe(navy.get(token));
  });

  test('the aurora is the accent by default and blue and violet under navy', () => {
    expect(NAVY_AURORA.map((t) => BASE.get(t))).toEqual([
      'var(--color-accent)',
      'var(--color-accent-ink)',
      'var(--color-accent)',
    ]);
    const navy = resolve({ prefersLight: false, palette: 'navy' });
    expect(NAVY_AURORA.map((t) => navy.get(t))).toEqual([
      'var(--color-hue-1)',
      'var(--color-hue-7)',
      'var(--color-hue-1)',
    ]);
  });
});
