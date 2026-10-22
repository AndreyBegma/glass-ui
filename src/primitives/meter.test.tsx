import { describe, expect, test } from 'bun:test';
import { render } from '@testing-library/react';
import { Meter } from './meter';

describe('Meter', () => {
  test('renders a meter with its value', () => {
    const { container } = render(<Meter value={40} label="Disk" />);
    expect(container.querySelector('meter')?.getAttribute('value')).toBe('40');
  });

  test.todo('tone thresholds, including optimum on each side');
  test.todo('aria attributes');
  test.todo('out-of-range values are clamped');
});
