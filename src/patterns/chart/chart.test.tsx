import { describe, expect, mock, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { buildModel } from './data';
import { Chart, type ChartSeries } from './index';
import { layoutChart } from './layout';

// #74 — one test (or more) per acceptance bullet. The geometry is also tested
// on its own in `path.test.ts`, `scale.test.ts`, `time-ticks.test.ts` and
// `downsample.test.ts`; these render the composed chart.

const DAY = 86_400_000;
const START = Date.UTC(2026, 9, 7, 12);
const week = (ys: (number | null)[]) => ys.map((y, i) => ({ x: new Date(START + i * DAY), y }));

const THREE: ChartSeries[] = [
  { id: 'tokens', name: 'Tokens', kind: 'area', points: week([1, 2, 3, 4, 5, 6, 7]) },
  { id: 'cost', name: 'Cost', kind: 'line', points: week([7, 6, 5, 4, 3, 2, 12.4]) },
  { id: 'runs', name: 'Runs', kind: 'bar', points: week([2, 2, 2, 2, 2, 2, 2]) },
];

const svgOf = (c: HTMLElement) => c.querySelector('svg[role="img"]') as SVGSVGElement;
const live = (c: HTMLElement) => c.querySelector('[aria-live="polite"]') as HTMLElement;
const points = (d: string) => (d.match(/[ML]/g) ?? []).length;

describe('Chart', () => {
  test('three series (area, line, bar) over 7 days render the right number of paths and bars', () => {
    const { container } = render(<Chart label="Usage" series={THREE} x="time" />);
    expect(container.querySelectorAll('path[data-kind="area"]')).toHaveLength(1);
    expect(container.querySelectorAll('path[data-kind="line"]')).toHaveLength(1);
    expect(container.querySelectorAll('rect[data-series="runs"]')).toHaveLength(7);
    const line = container.querySelector('path[data-kind="line"]')?.getAttribute('d') ?? '';
    expect(points(line)).toBe(7);
    expect(container.innerHTML).not.toContain('NaN');
  });

  test('bars are drawn first, then areas, then lines', () => {
    const { container } = render(<Chart label="Usage" series={[...THREE].reverse()} x="time" />);
    const marks = [...container.querySelectorAll('[data-series]')].map((el) =>
      el.tagName.toLowerCase() === 'rect' ? 'bar' : el.getAttribute('data-kind'),
    );
    expect(marks.indexOf('area')).toBeGreaterThan(marks.lastIndexOf('bar'));
    expect(marks.indexOf('line')).toBeGreaterThan(marks.lastIndexOf('area'));
  });

  test('stacked areas sum correctly at each x (pure-function tests on the path builder)', () => {
    const rows = [
      [1, 2, 3, 4, 5, 6, 7],
      [3, 1, 4, 1, 5, 9, 2],
      [2, 7, 1, 8, 2, 8, 1],
    ];
    const series: ChartSeries[] = rows.map((r, i) => ({
      id: `s${i}`,
      name: `S${i}`,
      kind: 'area',
      points: week(r),
    }));
    const l = layoutChart(buildModel(series, 'time'), {
      kind: 'time',
      width: 640,
      height: 240,
      stacked: true,
      formatY: String,
    });
    for (let i = 0; i < 7; i++) {
      expect(l.tops[0]?.[i]).toBe(rows[0]?.[i]);
      expect(l.tops[1]?.[i]).toBe((rows[0]?.[i] ?? 0) + (rows[1]?.[i] ?? 0));
      expect(l.tops[2]?.[i]).toBe(rows.reduce((s, r) => s + (r[i] ?? 0), 0));
    }
    const { container } = render(<Chart label="Stacked" series={series} x="time" stacked />);
    expect(container.querySelectorAll('path[data-kind="area"]')).toHaveLength(3);
  });

  test('a null y makes a gap in a line and an area, and no bar', () => {
    const gappy: ChartSeries[] = [
      { id: 'a', name: 'A', kind: 'area', points: week([1, 2, null, 4, 5, 6, 7]) },
      { id: 'l', name: 'L', kind: 'line', points: week([1, 2, 3, null, 5, 6, 7]) },
      { id: 'b', name: 'B', kind: 'bar', points: week([1, null, 3, 4, null, 6, 7]) },
    ];
    const { container } = render(<Chart label="Gaps" series={gappy} x="time" />);
    const line = container.querySelector('path[data-kind="line"]')?.getAttribute('d') ?? '';
    const area = container.querySelector('path[data-kind="area"]')?.getAttribute('d') ?? '';
    expect(line.match(/M/g)).toHaveLength(2);
    expect(area.match(/Z/g)).toHaveLength(2);
    expect(container.querySelectorAll('rect[data-series="b"]')).toHaveLength(5);
  });

  test('50 000 points down-sample to at most 2 x width points and the caption says so', () => {
    const n = 50_000;
    const big: ChartSeries[] = [
      {
        id: 'big',
        name: 'Requests',
        kind: 'line',
        points: Array.from({ length: n }, (_, i) => ({ x: START + i * 60_000, y: Math.sin(i / 300) * 50 })),
      },
    ];
    const { container } = render(<Chart label="Requests" series={big} x="time" />);
    // The headless DOM has no layout, so the width is the 640px default.
    const d = container.querySelector('path[data-kind="line"]')?.getAttribute('d') ?? '';
    expect(points(d)).toBeGreaterThan(100);
    expect(points(d)).toBeLessThanOrEqual(2 * 640);
    expect(container.querySelector('caption')?.textContent).toContain('down-sampled');
    expect(container.querySelectorAll('tbody tr').length).toBeLessThanOrEqual(2 * 640);
  });

  test('a small chart is not down-sampled and the caption is just the label', () => {
    const { container } = render(<Chart label="Usage" series={THREE} x="time" />);
    expect(container.querySelector('caption')?.textContent).toBe('Usage');
  });

  test('the hidden table has one row per x and one column per series', () => {
    const offset: ChartSeries[] = [
      ...THREE,
      // An x the others do not have still gets its own row, with gaps for them.
      { id: 'late', name: 'Late', kind: 'line', points: [{ x: new Date(START + 7 * DAY), y: 1 }] },
    ];
    const { container } = render(<Chart label="Usage" series={offset} x="time" />);
    const table = container.querySelector('table') as HTMLTableElement;
    expect(table.closest('[data-chart-table]')?.className).toContain('sr-only');
    const head = [...table.querySelectorAll('thead th')].map((th) => th.textContent);
    expect(head).toEqual(['Time', 'Tokens', 'Cost', 'Runs', 'Late']);
    const rows = table.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(8);
    for (const row of rows) expect(row.children).toHaveLength(5);
    expect(rows[7]?.textContent).toContain('—');
  });

  test('arrow keys move the focused x and announce it in a polite live region', () => {
    const { container } = render(
      <Chart label="Usage" series={THREE} x="time" formatX={(x) => `day ${(x as Date).getUTCDate()}`} />,
    );
    const svg = svgOf(container);
    expect(svg.getAttribute('tabindex')).toBe('0');
    expect(live(container).textContent).toBe('');

    fireEvent.keyDown(svg, { key: 'ArrowRight' });
    expect(live(container).textContent).toBe('day 7: Tokens 1, Cost 7, Runs 2');
    expect(container.querySelector('[data-chart-tooltip]')?.textContent).toContain('day 7');

    fireEvent.keyDown(svg, { key: 'ArrowRight' });
    expect(live(container).textContent).toStartWith('day 8:');

    fireEvent.keyDown(svg, { key: 'End' });
    expect(live(container).textContent).toBe('day 13: Tokens 7, Cost 12.4, Runs 2');
    fireEvent.keyDown(svg, { key: 'ArrowRight' });
    expect(live(container).textContent).toStartWith('day 13:');

    fireEvent.keyDown(svg, { key: 'ArrowLeft' });
    expect(live(container).textContent).toStartWith('day 12:');
    fireEvent.keyDown(svg, { key: 'Home' });
    expect(live(container).textContent).toStartWith('day 7:');

    fireEvent.keyDown(svg, { key: 'Escape' });
    expect(container.querySelector('[data-chart-tooltip]')).toBeNull();
  });

  test('the pointer moves the tooltip to the nearest x, and leaving hides it', () => {
    const { container } = render(
      <Chart label="Usage" series={THREE} x="time" formatX={(x) => `day ${(x as Date).getUTCDate()}`} />,
    );
    const svg = svgOf(container);
    fireEvent.pointerMove(svg, { clientX: 630 });
    expect(container.querySelector('[data-chart-tooltip]')?.textContent).toContain('day 13');
    fireEvent.pointerLeave(svg);
    expect(container.querySelector('[data-chart-tooltip]')).toBeNull();
  });

  test('formatTooltip replaces the readout', () => {
    const { container } = render(
      <Chart
        label="Usage"
        series={THREE}
        x="time"
        formatTooltip={({ entries }) => <b>{entries.length} values</b>}
      />,
    );
    fireEvent.keyDown(svgOf(container), { key: 'Home' });
    expect(container.querySelector('[data-chart-tooltip]')?.textContent).toBe('3 values');
  });

  test('the SVG is role="img", named by label plus an auto summary', () => {
    const { container } = render(<Chart label="Usage" series={THREE} x="time" formatY={(y) => y.toFixed(2)} />);
    const name = svgOf(container).getAttribute('aria-label') ?? '';
    expect(name).toStartWith('Usage. 3 series, ');
    expect(name).toContain(' – ');
    expect(name).toEndWith('max 12.40');
  });

  test('renders in light and dark and data-material flat (class and variable assertions)', () => {
    for (const [attr, value] of [
      ['data-theme', 'light'],
      ['data-theme', 'dark'],
      ['data-material', 'flat'],
    ] as const) {
      const host = document.createElement('div');
      host.setAttribute(attr, value);
      document.body.appendChild(host);
      const { container, unmount } = render(<Chart label="Usage" series={THREE} x="time" />, {
        container: host,
      });
      const root = container.querySelector('[data-chart]') as HTMLElement;
      // A solid surface, never glass (D12); token classes resolve per theme.
      expect(root.className).toContain('bg-surface');
      expect(root.className).not.toContain('glass');
      expect(container.querySelector('path[data-kind="area"]')?.getAttribute('class')).toContain('fill-series-1');
      expect(container.querySelector('path[data-kind="line"]')?.getAttribute('class')).toContain('stroke-series-2');
      expect(container.querySelector('rect[data-series="runs"]')?.getAttribute('class')).toContain('fill-series-3');
      expect(container.querySelector('[data-chart-axes]')?.getAttribute('class')).toContain('fill-ink-3');
      expect(container.querySelector('[data-chart-axes] line')?.getAttribute('class')).toContain('stroke-line');
      expect(container.innerHTML).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i);
      unmount();
      host.remove();
    }
  });

  test('uses series tokens only; no raw colour', () => {
    const six: ChartSeries[] = Array.from({ length: 7 }, (_, i) => ({
      id: `s${i}`,
      name: `S${i}`,
      kind: 'line',
      points: week([i, i + 1, i + 2, i + 3, i + 4, i + 5, i + 6]),
    }));
    six[5] = { ...(six[5] as ChartSeries), color: 'danger' };
    const { container } = render(<Chart label="Six" series={six} x="time" />);
    const lines = [...container.querySelectorAll('path[data-kind="line"]')];
    // D4: the seventh series does not render.
    expect(lines).toHaveLength(6);
    expect(lines.map((l) => l.getAttribute('class'))).toEqual([
      'stroke-series-1',
      'stroke-series-2',
      'stroke-series-3',
      'stroke-series-4',
      'stroke-series-5',
      'stroke-danger',
    ]);
    // D5: from the fourth series on, a line is also told apart by its dash.
    expect(lines.slice(0, 3).map((l) => l.getAttribute('stroke-dasharray'))).toEqual([null, null, null]);
    expect(new Set(lines.slice(3).map((l) => l.getAttribute('stroke-dasharray'))).size).toBe(3);
    expect(container.innerHTML).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i);
  });

  test('the legend names every series, top by default, bottom or hidden on request', () => {
    const { container, rerender } = render(<Chart label="Usage" series={THREE} x="time" />);
    const legend = () => container.querySelector('[data-chart-legend]');
    expect(legend()?.textContent).toBe('TokensCostRuns');
    expect(legend()?.compareDocumentPosition(svgOf(container)) ?? 0).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    rerender(<Chart label="Usage" series={THREE} x="time" legend="bottom" />);
    expect(legend()?.compareDocumentPosition(svgOf(container)) ?? 0).toBe(Node.DOCUMENT_POSITION_PRECEDING);
    rerender(<Chart label="Usage" series={THREE} x="time" legend={false} />);
    expect(legend()).toBeNull();
  });

  test('the show-table toggle is at least 44px on a coarse pointer', () => {
    render(<Chart label="Usage" series={THREE} x="time" />);
    expect(screen.getByRole('button', { name: 'Show table' }).className).toContain(
      'pointer-coarse:min-h-(--size-tap)',
    );
  });

  test('show table: uncontrolled toggles itself; controlled follows the prop', () => {
    const onChange = mock(() => {});
    const { container, rerender } = render(
      <Chart label="Usage" series={THREE} x="time" onShowTableChange={onChange} />,
    );
    const wrap = () => container.querySelector('[data-chart-table]') as HTMLElement;
    const toggle = screen.getByRole('button', { name: 'Show table' });
    expect(toggle.getAttribute('aria-controls')).toBe(wrap().id);
    fireEvent.click(toggle);
    expect(onChange).toHaveBeenLastCalledWith(true);
    expect(wrap().className).not.toContain('sr-only');
    expect(screen.getByRole('button', { name: 'Hide table' }).getAttribute('aria-expanded')).toBe('true');

    rerender(<Chart label="Usage" series={THREE} x="time" showTable={false} onShowTableChange={onChange} />);
    expect(wrap().className).toContain('sr-only');
    fireEvent.click(screen.getByRole('button', { name: 'Show table' }));
    expect(onChange).toHaveBeenLastCalledWith(true);
    // Controlled: nothing changes until the prop does.
    expect(wrap().className).toContain('sr-only');
  });

  test('labels override every rendered and announced string; the rest stay English', () => {
    const gappy: ChartSeries[] = [
      { id: 'c', name: 'Cost', kind: 'line', points: week([null, 2]) },
    ];
    const { container, rerender } = render(
      <Chart
        label="Kosten"
        series={gappy}
        x="time"
        formatX={() => 'Tag'}
        labels={{
          showTable: 'Tabelle zeigen',
          hideTable: 'Tabelle ausblenden',
          time: 'Zeit',
          seriesCount: (n) => `${n} Reihe`,
          max: (v) => `Maximum ${v}`,
          noValue: 'kein Wert',
        }}
      />,
    );
    expect(svgOf(container).getAttribute('aria-label')).toBe('Kosten. 1 Reihe, Tag, Maximum 2');
    expect(container.querySelector('thead th')?.textContent).toBe('Zeit');
    fireEvent.click(screen.getByRole('button', { name: 'Tabelle zeigen' }));
    expect(screen.getByRole('button', { name: 'Tabelle ausblenden' })).toBeTruthy();
    fireEvent.keyDown(svgOf(container), { key: 'Home' });
    expect(live(container).textContent).toBe('Tag: Cost kein Wert');

    rerender(
      <Chart label="Kosten" series={[]} x="category" labels={{ empty: 'Keine Daten', category: 'Kategorie' }} />,
    );
    expect(container.querySelector('[data-chart-empty]')?.textContent).toBe('Keine Daten');
    expect(container.querySelector('thead th')?.textContent).toBe('Kategorie');
    // Not overridden, so still the default.
    expect(screen.getByRole('button', { name: 'Hide table' })).toBeTruthy();

    const big: ChartSeries[] = [
      {
        id: 'big',
        name: 'Big',
        kind: 'line',
        points: Array.from({ length: 6_000 }, (_, i) => ({ x: START + i * 60_000, y: i % 7 })),
      },
    ];
    rerender(
      <Chart
        label="Kosten"
        series={big}
        x="time"
        labels={{ downsampled: (kept, total) => `${kept}/${total} Punkte` }}
      />,
    );
    expect(container.querySelector('caption')?.textContent).toMatch(/^Kosten — \d+\/6000 Punkte$/);
  });

  test('no data shows the empty state instead of a chart', () => {
    const { container, rerender } = render(<Chart label="Usage" series={[]} x="time" />);
    expect(svgOf(container)).toBeNull();
    expect(container.querySelector('[data-chart-empty]')?.textContent).toBe('No data');
    rerender(
      <Chart
        label="Usage"
        series={[{ id: 'n', name: 'N', kind: 'line', points: week([null, null]) }]}
        x="time"
        emptyState="Nothing yet"
      />,
    );
    expect(container.querySelector('[data-chart-empty]')?.textContent).toBe('Nothing yet');
  });

  test('category x: grouped bars per category, labels on the axis', () => {
    const cat: ChartSeries[] = [
      { id: 'in', name: 'In', kind: 'bar', points: [{ x: 'Mon', y: 1 }, { x: 'Tue', y: 2 }] },
      { id: 'out', name: 'Out', kind: 'bar', points: [{ x: 'Mon', y: 3 }, { x: 'Tue', y: 4 }] },
    ];
    const { container } = render(<Chart label="Traffic" series={cat} x="category" />);
    expect(container.querySelectorAll('rect[data-series]')).toHaveLength(4);
    expect(container.querySelector('[data-chart-axes]')?.textContent).toContain('Mon');
  });
});
