import { describe, expect, test } from 'bun:test';
import { fireEvent, render } from '@testing-library/react';
import { useState } from 'react';
import { Stepper, Wizard } from './stepper';

const STEPS = [
  { id: 'a', label: 'First' },
  { id: 'b', label: 'Second', optional: true },
  { id: 'c', label: 'Third', status: 'error' as const },
  { id: 'd', label: 'Fourth', description: 'Last one' },
];

const item = (c: HTMLElement, id: string) =>
  c.querySelector(`li[data-step="${id}"]`) as HTMLElement;

describe('Stepper', () => {
  test('renders an ordered list with the current step marked', () => {
    const { container } = render(<Stepper steps={STEPS} current="b" />);
    expect(container.querySelector('ol')).not.toBeNull();
    expect(container.querySelectorAll('li').length).toBe(4);
    const marked = container.querySelectorAll('[aria-current="step"]');
    expect(marked.length).toBe(1);
    expect(marked[0]).toBe(item(container, 'b'));
  });

  test('status rendering: completed, error text, optional, description', () => {
    const { container } = render(<Stepper steps={STEPS} current="b" />);
    expect(item(container, 'a').dataset.phase).toBe('completed');
    expect(item(container, 'a').textContent).toContain('Completed');
    expect(item(container, 'a').querySelector('svg')).not.toBeNull();
    expect(item(container, 'b').dataset.phase).toBe('current');
    expect(item(container, 'b').textContent).toContain('Optional');
    expect(item(container, 'c').dataset.phase).toBe('error');
    expect(item(container, 'c').textContent).toContain('Error');
    expect(item(container, 'c').querySelector('svg')).not.toBeNull();
    expect(item(container, 'd').dataset.phase).toBe('upcoming');
    expect(item(container, 'd').textContent).toContain('Last one');
  });

  test('completed prop is authoritative over position', () => {
    const { container } = render(
      <Stepper steps={STEPS} current="b" completed={new Set(['d'])} />,
    );
    expect(item(container, 'a').dataset.phase).toBe('upcoming');
    expect(item(container, 'd').dataset.phase).toBe('completed');
  });

  test('connectors are filled up to the current step', () => {
    const { container } = render(<Stepper steps={STEPS} current="c" />);
    const filled = [...container.querySelectorAll('[data-connector]')].map(
      (c) => c.getAttribute('data-filled'),
    );
    expect(filled).toEqual(['true', 'true', 'false']);
  });

  test('navigable none: nothing is a button', () => {
    const { container } = render(
      <Stepper steps={STEPS} current="c" onStepChange={() => {}} />,
    );
    expect(container.querySelectorAll('button').length).toBe(0);
  });

  test('navigable completed: only finished steps are buttons', () => {
    const seen: string[] = [];
    const { container } = render(
      <Stepper
        steps={STEPS}
        current="c"
        navigable="completed"
        onStepChange={(id) => seen.push(id)}
      />,
    );
    expect(container.querySelectorAll('button').length).toBe(2);
    expect(item(container, 'd').querySelector('button')).toBeNull();
    fireEvent.click(item(container, 'a').querySelector('button') as Element);
    expect(seen).toEqual(['a']);
  });

  test('navigable all: every step but the current one is a button', () => {
    const { container } = render(
      <Stepper
        steps={STEPS}
        current="c"
        navigable="all"
        onStepChange={() => {}}
      />,
    );
    expect(container.querySelectorAll('button').length).toBe(3);
    expect(item(container, 'c').querySelector('button')).toBeNull();
  });

  test('horizontal carries the compact summary, vertical does not', () => {
    const h = render(<Stepper steps={STEPS} current="b" />);
    expect(
      h.container.querySelector('[data-stepper-summary]')?.textContent,
    ).toBe('Step 2 of 4 · Second');
    const v = render(
      <Stepper steps={STEPS} current="b" orientation="vertical" />,
    );
    expect(v.container.querySelector('[data-stepper-summary]')).toBeNull();
  });

  test('labels override the copy', () => {
    const { container } = render(
      <Stepper
        steps={STEPS}
        current="b"
        labels={{
          steps: 'Etapes',
          error: 'Erreur',
          stepOf: (i, n, l) => `Etape ${i}/${n} ${l}`,
        }}
      />,
    );
    expect(container.querySelector('ol')?.getAttribute('aria-label')).toBe(
      'Etapes',
    );
    expect(item(container, 'c').textContent).toContain('Erreur');
    expect(container.querySelector('[data-stepper-summary]')?.textContent).toBe(
      'Etape 2/4 Second',
    );
  });
});

function Harness({
  canAdvance,
  onFinish = () => {},
  start = 'a',
}: {
  canAdvance?: boolean;
  onFinish?: () => void;
  start?: string;
}) {
  const [current, setCurrent] = useState(start);
  const steps = STEPS.map(({ status: _s, ...rest }) => rest);
  return (
    <Wizard
      steps={steps}
      current={current}
      onStepChange={setCurrent}
      onFinish={onFinish}
      canAdvance={canAdvance}
    >
      <p>panel {current}</p>
    </Wizard>
  );
}

const btn = (c: HTMLElement, name: string) =>
  [...c.querySelectorAll('button')].find(
    (b) => b.textContent === name,
  ) as HTMLButtonElement;

describe('Wizard', () => {
  test('renders the panel under a heading of the current step', () => {
    const { container } = render(<Harness />);
    expect(container.textContent).toContain('panel a');
    expect(container.querySelector('h2')?.textContent).toBe('First');
  });

  test('back and next move through the steps', () => {
    const { container } = render(<Harness />);
    expect(btn(container, 'Back').disabled).toBe(true);
    fireEvent.click(btn(container, 'Next'));
    expect(container.textContent).toContain('panel b');
    expect(btn(container, 'Back').disabled).toBe(false);
    fireEvent.click(btn(container, 'Back'));
    expect(container.textContent).toContain('panel a');
  });

  test('next is disabled while canAdvance is false', () => {
    const { container } = render(<Harness canAdvance={false} />);
    expect(btn(container, 'Next').disabled).toBe(true);
    fireEvent.click(btn(container, 'Next'));
    expect(container.textContent).toContain('panel a');
  });

  test('finish replaces next on the last step and calls onFinish', () => {
    let done = 0;
    const { container } = render(<Harness start="d" onFinish={() => done++} />);
    expect(btn(container, 'Next')).toBeUndefined();
    fireEvent.click(btn(container, 'Finish'));
    expect(done).toBe(1);
  });

  test('finish is gated by canAdvance too', () => {
    const { container } = render(<Harness start="d" canAdvance={false} />);
    expect(btn(container, 'Finish').disabled).toBe(true);
  });

  test('focus moves to the panel heading on change, not on mount', () => {
    const { container } = render(<Harness />);
    expect(document.activeElement).toBe(document.body);
    fireEvent.click(btn(container, 'Next'));
    const h = container.querySelector('h2');
    expect(h?.textContent).toBe('Second');
    expect(document.activeElement).toBe(h as Element);
  });

  test('labels override the footer', () => {
    const { container } = render(
      <Wizard
        steps={STEPS}
        current="a"
        onStepChange={() => {}}
        onFinish={() => {}}
        labels={{ next: 'Suivant', back: 'Retour' }}
      >
        x
      </Wizard>,
    );
    expect(btn(container, 'Suivant')).toBeDefined();
    expect(btn(container, 'Retour')).toBeDefined();
  });
});
