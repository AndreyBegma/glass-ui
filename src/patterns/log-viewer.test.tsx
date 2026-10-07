import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { type LogLine, LogViewer } from './log-viewer';

/**
 * FEAT-20260930-070 — LogViewer's acceptance bullets, one `test` each.
 *
 * happy-dom has no layout: `clientHeight` is 0, so the viewport is the
 * component's 400 px fallback, and `scrollTop` is stored as written. With the
 * default 20 px line that is 20 visible lines and a bottom at
 * `lines × 20 − 400`, which is the arithmetic these tests assert against.
 */

afterEach(cleanup);

const ESC = '\x1b';
const LINE = 20;
const VIEWPORT = 400;

const makeLines = (count: number, from = 0): LogLine[] =>
  Array.from({ length: count }, (_, i) => ({ id: from + i, text: `line ${from + i}` }));

const scroller = () => screen.getByRole('log') as HTMLElement;
const rendered = () => [...document.querySelectorAll<HTMLElement>('[data-line-index]')];
const lineText = (index: number) =>
  document.querySelector<HTMLElement>(`[data-line-index="${index}"]`)?.textContent ?? null;

function scrollTo(top: number) {
  act(() => {
    scroller().scrollTop = top;
    fireEvent.scroll(scroller());
  });
}

function mockMatchMedia(matching: string) {
  const original = window.matchMedia;
  window.matchMedia = ((query: string) => ({
    matches: query === matching,
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

describe('LogViewer', () => {
  test('has role="log" with aria-live="off", labelled by label', () => {
    render(<LogViewer lines={makeLines(3)} label="Worker output" />);
    const log = screen.getByRole('log', { name: 'Worker output' });
    expect(log.getAttribute('aria-live')).toBe('off');
    // The pill's region is the one that announces.
    expect(document.querySelector('[aria-live="polite"]')).not.toBeNull();
  });

  test('renders "\\x1b[31merror\\x1b[0m ok" with "error" in the danger token class and "ok" plain', () => {
    render(<LogViewer lines={[{ id: 1, text: `${ESC}[31merror${ESC}[0m ok` }]} label="Log" />);
    const danger = scroller().querySelector('.text-danger') as HTMLElement;
    expect(danger.textContent).toBe('error');
    const ok = danger.nextSibling;
    expect(ok?.nodeType).toBe(Node.TEXT_NODE);
    expect(ok?.textContent).toBe(' ok');
    expect(lineText(0)).toBe('error ok');
  });

  test('256-colour and truecolour sequences render default ink', () => {
    render(
      <LogViewer
        lines={[{ id: 1, text: `${ESC}[38;5;196mA${ESC}[48;2;255;0;0mB${ESC}[38:2::1:2:3mC` }]}
        label="Log"
      />,
    );
    const row = document.querySelector('[data-line-index="0"]') as HTMLElement;
    expect(row.textContent).toBe('ABC');
    // No run carries a colour class: the text is default ink.
    expect(row.querySelector('[class*="text-"]:not([data-line-number])')).toBeNull();
    expect(row.querySelector('[class*="bg-"]')).toBeNull();
    expect(row.innerHTML).not.toMatch(/196|255/);
  });

  test('other escape sequences are stripped', () => {
    render(
      <LogViewer
        lines={[{ id: 1, text: `a${ESC}[2Kb${ESC}[3;4Hc${ESC}]0;title\x07d${ESC}(Be\rf` }]}
        label="Log"
      />,
    );
    expect(lineText(0)).toBe('abcdef');
    expect(scroller().textContent).not.toContain(ESC);
  });

  test('with 50 000 lines and wrap off, fewer than 200 line nodes are in the DOM', () => {
    render(<LogViewer lines={makeLines(50_000)} label="Log" />);
    const nodes = rendered();
    expect(nodes.length).toBeGreaterThan(0);
    expect(nodes.length).toBeLessThan(200);
    // Following from the start: the window is the tail.
    expect(nodes.at(-1)?.dataset.lineIndex).toBe('49999');
    // The top: past the default 20 000 kept lines, the rest is one marker row.
    scrollTo(0);
    expect(screen.getByText('30000 earlier lines hidden')).toBeTruthy();
    expect(rendered()[0].dataset.lineIndex).toBe('30000');
    expect(rendered().length).toBeLessThan(200);

    // With every line kept, 50 000 nodes would be the alternative.
    cleanup();
    render(<LogViewer lines={makeLines(50_000)} maxLines={50_000} label="Log" />);
    expect(rendered().length).toBeLessThan(200);
    scrollTo(25_000 * LINE);
    expect(rendered().length).toBeLessThan(200);
    expect(lineText(25_000)).toBe('line 25000');
  });

  test('appending lines while following keeps the last line visible', () => {
    const { rerender } = render(<LogViewer lines={makeLines(1_000)} label="Log" />);
    expect(scroller().scrollTop).toBe(1_000 * LINE - VIEWPORT);
    rerender(<LogViewer lines={makeLines(1_010)} label="Log" />);
    expect(lineText(1_009)).toBe('line 1009');
    expect(scroller().scrollTop).toBe(1_010 * LINE - VIEWPORT);
    expect(document.querySelector('[data-log-jump]')).toBeNull();
  });

  test('after scrolling up, appending shows the "N new lines" pill and does not move the viewport', () => {
    const onFollowChange = mock(() => {});
    const { rerender } = render(
      <LogViewer lines={makeLines(1_000)} label="Log" onFollowChange={onFollowChange} />,
    );
    scrollTo(4_000);
    expect(onFollowChange).toHaveBeenLastCalledWith(false);
    const firstBefore = rendered()[0].dataset.lineIndex;

    rerender(<LogViewer lines={makeLines(1_005)} label="Log" onFollowChange={onFollowChange} />);
    expect(scroller().scrollTop).toBe(4_000);
    expect(rendered()[0].dataset.lineIndex).toBe(firstBefore);
    expect(screen.getByRole('button', { name: '5 new lines — Jump to latest' })).toBeTruthy();

    rerender(<LogViewer lines={makeLines(1_006)} label="Log" onFollowChange={onFollowChange} />);
    expect(screen.getByRole('button', { name: '6 new lines — Jump to latest' })).toBeTruthy();
    expect(scroller().scrollTop).toBe(4_000);
  });

  test('a scroll within one line of the bottom does not pause; scrolling back to the bottom resumes', () => {
    const { rerender } = render(<LogViewer lines={makeLines(100)} label="Log" />);
    const bottom = 100 * LINE - VIEWPORT;
    scrollTo(bottom - LINE);
    rerender(<LogViewer lines={makeLines(101)} label="Log" />);
    expect(document.querySelector('[data-log-jump]')).toBeNull();
    expect(scroller().scrollTop).toBe(101 * LINE - VIEWPORT);

    scrollTo(0);
    rerender(<LogViewer lines={makeLines(103)} label="Log" />);
    expect(screen.getByRole('button', { name: /2 new lines/ })).toBeTruthy();
    scrollTo(103 * LINE - VIEWPORT);
    expect(document.querySelector('[data-log-jump]')).toBeNull();
  });

  test('paused, lines trimmed off the top by maxLines do not move what is on screen', () => {
    const { rerender } = render(<LogViewer lines={makeLines(100)} maxLines={100} label="Log" />);
    scrollTo(200);
    // Line 10 is at the top of the viewport.
    rerender(<LogViewer lines={makeLines(110)} maxLines={100} label="Log" />);
    expect(screen.getByText('10 earlier lines hidden')).toBeTruthy();
    // Line 10 is now the first kept line, one marker row down.
    expect(scroller().scrollTop).toBe(LINE);
    expect(rendered()[0].dataset.lineIndex).toBe('10');
  });

  test('Jump to latest resumes following', () => {
    const restore = mockMatchMedia('(prefers-reduced-motion: reduce)');
    try {
      const { rerender } = render(<LogViewer lines={makeLines(1_000)} label="Log" />);
      scrollTo(0);
      rerender(<LogViewer lines={makeLines(1_003)} label="Log" />);
      fireEvent.click(screen.getByRole('button', { name: /3 new lines/ }));
      expect(document.querySelector('[data-log-jump]')).toBeNull();
      expect(scroller().scrollTop).toBe(1_003 * LINE - VIEWPORT);
      rerender(<LogViewer lines={makeLines(1_004)} label="Log" />);
      expect(lineText(1_003)).toBe('line 1003');
      expect(scroller().scrollTop).toBe(1_004 * LINE - VIEWPORT);

      // `End` on the log does the same.
      scrollTo(0);
      act(() => {
        fireEvent.keyDown(scroller(), { key: 'End' });
      });
      expect(scroller().scrollTop).toBe(1_004 * LINE - VIEWPORT);
      rerender(<LogViewer lines={makeLines(1_005)} label="Log" />);
      expect(document.querySelector('[data-log-jump]')).toBeNull();
      expect(lineText(1_004)).toBe('line 1004');
    } finally {
      restore();
    }
  });

  test('search highlights matches and Enter moves to the next', () => {
    const lines: LogLine[] = [
      { id: 0, text: `${ESC}[31mERR${ESC}[0mor one` },
      { id: 1, text: 'fine' },
      { id: 2, text: 'error two, error three' },
      ...makeLines(997, 3),
      { id: 'last', text: 'final error' },
    ];
    const onQueryChange = mock(() => {});
    render(<LogViewer lines={lines} label="Log" onQueryChange={onQueryChange} />);
    const field = screen.getByRole('searchbox', { name: 'Search log' });
    fireEvent.change(field, { target: { value: 'Error' } });
    expect(onQueryChange).toHaveBeenLastCalledWith('Error');
    // Counted over every kept line, not just the window.
    expect(document.querySelector('[data-match-count]')?.textContent).toBe('1 / 4');
    // The tail is in view while following: one highlight there.
    expect([...scroller().querySelectorAll('mark')].map((m) => m.textContent)).toEqual(['error']);

    act(() => {
      fireEvent.keyDown(field, { key: 'Enter' });
    });
    // Enter steps to the second match, scrolls it in, and pauses following.
    expect(document.querySelector('[data-match-count]')?.textContent).toBe('2 / 4');
    const current = scroller().querySelector('mark[data-current]') as HTMLElement;
    expect(current.textContent).toBe('error');
    expect(current.closest('[data-line-index]')?.getAttribute('data-line-index')).toBe('2');
    expect(scroller().scrollTop).toBe(0);
    // A match that spans two ANSI runs is still one highlight per run.
    const first = document.querySelector('[data-line-index="0"]') as HTMLElement;
    expect([...first.querySelectorAll('mark')].map((m) => m.textContent).join('')).toBe('ERRor');
    expect(first.querySelector('.text-danger mark')?.textContent).toBe('ERR');

    act(() => {
      fireEvent.keyDown(field, { key: 'Enter', shiftKey: true });
    });
    expect(document.querySelector('[data-match-count]')?.textContent).toBe('1 / 4');
    act(() => {
      fireEvent.keyDown(field, { key: 'Enter', shiftKey: true });
    });
    expect(document.querySelector('[data-match-count]')?.textContent).toBe('4 / 4');
    expect(lineText(1_000)).toBe('final error');
  });

  test('a controlled query is the consumer\'s', () => {
    render(<LogViewer lines={makeLines(30)} query="line 2" label="Log" />);
    // "line 2", "line 20" … "line 29".
    expect(document.querySelector('[data-match-count]')?.textContent).toBe('1 / 11');
  });

  describe('copy', () => {
    const original = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    let writeText: ReturnType<typeof mock>;

    beforeEach(() => {
      writeText = mock(async (_text: string) => {});
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    });

    afterEach(() => {
      if (original) Object.defineProperty(navigator, 'clipboard', original);
      else Reflect.deleteProperty(navigator, 'clipboard');
    });

    test('copy writes ANSI-stripped text (mocked clipboard)', async () => {
      const lines: LogLine[] = [
        { id: 1, text: `${ESC}[1;31mfail${ESC}[0m: boom` },
        { id: 2, text: `${ESC}[2Kdone` },
        ...makeLines(10, 3),
      ];
      // Every line, even the ones trimmed from view.
      render(<LogViewer lines={lines} maxLines={5} label="Log" />);
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
      });
      expect(writeText).toHaveBeenCalledTimes(1);
      const text = writeText.mock.calls[0][0] as string;
      expect(text.split('\n').slice(0, 3)).toEqual(['fail: boom', 'done', 'line 3']);
      expect(text.split('\n')).toHaveLength(12);
      expect(text).not.toContain(ESC);
      expect(screen.getByRole('button', { name: 'Copied' })).toBeTruthy();
    });

    test('a failed write does not confirm', async () => {
      writeText.mockImplementation(async () => {
        throw new Error('denied');
      });
      render(<LogViewer lines={makeLines(2)} label="Log" />);
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
      });
      expect(screen.getByRole('button', { name: 'Copy' })).toBeTruthy();
    });
  });

  test('wrap on trims to the last 5 000 lines with an "N earlier lines hidden" marker', () => {
    const onWrapChange = mock(() => {});
    render(<LogViewer lines={makeLines(6_000)} label="Log" onWrapChange={onWrapChange} />);
    expect(document.querySelector('[data-log-hidden]')).toBeNull();
    const toggle = screen.getByRole('button', { name: 'Wrap lines' });
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(toggle);
    expect(onWrapChange).toHaveBeenLastCalledWith(true);
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText('1000 earlier lines hidden')).toBeTruthy();
    // Virtualization is off: every kept line is in the DOM, wrapping.
    const nodes = rendered();
    expect(nodes).toHaveLength(5_000);
    expect(nodes[0].dataset.lineIndex).toBe('1000');
    expect(nodes[0].querySelector('.whitespace-pre-wrap')).not.toBeNull();
  });

  test('levels carry a gutter mark that is not colour alone; line numbers are optional', () => {
    const lines: LogLine[] = [
      { id: 1, text: 'bad', level: 'error' },
      { id: 2, text: 'hmm', level: 'warn' },
      { id: 3, text: 'fyi', level: 'info' },
    ];
    const { rerender } = render(<LogViewer lines={lines} label="Log" />);
    expect(screen.getByRole('img', { name: 'Error' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Warning' })).toBeTruthy();
    expect(document.querySelector('[data-line-number]')).toBeNull();
    rerender(<LogViewer lines={lines} label="Log" showLineNumbers />);
    expect(
      [...document.querySelectorAll('[data-line-number]')].map((n) => n.textContent),
    ).toEqual(['1', '2', '3']);
  });

  test('empty lines show the empty state, not a blank log', () => {
    const { rerender } = render(<LogViewer lines={[]} label="Log" />);
    expect(scroller().textContent).toBe('No output yet');
    rerender(<LogViewer lines={[]} label="Log" emptyState="Waiting for the worker" />);
    expect(scroller().textContent).toBe('Waiting for the worker');
  });

  test('labels replace the English defaults', () => {
    const { rerender } = render(
      <LogViewer
        lines={makeLines(100)}
        label="Log"
        labels={{ newLines: (n) => `${n} neue Zeilen`, jumpToLatest: 'Zum Ende', copy: 'Kopieren' }}
      />,
    );
    expect(screen.getByRole('button', { name: 'Kopieren' })).toBeTruthy();
    scrollTo(0);
    rerender(
      <LogViewer
        lines={makeLines(102)}
        label="Log"
        labels={{ newLines: (n) => `${n} neue Zeilen`, jumpToLatest: 'Zum Ende', copy: 'Kopieren' }}
      />,
    );
    expect(screen.getByRole('button', { name: '2 neue Zeilen — Zum Ende' })).toBeTruthy();
  });

  test('renders under data-theme light, dark and data-material flat', () => {
    for (const attrs of [
      { 'data-theme': 'light' },
      { 'data-theme': 'dark' },
      { 'data-material': 'flat' },
    ]) {
      const { container, unmount } = render(
        <div {...attrs}>
          <LogViewer lines={[{ id: 1, text: `${ESC}[32mok${ESC}[0m`, level: 'error' }]} label="Log" />
        </div>,
      );
      const root = container.querySelector('[data-log-viewer]') as HTMLElement;
      // A solid, token-built surface; lines are never glass (D3).
      expect(root.className).toContain('bg-raised');
      expect(root.className).toContain('border-line');
      expect(root.className).toContain('text-ink');
      expect(container.querySelector('[class*="glass"]')).toBeNull();
      expect(scroller().className).toContain('font-mono');
      expect(scroller().querySelector('.text-ok')?.textContent).toBe('ok');
      expect((container.querySelector('[data-line-index]') as HTMLElement).className).toContain(
        'bg-danger/8',
      );
      unmount();
    }
  });

  test('touch targets are at least 44px on a coarse pointer', () => {
    const restore = mockMatchMedia('(pointer: coarse)');
    try {
      const { rerender } = render(<LogViewer lines={makeLines(100)} label="Log" />);
      scrollTo(0);
      rerender(<LogViewer lines={makeLines(101)} label="Log" />);
      for (const name of ['Previous match', 'Next match', 'Wrap lines', 'Copy', /1 new line —/]) {
        const button = screen.getByRole('button', { name });
        expect(button.className).toContain('after:h-(--size-tap)');
        expect(button.className).toContain('[@media(pointer:fine)]:after:hidden');
      }
      // The search field is `Field`'s, at `--size-field`.
      expect(screen.getByRole('searchbox').className).toContain('h-(--size-field)');
    } finally {
      restore();
    }
  });
});
