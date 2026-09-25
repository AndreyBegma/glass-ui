import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * FEAT-20260906-001 — a `contenteditable` editor keeps its own caret, not the
 * page's 3px focus ring.
 *
 * `base.css` already exempts `textarea`, `input` and `select` because each of
 * those draws a focus indicator of its own; a `contenteditable` editor does
 * the same with its caret, and a consumer draws its own selected-node state on
 * top. Without the exemption glass-ui#17 reproduces: the outline frames the
 * whole editor on every focus.
 *
 * Source-level rather than behavioural: happy-dom (this package's DOM, see
 * `test-setup.ts`) does not resolve `:focus-visible` against an injected
 * stylesheet's cascade — `getComputedStyle(el).outlineStyle` comes back `''`
 * for a focused element regardless of which rule, if any, applies to it. A
 * test that focused a real element and read its computed outline would pass
 * whether or not the exemption exists, which is worse than no test.
 */
const CSS = readFileSync(join(new URL('.', import.meta.url).pathname, 'base.css'), 'utf8');

describe('the focus ring exempts contenteditable', () => {
  test('a contenteditable editor is exempted, beside the form-element exemption', () => {
    const formExemption = CSS.indexOf('textarea:focus-visible');
    const editorRule = CSS.indexOf('[contenteditable="true"]:focus-visible');
    expect(formExemption).toBeGreaterThan(-1);
    expect(editorRule).toBeGreaterThan(formExemption);
  });

  test('the exemption removes the outline', () => {
    const editorRule = CSS.indexOf('[contenteditable="true"]:focus-visible');
    const openBrace = CSS.indexOf('{', editorRule);
    const closeBrace = CSS.indexOf('}', openBrace);
    const body = CSS.slice(openBrace + 1, closeBrace);
    expect(body).toContain('outline: none;');
  });
});

/**
 * BUG-20260919-625 — no ring under the pointer.
 *
 * Radix menus rove DOM focus onto the item under the pointer, and Chromium
 * lets that script focus inherit `:focus-visible` from the content, so the
 * ring above framed every hovered item. The menu content records the input
 * that moved focus (`hooks/use-input-modality.ts`) and this rule trusts the
 * record. Source-level for the reason given at the top of this file; the
 * computed-style proof is the Playwright harness in the bug report.
 */
describe('the focus ring is not drawn under a pointer surface', () => {
  const ring = CSS.indexOf(':focus-visible {');
  const rule = CSS.indexOf('[data-input="pointer"] :focus-visible');

  test('the rule exists, after the ring it overrides', () => {
    expect(ring).toBeGreaterThan(-1);
    expect(rule).toBeGreaterThan(ring);
  });

  test('it removes the outline from everything under the surface, not only the highlighted item', () => {
    const selector = CSS.slice(rule, CSS.indexOf('{', rule)).trim();
    expect(selector).toBe('[data-input="pointer"] :focus-visible');
    const body = CSS.slice(CSS.indexOf('{', rule) + 1, CSS.indexOf('}', rule));
    expect(body).toContain('outline: none;');
  });

  test('a keyboard surface is left to the browser — no rule forces or strips its ring', () => {
    expect(CSS.includes('[data-input="keyboard"]')).toBe(false);
  });
});

/**
 * BUG-20260923-019 — no zoom on focus on a phone at the desk.
 *
 * iOS Safari zooms the page when a field under 16px takes focus. `Input`,
 * `Select` and `Textarea` are `text-sm` (14px), and a raw `<input>` gets the
 * browser's 13.33px. Below `sm` (Tailwind's `40rem`), under the desk profile
 * only, every field is 16px. Luna Watch never sets `data-scale`, so the rule
 * cannot reach it.
 *
 * Source-level for the reason given at the top of this file: happy-dom does
 * not evaluate media queries against an injected stylesheet's cascade.
 */
describe('fields are 16px on a phone at the desk', () => {
  const query = CSS.indexOf('@media (width < 40rem)');
  const selector = ':root:where([data-scale="desk"]) :is(input, select, textarea)';
  const rule = CSS.indexOf(selector, query);

  test('the rule sits inside the below-`sm` query', () => {
    expect(query).toBeGreaterThan(-1);
    expect(rule).toBeGreaterThan(query);
    // Inside the query's own braces, not in a rule after it.
    const open = CSS.indexOf('{', query);
    const firstClose = CSS.indexOf('}', CSS.indexOf('{', open + 1));
    const queryClose = CSS.indexOf('}', firstClose + 1);
    expect(rule).toBeLessThan(queryClose);
  });

  test('it sets 16px, in pixels', () => {
    // Pixels and not `1rem`: an application that sets a smaller root size
    // would otherwise bring the zoom back. `html` already says `16px`, so an
    // absent rule must not fall through to reading that one.
    expect(rule).toBeGreaterThan(-1);
    const body = CSS.slice(CSS.indexOf('{', rule) + 1, CSS.indexOf('}', rule));
    expect(body).toContain('font-size: 16px;');
  });

  test('it is scoped to the desk profile and nowhere else', () => {
    // A second, unscoped rule would move Luna Watch's fields.
    expect(CSS.match(/:is\(input, select, textarea\)/g)).toHaveLength(1);
  });
});

/**
 * BUG-20260925-707 — no ring around a dialog panel Radix focused itself.
 *
 * A Radix `Dialog` or `Sheet` with nothing focusable inside parks focus on its
 * own content element (`role="dialog" tabindex="-1"`), and opened by a key
 * that focus is `:focus-visible`: the base ring rang the whole panel instead
 * of a control. Source-level for the reason given at the top of this file.
 */
describe('the focus ring exempts a dialog panel Radix focused itself', () => {
  test('the exemption is scoped to a tabindex="-1" dialog role, after the ring it overrides', () => {
    const ring = CSS.indexOf(':focus-visible {');
    const rule = CSS.indexOf('[role="dialog"][tabindex="-1"]:focus-visible');
    expect(ring).toBeGreaterThan(-1);
    expect(rule).toBeGreaterThan(ring);
  });

  test('the exemption removes the outline', () => {
    const rule = CSS.indexOf('[role="dialog"][tabindex="-1"]:focus-visible');
    const openBrace = CSS.indexOf('{', rule);
    const closeBrace = CSS.indexOf('}', openBrace);
    const body = CSS.slice(openBrace + 1, closeBrace);
    expect(body).toContain('outline: none;');
  });

  test('a real control is not exempted — no rule reaches beyond the panel container', () => {
    // A button or field is neither role="dialog" nor tabindex="-1"; the
    // selector's specificity comes from matching both attributes together.
    expect(CSS.match(/\[role="dialog"\]\[tabindex="-1"\]/g)).toHaveLength(1);
  });
});

/**
 * BUG-20260924-693 — opening a dialog does not move the fixed chrome.
 *
 * Radix's scroll lock hides the scrollbar and pays its width back as a
 * `margin-right` on `<body>`, which covers the page's flow and not its `fixed`
 * layers; the header moved 7.5px on every open. The gutter holds the width
 * instead, and the lock's margin is taken back so it is not paid twice.
 * Source-level for the reason given at the top of this file; the measurements
 * in a real Chromium are in the bug report.
 */
describe('the scrollbar is paid for once, by the gutter', () => {
  const RULES = CSS.replace(/\/\*[\s\S]*?\*\//g, ' ');
  /** Every block whose selector is exactly `selector`, joined — `html` has two. */
  const bodyOf = (selector: string) => {
    const blocks = [...RULES.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .filter((match) => match[1].trim() === selector)
      .map((match) => match[2]);
    expect(blocks.length).toBeGreaterThan(0);
    return blocks.join('\n');
  };

  test('the root reserves a stable gutter', () => {
    expect(bodyOf('html')).toContain('scrollbar-gutter: stable;');
  });

  test("the lock's body margin is taken back, out-ranking the lock's own rule", () => {
    // `html` in front is the specificity that beats Radix's injected
    // `body[data-scroll-locked] { margin-right: … !important }`.
    expect(bodyOf('html body[data-scroll-locked]')).toContain(
      'margin-right: 0 !important;',
    );
  });
});

/**
 * BUG-20260925-708 — the gutter is not paid while the whole screen is the
 * player.
 *
 * A desktop with a classic scrollbar left a 15px empty strip down the right
 * edge of an element in fullscreen: the gutter above stays reserved even
 * though the document cannot scroll past the fullscreen element. Dropping it
 * for `:fullscreen` is a `:root:has()` override, which outranks the plain
 * `html` rule by specificity and needs no `!important`. Source-level for the
 * reason given at the top of this file; the measurements in a real Chromium
 * are in the bug report.
 */
describe('the gutter is dropped while an element is fullscreen', () => {
  const RULES = CSS.replace(/\/\*[\s\S]*?\*\//g, ' ');
  const bodyOf = (selector: string) => {
    const match = [...RULES.matchAll(/([^{}]+)\{([^{}]*)\}/g)].find(
      (m) => m[1].trim() === selector,
    );
    expect(match).toBeDefined();
    return match?.[2] ?? '';
  };

  test('the override covers the standard pseudo-class and the pre-standard WebKit one', () => {
    const selector = ':root:has(:fullscreen),\n:root:has(:-webkit-full-screen)';
    expect(bodyOf(selector)).toContain('scrollbar-gutter: auto;');
  });

  test('it comes after the stable gutter, so it is the one that wins on a match', () => {
    const stable = CSS.indexOf('scrollbar-gutter: stable;');
    const auto = CSS.indexOf('scrollbar-gutter: auto;');
    expect(stable).toBeGreaterThan(-1);
    expect(auto).toBeGreaterThan(stable);
  });
});

/**
 * BUG-20260924-698 — the page goes back around the middle of the viewport,
 * and nothing that is not the page moves with it.
 *
 * The origin comes from `--depth-origin-y`, which `DepthOrigin` writes when
 * the lock appears; registered and not inherited, so the write restyles one
 * element. `overflow: clip` rather than `hidden`, so a sticky header inside
 * the page keeps sticking to the viewport. Source-level for the reason given
 * at the top of this file; the measurements in a real Chromium are in the bug
 * report.
 */
describe('the depth effect is centred on the viewport', () => {
  const RULES = CSS.replace(/\/\*[\s\S]*?\*\//g, ' ');
  const bodyOf = (selector: string) => {
    const match = [...RULES.matchAll(/([^{}]+)\{([^{}]*)\}/g)].find(
      (m) => m[1].trim() === selector,
    );
    expect(match).toBeDefined();
    return match?.[2] ?? '';
  };

  test('the origin is the written middle of the viewport, falling back to the top', () => {
    expect(bodyOf('#main-content')).toContain(
      'transform-origin: 50% var(--depth-origin-y, 0px);',
    );
    expect(RULES).not.toContain('transform-origin: top center');
  });

  test('the property is registered, not inherited, and starts at the top', () => {
    const body = bodyOf('@property --depth-origin-y');
    expect(body).toContain("syntax: '<length>';");
    expect(body).toContain('inherits: false;');
    expect(body).toContain('initial-value: 0px;');
  });

  test('the page clips while it is back, without becoming a scroll container', () => {
    const body = bodyOf('body[data-scroll-locked] #main-content');
    expect(body).toContain('transform: scale(0.955);');
    expect(body).toContain('overflow: clip;');
    expect(body).not.toContain('overflow: hidden');
  });
});
