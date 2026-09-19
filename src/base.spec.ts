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
