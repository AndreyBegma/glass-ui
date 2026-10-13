'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * #110 — uploads with progress, a queue and a cancel button's worth of state.
 *
 * No UI and no copy: this is the state machine `FileItem` is drawn from, and
 * an application that wants a different row reads the same `items`.
 *
 * **`XMLHttpRequest`, on purpose.** `fetch` has no upload progress — a
 * streamed request body reports how much was *handed* to the network stack,
 * not how much arrived — and a file drop without a moving bar reads as a hang.
 * XHR's `upload.onprogress` is still the only portable answer.
 *
 * **One render per frame, at most.** A large file fires `progress` dozens of
 * times a second. Each event writes into a ref and asks for one animation
 * frame; the frame commits whatever arrived since the last one. So a hundred
 * events in a frame are one render, and a list of uploads costs a render per
 * frame in total, not per event per item. Starts, finishes and failures commit
 * at once — they change what the row *is*, not how full it is.
 *
 * **A queue, not a stampede.** `concurrency` (3) uploads run at once; the rest
 * wait as `queued` and start in the order they were added as slots free up.
 * `cancel` aborts a running request (or drops a queued one) and leaves the
 * item `canceled`; `retry` puts a failed or canceled item back in the queue;
 * `remove` does what `cancel` does and then forgets the item. Unmounting
 * aborts everything still running.
 *
 * The request is `multipart/form-data`: `extraFields` first, then the file
 * under `field` (`file`). A 2xx is `done` with the response body (parsed as
 * JSON when it is JSON); anything else is `error` with the status and body; a
 * network failure is `error` with neither.
 */

export type UploadState =
  | { status: 'queued' }
  | { status: 'uploading'; loaded: number; total: number }
  | { status: 'done'; response: unknown }
  | { status: 'error'; httpStatus?: number; body?: unknown }
  | { status: 'canceled' };

export type UploadItem = { id: string; file: File; state: UploadState };

export interface UseFileUploadOptions {
  url: string;
  /** The multipart field the file goes in. */
  field?: string;
  extraFields?: Record<string, string>;
  headers?: Record<string, string>;
  concurrency?: number;
  withCredentials?: boolean;
}

export interface UseFileUpload {
  items: UploadItem[];
  add(files: File[]): void;
  cancel(id: string): void;
  retry(id: string): void;
  remove(id: string): void;
}

let sequence = 0;
const nextId = () =>
  `upload-${Date.now().toString(36)}-${(sequence++).toString(36)}`;

function parse(xhr: XMLHttpRequest): unknown {
  const text = xhr.responseText;
  if (!text) return text;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

const frame = (run: () => void): (() => void) => {
  if (typeof requestAnimationFrame === 'function') {
    const handle = requestAnimationFrame(run);
    return () => cancelAnimationFrame(handle);
  }
  const handle = setTimeout(run, 16);
  return () => clearTimeout(handle);
};

export function useFileUpload(options: UseFileUploadOptions): UseFileUpload {
  const [items, setItems] = useState<UploadItem[]>([]);

  // The truth lives in refs, so the XHR callbacks — which outlive the render
  // that created them — always see the current list and the current options.
  const list = useRef<UploadItem[]>([]);
  const requests = useRef(new Map<string, XMLHttpRequest>());
  const pending = useRef<(() => void) | null>(null);
  const opts = useRef(options);
  opts.current = options;
  const mounted = useRef(true);

  const commit = useCallback(() => {
    pending.current?.();
    pending.current = null;
    if (mounted.current) setItems(list.current.slice());
  }, []);

  const commitNextFrame = useCallback(() => {
    if (pending.current) return;
    pending.current = frame(() => {
      pending.current = null;
      if (mounted.current) setItems(list.current.slice());
    });
  }, []);

  const write = useCallback((id: string, state: UploadState) => {
    list.current = list.current.map((item) =>
      item.id === id ? { ...item, state } : item,
    );
  }, []);

  // `pump` and `send` call each other through this ref: a finished request
  // frees a slot, and the slot starts the next one.
  const pumpRef = useRef<() => void>(() => {});

  const send = useCallback(
    (item: UploadItem) => {
      const {
        url,
        field = 'file',
        extraFields,
        headers,
        withCredentials = false,
      } = opts.current;
      const xhr = new XMLHttpRequest();
      requests.current.set(item.id, xhr);
      write(item.id, { status: 'uploading', loaded: 0, total: item.file.size });

      const finish = (state: UploadState) => {
        if (requests.current.get(item.id) !== xhr) return;
        requests.current.delete(item.id);
        write(item.id, state);
        commit();
        pumpRef.current();
      };

      xhr.upload.onprogress = (e) => {
        if (requests.current.get(item.id) !== xhr) return;
        write(item.id, {
          status: 'uploading',
          loaded: e.loaded,
          total: e.lengthComputable ? e.total : item.file.size,
        });
        commitNextFrame();
      };
      xhr.onload = () => {
        const body = parse(xhr);
        finish(
          xhr.status >= 200 && xhr.status < 300
            ? { status: 'done', response: body }
            : { status: 'error', httpStatus: xhr.status, body },
        );
      };
      xhr.onerror = () => finish({ status: 'error' });
      xhr.ontimeout = () => finish({ status: 'error' });

      xhr.open('POST', url);
      xhr.withCredentials = withCredentials;
      for (const [name, value] of Object.entries(headers ?? {}))
        xhr.setRequestHeader(name, value);
      const form = new FormData();
      for (const [name, value] of Object.entries(extraFields ?? {}))
        form.append(name, value);
      form.append(field, item.file, item.file.name);
      xhr.send(form);
    },
    [commit, commitNextFrame, write],
  );

  const pump = useCallback(() => {
    const limit = Math.max(1, opts.current.concurrency ?? 3);
    let running = requests.current.size;
    for (const item of list.current) {
      if (running >= limit) break;
      if (item.state.status !== 'queued') continue;
      running += 1;
      send(item);
    }
    commit();
  }, [commit, send]);
  pumpRef.current = pump;

  const abort = useCallback((id: string) => {
    const xhr = requests.current.get(id);
    if (!xhr) return;
    // Forget it first, so the `abort` event's own callbacks find nothing.
    requests.current.delete(id);
    xhr.abort();
  }, []);

  const add = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;
      list.current = [
        ...list.current,
        ...files.map((file) => ({
          id: nextId(),
          file,
          state: { status: 'queued' } as const,
        })),
      ];
      pump();
    },
    [pump],
  );

  const cancel = useCallback(
    (id: string) => {
      const item = list.current.find((i) => i.id === id);
      if (
        !item ||
        (item.state.status !== 'queued' && item.state.status !== 'uploading')
      )
        return;
      abort(id);
      write(id, { status: 'canceled' });
      pump();
    },
    [abort, pump, write],
  );

  const retry = useCallback(
    (id: string) => {
      const item = list.current.find((i) => i.id === id);
      if (
        !item ||
        (item.state.status !== 'error' && item.state.status !== 'canceled')
      )
        return;
      write(id, { status: 'queued' });
      pump();
    },
    [pump, write],
  );

  const remove = useCallback(
    (id: string) => {
      abort(id);
      list.current = list.current.filter((i) => i.id !== id);
      pump();
    },
    [abort, pump],
  );

  useEffect(() => {
    mounted.current = true;
    const live = requests.current;
    return () => {
      mounted.current = false;
      pending.current?.();
      pending.current = null;
      for (const xhr of live.values()) xhr.abort();
      live.clear();
    };
  }, []);

  return { items, add, cancel, retry, remove };
}
