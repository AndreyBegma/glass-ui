import { describe, expect, test } from 'bun:test';
import { render } from '@testing-library/react';
import { Bot } from 'lucide-react';
import { HUES, hueClasses } from '../lib/hue';
import { Badge } from '../primitives/badge';
import { Card } from '../primitives/card';
import { statusTone } from '../primitives/status-pill';
import { FlowNodeCard } from './flow-graph/node-card';
import { NodeCard } from './node-card';
import { Sankey } from './sankey';
import { StatTile } from './stat-tile';

/**
 * #109 — the `hue` prop, on every surface that takes one. A hue is an
 * identity: the border, the icon disc and the glow (or, on a badge, the tint
 * and its ink). Without the prop each component renders exactly as before,
 * which the second assertion of each block holds.
 */

const classOf = (el: Element | null) => (el as HTMLElement | null)?.className ?? '';

describe('NodeCard hue', () => {
  test.each([...HUES])('hue %d tints the border, the icon disc and the glow', (hue) => {
    const { container } = render(<NodeCard title="Agent" icon={Bot} hue={hue} />);
    const card = container.querySelector('[data-node-card]');
    const h = hueClasses(hue);
    expect(card?.getAttribute('data-node-hue')).toBe(String(hue));
    expect(classOf(card)).toContain(h.rim);
    expect(classOf(card)).toContain(h.glow);
    const tile = container.querySelector('[data-node-tile]');
    expect(tile?.getAttribute('data-node-tile')).toBe(`hue-${hue}`);
    expect(classOf(tile)).toContain(`bg-hue-${hue}-soft`);
  });

  test('with a hue, the status is the pill and the edge is the hue', () => {
    const { container } = render(
      <NodeCard title="Agent" icon={Bot} hue={3} status="blocked" />,
    );
    const card = classOf(container.querySelector('[data-node-card]'));
    expect(card).toContain(hueClasses(3).rim);
    expect(card).not.toContain(statusTone('blocked').rim);
    expect(container.querySelector('[data-status="blocked"]')).not.toBeNull();
  });

  test('without a hue, the status rim and the color tile are as they were', () => {
    const { container } = render(
      <NodeCard title="Agent" icon={Bot} color="series-2" status="blocked" />,
    );
    const card = container.querySelector('[data-node-card]');
    expect(card?.hasAttribute('data-node-hue')).toBe(false);
    expect(classOf(card)).toContain(statusTone('blocked').rim);
    expect(container.querySelector('[data-node-tile]')?.getAttribute('data-node-tile')).toBe(
      'series-2',
    );
  });

  test('glow={false} keeps the hue border and drops its glow', () => {
    const { container } = render(<NodeCard title="Agent" hue={5} glow={false} />);
    const card = classOf(container.querySelector('[data-node-card]'));
    expect(card).toContain(hueClasses(5).rim);
    expect(card).not.toContain(hueClasses(5).glow);
  });
});

describe('Card hue', () => {
  test('tints the border and glows, on the content fill by default', () => {
    const { container } = render(<Card hue={7}>x</Card>);
    const card = classOf(container.firstElementChild);
    expect(card).toContain(hueClasses(7).rim);
    expect(card).toContain(hueClasses(7).glow);
    expect(card).toContain('bg-content');
    expect(card).not.toContain('surface-content');
  });

  test('keeps the variant fill, and on glass takes the border only', () => {
    expect(classOf(render(<Card hue={2} variant="raised" />).container.firstElementChild)).toContain(
      'bg-raised',
    );
    const glass = classOf(render(<Card hue={2} variant="glass" />).container.firstElementChild);
    expect(glass).toContain('glass');
    expect(glass).toContain(hueClasses(2).rim);
    expect(glass).not.toContain(hueClasses(2).glow);
  });

  test('without a hue it is the content surface, as before', () => {
    const card = classOf(render(<Card>x</Card>).container.firstElementChild);
    expect(card).toContain('surface-content');
    expect(card).not.toContain('hue-');
  });
});

describe('StatTile hue', () => {
  test('tints the border and glows', () => {
    const { container } = render(<StatTile label="Spend" value="12" hue={4} />);
    const tile = classOf(container.firstElementChild);
    expect(tile).toContain(hueClasses(4).rim);
    expect(tile).toContain(hueClasses(4).glow);
    expect(tile).not.toContain('border-line ');
  });

  test('without a hue the hairline is the line token', () => {
    const tile = classOf(render(<StatTile label="Spend" value="12" />).container.firstElementChild);
    expect(tile).toContain('border-line');
    expect(tile).not.toContain('hue-');
  });
});

describe('Badge hue', () => {
  test('a counting badge takes the hue tint and its ink, over the tone', () => {
    const badge = classOf(render(<Badge count={3} hue={6} tone="ok" />).container.firstElementChild);
    expect(badge).toContain('bg-hue-6-soft');
    expect(badge).toContain('text-hue-6-ink');
    expect(badge).not.toContain('bg-ok');
  });

  test('a dot takes the solid mark', () => {
    const badge = classOf(render(<Badge dot hue={1} />).container.firstElementChild);
    expect(badge).toContain('bg-hue-1');
    expect(badge).not.toContain('bg-hue-1-soft');
  });
});

describe('FlowNodeCard hue', () => {
  test('the hue is the edge and the icon disc; the status keeps its dot', () => {
    const { container } = render(
      <FlowNodeCard title="Agent" icon={<Bot />} tone="waiting" hue={8} />,
    );
    const card = container.querySelector('[data-flow-node-card]');
    expect(card?.getAttribute('data-hue')).toBe('8');
    expect(classOf(card)).toContain(hueClasses(8).rim);
    expect(classOf(card)).not.toContain(statusTone('waiting').rim);
    expect(container.innerHTML).toContain('bg-hue-8-soft');
    expect(container.innerHTML).toContain(statusTone('waiting').dot);
  });
});

describe('Sankey hue', () => {
  test('a link is its source node’s hue, else the accent', () => {
    const { container } = render(
      <Sankey
        label="Flow"
        columns={[
          { id: 'a', label: 'A' },
          { id: 'b', label: 'B' },
        ]}
        nodes={[
          { id: 'x', label: 'X', column: 'a', hue: 2 },
          { id: 'y', label: 'Y', column: 'a' },
          { id: 'z', label: 'Z', column: 'b' },
        ]}
        links={[
          { source: 'x', target: 'z', value: 3 },
          { source: 'y', target: 'z', value: 2 },
        ]}
      />,
    );
    const strokes = [...container.querySelectorAll('[data-sankey-stroke]')].map(classOf);
    expect(strokes.some((c) => c.includes('stroke-hue-2'))).toBe(true);
    expect(strokes.some((c) => c.includes('stroke-accent'))).toBe(true);
    expect(classOf(container.querySelector('[data-sankey-node="x"]'))).toContain('bg-hue-2-soft');
  });
});
