import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { act, cleanup, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { renderToString } from 'react-dom/server';

type Options = Record<string, unknown> & { theme?: Record<string, string> };

// Fake xterm: records everything the component does to it.
class FakeTerminal {
  static instances: FakeTerminal[] = [];
  options: Options;
  cols = 80;
  rows = 24;
  opened: HTMLElement | null = null;
  addons: unknown[] = [];
  written: string[] = [];
  cleared = 0;
  focused = 0;
  blurred = 0;
  disposed = false;
  dataListener: ((data: string) => void) | null = null;
  keyHandler: ((event: { key: string; type: string }) => boolean) | null = null;
  constructor(options: Options) {
    this.options = { ...options };
    FakeTerminal.instances.push(this);
  }
  loadAddon(addon: unknown) {
    this.addons.push(addon);
  }
  open(el: HTMLElement) {
    this.opened = el;
  }
  write(data: string) {
    this.written.push(data);
  }
  writeln(data: string) {
    this.written.push(`${data}\n`);
  }
  clear() {
    this.cleared += 1;
  }
  focus() {
    this.focused += 1;
  }
  blur() {
    this.blurred += 1;
  }
  onData(listener: (data: string) => void) {
    this.dataListener = listener;
    return { dispose: () => (this.dataListener = null) };
  }
  attachCustomKeyEventHandler(handler: (event: { key: string; type: string }) => boolean) {
    this.keyHandler = handler;
  }
  dispose() {
    this.disposed = true;
  }
}

class FakeFit {
  static instances: FakeFit[] = [];
  fits = 0;
  constructor() {
    FakeFit.instances.push(this);
  }
  fit() {
    this.fits += 1;
  }
}

const loadPeers = mock(() => Promise.resolve([{ Terminal: FakeTerminal }, { FitAddon: FakeFit }] as never));
mock.module('./terminal-peers', () => ({ loadTerminalPeers: loadPeers }));

// Observers, so tests can fire them and see them disconnected.
type ObserverRecord = { disconnected: boolean; callback: () => void };
const resizeObservers: ObserverRecord[] = [];
const mutationObservers: ObserverRecord[] = [];
class FakeResizeObserver {
  record: ObserverRecord;
  constructor(callback: () => void) {
    this.record = { disconnected: false, callback };
    resizeObservers.push(this.record);
  }
  observe() {}
  unobserve() {}
  disconnect() {
    this.record.disconnected = true;
  }
}
class FakeMutationObserver {
  record: ObserverRecord;
  constructor(callback: () => void) {
    this.record = { disconnected: false, callback };
    mutationObservers.push(this.record);
  }
  observe() {}
  disconnect() {
    this.record.disconnected = true;
  }
}

const realResizeObserver = globalThis.ResizeObserver;
const realMutationObserver = globalThis.MutationObserver;

import { Terminal, type TerminalHandle } from './terminal';

const tokens: Record<string, string> = {
  '--color-ground': 'ground-1',
  '--color-ink': 'ink-1',
  '--color-ink-2': 'ink2-1',
  '--color-ink-3': 'ink3-1',
  '--color-accent': 'accent-1',
  '--color-ok': 'ok-1',
  '--color-warn': 'warn-1',
  '--color-danger': 'danger-1',
  '--color-series-1': 'series1-1',
  '--color-series-3': 'series3-1',
  '--color-series-4': 'series4-1',
};

function setTokens(suffix: string) {
  for (const [name, value] of Object.entries(tokens)) {
    document.documentElement.style.setProperty(name, value.replace(/-1$/, `-${suffix}`));
  }
}

const flush = () => act(async () => {
  for (let i = 0; i < 5; i += 1) await Promise.resolve();
});

const term = () => FakeTerminal.instances[FakeTerminal.instances.length - 1] as FakeTerminal;

beforeEach(() => {
  FakeTerminal.instances = [];
  FakeFit.instances = [];
  resizeObservers.length = 0;
  mutationObservers.length = 0;
  globalThis.ResizeObserver = FakeResizeObserver as unknown as typeof ResizeObserver;
  globalThis.MutationObserver = FakeMutationObserver as unknown as typeof MutationObserver;
  setTokens('1');
});
afterEach(() => {
  cleanup();
  globalThis.ResizeObserver = realResizeObserver;
  globalThis.MutationObserver = realMutationObserver;
  for (const name of Object.keys(tokens)) document.documentElement.style.removeProperty(name);
});

describe('Terminal', () => {
  test('with xterm mocked, it calls open, loads the fit addon and applies a theme built from computed tokens', async () => {
    render(<Terminal aria-label="Agent shell" />);
    await flush();
    const t = term();
    expect(t.opened).toBe(screen.getByRole('region', { name: 'Agent shell' }));
    expect(t.addons).toEqual(FakeFit.instances);
    expect(FakeFit.instances).toHaveLength(1);
    expect(FakeFit.instances[0]?.fits).toBeGreaterThan(0);
    expect(t.options.theme).toMatchObject({
      background: 'ground-1',
      foreground: 'ink-1',
      cursor: 'accent-1',
      green: 'ok-1',
      yellow: 'warn-1',
      red: 'danger-1',
      blue: 'series1-1',
      brightBlack: 'ink3-1',
    });
  });

  test('changing data-theme re-applies the theme', async () => {
    const frames: FrameRequestCallback[] = [];
    const raf = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => frames.push(cb)) as typeof raf;
    try {
      render(<Terminal aria-label="Agent shell" />);
      await flush();
      expect(term().options.theme?.background).toBe('ground-1');
      setTokens('2');
      document.documentElement.setAttribute('data-theme', 'light');
      act(() => {
        // Three mutations in one frame schedule one rebuild.
        for (let i = 0; i < 3; i += 1) mutationObservers[0]?.callback();
      });
      act(() => {
        // The cancelled frames never run; only the last does.
        frames[frames.length - 1]?.(0);
      });
      expect(term().options.theme?.background).toBe('ground-2');
      expect(term().options.theme?.foreground).toBe('ink-2');
    } finally {
      globalThis.requestAnimationFrame = raf;
      document.documentElement.removeAttribute('data-theme');
    }
  });

  test('readOnly disables stdin and hides the cursor', async () => {
    const { rerender } = render(<Terminal aria-label="Log" readOnly />);
    await flush();
    expect(term().options.disableStdin).toBe(true);
    expect(term().options.cursorBlink).toBe(false);
    // The caret is painted in the ground colour.
    expect(term().options.theme?.cursor).toBe('ground-1');
    rerender(<Terminal aria-label="Log" />);
    expect(term().options.disableStdin).toBe(false);
    expect(term().options.theme?.cursor).toBe('accent-1');
  });

  test('onData fires on input when not read-only', async () => {
    const onData = mock((_data: string) => {});
    const { rerender } = render(<Terminal aria-label="Shell" onData={onData} />);
    await flush();
    term().dataListener?.('ls\r');
    expect(onData).toHaveBeenCalledWith('ls\r');
    rerender(<Terminal aria-label="Shell" onData={onData} readOnly />);
    term().dataListener?.('x');
    expect(onData).toHaveBeenCalledTimes(1);
  });

  test('the handle write reaches the terminal', async () => {
    const ref = createRef<TerminalHandle>();
    render(<Terminal ref={ref} aria-label="Shell" />);
    // Before xterm has loaded, writes are queued, not lost.
    ref.current?.write('early');
    await flush();
    ref.current?.write('hello');
    ref.current?.writeln('line');
    ref.current?.clear();
    ref.current?.focus();
    ref.current?.fit();
    const t = term();
    expect(t.written).toEqual(['early', 'hello', 'line\n']);
    expect(t.cleared).toBe(1);
    expect(t.focused).toBe(1);
    expect(FakeFit.instances[0]?.fits).toBeGreaterThan(1);
  });

  test('a ResizeObserver drives fit and emits onResize only when the size changes', async () => {
    const onResize = mock((_size: { cols: number; rows: number }) => {});
    render(<Terminal aria-label="Shell" onResize={onResize} />);
    await flush();
    expect(onResize).toHaveBeenCalledWith({ cols: 80, rows: 24 });
    const fits = FakeFit.instances[0]?.fits ?? 0;
    resizeObservers[0]?.callback();
    expect(FakeFit.instances[0]?.fits).toBe(fits + 1);
    expect(onResize).toHaveBeenCalledTimes(1);
    term().cols = 120;
    resizeObservers[0]?.callback();
    expect(onResize).toHaveBeenLastCalledWith({ cols: 120, rows: 24 });
  });

  test('unmount disposes the terminal and observers', async () => {
    const { unmount } = render(<Terminal aria-label="Shell" />);
    await flush();
    const t = term();
    unmount();
    expect(t.disposed).toBe(true);
    expect(resizeObservers.every((o) => o.disconnected)).toBe(true);
    expect(mutationObservers.every((o) => o.disconnected)).toBe(true);
    expect(t.dataListener).toBeNull();
  });

  test('unmounting before xterm loads never creates a terminal', async () => {
    const { unmount } = render(<Terminal aria-label="Shell" />);
    unmount();
    await flush();
    expect(FakeTerminal.instances).toHaveLength(0);
  });

  test('nothing touches window during SSR import', () => {
    const html = renderToString(<Terminal aria-label="Shell" />);
    expect(html).toContain('aria-label="Shell"');
    expect(FakeTerminal.instances).toHaveLength(0);
  });

  test('Escape blurs unless captureEscape', async () => {
    const { rerender } = render(<Terminal aria-label="Shell" />);
    await flush();
    const handler = term().keyHandler;
    expect(handler?.({ key: 'Escape', type: 'keydown' })).toBe(false);
    expect(term().blurred).toBe(1);
    expect(handler?.({ key: 'a', type: 'keydown' })).toBe(true);
    rerender(<Terminal aria-label="Shell" captureEscape />);
    expect(handler?.({ key: 'Escape', type: 'keydown' })).toBe(true);
    expect(term().blurred).toBe(1);
  });

  test('option props reach the terminal', async () => {
    const { rerender } = render(<Terminal aria-label="Shell" fontSize={15} scrollback={100} screenReaderMode />);
    await flush();
    expect(term().options).toMatchObject({ fontSize: 15, scrollback: 100, screenReaderMode: true });
    rerender(<Terminal aria-label="Shell" fontSize={11} scrollback={200} />);
    expect(term().options).toMatchObject({ fontSize: 11, scrollback: 200, screenReaderMode: false });
  });

  test('the container shows a focus ring and is a solid surface', () => {
    render(<Terminal aria-label="Shell" className="custom" />);
    const el = screen.getByRole('region', { name: 'Shell' });
    expect(el.className).toContain('focus-within:outline-focus');
    expect(el.className).toContain('bg-ground');
    expect(el.className).toContain('custom');
  });

  test('a missing peer renders an alert naming the packages', async () => {
    loadPeers.mockImplementationOnce(() => Promise.reject(new Error('Cannot find package @xterm/xterm')));
    render(<Terminal aria-label="Shell" />);
    await flush();
    expect(screen.getByRole('alert').textContent).toContain('@xterm/xterm');
    expect(screen.getByRole('alert').textContent).toContain('@xterm/addon-fit');
    expect(FakeTerminal.instances).toHaveLength(0);
  });
});
