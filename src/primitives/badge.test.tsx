import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react';
import { Badge } from './badge';

describe('Badge', () => {
  test('renders the count, capped at 99+', () => {
    render(<Badge count={7} />);
    expect(screen.getByText('7')).not.toBeNull();
  });

  test('caps a count over 99', () => {
    render(<Badge count={140} />);
    expect(screen.getByText('99+')).not.toBeNull();
  });

  test('a dot carries no text, regardless of count', () => {
    const { container } = render(<Badge dot count={4} />);
    expect(container.textContent).toBe('');
  });

  test('a dot paints the solid semantic token, not the counting badge’s tint', () => {
    const { container: dotContainer } = render(<Badge dot tone="warn" />);
    const dot = dotContainer.firstElementChild;
    expect(dot?.className.split(' ')).toContain('bg-warn');
    expect(dot?.className.split(' ')).not.toContain('bg-warn/14');

    const { container: countContainer } = render(<Badge tone="warn" count={3} />);
    expect(countContainer.firstElementChild?.className.split(' ')).toContain('bg-warn');
  });

  test('the default size is today’s 10 px badge; md is 12 px, sentence case', () => {
    const { container: sm } = render(<Badge label="Idle" />);
    expect(sm.firstElementChild?.className).toContain('text-[10px]');
    const { container: md } = render(<Badge size="md" label="Running" />);
    const classes = md.firstElementChild?.className.split(' ') ?? [];
    expect(classes).toContain('text-xs');
    expect(classes).toContain('normal-case');
    expect(classes).not.toContain('uppercase');
    expect(classes).not.toContain('text-[10px]');
  });

  test('a hue badge is a round dot by default and a square swatch on request', () => {
    const { container: round } = render(<Badge hue={3} dot />);
    expect(round.firstElementChild?.className).toContain('rounded-full');
    expect(round.firstElementChild?.getAttribute('data-shape')).toBeNull();

    const { container: square } = render(<Badge hue={3} shape="square" />);
    const el = square.firstElementChild;
    expect(el?.getAttribute('data-shape')).toBe('square');
    expect(el?.className).toContain('bg-hue-3');
    expect(el?.className).not.toContain('rounded-full');
    expect(el?.textContent).toBe('');
  });

  test('shape does nothing without a hue', () => {
    const { container } = render(<Badge shape="square" label="x" />);
    expect(container.firstElementChild?.getAttribute('data-shape')).toBeNull();
    expect(container.textContent).toBe('x');
  });
});

/**
 * #130 — the count badge measured 3.86:1 in light. Pinned from `tokens.css`
 * itself: the solid fill (`--color-ok|warn|danger`) under `--color-ground`
 * ink, in the dark base set and in the light set, must clear 4.5:1.
 */
describe('Badge count contrast', () => {
  const tokens = readFileSync(
    join(new URL('.', import.meta.url).pathname, '..', 'tokens.css'),
    'utf8',
  );
  const find = (name: string, nth: number) => {
    const all = [...tokens.matchAll(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`, 'g'))];
    return all[nth]?.[1] as string;
  };
  const lum = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => {
      const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (a: string, b: string) => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };

  // nth 0 is the dark base set, nth 1 the explicit light set (line order in tokens.css).
  for (const [theme, nth] of [['dark', 0], ['light', 1]] as const) {
    for (const tone of ['ok', 'warn', 'danger'] as const) {
      test(`${tone} count, ${theme}: solid fill under ground ink is at least 4.5:1`, () => {
        const ground = nth === 0 ? find('ground', 0) : find('ground', 1);
        expect(ratio(find(tone, nth), ground)).toBeGreaterThanOrEqual(4.5);
      });
    }
  }

  test('the count uses the solid fill and ground ink', () => {
    for (const tone of ['ok', 'warn', 'danger'] as const) {
      const { container } = render(<Badge tone={tone} count={5} />);
      const classes = container.firstElementChild?.className.split(' ') ?? [];
      expect(classes).toContain(`bg-${tone}`);
      expect(classes).toContain('text-ground');
    }
  });

  test('a label is shown as given, not capped like a count', () => {
    render(<Badge label="1.75×" />);
    expect(screen.getByText('1.75×')).not.toBeNull();
  });

  test('count wins over label when both are passed', () => {
    const { container } = render(<Badge count={3} label="x" />);
    expect(container.textContent).toBe('3');
  });

  test('the ink tone is the primary pair', () => {
    const { container } = render(<Badge tone="ink" label="2×" />);
    const classes = container.firstElementChild?.className.split(' ') ?? [];
    expect(classes).toContain('bg-ink');
    expect(classes).toContain('text-ground');
  });
});
