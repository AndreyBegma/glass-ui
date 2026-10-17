import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { FloatingWindow, type FloatingWindowProps } from './floating-window';

const labels = {
  move: 'Move the window',
  minimize: 'Minimize',
  restore: 'Restore',
  maximize: 'Maximize',
  unmaximize: 'Restore size',
  close: 'Close',
};

/** Answers every `min-width` query with `desktop`; Motion's reduced-motion query with no. */
function mockMatchMedia(desktop: boolean) {
  const original = window.matchMedia;
  window.matchMedia = ((query: string) => ({
    matches: query.includes('min-width') ? desktop : false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
  return () => {
    window.matchMedia = original;
  };
}

function setViewport(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    value: height,
  });
}

function Harness(props: Partial<FloatingWindowProps>) {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      <FloatingWindow
        open={open}
        onOpenChange={setOpen}
        title="Assistant"
        labels={labels}
        minWidth={300}
        minHeight={200}
        maxWidth={800}
        maxHeight={600}
        defaultWidth={400}
        defaultHeight={300}
        defaultPosition={{ x: 100, y: 100 }}
        {...props}
      >
        <p>Chat goes here</p>
        {props.children}
      </FloatingWindow>
    </>
  );
}

const win = () => screen.getByRole('dialog', { name: 'Assistant' });
const rectOf = () => {
  const s = win().style;
  return {
    x: Number.parseFloat(s.left),
    y: Number.parseFloat(s.top),
    width: Number.parseFloat(s.width),
    height: Number.parseFloat(s.height),
  };
};
const bar = () => win().querySelector('header') as HTMLElement;
const handle = (edge: string) =>
  win().querySelector(`[data-resize="${edge}"]`) as HTMLElement;

const drag = (
  el: HTMLElement,
  from: [number, number],
  to: [number, number],
) => {
  fireEvent.pointerDown(el, {
    button: 0,
    clientX: from[0],
    clientY: from[1],
    pointerId: 1,
  });
  fireEvent.pointerMove(el, { clientX: to[0], clientY: to[1], pointerId: 1 });
  fireEvent.pointerUp(el, { clientX: to[0], clientY: to[1], pointerId: 1 });
};

describe('FloatingWindow on a desktop', () => {
  let restore: () => void;
  beforeEach(() => {
    localStorage.clear();
    setViewport(1200, 900);
    restore = mockMatchMedia(true);
  });
  afterEach(() => {
    cleanup();
    restore();
    setViewport(390, 844);
  });

  test('is a labelled dialog with named controls, and takes focus', () => {
    render(<Harness />);
    expect(win().getAttribute('aria-modal')).toBeNull();
    for (const name of ['Move the window', 'Minimize', 'Maximize', 'Close']) {
      expect(screen.getByRole('button', { name })).toBeTruthy();
    }
    expect(document.activeElement).toBe(win());
    expect(rectOf()).toEqual({ x: 100, y: 100, width: 400, height: 300 });
  });

  test('without a position it opens 24 px in from the top-right corner', () => {
    render(<Harness defaultPosition={undefined} />);
    expect(rectOf()).toMatchObject({ x: 1200 - 24 - 400, y: 24 });
  });

  test('drags by its title bar, and stays inside the viewport', () => {
    render(<Harness />);
    drag(bar(), [200, 110], [250, 140]);
    expect(rectOf()).toMatchObject({ x: 150, y: 130 });

    drag(bar(), [250, 140], [5000, 5000]);
    expect(rectOf()).toMatchObject({ x: 1200 - 8 - 400, y: 900 - 8 - 300 });
  });

  test('a press on a bar button does not start a drag', () => {
    render(<Harness />);
    drag(screen.getByRole('button', { name: 'Close' }), [200, 110], [400, 300]);
    expect(rectOf()).toMatchObject({ x: 100, y: 100 });
  });

  test('resizes from every edge and corner, within the min and max sizes', () => {
    render(<Harness />);
    drag(handle('se'), [0, 0], [100, 50]);
    expect(rectOf()).toEqual({ x: 100, y: 100, width: 500, height: 350 });

    drag(handle('nw'), [0, 0], [-40, -40]);
    expect(rectOf()).toEqual({ x: 60, y: 60, width: 540, height: 390 });

    drag(handle('e'), [0, 0], [10_000, 0]);
    expect(rectOf().width).toBe(800);
    drag(handle('s'), [0, 0], [0, -10_000]);
    expect(rectOf().height).toBe(200);
    drag(handle('w'), [0, 0], [10_000, 0]);
    expect(rectOf().width).toBe(300);
    drag(handle('n'), [0, 0], [0, -10_000]);
    expect(rectOf()).toMatchObject({ y: 8 });

    for (const edge of ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']) {
      expect(handle(edge).getAttribute('aria-hidden')).toBe('true');
    }
    drag(handle('ne'), [0, 0], [-10_000, 10_000]);
    expect(rectOf()).toMatchObject({ width: 300, height: 200 });
    drag(handle('sw'), [0, 0], [-10, 10]);
    expect(rectOf()).toMatchObject({ width: 310, height: 210 });
  });

  test('re-clamps when the browser window shrinks, and returns when it grows', () => {
    render(<Harness defaultPosition={{ x: 700, y: 500 }} />);
    act(() => {
      setViewport(900, 600);
      window.dispatchEvent(new Event('resize'));
    });
    expect(rectOf()).toEqual({
      x: 900 - 8 - 400,
      y: 600 - 8 - 300,
      width: 400,
      height: 300,
    });

    act(() => {
      setViewport(350, 250);
      window.dispatchEvent(new Event('resize'));
    });
    expect(rectOf()).toEqual({ x: 8, y: 8, width: 334, height: 234 });

    act(() => {
      setViewport(1200, 900);
      window.dispatchEvent(new Event('resize'));
    });
    expect(rectOf()).toEqual({ x: 700, y: 500, width: 400, height: 300 });
  });

  test('Escape minimizes to the bar and keeps the content mounted; restore brings it back', () => {
    render(<Harness />);
    fireEvent.keyDown(win(), { key: 'Escape' });
    expect(win().dataset.minimized).toBe('true');
    expect(rectOf().height).toBe(40);
    expect(screen.getByText('Chat goes here').closest('[hidden]')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Minimize' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Restore' }));
    expect(win().dataset.minimized).toBeUndefined();
    expect(rectOf().height).toBe(300);
  });

  test("Escape in something portalled out of the window is not the window's", () => {
    function Portalled() {
      return createPortal(<input aria-label="Menu search" />, document.body);
    }
    render(
      <Harness>
        <Portalled />
      </Harness>,
    );
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Menu search' }), {
      key: 'Escape',
    });
    expect(win().dataset.minimized).toBeUndefined();
  });

  test('maximize fills the viewport and restores the previous rectangle', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Maximize' }));
    expect(rectOf()).toEqual({ x: 8, y: 8, width: 1184, height: 884 });
    expect(handle('se')).toBeNull();

    drag(bar(), [200, 20], [400, 300]);
    expect(rectOf()).toMatchObject({ x: 8, y: 8 });

    fireEvent.click(screen.getByRole('button', { name: 'Restore size' }));
    expect(rectOf()).toEqual({ x: 100, y: 100, width: 400, height: 300 });
  });

  test('the grip moves with arrows and resizes with Shift+arrows', () => {
    render(<Harness />);
    const grip = screen.getByRole('button', { name: 'Move the window' });
    fireEvent.keyDown(grip, { key: 'ArrowRight' });
    fireEvent.keyDown(grip, { key: 'ArrowDown' });
    expect(rectOf()).toMatchObject({ x: 116, y: 116 });
    fireEvent.keyDown(grip, { key: 'ArrowRight', shiftKey: true });
    fireEvent.keyDown(grip, { key: 'ArrowUp', shiftKey: true });
    expect(rectOf()).toMatchObject({ width: 416, height: 284 });
  });

  test('close calls onOpenChange(false)', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  test('with a storage key, position, size and minimized state survive a remount', () => {
    const { unmount } = render(<Harness storageKey="test-window" />);
    drag(bar(), [200, 110], [260, 150]);
    drag(handle('se'), [0, 0], [40, 20]);
    fireEvent.keyDown(win(), { key: 'Escape' });
    unmount();

    expect(JSON.parse(localStorage.getItem('test-window') ?? '{}')).toEqual({
      x: 160,
      y: 140,
      width: 440,
      height: 320,
      minimized: true,
      maximized: false,
    });

    render(<Harness storageKey="test-window" />);
    expect(win().dataset.minimized).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Restore' }));
    expect(rectOf()).toEqual({ x: 160, y: 140, width: 440, height: 320 });
  });

  test('without a storage key nothing is written', () => {
    render(<Harness />);
    drag(bar(), [200, 110], [260, 150]);
    expect(localStorage.length).toBe(0);
  });

  test('a stored record that is not one is ignored', () => {
    localStorage.setItem(
      'test-window',
      '{"x":"left","width":null,"minimized":"yes"}',
    );
    render(<Harness storageKey="test-window" />);
    expect(rectOf()).toEqual({ x: 100, y: 100, width: 400, height: 300 });
    expect(win().dataset.minimized).toBeUndefined();
  });
});

describe('FloatingWindow below md', () => {
  let restore: () => void;
  beforeEach(() => {
    localStorage.clear();
    restore = mockMatchMedia(false);
  });
  afterEach(() => {
    cleanup();
    restore();
  });

  test('renders its content in a Sheet, with no window controls', () => {
    render(<Harness />);
    const sheet = screen.getByRole('dialog', { name: 'Assistant' });
    expect(sheet.textContent).toContain('Chat goes here');
    expect(sheet.querySelector('[data-resize]')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Minimize' })).toBeNull();
  });
});
