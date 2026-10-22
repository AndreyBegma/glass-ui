import { describe, expect, test } from 'bun:test';
import { render } from '@testing-library/react';
import { Tour } from './tour';

describe('Tour', () => {
  test('renders without throwing', () => {
    const { container } = render(
      <Tour
        steps={[{ id: 'a', target: '#nowhere', title: 'Hello' }]}
        open={false}
        onOpenChange={() => {}}
      />,
    );
    expect(container).toBeTruthy();
  });

  test.todo('step navigation');
  test.todo('a missing target is skipped');
  test.todo('focus moves and returns');
  test.todo('Escape closes');
  test.todo('onFinish fires once');
});
