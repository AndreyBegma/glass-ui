import { describe, expect, test } from 'bun:test';
import { render } from '@testing-library/react';
import { Card } from './card';
import { Chip } from './chip';

/**
 * FEAT-20260930-004 (#168, ported from `maint/v0.8`) — the chip sizes by token
 * and, under the workspace profile, rounds by fraction; the raised card reads
 * `card` and `card-line` there. Outside the profile both render as before.
 * The tokens' values are pinned in `tokens.spec.ts` and `workspace.spec.ts`.
 */
const classes = (element: Element | null) => element?.className.split(/\s+/) ?? [];

describe('Chip', () => {
  test('`md` reads `--size-chip`, not a fixed height', () => {
    const { container } = render(<Chip>Draft</Chip>);
    expect(classes(container.firstElementChild)).toContain('h-(--size-chip)');
  });

  test('outside the workspace the radii and the text are what they were', () => {
    const md = render(<Chip>Draft</Chip>).container.firstElementChild;
    expect(classes(md)).toContain('rounded-[calc(var(--radius-control)-4px)]');
    const sm = render(<Chip size="sm">3</Chip>).container.firstElementChild;
    expect(classes(sm)).toEqual(
      expect.arrayContaining(['text-[10px]', 'rounded-[calc(var(--radius-control)-6px)]']),
    );
  });

  test('in the workspace no radius is the control radius minus a fixed number of pixels', () => {
    // `calc(var(--radius-control)-4px)` is 2px at a 6px corner; `-6px` is nothing.
    for (const size of ['sm', 'md'] as const) {
      const chip = render(<Chip size={size}>Draft</Chip>).container.firstElementChild;
      const radii = classes(chip).filter((c) => c.startsWith('workspace:rounded-'));
      expect(radii).toHaveLength(1);
      expect(radii[0]).not.toMatch(/--radius-control\)\s*-\s*\d+px/);
    }
  });

  test('in the workspace no text is under 12px (`E-127` d3)', () => {
    const sm = render(<Chip size="sm">3</Chip>).container.firstElementChild;
    expect(classes(sm)).toContain('workspace:text-xs');
  });
});

describe('Card raised', () => {
  test('raised on line, and card on card-line in the workspace', () => {
    const { container } = render(<Card variant="raised">Body</Card>);
    expect(classes(container.firstElementChild)).toEqual(
      expect.arrayContaining([
        'bg-raised',
        'border-line',
        'workspace:bg-card',
        'workspace:border-card-line',
      ]),
    );
  });
});
