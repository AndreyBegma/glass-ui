import { describe, expect, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { Radio, RadioGroup } from './radio-group';

describe('RadioGroup / Radio', () => {
  test('is role="radiogroup" wrapping real radios sharing one name; selecting one clears the other', () => {
    render(
      <RadioGroup label="Frequency">
        <Radio name="frequency" value="daily" label="Daily" defaultChecked />
        <Radio name="frequency" value="weekly" label="Weekly" />
      </RadioGroup>,
    );

    screen.getByRole('radiogroup', { name: 'Frequency' });
    const daily = screen.getByRole('radio', { name: 'Daily' }) as HTMLInputElement;
    const weekly = screen.getByRole('radio', { name: 'Weekly' }) as HTMLInputElement;

    expect(daily.checked).toBe(true);
    expect(daily.name).toBe(weekly.name);

    fireEvent.click(weekly);
    expect(weekly.checked).toBe(true);
    expect(daily.checked).toBe(false);
  });
});
