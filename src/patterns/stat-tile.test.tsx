import { describe, expect, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { StatTile } from './stat-tile';

describe('StatTile', () => {
  test('renders label, value, hint and the trend slot', () => {
    render(
      <StatTile label="Spend" value="$12" hint="last 24h">
        <span>trend</span>
      </StatTile>,
    );
    for (const t of ['Spend', '$12', 'last 24h', 'trend'])
      expect(screen.getByText(t)).not.toBeNull();
  });

  test('delta sentiment="bad" direction="up" uses the danger token with an icon and text', () => {
    const { container } = render(
      <StatTile
        label="Cost"
        value="$9"
        delta={{ value: '+12%', direction: 'up', sentiment: 'bad' }}
      />,
    );
    const delta = container.querySelector('[data-sentiment="bad"]');
    expect(delta?.className).toContain('text-danger');
    expect(delta?.querySelector('svg[data-direction="up"]')).not.toBeNull();
    expect(delta?.textContent).toContain('+12%');
    expect(delta?.textContent).toContain('Up');
  });

  test('sentiment, not direction, picks the colour', () => {
    const { container } = render(
      <StatTile
        label="Merges"
        value="4"
        delta={{ value: '+2', direction: 'up', sentiment: 'good' }}
      />,
    );
    expect(container.querySelector('[data-sentiment="good"]')?.className).toContain('text-ok');
    expect(container.querySelector('[data-sentiment="good"]')?.className).not.toContain(
      'text-danger',
    );
  });

  test('loading renders skeletons of the same height', () => {
    const props = {
      label: 'L',
      value: 'V',
      delta: { value: '1', direction: 'down', sentiment: 'neutral' },
    } as const;
    const { container: ready } = render(<StatTile {...props} />);
    const { container: busy } = render(<StatTile {...props} loading />);
    expect(busy.querySelectorAll('[data-stat-skeleton]').length).toBe(2);
    expect(busy.textContent).not.toContain('V');
    // Value and delta rows keep the heights the loaded tile uses.
    const h = (el: Element | null) => /\bh-\d+\b/.exec(el?.className ?? '')?.[0];
    expect(h(busy.querySelector('[data-stat-skeleton="value"]'))).toBe('h-7');
    expect(h(busy.querySelector('[data-stat-skeleton="delta"]'))).toBe('h-4');
    expect(ready.querySelector('.h-7')).not.toBeNull();
    expect(ready.querySelector('[data-sentiment].h-4')).not.toBeNull();
  });

  test('is pressable only with href or onClick', () => {
    const { container, rerender } = render(<StatTile label="A" value="1" />);
    expect(container.querySelector('a,button')).toBeNull();

    let n = 0;
    rerender(<StatTile label="A" value="1" onClick={() => n++} />);
    fireEvent.click(screen.getByRole('button'));
    expect(n).toBe(1);

    rerender(<StatTile label="A" value="1" href="/x" />);
    expect(screen.getByRole('link').getAttribute('href')).toBe('/x');
  });

  test('is a solid surface, never glass', () => {
    const { container } = render(<StatTile label="A" value="1" />);
    const cls = container.firstElementChild?.className.split(' ') ?? [];
    expect(cls).toContain('bg-raised');
    expect(cls).not.toContain('glass');
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
      const { container } = render(<StatTile label="A" value="1" />, { container: host });
      // Token classes only, so each theme and the flat material resolve them.
      expect(container.firstElementChild?.className).toContain('bg-raised');
      expect(container.firstElementChild?.className).not.toMatch(/#|rgb/);
      host.remove();
    }
  });

  test('touch targets are at least 44px on a coarse pointer', () => {
    const { rerender } = render(<StatTile label="A" value="1" onClick={() => {}} />);
    expect(screen.getByRole('button').className).toContain('min-h-(--size-tap)');
    rerender(<StatTile label="A" value="1" href="/x" />);
    expect(screen.getByRole('link').className).toContain('min-h-(--size-tap)');
  });
});
