import { describe, expect, test } from 'bun:test';
import { render } from '@testing-library/react';
import { ActivityHeatmap } from './activity-heatmap';

describe('ActivityHeatmap', () => {
  test('renders', () => {
    const { container } = render(
      <ActivityHeatmap data={[]} className="probe" />,
    );
    expect(container.querySelector('.probe')).not.toBeNull();
  });

  test.todo('level bucketing');
  test.todo('week alignment for both weekStartsOn values');
  test.todo('accessible names');
  test.todo('keyboard roving');
  test.todo('empty data');
});
