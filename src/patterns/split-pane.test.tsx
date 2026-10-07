import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { SplitPane, type SplitPaneProps } from './split-pane';

function Split(props: Partial<SplitPaneProps>) {
  return (
    <SplitPane
      storageKey="test-split"
      defaultSize={300}
      min={200}
      max={500}
      first={<p>first pane</p>}
      second={<p>second pane</p>}
      {...props}
    />
  );
}

const sep = () => screen.getByRole('separator');
const now = () => Number(sep().getAttribute('aria-valuenow'));
const firstPane = () => screen.getByText('first pane').parentElement as HTMLElement;
const wait = (ms: number) => act(() => new Promise<void>((resolve) => setTimeout(resolve, ms)));

beforeEach(() => {
  localStorage.clear();
});
afterEach(cleanup);

describe('SplitPane', () => {
  test('the separator has role="separator", aria-orientation and aria-valuenow / min / max', () => {
    render(<Split />);
    expect(sep().getAttribute('aria-orientation')).toBe('vertical');
    expect(sep().getAttribute('aria-valuemin')).toBe('200');
    expect(sep().getAttribute('aria-valuemax')).toBe('500');
    expect(now()).toBe(300);
    expect(sep().tabIndex).toBe(0);
    expect(firstPane().style.flexBasis).toBe('300px');
  });

  test('a vertical split has a horizontal separator', () => {
    render(<Split orientation="vertical" />);
    expect(sep().getAttribute('aria-orientation')).toBe('horizontal');
    fireEvent.keyDown(sep(), { key: 'ArrowDown' });
    expect(now()).toBe(316);
  });

  test('arrow keys change the size by 16 px within min / max', () => {
    render(<Split />);
    fireEvent.keyDown(sep(), { key: 'ArrowRight' });
    expect(now()).toBe(316);
    fireEvent.keyDown(sep(), { key: 'ArrowLeft' });
    fireEvent.keyDown(sep(), { key: 'ArrowLeft' });
    expect(now()).toBe(284);
    for (let i = 0; i < 20; i++) fireEvent.keyDown(sep(), { key: 'ArrowLeft' });
    expect(now()).toBe(200);
    for (let i = 0; i < 40; i++) fireEvent.keyDown(sep(), { key: 'ArrowRight' });
    expect(now()).toBe(500);
  });

  test('Home / End jump to min / max', () => {
    render(<Split />);
    fireEvent.keyDown(sep(), { key: 'End' });
    expect(now()).toBe(500);
    fireEvent.keyDown(sep(), { key: 'Home' });
    expect(now()).toBe(200);
  });

  test('the size persists under storageKey and is restored after remount', async () => {
    const first = render(<Split />);
    fireEvent.keyDown(sep(), { key: 'ArrowRight' });
    await wait(200);
    expect(JSON.parse(localStorage.getItem('test-split') ?? '{}')).toEqual({ size: 316 });
    first.unmount();
    render(<Split />);
    expect(now()).toBe(316);
  });

  test('a stored size is clamped by min / max', () => {
    localStorage.setItem('test-split', JSON.stringify({ size: 9000 }));
    render(<Split />);
    expect(now()).toBe(500);
  });

  test('a change inside the debounce still lands when the pane unmounts', () => {
    const first = render(<Split />);
    fireEvent.keyDown(sep(), { key: 'End' });
    first.unmount();
    expect(JSON.parse(localStorage.getItem('test-split') ?? '{}')).toEqual({ size: 500 });
  });

  test('the first render matches the server render (no storage read before mount)', () => {
    localStorage.setItem('test-split', JSON.stringify({ size: 450 }));
    const server = renderToString(<Split />);
    expect(server).toContain('flex-basis:300px');
    expect(server).not.toContain('450');
    // The client's first render is the default too; storage applies after mount.
    render(<Split />);
    expect(now()).toBe(450);
  });

  test('nothing is written to storage on mount', async () => {
    render(<Split />);
    await wait(200);
    expect(localStorage.getItem('test-split')).toBeNull();
  });

  test('double-click on the separator resets to defaultSize', () => {
    render(<Split />);
    fireEvent.keyDown(sep(), { key: 'End' });
    expect(now()).toBe(500);
    fireEvent.doubleClick(sep());
    expect(now()).toBe(300);
  });

  test('pointer drag with pointer capture resizes the first pane', () => {
    render(<Split />);
    fireEvent.pointerDown(sep(), { button: 0, clientX: 300, pointerId: 1 });
    fireEvent.pointerMove(sep(), { clientX: 360, pointerId: 1 });
    expect(now()).toBe(360);
    fireEvent.pointerMove(sep(), { clientX: 900, pointerId: 1 });
    expect(now()).toBe(500);
    fireEvent.pointerUp(sep(), { clientX: 900, pointerId: 1 });
    fireEvent.pointerMove(sep(), { clientX: 250, pointerId: 1 });
    expect(now()).toBe(500);
  });

  test('storage writes are debounced at 150 ms', async () => {
    render(<Split />);
    fireEvent.keyDown(sep(), { key: 'ArrowRight' });
    await wait(60);
    fireEvent.keyDown(sep(), { key: 'ArrowRight' });
    await wait(100);
    expect(localStorage.getItem('test-split')).toBeNull();
    await wait(120);
    expect(JSON.parse(localStorage.getItem('test-split') ?? '{}')).toEqual({ size: 332 });
  });

  test('collapsedFirst hides the first pane', () => {
    render(<Split collapsedFirst />);
    expect(firstPane().hidden).toBe(true);
    expect(screen.queryByRole('separator')).toBeNull();
    expect(screen.getByText('second pane')).toBeTruthy();
  });

  test('percent units clamp to 0–100 by default', () => {
    render(<Split unit="%" defaultSize={40} min={20} max={undefined} />);
    expect(firstPane().style.flexBasis).toBe('40%');
    expect(sep().getAttribute('aria-valuemax')).toBe('100');
    fireEvent.keyDown(sep(), { key: 'End' });
    expect(now()).toBe(100);
  });

  test('the separator hit area is at least 44px on a coarse pointer', () => {
    render(<Split />);
    expect(sep().className).toContain('pointer-coarse:before:w-11');
    render(<Split orientation="vertical" storageKey="other" />);
    expect(screen.getAllByRole('separator')[1]?.className).toContain('pointer-coarse:before:h-11');
  });

  test('renders under data-theme light, dark and data-material flat', () => {
    // No colour is chosen here: only token classes, so the theme and material
    // attributes on an ancestor change nothing structurally.
    for (const attrs of [
      { 'data-theme': 'light' },
      { 'data-theme': 'dark' },
      { 'data-material': 'flat' },
    ]) {
      const view = render(
        <div {...attrs}>
          <Split />
        </div>,
      );
      expect(screen.getByRole('separator').className).toContain('bg-line');
      view.unmount();
    }
  });
});
