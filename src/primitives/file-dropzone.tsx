'use client';

import {
  type ClipboardEvent as ReactClipboardEvent,
  type DragEvent,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { cn } from '../lib/cn';

/**
 * #110 — somewhere to put a file.
 *
 * glass-ui had no file input of any kind, and FilesDrop (an anonymous drop for
 * files) is nothing else. So this is the neutral half: a zone that takes files
 * by drop, by the native picker and by paste, and says which ones it refused.
 * The other half — the cat, the copy, the illustration for each state — is the
 * application's, and comes in through `children`. Per this package's rule that
 * a primitive does not guess product language, the only string here is
 * `label`, and it is required.
 *
 * **One control.** The whole zone is a `role="button"` that opens the picker on
 * click, Enter and Space; the `<input type="file">` is `hidden` beside it, not
 * inside it, so the input's own click cannot bubble back into the zone's and
 * open the picker twice. A `div` rather than a `<button>` so a slot may hold
 * any layout, and so Space opens on keydown without the native button's
 * keyup activation racing it. The ring is `base.css`'s, as everywhere.
 *
 * **`dragging` is about files, and it does not flicker.** `dragenter` and
 * `dragleave` fire for every child the pointer crosses, so a boolean set on
 * enter and cleared on leave goes false the moment the pointer reaches the
 * illustration inside the zone. A counter does not: +1 per enter, -1 per leave,
 * dragging while it is above zero. A `drop` or a `dragend` anywhere on the
 * page resets it, because a counter that misses one leave would
 * otherwise stay lit forever. A drag carrying text or a link (no `Files` in its
 * types) never lights it, and a drop of one is ignored — a mis-dropped link
 * becoming an upload is a surprise (#110, open question, default no).
 *
 * **Refusals are reported, not swallowed.** `accept`, `maxSize` and `maxFiles`
 * split every drop into the files that go to `onFiles` and the rejections that
 * go to `onReject`, each with a reason. Type and size are checked first; of
 * what survives, files past `maxFiles` are `too-many`.
 *
 * **Paste.** `pasteTarget="self"` (the default) takes files pasted while the
 * zone has focus; `"document"` takes them from anywhere on the page, which is
 * what a single-purpose drop page wants; `"none"` turns it off. A paste with
 * no files — text — does nothing and is left to whoever else wants it.
 *
 * **Material.** `glass-strong`, because it carries a label. The dashed rim is
 * `--color-line-strong`, the hairline that already sits beside the glass
 * edge. The lift while dragging is a scale and an opacity, both `motion-safe`,
 * so under `prefers-reduced-motion` they resolve at once.
 */

export type FileRejection = {
  file: File;
  reason: 'too-large' | 'type' | 'too-many';
};

export type FileDropzoneState = { dragging: boolean; disabled: boolean };

export interface FileDropzoneProps {
  onFiles(files: File[]): void;
  onReject?(rejections: FileRejection[]): void;
  /** MIME types (`image/png`, `image/*`) or extensions (`.zip`). Empty is any. */
  accept?: string[];
  /** Bytes, per file. */
  maxSize?: number;
  /** Per drop, pick or paste. */
  maxFiles?: number;
  multiple?: boolean;
  disabled?: boolean;
  pasteTarget?: 'document' | 'self' | 'none';
  /** The zone's accessible name. Required: the zone has no copy of its own. */
  label: string;
  children?: ReactNode | ((state: FileDropzoneState) => ReactNode);
  className?: string;
}

/** Does `file` match one `accept` entry: an extension, `type/*`, or a MIME type. */
function accepts(file: File, accept: readonly string[]): boolean {
  if (accept.length === 0) return true;
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return accept.some((raw) => {
    const rule = raw.trim().toLowerCase();
    if (rule.startsWith('.')) return name.endsWith(rule);
    if (rule.endsWith('/*')) return type.startsWith(rule.slice(0, -1));
    return type === rule;
  });
}

/** Splits files into the accepted and the refused, in the order they came. */
export function sortFiles(
  files: readonly File[],
  rules: { accept?: readonly string[]; maxSize?: number; maxFiles?: number },
): { accepted: File[]; rejected: FileRejection[] } {
  const accepted: File[] = [];
  const rejected: FileRejection[] = [];
  for (const file of files) {
    if (!accepts(file, rules.accept ?? []))
      rejected.push({ file, reason: 'type' });
    else if (rules.maxSize !== undefined && file.size > rules.maxSize)
      rejected.push({ file, reason: 'too-large' });
    else if (rules.maxFiles !== undefined && accepted.length >= rules.maxFiles)
      rejected.push({ file, reason: 'too-many' });
    else accepted.push(file);
  }
  return { accepted, rejected };
}

/** True when a drag carries files, and not only text or a link. */
function carriesFiles(data: DataTransfer | null): boolean {
  if (!data) return false;
  return Array.from(data.types ?? []).includes('Files');
}

export function FileDropzone({
  onFiles,
  onReject,
  accept = [],
  maxSize,
  maxFiles,
  multiple = true,
  disabled = false,
  pasteTarget = 'self',
  label,
  children,
  className,
}: FileDropzoneProps) {
  const input = useRef<HTMLInputElement>(null);
  const depth = useRef(0);
  const [dragging, setDragging] = useState(false);

  const reset = useCallback(() => {
    depth.current = 0;
    setDragging(false);
  }, []);

  const take = useCallback(
    (list: FileList | readonly File[] | null | undefined) => {
      const files = Array.from(list ?? []);
      if (disabled || files.length === 0) return;
      const { accepted, rejected } = sortFiles(files, {
        accept,
        maxSize,
        maxFiles: multiple ? maxFiles : 1,
      });
      if (accepted.length > 0) onFiles(accepted);
      if (rejected.length > 0) onReject?.(rejected);
    },
    [accept, disabled, maxFiles, maxSize, multiple, onFiles, onReject],
  );

  // A counter that missed a leave would stay lit, so any drop or dragend on
  // the page puts it back to zero — including a drop the zone never saw.
  useEffect(() => {
    window.addEventListener('drop', reset);
    window.addEventListener('dragend', reset);
    return () => {
      window.removeEventListener('drop', reset);
      window.removeEventListener('dragend', reset);
    };
  }, [reset]);

  useEffect(() => {
    if (pasteTarget !== 'document' || disabled) return;
    const paste = (e: ClipboardEvent) => {
      const files = e.clipboardData?.files;
      if (!files || files.length === 0) return;
      e.preventDefault();
      take(files);
    };
    document.addEventListener('paste', paste);
    return () => document.removeEventListener('paste', paste);
  }, [disabled, pasteTarget, take]);

  const open = () => {
    if (!disabled) input.current?.click();
  };

  const onDragEnter = (e: DragEvent<HTMLDivElement>) => {
    if (disabled || !carriesFiles(e.dataTransfer)) return;
    e.preventDefault();
    depth.current += 1;
    setDragging(true);
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (disabled || !carriesFiles(e.dataTransfer)) return;
    // Without this the browser refuses the drop and opens the file instead.
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    if (disabled || !carriesFiles(e.dataTransfer)) return;
    depth.current = Math.max(0, depth.current - 1);
    if (depth.current === 0) setDragging(false);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    if (!carriesFiles(e.dataTransfer)) return;
    e.preventDefault();
    reset();
    take(e.dataTransfer.files);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    open();
  };

  const onPaste = (e: ReactClipboardEvent<HTMLDivElement>) => {
    if (pasteTarget !== 'self') return;
    const files = e.clipboardData?.files;
    if (!files || files.length === 0) return;
    e.preventDefault();
    take(files);
  };

  const state: FileDropzoneState = {
    dragging: dragging && !disabled,
    disabled,
  };

  return (
    <>
      {/* biome-ignore lint/a11y/useSemanticElements: a zone that holds any slot layout; see the note above. */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={label}
        aria-disabled={disabled || undefined}
        data-state={disabled ? 'disabled' : dragging ? 'dragging' : 'idle'}
        onClick={open}
        onKeyDown={onKeyDown}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onPaste={onPaste}
        className={cn(
          'glass-strong relative flex flex-col items-center justify-center gap-3',
          'rounded-surface border border-dashed border-line-strong p-6 text-ink',
          'cursor-pointer select-none',
          'motion-safe:transition-[transform,opacity,background-color] motion-safe:duration-(--dur-fast)',
          state.dragging && 'scale-[1.01] bg-hover',
          disabled && 'cursor-not-allowed opacity-40',
          className,
        )}
      >
        {typeof children === 'function' ? children(state) : children}
      </div>
      <input
        ref={input}
        type="file"
        hidden
        tabIndex={-1}
        aria-hidden="true"
        multiple={multiple}
        accept={accept.length > 0 ? accept.join(',') : undefined}
        disabled={disabled}
        onChange={(e) => {
          take(e.currentTarget.files);
          // The same file picked twice is still a pick.
          e.currentTarget.value = '';
        }}
      />
    </>
  );
}
