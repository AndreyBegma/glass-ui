import { describe, expect, mock, test } from 'bun:test';
import { act, fireEvent, render } from '@testing-library/react';
import { ActivityHeatmap } from './activity-heatmap';

// 2026-10-04 is a Sunday, 2026-10-12 a Monday, 2026-10-17 a Saturday.
const start = new Date(2026, 9, 4);
const end = new Date(2026, 9, 17);

const data = [
  { date: '2026-10-12', value: 3 },
  { date: '2026-10-13', value: 1 },
  { date: '2026-10-14', value: 8 },
];

const cell = (container: HTMLElement, date: string) =>
  container.querySelector(`[data-date="${date}"]`) as HTMLElement;

describe('ActivityHeatmap', () => {
  test('renders', () => {
    const { container } = render(<ActivityHeatmap data={[]} className="probe" />);
    expect(container.querySelector('.probe')).not.toBeNull();
  });

  test('level bucketing: zero is the hairline, the busiest day is the top shade', () => {
    const { container } = render(<ActivityHeatmap data={data} start={start} end={end} />);
    expect(cell(container, '2026-10-05').dataset.level).toBe('0');
    expect(cell(container, '2026-10-13').dataset.level).toBe('1');
    expect(cell(container, '2026-10-14').dataset.level).toBe('4');
    // the shade is the accent token at a stepped opacity, never a colour
    expect(cell(container, '2026-10-14').getAttribute('style')).toContain('--color-accent');
  });

  test('levels counts the empty one, and the legend shows every level', () => {
    const { container } = render(
      <ActivityHeatmap data={data} start={start} end={end} levels={3} />,
    );
    expect(container.querySelectorAll('[data-activity-heatmap-legend] [data-level]')).toHaveLength(3);
    expect(cell(container, '2026-10-14').dataset.level).toBe('2');
  });

  test('tone paints with the hue token', () => {
    const { container } = render(<ActivityHeatmap data={data} start={start} end={end} tone={3} />);
    expect(cell(container, '2026-10-14').getAttribute('style')).toContain('--color-hue-3');
  });

  test('week alignment for weekStartsOn 0', () => {
    const { container } = render(<ActivityHeatmap data={[]} start={start} end={end} weekStartsOn={0} />);
    expect(cell(container, '2026-10-04').dataset).toMatchObject({ col: '0', row: '0' });
    expect(cell(container, '2026-10-12').dataset).toMatchObject({ col: '1', row: '1' });
  });

  test('week alignment for weekStartsOn 1', () => {
    const { container } = render(
      <ActivityHeatmap data={[]} start={start} end={end} weekStartsOn={1} />,
    );
    expect(cell(container, '2026-10-04').dataset).toMatchObject({ col: '0', row: '6' });
    expect(cell(container, '2026-10-12').dataset).toMatchObject({ col: '2', row: '0' });
    expect(container.querySelectorAll('[role="grid"] [role="row"]')).toHaveLength(7);
  });

  test('weekday labels start from the chosen weekday', () => {
    const { container } = render(<ActivityHeatmap data={[]} start={start} end={end} weekStartsOn={1} />);
    const shown = [...container.querySelectorAll('[data-activity-heatmap-weekday]')].map(
      (e) => e.textContent,
    );
    expect(shown).toEqual(['Tue', 'Thu', 'Sat']);
  });

  test('accessible names carry the value, the unit and the date', () => {
    const { container } = render(
      <ActivityHeatmap
        data={data}
        start={start}
        end={end}
        formatValue={(n) => `${n} runs`}
      />,
    );
    expect(cell(container, '2026-10-12').getAttribute('aria-label')).toBe('3 runs on 12 October 2026');
    expect(cell(container, '2026-10-05').getAttribute('aria-label')).toBe(
      'No activity on 5 October 2026',
    );
  });

  test('labels override every string', () => {
    const { container, getByRole, getByText } = render(
      <ActivityHeatmap
        data={data}
        start={start}
        end={end}
        labels={{
          grid: 'Aktivität',
          less: 'Weniger',
          more: 'Mehr',
          day: (v, d) => `${v} am ${d}`,
          none: (d) => `Nichts am ${d}`,
        }}
      />,
    );
    expect(getByRole('grid').getAttribute('aria-label')).toStartWith('Aktivität.');
    expect(getByText('Weniger')).not.toBeNull();
    expect(getByText('Mehr')).not.toBeNull();
    expect(cell(container, '2026-10-12').getAttribute('aria-label')).toBe('3 am 12 October 2026');
    expect(cell(container, '2026-10-05').getAttribute('aria-label')).toBe('Nichts am 5 October 2026');
  });

  test('keyboard roving: one tab stop, starting on the newest day', () => {
    const { container } = render(<ActivityHeatmap data={data} start={start} end={end} />);
    const stops = container.querySelectorAll('[role="gridcell"][tabindex="0"]');
    expect(stops).toHaveLength(1);
    expect((stops[0] as HTMLElement).dataset.date).toBe('2026-10-17');
  });

  test('keyboard roving: arrows move by week and day, and the stop follows focus', () => {
    const { container } = render(<ActivityHeatmap data={data} start={start} end={end} />);
    const first = cell(container, '2026-10-12');
    act(() => first.focus());
    fireEvent.keyDown(first, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(cell(container, '2026-10-05'));
    fireEvent.keyDown(document.activeElement as Element, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(cell(container, '2026-10-06'));
    fireEvent.keyDown(document.activeElement as Element, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(cell(container, '2026-10-13'));
    fireEvent.keyDown(document.activeElement as Element, { key: 'End' });
    expect(document.activeElement).toBe(cell(container, '2026-10-13'));
    fireEvent.keyDown(document.activeElement as Element, { key: 'Home', ctrlKey: true });
    expect(document.activeElement).toBe(cell(container, '2026-10-04'));
    // an edge does not wrap
    fireEvent.keyDown(document.activeElement as Element, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(cell(container, '2026-10-04'));
    expect(container.querySelectorAll('[role="gridcell"][tabindex="0"]')).toHaveLength(1);
    expect(cell(container, '2026-10-04').getAttribute('tabindex')).toBe('0');
  });

  test('focus shows the readout, Escape and blur hide it', () => {
    const { container } = render(
      <ActivityHeatmap data={data} start={start} end={end} formatValue={(n) => `${n} runs`} />,
    );
    const c = cell(container, '2026-10-12');
    fireEvent.focus(c);
    const tip = container.querySelector('[data-activity-heatmap-tooltip]');
    expect(tip?.textContent).toContain('3 runs');
    expect(tip?.textContent).toContain('12 October 2026');
    fireEvent.keyDown(c, { key: 'Escape' });
    expect(container.querySelector('[data-activity-heatmap-tooltip]')).toBeNull();
  });

  test('hover shows the readout', () => {
    const { container } = render(<ActivityHeatmap data={data} start={start} end={end} />);
    fireEvent.pointerEnter(cell(container, '2026-10-14'));
    expect(container.querySelector('[data-activity-heatmap-tooltip]')?.textContent).toContain('8');
  });

  test('Enter, Space and click call onDayClick with the day', () => {
    const onDayClick = mock();
    const { container } = render(
      <ActivityHeatmap data={data} start={start} end={end} onDayClick={onDayClick} />,
    );
    const c = cell(container, '2026-10-12');
    fireEvent.keyDown(c, { key: 'Enter' });
    fireEvent.keyDown(c, { key: ' ' });
    fireEvent.click(cell(container, '2026-10-05'));
    expect(onDayClick.mock.calls).toEqual([
      [{ date: '2026-10-12', value: 3 }],
      [{ date: '2026-10-12', value: 3 }],
      [{ date: '2026-10-05', value: 0 }],
    ]);
  });

  test('empty data: a full grid of hairlines, and the table says so', () => {
    const { container, getByRole } = render(<ActivityHeatmap data={[]} start={start} end={end} />);
    const cells = container.querySelectorAll('[role="gridcell"]');
    expect(cells).toHaveLength(14);
    expect([...cells].every((c) => (c as HTMLElement).dataset.level === '0')).toBe(true);
    expect(getByRole('grid').getAttribute('aria-label')).toContain('0 days with activity');
    expect(container.querySelector('[data-activity-heatmap-table] caption')?.textContent).toContain(
      'No activity',
    );
  });

  test('default range is the 52 weeks up to today', () => {
    const { container } = render(<ActivityHeatmap data={[]} />);
    const n = container.querySelectorAll('[role="gridcell"]').length;
    expect(n).toBe(52 * 7 + 1);
  });

  test('the hidden table lists the days with activity', () => {
    const { container } = render(
      <ActivityHeatmap data={data} start={start} end={end} formatValue={(n) => `${n} runs`} />,
    );
    const rows = container.querySelectorAll('[data-activity-heatmap-table] tbody tr');
    expect(rows).toHaveLength(3);
    expect(rows[0]?.textContent).toContain('12 October 2026');
    expect(rows[0]?.textContent).toContain('3 runs');
  });
});
