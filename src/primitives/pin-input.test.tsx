import { describe, expect, test } from 'bun:test';
import { render } from '@testing-library/react';
import { PinInput } from './pin-input';

describe('PinInput', () => {
  test('renders a named group', () => {
    const { container } = render(
      <PinInput value="" onValueChange={() => {}} label="Code" />,
    );
    expect(
      container.querySelector('fieldset')?.getAttribute('aria-label'),
    ).toBe('Code');
  });

  test.todo('typing and backspace');
  test.todo('paste of a full and of a partial code');
  test.todo('invalid characters are rejected');
  test.todo('onComplete fires once');
});
