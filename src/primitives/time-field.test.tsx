import { describe, expect, mock, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { TimeField, type TimeFieldProps } from './time-field';
import { resolveHourCycle } from './time-text';

/**
 * FEAT-20261013-006 (W242) — acceptance 2. The hour cycles are asserted
 * against the runtime's `Intl`, so a change in its data shows here first.
 */
function setup(props: Partial<TimeFieldProps> = {}) {
  const onChange = mock((_value: string) => {});
  function Controlled() {
    const [value, setValue] = useState(props.value ?? '');
    return (
      <TimeField
        aria-label="Start"
        locale="ru"
        {...props}
        value={value}
        onValueChange={(next) => {
          onChange(next);
          setValue(next);
        }}
      />
    );
  }
  render(<Controlled />);
  return { onChange, input: screen.getByRole('textbox', { name: 'Start' }) as HTMLInputElement };
}

function type(input: HTMLInputElement, text: string) {
  fireEvent.change(input, { target: { value: text } });
  fireEvent.keyDown(input, { key: 'Enter' });
}

describe('TimeField', () => {
  test('ru and uk are 24-hour, en is 12-hour', () => {
    expect(resolveHourCycle('ru')).toBe('h23');
    expect(resolveHourCycle('uk')).toBe('h23');
    expect(resolveHourCycle('en')).toBe('h12');
  });

  test('shows the value on the locale clock', () => {
    const { input } = setup({ value: '14:30' });
    expect(input.value).toBe('14:30');
  });

  test('en shows the twelve-hour clock', () => {
    const { input } = setup({ value: '14:30', locale: 'en' });
    expect(input.value).toMatch(/^2:30\sPM$/);
  });

  test('`930` is 09:30', () => {
    const { input, onChange } = setup();
    type(input, '930');
    expect(onChange).toHaveBeenCalledWith('09:30');
    expect(input.value).toBe('09:30');
  });

  test('`14.30` is 14:30', () => {
    const { input, onChange } = setup();
    type(input, '14.30');
    expect(onChange).toHaveBeenCalledWith('14:30');
  });

  test('`2:30 pm` under h12 is 14:30', () => {
    const { input, onChange } = setup({ locale: 'en' });
    type(input, '2:30 pm');
    expect(onChange).toHaveBeenCalledWith('14:30');
  });

  test('`25:00` keeps the text, marks it, and calls nothing', () => {
    const { input, onChange } = setup();
    type(input, '25:00');
    expect(onChange).not.toHaveBeenCalled();
    expect(input.value).toBe('25:00');
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });

  test('ArrowUp from 23:50 with step 15 wraps to 00:05', () => {
    const { input, onChange } = setup({ value: '23:50' });
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(onChange).toHaveBeenCalledWith('00:05');
  });

  test('ArrowDown moves back by `step`', () => {
    const { input, onChange } = setup({ value: '00:05', step: 10 });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(onChange).toHaveBeenCalledWith('23:55');
  });

  test('blur commits, and clearing clears', () => {
    const { input, onChange } = setup({ value: '10:00' });
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith('');
  });

  test('an explicit `hourCycle` wins over the locale', () => {
    const { input } = setup({ value: '14:30', locale: 'en', hourCycle: 'h23' });
    expect(input.value).toBe('14:30');
  });
});
