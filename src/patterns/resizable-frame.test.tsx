import { describe, expect, test } from 'bun:test';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { renderToString } from 'react-dom/server';
import { ResizableFrame, type ResizableFrameProps } from './resizable-frame';

type Calls = { change: number[]; commit: number[] };

/** The consumer: controlled, as AgentDock's preview is. */
function Frame({
  calls,
  initial = 1000,
  ...props
}: Partial<ResizableFrameProps> & { calls: Calls; initial?: number }) {
  const [width, setWidth] = useState(initial);
  return (
    <ResizableFrame
      width={width}
      onWidthChange={(next) => {
        calls.change.push(next);
        setWidth(next);
      }}
      onWidthCommit={(next) => calls.commit.push(next)}
      min={320}
      max={1920}
      labels={{ resize: 'Resize the frame' }}
      {...props}
    >
      <iframe title="mockup" src="about:blank" />
    </ResizableFrame>
  );
}

const fresh = (): Calls => ({ change: [], commit: [] });
const handles = () => screen.getAllByRole('separator');
const right = () => handles()[1] as HTMLElement;
const left = () => handles()[0] as HTMLElement;
const now = () => Number(right().getAttribute('aria-valuenow'));
const content = () => screen.getByTitle('mockup').parentElement as HTMLElement;
const box = (container: HTMLElement) => container.firstElementChild as HTMLElement;
const frame = (container: HTMLElement) => box(container).firstElementChild as HTMLElement;
const nextFrame = () =>
  act(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));

/** happy-dom has no layout; give the box the room a wide screen would. */
function room(container: HTMLElement, px: number) {
  Object.defineProperty(box(container), 'clientWidth', { configurable: true, value: px });
}

describe('ResizableFrame', () => {
  test('both handles are WAI-ARIA window splitters', () => {
    render(<Frame calls={fresh()} />);
    expect(handles()).toHaveLength(2);
    for (const handle of handles()) {
      expect(handle.getAttribute('aria-orientation')).toBe('vertical');
      expect(handle.getAttribute('aria-valuenow')).toBe('1000');
      expect(handle.getAttribute('aria-valuemin')).toBe('320');
      expect(handle.getAttribute('aria-valuemax')).toBe('1920');
      expect(handle.getAttribute('aria-valuetext')).toBe('1000 pixels');
      expect(handle.getAttribute('aria-label')).toBe('Resize the frame');
      expect(handle.tabIndex).toBe(0);
    }
  });

  test('the frame is the controlled width, and only that', () => {
    const { container, rerender } = render(
      <ResizableFrame width={390} onWidthChange={() => {}} min={320} max={1920} labels={{ resize: 'Resize' }}>
        <p>child</p>
      </ResizableFrame>,
    );
    expect(frame(container).style.width).toBe('390px');
    rerender(
      <ResizableFrame width={1440} onWidthChange={() => {}} min={320} max={1920} labels={{ resize: 'Resize' }}>
        <p>child</p>
      </ResizableFrame>,
    );
    expect(frame(container).style.width).toBe('1440px');
    expect(right().getAttribute('aria-valuetext')).toBe('1440 pixels');
  });

  test('arrows step 16 px, Shift steps 1 px, Page Up / Page Down step 160 px', () => {
    const calls = fresh();
    render(<Frame calls={calls} />);
    fireEvent.keyDown(right(), { key: 'ArrowRight' });
    expect(now()).toBe(1016);
    fireEvent.keyDown(right(), { key: 'ArrowLeft' });
    fireEvent.keyDown(right(), { key: 'ArrowLeft' });
    expect(now()).toBe(984);
    fireEvent.keyDown(right(), { key: 'ArrowRight', shiftKey: true });
    expect(now()).toBe(985);
    fireEvent.keyDown(right(), { key: 'ArrowLeft', shiftKey: true });
    expect(now()).toBe(984);
    fireEvent.keyDown(right(), { key: 'PageUp' });
    expect(now()).toBe(1144);
    fireEvent.keyDown(right(), { key: 'PageDown' });
    expect(now()).toBe(984);
    expect(calls.change).toEqual([1016, 1000, 984, 985, 984, 1144, 984]);
  });

  test('the left handle mirrors: ArrowLeft moves the left edge out and widens', () => {
    render(<Frame calls={fresh()} />);
    fireEvent.keyDown(left(), { key: 'ArrowLeft' });
    expect(now()).toBe(1016);
    fireEvent.keyDown(left(), { key: 'ArrowRight' });
    fireEvent.keyDown(left(), { key: 'ArrowRight' });
    expect(now()).toBe(984);
  });

  test('Home / End go to min / max', () => {
    render(<Frame calls={fresh()} />);
    fireEvent.keyDown(right(), { key: 'End' });
    expect(now()).toBe(1920);
    fireEvent.keyDown(left(), { key: 'Home' });
    expect(now()).toBe(320);
  });

  test('key steps clamp to min / max, and a step that changes nothing sends nothing', () => {
    const calls = fresh();
    render(<Frame calls={calls} initial={1900} />);
    fireEvent.keyDown(right(), { key: 'PageUp' });
    expect(now()).toBe(1920);
    fireEvent.keyDown(right(), { key: 'ArrowRight' });
    expect(now()).toBe(1920);
    expect(calls.change).toEqual([1920]);
    fireEvent.keyDown(right(), { key: 'Home' });
    fireEvent.keyDown(right(), { key: 'PageDown' });
    expect(now()).toBe(320);
  });

  test('keys that are not the splitter’s are left alone', () => {
    const calls = fresh();
    render(<Frame calls={calls} />);
    const event = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true });
    right().dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(calls.change).toEqual([]);
  });

  test('a run of key presses commits once, on key-up', () => {
    const calls = fresh();
    render(<Frame calls={calls} />);
    // A held arrow: auto-repeat keydowns, one keyup.
    fireEvent.keyDown(right(), { key: 'ArrowRight' });
    fireEvent.keyDown(right(), { key: 'ArrowRight' });
    fireEvent.keyDown(right(), { key: 'ArrowRight' });
    expect(calls.commit).toEqual([]);
    fireEvent.keyUp(right(), { key: 'ArrowRight' });
    expect(calls.commit).toEqual([1048]);
    // A key-up with no step before it commits nothing.
    fireEvent.keyUp(right(), { key: 'Tab' });
    expect(calls.commit).toEqual([1048]);
  });

  test('a run of key presses whose key-up never arrives commits on blur', () => {
    const calls = fresh();
    render(<Frame calls={calls} />);
    fireEvent.keyDown(right(), { key: 'End' });
    fireEvent.blur(right());
    expect(calls.commit).toEqual([1920]);
    fireEvent.blur(right());
    expect(calls.commit).toEqual([1920]);
  });

  test('a drag on the right handle of a centred frame moves both edges: 2 × dx', async () => {
    const calls = fresh();
    const { container } = render(<Frame calls={calls} />);
    room(container, 1600);
    fireEvent.pointerDown(right(), { button: 0, clientX: 1300, pointerId: 1 });
    fireEvent.pointerMove(right(), { clientX: 1350, pointerId: 1 });
    await nextFrame();
    expect(now()).toBe(1100);
    fireEvent.pointerUp(right(), { clientX: 1350, pointerId: 1 });
    expect(calls.commit).toEqual([1100]);
  });

  test('a drag on the left handle mirrors', async () => {
    const calls = fresh();
    const { container } = render(<Frame calls={calls} />);
    room(container, 1600);
    fireEvent.pointerDown(left(), { button: 0, clientX: 300, pointerId: 1 });
    fireEvent.pointerMove(left(), { clientX: 250, pointerId: 1 });
    await nextFrame();
    expect(now()).toBe(1100);
    fireEvent.pointerUp(left(), { clientX: 250, pointerId: 1 });
    expect(calls.commit).toEqual([1100]);
  });

  test('a frame wider than its box is left-aligned, so a drag moves the right edge 1 × dx', async () => {
    const { container } = render(<Frame calls={fresh()} />);
    room(container, 390);
    fireEvent.pointerDown(right(), { button: 0, clientX: 1000, pointerId: 1 });
    fireEvent.pointerMove(right(), { clientX: 950, pointerId: 1 });
    await nextFrame();
    expect(now()).toBe(950);
    fireEvent.pointerUp(right(), { clientX: 950, pointerId: 1 });
  });

  test('a drag clamps to min / max', async () => {
    const calls = fresh();
    const { container } = render(<Frame calls={calls} />);
    room(container, 3000);
    fireEvent.pointerDown(right(), { button: 0, clientX: 1000, pointerId: 1 });
    fireEvent.pointerMove(right(), { clientX: 5000, pointerId: 1 });
    await nextFrame();
    expect(now()).toBe(1920);
    fireEvent.pointerMove(right(), { clientX: -5000, pointerId: 1 });
    await nextFrame();
    expect(now()).toBe(320);
    fireEvent.pointerUp(right(), { clientX: -5000, pointerId: 1 });
    expect(calls.change.every((w) => w >= 320 && w <= 1920)).toBe(true);
    expect(calls.commit).toEqual([320]);
  });

  test('onWidthChange is rAF-throttled: one call per frame, with the latest width', async () => {
    const calls = fresh();
    const { container } = render(<Frame calls={calls} />);
    room(container, 3000);
    fireEvent.pointerDown(right(), { button: 0, clientX: 1000, pointerId: 1 });
    fireEvent.pointerMove(right(), { clientX: 1010, pointerId: 1 });
    fireEvent.pointerMove(right(), { clientX: 1020, pointerId: 1 });
    fireEvent.pointerMove(right(), { clientX: 1030, pointerId: 1 });
    expect(calls.change).toEqual([]);
    await nextFrame();
    expect(calls.change).toEqual([1060]);
    fireEvent.pointerUp(right(), { clientX: 1030, pointerId: 1 });
  });

  test('pointer-up flushes a frame still pending, then commits once', () => {
    const calls = fresh();
    const { container } = render(<Frame calls={calls} />);
    room(container, 3000);
    fireEvent.pointerDown(right(), { button: 0, clientX: 1000, pointerId: 1 });
    fireEvent.pointerMove(right(), { clientX: 1040, pointerId: 1 });
    fireEvent.pointerUp(right(), { clientX: 1040, pointerId: 1 });
    expect(calls.change).toEqual([1080]);
    expect(calls.commit).toEqual([1080]);
    // The gesture is over: later moves, ups and a lost capture do nothing.
    fireEvent.pointerMove(right(), { clientX: 1200, pointerId: 1 });
    fireEvent.pointerUp(right(), { clientX: 1200, pointerId: 1 });
    fireEvent.lostPointerCapture(right(), { pointerId: 1 });
    expect(calls.change).toEqual([1080]);
    expect(calls.commit).toEqual([1080]);
  });

  test('pointer-cancel ends the gesture and commits once', () => {
    const calls = fresh();
    render(<Frame calls={calls} />);
    fireEvent.pointerDown(right(), { button: 0, clientX: 1000, pointerId: 1 });
    fireEvent.pointerCancel(right(), { pointerId: 1 });
    expect(calls.commit).toEqual([1000]);
  });

  test('a secondary button does not start a drag', async () => {
    const calls = fresh();
    render(<Frame calls={calls} />);
    fireEvent.pointerDown(right(), { button: 2, clientX: 1000, pointerId: 1 });
    fireEvent.pointerMove(right(), { clientX: 1100, pointerId: 1 });
    await nextFrame();
    fireEvent.pointerUp(right(), { clientX: 1100, pointerId: 1 });
    expect(calls.change).toEqual([]);
    expect(calls.commit).toEqual([]);
  });

  test('the handle takes pointer capture', () => {
    render(<Frame calls={fresh()} />);
    const captured: number[] = [];
    right().setPointerCapture = (id: number) => {
      captured.push(id);
    };
    fireEvent.pointerDown(right(), { button: 0, clientX: 1000, pointerId: 7 });
    expect(captured).toEqual([7]);
    fireEvent.pointerUp(right(), { pointerId: 7 });
  });

  test('while dragging the child gets pointer-events: none, so an iframe cannot swallow the drag', () => {
    render(<Frame calls={fresh()} />);
    expect(content().className).not.toContain('pointer-events-none');
    fireEvent.pointerDown(right(), { button: 0, clientX: 1000, pointerId: 1 });
    expect(content().className).toContain('pointer-events-none');
    fireEvent.pointerUp(right(), { pointerId: 1 });
    expect(content().className).not.toContain('pointer-events-none');
  });

  test('the size hint shows width × height on the dragged handle only while dragging', async () => {
    const { container } = render(<Frame calls={fresh()} height={844} />);
    room(container, 3000);
    const hint = () => container.querySelector('[data-size-hint]');
    expect(hint()).toBeNull();
    fireEvent.pointerDown(right(), { button: 0, clientX: 1000, pointerId: 1 });
    fireEvent.pointerMove(right(), { clientX: 1020, pointerId: 1 });
    await nextFrame();
    expect(hint()?.textContent).toBe('1040 × 844');
    expect(hint()?.getAttribute('aria-hidden')).toBe('true');
    expect(right().contains(hint())).toBe(true);
    fireEvent.pointerUp(right(), { pointerId: 1 });
    expect(hint()).toBeNull();
  });

  test('showSizeHint={false} shows no hint', () => {
    const { container } = render(<Frame calls={fresh()} showSizeHint={false} />);
    fireEvent.pointerDown(right(), { button: 0, clientX: 1000, pointerId: 1 });
    expect(container.querySelector('[data-size-hint]')).toBeNull();
    fireEvent.pointerUp(right(), { pointerId: 1 });
  });

  test('a fixed height is applied; omitted, the frame fills its container', () => {
    const fixed = render(<Frame calls={fresh()} height={844} />);
    expect(frame(fixed.container).style.height).toBe('844px');
    expect(frame(fixed.container).className).not.toContain('h-full');
    fixed.unmount();
    const fill = render(<Frame calls={fresh()} />);
    expect(frame(fill.container).style.height).toBe('');
    expect(frame(fill.container).className).toContain('h-full');
    expect(box(fill.container).className).toContain('h-full');
  });

  test('a frame wider than its container scrolls inside its own box, centred while it fits', () => {
    const { container } = render(<Frame calls={fresh()} />);
    const own = box(container);
    expect(own.className).toContain('overflow-x-auto');
    expect(own.className).toContain('min-w-0');
    expect(own.className).toContain('max-w-full');
    // Auto margins centre it and resolve to 0 once it overflows, so its left
    // part is scrollable rather than cut off (justify-center would cut it).
    expect(frame(container).className).toContain('mx-auto');
  });

  test('the width transition is motion-safe only, and off while dragging', () => {
    const { container } = render(<Frame calls={fresh()} />);
    const transitions = () =>
      frame(container)
        .className.split(' ')
        .filter((c) => c.includes('transition'));
    expect(transitions()).toEqual(['motion-safe:transition-[width]']);
    fireEvent.pointerDown(right(), { button: 0, clientX: 1000, pointerId: 1 });
    expect(transitions()).toEqual([]);
    fireEvent.pointerUp(right(), { pointerId: 1 });
  });

  test('it draws a hairline and no material', () => {
    const { container } = render(<Frame calls={fresh()} className="extra" />);
    expect(frame(container).className).toContain('ring-line');
    expect(container.innerHTML).not.toContain('glass');
    expect(box(container).className).toContain('extra');
  });

  test('it renders on the server', () => {
    const html = renderToString(
      <ResizableFrame width={390} onWidthChange={() => {}} min={320} max={1920} labels={{ resize: 'Resize' }}>
        <iframe title="mockup" src="about:blank" />
      </ResizableFrame>,
    );
    expect(html).toContain('width:390px');
    expect(html).toContain('aria-valuetext="390 pixels"');
  });
});
