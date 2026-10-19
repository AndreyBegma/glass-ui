import { afterAll, beforeAll, describe, expect, mock, setSystemTime, test } from 'bun:test';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { DateField, type DateFieldProps } from './date-field';

/**
 * FEAT-20261013-006 (W242) — acceptance 1. Today is pinned to Tuesday
 * 13 October 2026, so "this year" and the grid's month are fixed.
 */
beforeAll(() => setSystemTime(new Date(2026, 9, 13, 12)));
afterAll(() => setSystemTime());

function Controlled(props: Partial<DateFieldProps> & { onChange?: (value: string) => void }) {
  const { onChange, value: initial = '2026-10-13', ...rest } = props;
  const [value, setValue] = useState(initial);
  return (
    <DateField
      aria-label="Due"
      calendarLabel="Choose a date"
      locale="ru"
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
  const onChange = mock((_value: string) => {});
  render(<Controlled onChange={onChange} {...props} />);
  return { onChange, input: screen.getByRole('textbox', { name: 'Due' }) as HTMLInputElement };
}

function type(input: HTMLInputElement, text: string) {
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: text } });
  fireEvent.keyDown(input, { key: 'Enter' });
}

async function openGrid() {
  fireEvent.click(screen.getByRole('button', { name: 'Choose a date' }));
  return screen.findByRole('grid');
}

function focusedDay() {
  return (document.activeElement as HTMLElement | null)?.dataset.day;
}

describe('DateField — the text', () => {
  test('at rest it reads the day in the locale, without this year', () => {
    const { input } = setup();
    expect(input.value).toBe('вт, 13 окт.');
  });

  test('another year is printed', () => {
    const { input } = setup({ value: '2025-10-13' });
    expect(input.value).toContain('2025');
  });

  test('focus shows the numbers to edit, in the locale order', () => {
    const { input } = setup();
    fireEvent.focus(input);
    expect(input.value).toBe('13.10.2026');
  });

  test('an empty field has the locale pattern as its placeholder', () => {
    const { input } = setup({ value: '' });
    expect(input.value).toBe('');
    expect(input.placeholder).toBe('DD.MM.YYYY');
  });

  test('`14.10` and Enter is the 14th of this year', () => {
    const { input, onChange } = setup();
    type(input, '14.10');
    expect(onChange).toHaveBeenCalledWith('2026-10-14');
  });

  test('en reads month first', () => {
    const { input, onChange } = setup({ locale: 'en' });
    type(input, '10/14/2026');
    expect(onChange).toHaveBeenCalledWith('2026-10-14');
  });

  test('a day that does not exist keeps the text, marks it, and calls nothing', () => {
    const { input, onChange } = setup();
    type(input, '31.02.2026');
    expect(onChange).not.toHaveBeenCalled();
    expect(input.value).toBe('31.02.2026');
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });

  test('a day after `max` is invalid too', () => {
    const { input, onChange } = setup({ max: '2026-10-20' });
    type(input, '21.10.2026');
    expect(onChange).not.toHaveBeenCalled();
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });

  test('clearing the text clears the value', () => {
    const { input, onChange } = setup();
    type(input, '');
    expect(onChange).toHaveBeenCalledWith('');
  });

  test('blur commits as Enter does', () => {
    const { input, onChange } = setup();
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '1.11.26' } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith('2026-11-01');
  });
});

describe('DateField — the month grid', () => {
  test('starts on Monday and opens on the chosen day', async () => {
    setup({ locale: 'en' });
    const grid = await openGrid();
    const heads = grid.querySelectorAll('th');
    expect(heads[0]?.getAttribute('abbr')).toBe('Monday');
    // 1 October 2026 is a Thursday, so the first row starts on 28 September.
    expect(grid.querySelector('[data-day]')?.getAttribute('data-day')).toBe('2026-09-28');
    await waitFor(() => expect(focusedDay()).toBe('2026-10-13'));
  });

  test('`weekStartsOn={0}` starts on Sunday', async () => {
    setup({ locale: 'en', weekStartsOn: 0 });
    const grid = await openGrid();
    expect(grid.querySelector('th')?.getAttribute('abbr')).toBe('Sunday');
    expect(grid.querySelector('[data-day]')?.getAttribute('data-day')).toBe('2026-09-27');
  });

  test('arrows move a day and a week, PageDown a month, Home and End the week', async () => {
    setup();
    const grid = await openGrid();
    await waitFor(() => expect(focusedDay()).toBe('2026-10-13'));

    const press = async (key: string, day: string) => {
      fireEvent.keyDown(document.activeElement as Element, { key });
      await waitFor(() => expect(focusedDay()).toBe(day));
    };
    await press('ArrowRight', '2026-10-14');
    await press('ArrowLeft', '2026-10-13');
    await press('ArrowDown', '2026-10-20');
    await press('ArrowUp', '2026-10-13');
    await press('Home', '2026-10-12');
    await press('End', '2026-10-18');
    await press('PageDown', '2026-11-18');
    expect(grid.getAttribute('aria-label')).toBe('Ноябрь 2026 г.');
    await press('PageUp', '2026-10-18');
  });

  test('Enter picks the focused day and closes the grid', async () => {
    const { input, onChange } = setup();
    await openGrid();
    await waitFor(() => expect(focusedDay()).toBe('2026-10-13'));
    fireEvent.keyDown(document.activeElement as Element, { key: 'ArrowRight' });
    await waitFor(() => expect(focusedDay()).toBe('2026-10-14'));
    fireEvent.keyDown(document.activeElement as Element, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith('2026-10-14');
    await waitFor(() => expect(screen.queryByRole('grid')).toBeNull());
    expect(input.value).toBe('ср, 14 окт.');
  });

  test('Escape closes it and focus goes back to the calendar button', async () => {
    setup();
    await openGrid();
    await waitFor(() => expect(focusedDay()).toBe('2026-10-13'));
    fireEvent.keyDown(document.activeElement as Element, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('grid')).toBeNull());
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Choose a date' }));
  });

  test('today is marked, the chosen day is selected', async () => {
    setup({ value: '2026-10-20' });
    const grid = await openGrid();
    expect(grid.querySelector('[data-day="2026-10-13"]')?.getAttribute('aria-current')).toBe('date');
    expect(
      grid.querySelector('[data-day="2026-10-20"]')?.parentElement?.getAttribute('aria-selected'),
    ).toBe('true');
  });

  test('a day after `max` is disabled and cannot be picked', async () => {
    const { onChange } = setup({ max: '2026-10-20' });
    const grid = await openGrid();
    const late = grid.querySelector('[data-day="2026-10-21"]') as HTMLButtonElement;
    expect(late.getAttribute('aria-disabled')).toBe('true');
    expect(grid.querySelector('[data-day="2026-10-20"]')?.getAttribute('aria-disabled')).toBeNull();
    fireEvent.click(late);
    expect(onChange).not.toHaveBeenCalled();
  });

  test('the month arrows are named after the month they go to, unless a label is given', async () => {
    setup({ locale: 'en' });
    await openGrid();
    fireEvent.click(screen.getByRole('button', { name: 'September 2026' }));
    await waitFor(() => expect(screen.getByRole('grid').getAttribute('aria-label')).toBe('September 2026'));
  });

  test('given labels win', async () => {
    setup({ previousMonthLabel: 'Previous month', nextMonthLabel: 'Next month' });
    await openGrid();
    expect(screen.getByRole('button', { name: 'Previous month' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Next month' })).toBeTruthy();
  });
});
