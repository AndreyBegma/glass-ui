import { describe, expect, test } from 'bun:test';
import { render } from '@testing-library/react';
import { DiffView } from './diff-view';

describe('DiffView', () => {
  test('renders', () => {
    const { container } = render(
      <DiffView oldText="a" newText="b" fileName="a.txt" />,
    );
    expect(container.textContent).toContain('a.txt');
  });

  test.todo('identical input renders the empty state "No changes"');
  test.todo('one insertion and one deletion are counted');
  test.todo('split mode aligns filler rows');
  test.todo('a collapsed unchanged run expands in place');
  test.todo(
    'patch input renders the same rows as the equivalent oldText and newText',
  );
  test.todo('mode is controllable');
});
