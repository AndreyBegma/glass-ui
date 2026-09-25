import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fireEvent, render, screen } from '@testing-library/react';
import { Slider } from './slider';

/**
 * FEAT-20260916-608 — `Slider` after the restyle.
 *
 * Two halves. The first mounts the component and holds what its three callers
 * in Luna Watch depend on: the element is the input, the caller's class and
 * handlers land on it, the value reaches `event.target`. The second reads
 * `slider.css` as text, the way `motion.spec.ts` reads `motion.css`, because
 * happy-dom resolves no cascade and a pseudo-element's computed style cannot
 * be asked for at all.
 */
describe('Slider', () => {
  test("is the input itself, with the caller's class beside luna-slider", () => {
    render(
      <Slider
        aria-label="Volume"
        min={0}
        max={1}
        step={0.05}
        value={0.5}
        onChange={() => {}}
        className="hidden sm:block w-28"
      />,
    );
    const input = screen.getByRole('slider', {
      name: 'Volume',
    }) as HTMLInputElement;
    expect(input.tagName).toBe('INPUT');
    expect(input.type).toBe('range');
    for (const c of ['luna-slider', 'hidden', 'sm:block', 'w-28'])
      expect(input.classList.contains(c)).toBe(true);
    expect(input.min).toBe('0');
    expect(input.max).toBe('1');
    expect(input.step).toBe('0.05');
  });

  test('writes the fill ratio from the controlled value', () => {
    const { rerender } = render(
      <Slider
        aria-label="v"
        min={0}
        max={200}
        value={50}
        onChange={() => {}}
      />,
    );
    const input = screen.getByRole('slider');
    expect(input.style.getPropertyValue('--luna-slider-ratio')).toBe('0.25');
    rerender(
      <Slider
        aria-label="v"
        min={0}
        max={200}
        value={999}
        onChange={() => {}}
      />,
    );
    expect(input.style.getPropertyValue('--luna-slider-ratio')).toBe('1');
  });

  test("an uncontrolled slider's fill follows its own changes", () => {
    render(<Slider aria-label="v" min={0} max={10} defaultValue={2} />);
    const input = screen.getByRole('slider');
    expect(input.style.getPropertyValue('--luna-slider-ratio')).toBe('0.2');
    fireEvent.change(input, { target: { value: '8' } });
    expect(input.style.getPropertyValue('--luna-slider-ratio')).toBe('0.8');
  });

  test('onChange and onPointerUp receive the event with the input as target; disabled reaches the element', () => {
    const seen: string[] = [];
    render(
      <Slider
        aria-label="v"
        min={0}
        max={100}
        value={10}
        disabled
        onChange={(e) => seen.push(`change:${e.target.value}`)}
        onPointerUp={(e) =>
          seen.push(`up:${(e.target as HTMLInputElement).value}`)
        }
      />,
    );
    const input = screen.getByRole('slider') as HTMLInputElement;
    expect(input.disabled).toBe(true);
    expect(input.classList.contains('disabled:opacity-40')).toBe(true);
    fireEvent.change(input, { target: { value: '40' } });
    fireEvent.pointerUp(input);
    // Controlled: React writes the prop back after the change, so the release
    // reads the value the caller holds, as `remote-panel.tsx` expects.
    expect(seen).toEqual(['change:40', 'up:10']);
  });

  test('data-dragging is set by a pointer down and cleared by up or cancel', () => {
    render(<Slider aria-label="v" min={0} max={100} defaultValue={10} />);
    const input = screen.getByRole('slider');
    expect(input.hasAttribute('data-dragging')).toBe(false);
    fireEvent.pointerDown(input);
    expect(input.hasAttribute('data-dragging')).toBe(true);
    fireEvent.pointerUp(input);
    expect(input.hasAttribute('data-dragging')).toBe(false);
    fireEvent.pointerDown(input);
    fireEvent.pointerCancel(input);
    expect(input.hasAttribute('data-dragging')).toBe(false);
  });
});

const CSS = readFileSync(
  join(new URL('.', import.meta.url).pathname, 'slider.css'),
  'utf8',
).replace(/\/\*[\s\S]*?\*\//g, ' ');

/** The body of the media block that gates motion, braces matched. */
function block(marker: string): string {
  const at = CSS.indexOf(marker);
  if (at < 0) throw new Error(`slider.css no longer contains \`${marker}\``);
  const open = CSS.indexOf('{', at);
  let depth = 0;
  for (let i = open; i < CSS.length; i++) {
    if (CSS[i] === '{') depth++;
    else if (CSS[i] === '}' && --depth === 0) return CSS.slice(open + 1, i);
  }
  throw new Error(`unbalanced braces after \`${marker}\``);
}

describe('slider.css', () => {
  test('a thumb drag on a phone does not scroll the sheet', () => {
    expect(block('.luna-slider {')).toContain('touch-action: pan-y;');
  });

  test('only transform transitions, and only inside the reduced-motion gate', () => {
    const gated = block('@media (prefers-reduced-motion: no-preference)');
    const transitions = CSS.match(/transition:[^;]+;/g) ?? [];
    expect(transitions.length).toBeGreaterThan(0);
    for (const t of transitions) {
      expect(t).toMatch(
        /^transition: transform var\(--dur-fast\) var\(--ease-sheet\);$/,
      );
      expect(gated).toContain(t);
    }
    const transforms = CSS.match(/transform:[^;]+;/g) ?? [];
    expect(transforms.length).toBeGreaterThan(0);
    for (const t of transforms) expect(gated).toContain(t);
    expect(CSS.replace(gated, '')).not.toContain('transform:');
  });

  test('every duration and curve is a token, every colour a token', () => {
    // Spelled in two halves: `motion.spec.ts` greps every source file for the
    // literal, and this file is one of them.
    expect(CSS).not.toContain(['cubic', 'bezier('].join('-'));
    expect(CSS.match(/\b\d+(?:\.\d+)?m?s\b/g) ?? []).toEqual([]);
    expect(CSS).not.toMatch(/#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/);
    expect(CSS).not.toMatch(/\b(?:white|black)\b/);
  });

  test('the hit area is the tap token on a coarse pointer; the desk thumb is 20px', () => {
    expect(block('@media (pointer: coarse)')).toContain(
      'height: var(--size-tap);',
    );
    expect(block(':root:where([data-scale="desk"]) .luna-slider')).toContain(
      '--luna-slider-thumb: 20px;',
    );
  });

  test("the focus ring on the native thumb is base.css's ring, restated", () => {
    const base = readFileSync(
      join(new URL('.', import.meta.url).pathname, '..', 'base.css'),
      'utf8',
    );
    const ring = base.match(/:focus-visible \{([^}]*)\}/)?.[1] ?? '';
    expect(ring).toContain('outline: 3px solid var(--color-focus);');
    for (const thumb of ['::-webkit-slider-thumb', '::-moz-range-thumb']) {
      const rule = block(`input.luna-slider:focus-visible${thumb} {`);
      expect(rule).toContain('outline: 3px solid var(--color-focus);');
      expect(rule).toContain('outline-offset: 4px;');
    }
    // And none on the Radix thumb: it is a span, and base.css reaches it.
    expect(block('.luna-slider-thumb {')).not.toContain('outline');
  });
});
