import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { Tour, type TourProps, type TourStep } from './tour';

/**
 * v0.38.0 wave, Tour. Behaviour, not geometry: a headless DOM has no layout, so
 * where the card and the cut-out land is not asserted (see `test-setup.ts`).
 * Every interaction is followed by `settle`, because Floating UI positions the
 * card asynchronously and that update has to land inside `act`.
 */
const STEPS: TourStep[] = [
  { id: 'a', target: '#target-a', title: 'First', body: 'The first thing' },
  { id: 'b', target: '#target-b', title: 'Second' },
  { id: 'c', target: () => document.getElementById('target-c'), title: 'Third' },
];

function Harness(props: Partial<TourProps> & { initiallyOpen?: boolean; targets?: string[] }) {
  const { initiallyOpen = false, targets = ['a', 'b', 'c'], ...tour } = props;
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Start
      </button>
      {targets.map((t) => (
        <div key={t} id={`target-${t}`}>
          {t}
        </div>
      ))}
      <Tour
        steps={STEPS}
        {...tour}
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          tour.onOpenChange?.(o);
        }}
      />
    </>
  );
}

const settle = () => act(async () => {});
const card = () => screen.getByRole('dialog');
const start = async () => {
  const opener = screen.getByText('Start');
  opener.focus();
  fireEvent.click(opener);
  await settle();
  return opener;
};
const click = async (name: string) => {
  fireEvent.click(screen.getByRole('button', { name }));
  await settle();
};
const key = async (k: string) => {
  fireEvent.keyDown(card(), { key: k });
  await settle();
};

let warn: ReturnType<typeof spyOn>;
beforeEach(() => {
  warn = spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => warn.mockRestore());

describe('Tour', () => {
  test('renders nothing while closed', () => {
    render(<Harness />);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.querySelector('[data-tour-spotlight]')).toBeNull();
  });

  test('a non-modal dialog labelled by the step title', async () => {
    render(<Harness />);
    await start();
    expect(card().getAttribute('aria-modal')).toBeNull();
    const title = document.getElementById(card().getAttribute('aria-labelledby') ?? '');
    expect(title?.textContent).toBe('First');
    const described = (card().getAttribute('aria-describedby') ?? '')
      .split(' ')
      .map((id) => document.getElementById(id)?.textContent);
    expect(described).toEqual(['1 of 3', 'The first thing']);
  });

  test('step navigation: Next, Back, the count and Done', async () => {
    const onStepChange = mock();
    render(<Harness onStepChange={onStepChange} />);
    await start();
    expect(card().textContent).toContain('1 of 3');
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
    await click('Next');
    expect(card().textContent).toContain('Second');
    expect(card().textContent).toContain('2 of 3');
    await click('Next');
    expect(card().textContent).toContain('Third');
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Skip' })).toBeNull();
    screen.getByRole('button', { name: 'Done' });
    await click('Back');
    expect(card().textContent).toContain('Second');
    expect(onStepChange.mock.calls.map((c) => c[0])).toEqual(['b', 'c', 'b']);
  });

  test('arrow keys move between steps; the last step does not finish on an arrow', async () => {
    const onFinish = mock();
    render(<Harness onFinish={onFinish} />);
    await start();
    await key('ArrowRight');
    expect(card().textContent).toContain('Second');
    await key('ArrowLeft');
    expect(card().textContent).toContain('First');
    await key('ArrowLeft');
    expect(card().textContent).toContain('First');
    await key('ArrowRight');
    await key('ArrowRight');
    await key('ArrowRight');
    expect(card().textContent).toContain('Third');
    expect(onFinish).not.toHaveBeenCalled();
  });

  test('a controlled step follows the prop', async () => {
    function Controlled() {
      const [step, setStep] = useState('b');
      return (
        <>
          <div id="target-a" />
          <div id="target-b" />
          <div id="target-c" />
          <Tour steps={STEPS} open onOpenChange={() => {}} step={step} onStepChange={setStep} />
        </>
      );
    }
    render(<Controlled />);
    await settle();
    expect(card().textContent).toContain('Second');
    await click('Next');
    expect(card().textContent).toContain('Third');
  });

  test('a missing target is skipped, left out of the count, and warned about', async () => {
    render(<Harness targets={['a', 'c']} />);
    await start();
    expect(card().textContent).toContain('1 of 2');
    await click('Next');
    expect(card().textContent).toContain('Third');
    expect(card().textContent).toContain('2 of 2');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain('"b"');
  });

  test('a missing first target opens on the next step that resolves', async () => {
    render(<Harness targets={['b', 'c']} />);
    await start();
    expect(card().textContent).toContain('Second');
  });

  test('a target gone by the time it is reached is skipped forward', async () => {
    function Vanishing() {
      const [open, setOpen] = useState(true);
      const [hasB, setHasB] = useState(true);
      return (
        <>
          <button type="button" onClick={() => setHasB(false)}>
            Remove
          </button>
          <div id="target-a" />
          {hasB ? <div id="target-b" /> : null}
          <div id="target-c" />
          <Tour steps={STEPS} open={open} onOpenChange={setOpen} />
        </>
      );
    }
    render(<Vanishing />);
    await settle();
    fireEvent.click(screen.getByText('Remove'));
    await settle();
    await click('Next');
    expect(card().textContent).toContain('Third');
  });

  test('no target at all closes the tour', async () => {
    const onOpenChange = mock();
    render(<Harness targets={[]} onOpenChange={onOpenChange} />);
    await start();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  test('focus moves to the card on each step and returns to the opener on close', async () => {
    render(<Harness />);
    const opener = await start();
    expect(document.activeElement).toBe(card());
    const next = screen.getByRole('button', { name: 'Next' });
    next.focus();
    fireEvent.click(next);
    await settle();
    expect(document.activeElement).toBe(card());
    await click('Skip');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  test('Escape closes without finishing', async () => {
    const onOpenChange = mock();
    const onFinish = mock();
    render(<Harness onOpenChange={onOpenChange} onFinish={onFinish} />);
    const opener = await start();
    await key('Escape');
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onFinish).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(opener);
  });

  test('a click outside does not close it', async () => {
    const onOpenChange = mock();
    render(<Harness onOpenChange={onOpenChange} spotlight={false} />);
    await start();
    fireEvent.pointerDown(document.getElementById('target-a') as HTMLElement);
    await settle();
    expect(onOpenChange).not.toHaveBeenCalled();
    screen.getByRole('dialog');
  });

  test('onFinish fires once', async () => {
    const onFinish = mock();
    render(<Harness onFinish={onFinish} />);
    await start();
    await click('Next');
    await click('Next');
    const done = screen.getByRole('button', { name: 'Done' });
    fireEvent.click(done);
    fireEvent.click(done);
    await settle();
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  test('an uncontrolled tour starts from the first step each time it opens', async () => {
    render(<Harness />);
    await start();
    await click('Next');
    await click('Skip');
    await start();
    expect(card().textContent).toContain('First');
  });

  test('the target is scrolled to the centre', async () => {
    const scroll = mock();
    render(<Harness />);
    (document.getElementById('target-b') as HTMLElement).scrollIntoView = scroll;
    await start();
    await click('Next');
    expect(scroll).toHaveBeenCalledTimes(1);
    expect(scroll.mock.calls[0][0]).toMatchObject({ block: 'center' });
  });

  test('the spotlight is drawn by default, and not when turned off', async () => {
    const { unmount } = render(<Harness initiallyOpen />);
    await settle();
    const layer = document.querySelector('[data-tour-spotlight]');
    expect(layer?.getAttribute('aria-hidden')).toBe('true');
    unmount();
    render(<Harness initiallyOpen spotlight={false} />);
    await settle();
    screen.getByRole('dialog');
    expect(document.querySelector('[data-tour-spotlight]')).toBeNull();
  });

  test('every visible string can be replaced', async () => {
    render(
      <Harness
        labels={{
          next: 'Weiter',
          skip: 'Überspringen',
          back: 'Zurück',
          done: 'Fertig',
          progress: (c, t) => `${c}/${t}`,
        }}
      />,
    );
    await start();
    expect(card().textContent).toContain('1/3');
    await click('Weiter');
    screen.getByRole('button', { name: 'Zurück' });
    screen.getByRole('button', { name: 'Überspringen' });
    await click('Weiter');
    screen.getByRole('button', { name: 'Fertig' });
  });
});
