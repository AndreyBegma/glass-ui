import { describe, expect, test } from 'bun:test';
import { render } from '@testing-library/react';
import { Sparkline } from './sparkline';

const paths = (c: HTMLElement) =>
  [...c.querySelectorAll('path')].map((p) => p.getAttribute('d') ?? '');

describe('Sparkline', () => {
  test('[] renders a flat baseline with no NaN in the path', () => {
    const { container } = render(<Sparkline values={[]} area />);
    const [d] = paths(container);
    expect(d).toBeTruthy();
    expect(d).not.toContain('NaN');
    const ys = [...(d ?? '').matchAll(/ (-?[\d.]+)/g)].map((m) => m[1]);
    expect(new Set(ys).size).toBe(1);
  });

  test('[5] renders a flat baseline with no NaN in the path', () => {
    const { container } = render(<Sparkline values={[5]} area />);
    for (const d of paths(container)) expect(d).not.toContain('NaN');
    expect(paths(container).length).toBe(1);
  });

  test('a constant series and non-finite entries never produce NaN', () => {
    const { container } = render(<Sparkline values={[3, 3, 3, Number.NaN, 3]} area />);
    for (const d of paths(container)) expect(d).not.toContain('NaN');
  });

  test('a 200-point series renders without NaN in the path', () => {
    const values = Array.from({ length: 200 }, (_, i) => Math.sin(i / 7) * 10 + i);
    const { container } = render(<Sparkline values={values} area />);
    const all = paths(container);
    expect(all.length).toBe(2);
    for (const d of all) {
      expect(d).not.toContain('NaN');
      expect(d).not.toContain('Infinity');
    }
    expect((all[1] ?? '').match(/L/g)?.length).toBe(199);
  });

  test('scales between min and max, higher values sit higher', () => {
    const { container } = render(<Sparkline values={[0, 10]} height={22} />);
    const d = paths(container)[0] ?? '';
    const [a, b] = [...d.matchAll(/[ML][\d.]+ ([\d.]+)/g)].map((m) => Number(m[1]));
    expect(a).toBe(21);
    expect(b).toBe(1);
  });

  test('explicit min/max clamp and set the scale', () => {
    const { container } = render(<Sparkline values={[5, 500]} min={0} max={10} height={22} />);
    const d = paths(container)[0] ?? '';
    const ys = [...d.matchAll(/[ML][\d.]+ ([\d.]+)/g)].map((m) => Number(m[1]));
    expect(ys).toEqual([11, 1]);
  });

  test('label yields role="img" and aria-label; without it, aria-hidden', () => {
    const { container, rerender } = render(<Sparkline values={[1, 2]} label="Cost, 7 days" />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('role')).toBe('img');
    expect(svg?.getAttribute('aria-label')).toBe('Cost, 7 days');
    expect(svg?.getAttribute('aria-hidden')).toBeNull();
    rerender(<Sparkline values={[1, 2]} />);
    const bare = container.querySelector('svg');
    expect(bare?.getAttribute('role')).toBeNull();
    expect(bare?.getAttribute('aria-hidden')).toBe('true');
  });

  test('tone sets a text colour token; stroke is currentColor', () => {
    const { container } = render(<Sparkline values={[1, 2]} tone="danger" />);
    expect(container.querySelector('svg')?.getAttribute('class')).toContain('text-danger');
    expect(container.querySelector('path')?.getAttribute('stroke')).toBe('currentColor');
  });

  test('renders under data-theme light, dark and data-material flat', () => {
    for (const attr of [
      ['data-theme', 'light'],
      ['data-theme', 'dark'],
      ['data-material', 'flat'],
    ] as const) {
      const host = document.createElement('div');
      host.setAttribute(attr[0], attr[1]);
      document.body.appendChild(host);
      const { container } = render(<Sparkline values={[1, 3, 2]} tone="ok" />, {
        container: host,
      });
      const cls = container.querySelector('svg')?.getAttribute('class') ?? '';
      // Colour comes from a token class, never a literal, so every theme resolves it.
      expect(cls).toContain('text-ok');
      expect(cls).not.toMatch(/#|rgb/);
      host.remove();
    }
  });
});
