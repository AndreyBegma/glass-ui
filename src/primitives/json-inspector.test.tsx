import { describe, expect, test } from 'bun:test';
import { render } from '@testing-library/react';
import { JsonInspector } from './json-inspector';

describe('JsonInspector', () => {
  test('renders', () => {
    const { container } = render(
      <JsonInspector value={{ a: 1 }} rootLabel="root" />,
    );
    expect(container.textContent).toContain('root');
  });

  test.todo('expands to the default depth');
  test.todo('a circular input does not loop');
  test.todo('path strings follow the dollar-path form');
  test.todo('keyboard expand and collapse');
  test.todo('long strings truncate with a show-more control');
  test.todo('copy path copies the row path');
});
