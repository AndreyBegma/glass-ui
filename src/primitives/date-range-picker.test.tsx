import { describe, expect, test } from 'bun:test';
import { render } from '@testing-library/react';
import { DateRangePicker } from './date-range-picker';

describe('DateRangePicker', () => {
  test('renders', () => {
    const { container } = render(
      <DateRangePicker
        value={null}
        onValueChange={() => {}}
        placeholder="Pick a range"
      />,
    );
    expect(container.textContent).toContain('Pick a range');
  });

  test.todo('selecting across a month boundary');
  test.todo('reversed clicks');
  test.todo('min and max disable days');
  test.todo('presets');
  test.todo('controlled value');
  test.todo('keyboard selection');
});
