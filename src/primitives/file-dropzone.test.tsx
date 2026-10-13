import { describe, expect, mock, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { FileDropzone, type FileRejection, sortFiles } from './file-dropzone';

/**
 * #110 — the acceptance criteria for `FileDropzone`, one test each.
 *
 * happy-dom has no drag source and no clipboard, so the events carry a plain
 * object as their `dataTransfer` / `clipboardData`: the `types` and `files` a
 * browser would hand over. What is asserted is what the zone does with them.
 */

const file = (name: string, bytes: number, type = 'text/plain') =>
  new File(['x'.repeat(bytes)], name, { type });

const withFiles = (files: File[]) => ({
  dataTransfer: { types: ['Files'], files, dropEffect: 'none' },
});
const withText = {
  dataTransfer: { types: ['text/plain', 'text/uri-list'], files: [] },
};

const zone = () => screen.getByRole('button', { name: 'Drop files' });
const hiddenInput = () =>
  document.querySelector('input[type="file"]') as HTMLInputElement;

describe('FileDropzone', () => {
  test('dropping 2 files calls onFiles with exactly those 2 files', () => {
    const onFiles = mock((_: File[]) => {});
    render(<FileDropzone label="Drop files" onFiles={onFiles} />);
    const a = file('a.txt', 3);
    const b = file('b.txt', 4);
    fireEvent.drop(zone(), withFiles([a, b]));
    expect(onFiles).toHaveBeenCalledTimes(1);
    expect(onFiles.mock.calls[0][0]).toEqual([a, b]);
    expect(onFiles.mock.calls[0][0][0]).toBe(a);
    expect(onFiles.mock.calls[0][0][1]).toBe(b);
  });

  test('dropping text or a link calls nothing', () => {
    const onFiles = mock(() => {});
    const onReject = mock(() => {});
    render(
      <FileDropzone label="Drop files" onFiles={onFiles} onReject={onReject} />,
    );
    fireEvent.dragEnter(zone(), withText);
    expect(zone().getAttribute('data-state')).toBe('idle');
    fireEvent.drop(zone(), withText);
    expect(onFiles).not.toHaveBeenCalled();
    expect(onReject).not.toHaveBeenCalled();
  });

  test('maxSize=10: an 11-byte file is rejected as too-large and not passed on', () => {
    const onFiles = mock((_: File[]) => {});
    const onReject = mock((_: FileRejection[]) => {});
    render(
      <FileDropzone
        label="Drop files"
        maxSize={10}
        onFiles={onFiles}
        onReject={onReject}
      />,
    );
    const big = file('big.txt', 11);
    const ok = file('ok.txt', 10);
    fireEvent.drop(zone(), withFiles([big, ok]));
    expect(onFiles.mock.calls[0][0]).toEqual([ok]);
    expect(onReject.mock.calls[0][0]).toEqual([
      { file: big, reason: 'too-large' },
    ]);
  });

  test('accept: a file of another type is rejected as type', () => {
    const onFiles = mock((_: File[]) => {});
    const onReject = mock((_: FileRejection[]) => {});
    render(
      <FileDropzone
        label="Drop files"
        accept={['image/*', '.zip']}
        onFiles={onFiles}
        onReject={onReject}
      />,
    );
    const png = file('cat.png', 1, 'image/png');
    const zip = file('cats.ZIP', 1, 'application/zip');
    const txt = file('notes.txt', 1);
    fireEvent.drop(zone(), withFiles([png, txt, zip]));
    expect(onFiles.mock.calls[0][0]).toEqual([png, zip]);
    expect(onReject.mock.calls[0][0]).toEqual([{ file: txt, reason: 'type' }]);
  });

  test('maxFiles: files past the limit are rejected as too-many; only rejections means no onFiles', () => {
    const onFiles = mock((_: File[]) => {});
    const onReject = mock((_: FileRejection[]) => {});
    render(
      <FileDropzone
        label="Drop files"
        maxFiles={2}
        onFiles={onFiles}
        onReject={onReject}
      />,
    );
    const [a, b, c] = [file('a', 1), file('b', 1), file('c', 1)];
    fireEvent.drop(zone(), withFiles([a, b, c]));
    expect(onFiles.mock.calls[0][0]).toEqual([a, b]);
    expect(onReject.mock.calls[0][0]).toEqual([
      { file: c, reason: 'too-many' },
    ]);
  });

  test('multiple={false} takes one file per drop', () => {
    const onFiles = mock((_: File[]) => {});
    const onReject = mock((_: FileRejection[]) => {});
    render(
      <FileDropzone
        label="Drop files"
        multiple={false}
        onFiles={onFiles}
        onReject={onReject}
      />,
    );
    const [a, b] = [file('a', 1), file('b', 1)];
    fireEvent.drop(zone(), withFiles([a, b]));
    expect(onFiles.mock.calls[0][0]).toEqual([a]);
    expect(onReject.mock.calls[0][0]).toEqual([
      { file: b, reason: 'too-many' },
    ]);
  });

  test('sortFiles checks type and size before counting', () => {
    const [big, a, b] = [file('big', 50), file('a', 1), file('b', 1)];
    expect(sortFiles([big, a, b], { maxSize: 10, maxFiles: 2 })).toEqual({
      accepted: [a, b],
      rejected: [{ file: big, reason: 'too-large' }],
    });
  });

  test('moving from the zone onto a child does not toggle dragging', () => {
    const states: boolean[] = [];
    render(
      <FileDropzone label="Drop files" onFiles={() => {}}>
        {({ dragging }) => {
          states.push(dragging);
          return (
            <div data-testid="art">
              <span data-testid="inner">drop</span>
            </div>
          );
        }}
      </FileDropzone>,
    );
    const art = screen.getByTestId('art');
    const inner = screen.getByTestId('inner');
    const payload = withFiles([file('a', 1)]);

    // Into the zone, then into a child, then a grandchild: each `dragenter`
    // fires on the new element before the `dragleave` of the one it left.
    fireEvent.dragEnter(zone(), payload);
    expect(zone().getAttribute('data-state')).toBe('dragging');
    fireEvent.dragEnter(art, payload);
    fireEvent.dragLeave(zone(), payload);
    expect(zone().getAttribute('data-state')).toBe('dragging');
    fireEvent.dragEnter(inner, payload);
    fireEvent.dragLeave(art, payload);
    expect(zone().getAttribute('data-state')).toBe('dragging');
    // And back out, one level at a time.
    fireEvent.dragEnter(art, payload);
    fireEvent.dragLeave(inner, payload);
    expect(zone().getAttribute('data-state')).toBe('dragging');
    fireEvent.dragLeave(art, payload);
    expect(zone().getAttribute('data-state')).toBe('idle');

    // `dragging` went true once and false once: no flicker in between.
    const flips = states.filter((s, i) => i > 0 && s !== states[i - 1]).length;
    expect(flips).toBe(2);
  });

  test('a drop, or a dragend anywhere, resets the counter', () => {
    render(<FileDropzone label="Drop files" onFiles={() => {}} />);
    const payload = withFiles([file('a', 1)]);
    fireEvent.dragEnter(zone(), payload);
    fireEvent.dragEnter(zone(), payload);
    fireEvent.drop(zone(), payload);
    expect(zone().getAttribute('data-state')).toBe('idle');
    fireEvent.dragEnter(zone(), payload);
    fireEvent(window, new Event('dragend'));
    expect(zone().getAttribute('data-state')).toBe('idle');
  });

  test('keyboard: Tab reaches the zone, Enter and Space open the picker', () => {
    render(<FileDropzone label="Drop files" onFiles={() => {}} />);
    expect(zone().tabIndex).toBe(0);
    zone().focus();
    expect(document.activeElement).toBe(zone());
    // The ring is base.css's `:focus-visible` outline; the zone must not opt out.
    expect(zone().className).not.toContain('outline-none');

    const click = mock(() => {});
    hiddenInput().addEventListener('click', click);
    fireEvent.keyDown(zone(), { key: 'Enter' });
    expect(click).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(zone(), { key: ' ' });
    expect(click).toHaveBeenCalledTimes(2);
    // The input is outside the zone, so its click does not bubble back in.
    expect(zone().contains(hiddenInput())).toBe(false);
  });

  test('picking through the hidden input goes through the same checks', () => {
    const onFiles = mock((_: File[]) => {});
    render(<FileDropzone label="Drop files" onFiles={onFiles} />);
    const a = file('a', 1);
    fireEvent.change(hiddenInput(), { target: { files: [a] } });
    expect(onFiles.mock.calls[0][0]).toEqual([a]);
  });

  test('pasteTarget="document": a paste with files anywhere calls onFiles; text does nothing', () => {
    const onFiles = mock((_: File[]) => {});
    render(
      <FileDropzone
        label="Drop files"
        pasteTarget="document"
        onFiles={onFiles}
      />,
    );

    const paste = (files: File[]) => {
      const e = new Event('paste', { bubbles: true, cancelable: true });
      Object.defineProperty(e, 'clipboardData', {
        value: { files, types: files.length ? ['Files'] : ['text/plain'] },
      });
      document.body.dispatchEvent(e);
    };

    paste([]);
    expect(onFiles).not.toHaveBeenCalled();
    const a = file('shot.png', 1, 'image/png');
    paste([a]);
    expect(onFiles.mock.calls[0][0]).toEqual([a]);
  });

  test('pasteTarget="self" (the default) ignores a paste on the document', () => {
    const onFiles = mock(() => {});
    render(<FileDropzone label="Drop files" onFiles={onFiles} />);
    const e = new Event('paste', { bubbles: true });
    Object.defineProperty(e, 'clipboardData', {
      value: { files: [file('a', 1)] },
    });
    document.body.dispatchEvent(e);
    expect(onFiles).not.toHaveBeenCalled();
  });

  test('disabled: not focusable, no picker, no drag state, no files', () => {
    const onFiles = mock(() => {});
    render(
      <FileDropzone label="Drop files" disabled onFiles={onFiles}>
        {({ disabled }) => (disabled ? 'off' : 'on')}
      </FileDropzone>,
    );
    expect(zone().tabIndex).toBe(-1);
    expect(zone().getAttribute('aria-disabled')).toBe('true');
    expect(zone().textContent).toBe('off');
    const click = mock(() => {});
    hiddenInput().addEventListener('click', click);
    fireEvent.click(zone());
    fireEvent.keyDown(zone(), { key: 'Enter' });
    expect(click).not.toHaveBeenCalled();
    fireEvent.dragEnter(zone(), withFiles([file('a', 1)]));
    expect(zone().getAttribute('data-state')).toBe('disabled');
    fireEvent.drop(zone(), withFiles([file('a', 1)]));
    expect(onFiles).not.toHaveBeenCalled();
  });

  test('is glass-strong with a dashed hairline rim, and its motion is motion-safe only', () => {
    render(<FileDropzone label="Drop files" onFiles={() => {}} />);
    const classes = zone().className.split(' ');
    expect(classes).toContain('glass-strong');
    expect(classes).toContain('border-dashed');
    expect(classes).toContain('border-line-strong');
    const transitions = classes.filter(
      (c) => c.includes('transition') || c.includes('duration'),
    );
    expect(transitions.length).toBeGreaterThan(0);
    for (const c of transitions)
      expect(c.startsWith('motion-safe:')).toBe(true);
  });
});
