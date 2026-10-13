import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useFileUpload } from './use-file-upload';

/**
 * #110 — `useFileUpload` against a hand-driven `XMLHttpRequest`.
 *
 * Every request the hook makes is recorded, and the test decides when each
 * one makes progress, finishes or fails. That is the only way to assert the
 * queue: a real network finishes requests in whatever order it likes.
 */

type Listener =
  | ((e: { loaded: number; total: number; lengthComputable: boolean }) => void)
  | null;

class FakeXHR {
  static all: FakeXHR[] = [];
  method = '';
  url = '';
  headers: Record<string, string> = {};
  withCredentials = false;
  body: FormData | null = null;
  status = 0;
  responseText = '';
  aborted = false;
  done = false;
  upload: { onprogress: Listener } = { onprogress: null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  ontimeout: (() => void) | null = null;

  constructor() {
    FakeXHR.all.push(this);
  }
  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }
  setRequestHeader(name: string, value: string) {
    this.headers[name] = value;
  }
  send(body: FormData) {
    this.body = body;
  }
  abort() {
    this.aborted = true;
    this.done = true;
  }
  progress(loaded: number, total: number) {
    this.upload.onprogress?.({ loaded, total, lengthComputable: true });
  }
  respond(status: number, text: string) {
    this.status = status;
    this.responseText = text;
    this.done = true;
    this.onload?.();
  }
  fail() {
    this.done = true;
    this.onerror?.();
  }
  static inFlight() {
    return FakeXHR.all.filter((x) => !x.done).length;
  }
}

const original = globalThis.XMLHttpRequest;
beforeEach(() => {
  FakeXHR.all = [];
  (globalThis as unknown as { XMLHttpRequest: unknown }).XMLHttpRequest =
    FakeXHR;
});
afterEach(() => {
  globalThis.XMLHttpRequest = original;
});

const file = (name: string, bytes = 100) => new File(['x'.repeat(bytes)], name);

describe('useFileUpload', () => {
  test('posts multipart to url with the extra fields, headers and credentials', () => {
    const { result } = renderHook(() =>
      useFileUpload({
        url: '/api/upload',
        field: 'blob',
        extraFields: { expires: '1h' },
        headers: { 'X-Token': 't' },
        withCredentials: true,
      }),
    );
    const a = file('a.txt');
    act(() => result.current.add([a]));
    const [xhr] = FakeXHR.all;
    expect(xhr.method).toBe('POST');
    expect(xhr.url).toBe('/api/upload');
    expect(xhr.headers).toEqual({ 'X-Token': 't' });
    expect(xhr.withCredentials).toBe(true);
    expect(xhr.body?.get('expires')).toBe('1h');
    expect((xhr.body?.get('blob') as File).name).toBe('a.txt');
    expect(result.current.items[0].state).toEqual({
      status: 'uploading',
      loaded: 0,
      total: 100,
    });
  });

  test('progress events update loaded/total, batched to a frame', async () => {
    const { result } = renderHook(() => useFileUpload({ url: '/u' }));
    act(() => result.current.add([file('a')]));
    const [xhr] = FakeXHR.all;
    act(() => {
      xhr.progress(10, 100);
      xhr.progress(40, 100);
    });
    await waitFor(() =>
      expect(result.current.items[0].state).toEqual({
        status: 'uploading',
        loaded: 40,
        total: 100,
      }),
    );
  });

  test('a burst of progress events in one frame is one render', async () => {
    let renders = 0;
    const { result } = renderHook(() => {
      renders += 1;
      return useFileUpload({ url: '/u' });
    });
    act(() => result.current.add([file('a')]));
    const before = renders;
    const [xhr] = FakeXHR.all;
    for (let i = 1; i <= 20; i++) xhr.progress(i * 5, 100);
    expect(renders).toBe(before);
    await waitFor(() =>
      expect(result.current.items[0].state).toEqual({
        status: 'uploading',
        loaded: 100,
        total: 100,
      }),
    );
    expect(renders).toBe(before + 1);
  });

  test('a 2xx is done with the parsed body; a 4xx is error with status and body', () => {
    const { result } = renderHook(() => useFileUpload({ url: '/u' }));
    act(() => result.current.add([file('a'), file('b')]));
    const [a, b] = FakeXHR.all;
    act(() => a.respond(201, '{"url":"https://x/abc"}'));
    act(() => b.respond(413, 'too big'));
    expect(result.current.items[0].state).toEqual({
      status: 'done',
      response: { url: 'https://x/abc' },
    });
    expect(result.current.items[1].state).toEqual({
      status: 'error',
      httpStatus: 413,
      body: 'too big',
    });
  });

  test('cancel aborts the request and leaves the item canceled', () => {
    const { result } = renderHook(() => useFileUpload({ url: '/u' }));
    act(() => result.current.add([file('a')]));
    const [xhr] = FakeXHR.all;
    act(() => result.current.cancel(result.current.items[0].id));
    expect(xhr.aborted).toBe(true);
    expect(result.current.items[0].state).toEqual({ status: 'canceled' });
    // A late event from the aborted request changes nothing.
    act(() => xhr.respond(200, 'late'));
    expect(result.current.items[0].state).toEqual({ status: 'canceled' });
  });

  test('retry re-sends a failed upload', () => {
    const { result } = renderHook(() => useFileUpload({ url: '/u' }));
    const a = file('a');
    act(() => result.current.add([a]));
    act(() => FakeXHR.all[0].fail());
    expect(result.current.items[0].state).toEqual({ status: 'error' });
    act(() => result.current.retry(result.current.items[0].id));
    expect(FakeXHR.all).toHaveLength(2);
    expect((FakeXHR.all[1].body?.get('file') as File).name).toBe(a.name);
    act(() => FakeXHR.all[1].respond(200, 'ok'));
    expect(result.current.items[0].state).toEqual({
      status: 'done',
      response: 'ok',
    });
  });

  test('concurrency: 2 never has more than 2 in flight, and the queue drains in order', () => {
    const { result } = renderHook(() =>
      useFileUpload({ url: '/u', concurrency: 2 }),
    );
    let peak = 0;
    const watch = () => {
      peak = Math.max(peak, FakeXHR.inFlight());
    };
    act(() =>
      result.current.add([
        file('a'),
        file('b'),
        file('c'),
        file('d'),
        file('e'),
      ]),
    );
    watch();
    expect(FakeXHR.all).toHaveLength(2);
    expect(result.current.items.map((i) => i.state.status)).toEqual([
      'uploading',
      'uploading',
      'queued',
      'queued',
      'queued',
    ]);

    act(() => FakeXHR.all[0].respond(200, ''));
    watch();
    act(() => result.current.cancel(result.current.items[1].id));
    watch();
    act(() => FakeXHR.all[2].fail());
    watch();
    act(() => FakeXHR.all[3].respond(200, ''));
    watch();
    act(() => FakeXHR.all[4].respond(200, ''));
    watch();

    expect(peak).toBeLessThanOrEqual(2);
    expect(FakeXHR.all).toHaveLength(5);
    expect(
      (FakeXHR.all.map((x) => x.body?.get('file')) as File[]).map(
        (f) => f.name,
      ),
    ).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(result.current.items.map((i) => i.state.status)).toEqual([
      'done',
      'canceled',
      'error',
      'done',
      'done',
    ]);
  });

  test('a queued item can be canceled before it starts, and never sends', () => {
    const { result } = renderHook(() =>
      useFileUpload({ url: '/u', concurrency: 1 }),
    );
    act(() => result.current.add([file('a'), file('b')]));
    act(() => result.current.cancel(result.current.items[1].id));
    act(() => FakeXHR.all[0].respond(200, ''));
    expect(FakeXHR.all).toHaveLength(1);
    expect(result.current.items[1].state).toEqual({ status: 'canceled' });
  });

  test('remove aborts and forgets; unmount aborts what is running', () => {
    const { result, unmount } = renderHook(() => useFileUpload({ url: '/u' }));
    act(() => result.current.add([file('a'), file('b')]));
    act(() => result.current.remove(result.current.items[0].id));
    expect(FakeXHR.all[0].aborted).toBe(true);
    expect(result.current.items.map((i) => i.file.name)).toEqual(['b']);
    unmount();
    expect(FakeXHR.all[1].aborted).toBe(true);
  });
});
