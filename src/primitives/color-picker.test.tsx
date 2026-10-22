import { describe, expect, test } from 'bun:test';
import { render } from '@testing-library/react';
import { ColorPicker } from './color-picker';

describe('ColorPicker', () => {
  test('renders', () => {
    const { container } = render(
      <ColorPicker value="oklch(0.6 0.1 250)" onValueChange={() => {}} />,
    );
    expect(container.textContent).toContain('oklch');
  });

  test.todo('conversion round-trips');
  test.todo('keyboard on the area');
  test.todo('text input validation');
  test.todo('alpha');
  test.todo('swatches');
});
