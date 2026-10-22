import { describe, expect, test } from 'bun:test';
import { render } from '@testing-library/react';
import { TagInput } from './tag-input';

describe('TagInput', () => {
  test('renders', () => {
    const { container } = render(
      <TagInput value={['a', 'b']} onValueChange={() => {}} />,
    );
    expect(container.textContent).toContain('a b');
  });

  test.todo('commit, paste and backspace flows');
  test.todo('validate');
  test.todo('max');
  test.todo('duplicates');
  test.todo('suggestions keyboard');
});
