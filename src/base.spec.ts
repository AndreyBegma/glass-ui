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
