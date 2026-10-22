import { describe, expect, test } from 'bun:test';
import { render } from '@testing-library/react';
import { Rating } from './rating';

describe('Rating', () => {
  test('renders a named group', () => {
    const { container } = render(<Rating label="Quality" />);
    expect(
      container.querySelector('fieldset')?.getAttribute('aria-label'),
    ).toBe('Quality');
  });

  test.todo('keyboard');
  test.todo('hover preview does not commit');
  test.todo('half values');
  test.todo('read-only name');
});
