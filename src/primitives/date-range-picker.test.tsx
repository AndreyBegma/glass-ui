import { afterAll, afterEach, beforeAll, describe, expect, mock, setSystemTime, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { type DateRange, DateRangePicker, type DateRangePickerProps } from './date-range-picker';

/**
 * Today is pinned to Tuesday 13 October 2026, and the document speaks en-GB,
 * so the grid's month and the trigger's text are fixed.
 */
beforeAll(() => {
  setSystemTime(new Date(2026, 9, 13, 12));
  document.documentElement.lang = 'en-GB';
});
afterAll(() => {
  setSystemTime();
  document.documentElement.lang = '';
});

// The test DOM is a 390px phone: one month. `wide()` makes it a desktop.
const original = window.matchMedia;
function wide() {
  window.matchMedia = ((query: string) => {
    const min = query.match(/min-width: (\d+)px/);
    const max = query.match(/max-width: (\d+)px/);
    return {
      media: query,
      matches: (!min || 1280 >= Number(min[1])) && (!max || 1280 <= Number(max[1])),
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    };
  }) as unknown as typeof window.matchMedia;
}
afterEach(() => {
  window.matchMedia = original;
});

function Controlled(
  props: Partial<DateRangePickerProps> & { onChange?: (value: DateRange | null) => void },
) {
  const { onChange, value: initial = null, ...rest } = props;
  const [value, setValue] = useState<DateRange | null>(initial);
  return (
    <DateRangePicker
      {...rest}
      value={value}
      onValueChange={(next) => {
        onChange?.(next);
        setValue(next);
      }}
    />
  );
}

function setup(props: Parameters<typeof Controlled>[0] = {}) {
  const onChange = mock((_value: DateRange | null) => {});
  render(<Controlled onChange={onChange} placeholder="Pick a range" {...props} />);
  return { onChange };
}

function trigger() {
  return screen.getByRole('button', { name: /Pick a range|2026/ });
}

async function open() {
  fireEvent.click(trigger());
  return screen.findByRole('dialog');
}

function day(iso: string) {
  const found = document.querySelector<HTMLButtonElement>(`[data-day="${iso}"]`);
  if (!found) throw new Error(`no day ${iso} on screen`);
  return found;
}

function selected(iso: string) {
  return day(iso).closest('td')?.getAttribute('aria-selected') === 'true';
}

function focusedDay() {
  return (document.activeElement as HTMLElement | null)?.dataset.day;
}

function days(range: DateRange) {
  return [range.start, range.end];
}

const flat = (text: string | null) => (text ?? '').replace(/\s+/g, '');

describe('DateRangePicker', () => {
  test('renders', () => {
    const { container } = render(
      <DateRangePicker value={null} onValueChange={() => {}} placeholder="Pick a range" />,
    );
    expect(container.textContent).toContain('Pick a range');
  });

  test('the trigger reads the range in the document locale', () => {
    setup({ value: { start: new Date(2026, 9, 12), end: new Date(2026, 9, 19) } });
    expect(flat(trigger().textContent)).toBe('12–19Oct2026');
  });

  test('selecting across a month boundary', async () => {
    wide();
    const { onChange } = setup();
    await open();
    expect(screen.getAllByRole('grid').map((grid) => grid.getAttribute('aria-label'))).toEqual([
      'October 2026',
      'November 2026',
    ]);
    fireEvent.click(day('2026-10-28'));
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(day('2026-11-03'));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(days(onChange.mock.calls[0]?.[0] as DateRange)).toEqual([
      new Date(2026, 9, 28),
      new Date(2026, 10, 3),
    ]);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(flat(trigger().textContent)).toBe('28Oct–3Nov2026');
  });

  test('the neighbouring months are blank, so no day is drawn twice', async () => {
    wide();
    setup();
    await open();
    expect(document.querySelectorAll('[data-day="2026-11-01"]')).toHaveLength(1);
    expect(document.querySelector('[data-day="2026-09-30"]')).toBeNull();
  });

  test('below the tablet edge there is one month', async () => {
    setup();
    await open();
    expect(screen.getAllByRole('grid')).toHaveLength(1);
  });

  test('hover previews the range from the start', async () => {
    setup();
    await open();
    fireEvent.click(day('2026-10-15'));
    fireEvent.mouseEnter(day('2026-10-18'));
    expect(['15', '16', '17', '18', '19'].map((d) => selected(`2026-10-${d}`))).toEqual([
      true,
      true,
      true,
      true,
      false,
    ]);
  });

  test('reversed clicks: a day before the start starts again', async () => {
    const { onChange } = setup();
    await open();
    fireEvent.click(day('2026-10-20'));
    fireEvent.click(day('2026-10-15'));
    expect(onChange).not.toHaveBeenCalled();
    expect(selected('2026-10-15')).toBe(true);
    expect(selected('2026-10-20')).toBe(false);
    fireEvent.click(day('2026-10-18'));
    expect(days(onChange.mock.calls[0]?.[0] as DateRange)).toEqual([
      new Date(2026, 9, 15),
      new Date(2026, 9, 18),
    ]);
  });

  test('the same day twice is a one-day range', async () => {
    const { onChange } = setup();
    await open();
    fireEvent.click(day('2026-10-15'));
    fireEvent.click(day('2026-10-15'));
    expect(days(onChange.mock.calls[0]?.[0] as DateRange)).toEqual([
      new Date(2026, 9, 15),
      new Date(2026, 9, 15),
    ]);
  });

  test('Escape drops the pending start and keeps the popover open', async () => {
    const { onChange } = setup();
    await open();
    fireEvent.click(day('2026-10-15'));
    fireEvent.keyDown(day('2026-10-15'), { key: 'Escape' });
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(selected('2026-10-15')).toBe(false);
    expect(screen.getByText('Selection cancelled.')).toBeTruthy();
    fireEvent.click(day('2026-10-17'));
    expect(onChange).not.toHaveBeenCalled();
  });

  test('min and max disable days', async () => {
    const { onChange } = setup({ min: new Date(2026, 9, 10), max: new Date(2026, 9, 20) });
    await open();
    expect(day('2026-10-09').getAttribute('aria-disabled')).toBe('true');
    expect(day('2026-10-21').getAttribute('aria-disabled')).toBe('true');
    expect(day('2026-10-10').hasAttribute('aria-disabled')).toBe(false);
    fireEvent.click(day('2026-10-09'));
    fireEvent.click(day('2026-10-21'));
    expect(selected('2026-10-09')).toBe(false);
    expect(onChange).not.toHaveBeenCalled();
    // Last 30 days reaches before the 10th; Today fits.
    expect(screen.getByRole('button', { name: 'Last 30 days' })).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: 'Today' })).toHaveProperty('disabled', false);
  });

  test('presets', async () => {
    const { onChange } = setup();
    await open();
    expect(
      screen.getAllByRole('button', { pressed: false }).map((button) => button.textContent),
    ).toEqual(['Today', 'Last 7 days', 'Last 30 days', 'This month']);
    fireEvent.click(screen.getByRole('button', { name: 'Last 7 days' }));
    expect(days(onChange.mock.calls[0]?.[0] as DateRange)).toEqual([
      new Date(2026, 9, 7),
      new Date(2026, 9, 13),
    ]);
    expect(screen.queryByRole('dialog')).toBeNull();
    await open();
    expect(screen.getByRole('button', { name: 'Last 7 days' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
  });

  test('custom presets and labels replace the defaults', async () => {
    setup({
      presets: [
        {
          id: 'q4',
          label: 'Q4',
          range: () => ({ start: new Date(2026, 9, 1), end: new Date(2026, 11, 31) }),
        },
      ],
      labels: { presets: 'Shortcuts', dialog: 'Report period' },
    });
    await open();
    expect(screen.getByRole('dialog', { name: 'Report period' })).toBeTruthy();
    const group = screen.getByRole('group', { name: 'Shortcuts' });
    expect(group.textContent).toBe('Q4');
  });

  test('controlled value: the trigger follows the prop, not the click', async () => {
    const onValueChange = mock((_value: DateRange | null) => {});
    const value = { start: new Date(2026, 9, 1), end: new Date(2026, 9, 2) };
    const { rerender } = render(
      <DateRangePicker value={value} onValueChange={onValueChange} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /2026/ }));
    await screen.findByRole('dialog');
    expect(selected('2026-10-01') && selected('2026-10-02')).toBe(true);
    fireEvent.click(day('2026-10-05'));
    fireEvent.click(day('2026-10-06'));
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(flat(screen.getByRole('button', { name: /2026/ }).textContent)).toBe('1–2Oct2026');
    rerender(
      <DateRangePicker
        value={{ start: new Date(2026, 9, 5), end: new Date(2026, 9, 6) }}
        onValueChange={onValueChange}
      />,
    );
    expect(flat(screen.getByRole('button', { name: /2026/ }).textContent)).toBe('5–6Oct2026');
  });

  test('uncontrolled from defaultValue', async () => {
    const onValueChange = mock((_value: DateRange | null) => {});
    render(
      <DateRangePicker
        defaultValue={{ start: new Date(2026, 9, 1), end: new Date(2026, 9, 2) }}
        onValueChange={onValueChange}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /2026/ }));
    await screen.findByRole('dialog');
    fireEvent.click(day('2026-10-05'));
    fireEvent.click(day('2026-10-06'));
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(flat(screen.getByRole('button', { name: /2026/ }).textContent)).toBe('5–6Oct2026');
  });

  test('keyboard selection', async () => {
    const { onChange } = setup();
    await open();
    expect(focusedDay()).toBe('2026-10-13');
    const grid = () => screen.getByRole('grid');
    fireEvent.keyDown(grid(), { key: 'Enter' });
    expect(screen.getByText(/Start 13Oct2026|Start 13 Oct 2026/)).toBeTruthy();
    fireEvent.keyDown(grid(), { key: 'ArrowDown' });
    fireEvent.keyDown(grid(), { key: 'End' });
    expect(focusedDay()).toBe('2026-10-25');
    // The focused day previews the range, as the pointer does.
    expect(selected('2026-10-20')).toBe(true);
    fireEvent.keyDown(grid(), { key: 'PageDown' });
    expect(focusedDay()).toBe('2026-11-25');
    expect(grid().getAttribute('aria-label')).toBe('November 2026');
    fireEvent.keyDown(grid(), { key: 'Home' });
    expect(focusedDay()).toBe('2026-11-23');
    fireEvent.keyDown(grid(), { key: ' ' });
    expect(days(onChange.mock.calls[0]?.[0] as DateRange)).toEqual([
      new Date(2026, 9, 13),
      new Date(2026, 10, 23),
    ]);
    expect(screen.getByText(/Selected/).textContent).toContain('2026');
  });

  test('one tab stop across both months', async () => {
    wide();
    setup();
    await open();
    expect(document.querySelectorAll('[role="grid"] button[tabindex="0"]')).toHaveLength(1);
    fireEvent.keyDown(screen.getAllByRole('grid')[0] as HTMLElement, { key: 'PageDown' });
    expect(focusedDay()).toBe('2026-11-13');
    expect(document.querySelectorAll('[role="grid"] button[tabindex="0"]')).toHaveLength(1);
  });

  test('disabled leaves the trigger shut', () => {
    setup({ disabled: true });
    expect(trigger()).toHaveProperty('disabled', true);
  });
});
