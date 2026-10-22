import { describe, expect, test } from 'bun:test';
import { render } from '@testing-library/react';
import { Stepper, Wizard } from './stepper';

const STEPS = [
  { id: 'a', label: 'First' },
  { id: 'b', label: 'Second' },
];

describe('Stepper', () => {
  test('renders', () => {
    const { container } = render(<Stepper steps={STEPS} current="a" />);
    expect(container.querySelectorAll('li').length).toBe(2);
  });

  test.todo('status rendering');
  test.todo('navigability rules');
  test.todo('focus moves on change');
});

describe('Wizard', () => {
  test('renders', () => {
    const { container } = render(
      <Wizard
        steps={STEPS}
        current="a"
        onStepChange={() => {}}
        onFinish={() => {}}
      >
        panel
      </Wizard>,
    );
    expect(container.textContent).toContain('panel');
  });

  test.todo('back, next and finish');
});
