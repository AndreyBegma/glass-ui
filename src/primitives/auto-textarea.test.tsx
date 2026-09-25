import { describe, expect, test } from 'bun:test';
import { fireEvent, render } from '@testing-library/react';
import { createRef } from 'react';
import { AutoTextarea } from './auto-textarea';

describe('AutoTextarea', () => {
  test('caps its inline max-height style at maxHeight (default 160px)', () => {
    const { container } = render(<AutoTextarea aria-label="Message" />);
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea.style.maxHeight).toBe('160px');
  });

  test('accepts a custom maxHeight', () => {
    const { container } = render(
      <AutoTextarea aria-label="Message" maxHeight={240} />,
    );
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea.style.maxHeight).toBe('240px');
  });

  test('starts as a single row and stays resize-none', () => {
    const { container } = render(<AutoTextarea aria-label="Message" />);
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea.getAttribute('rows')).toBe('1');
    expect(textarea.className).toContain('resize-none');
  });

  // FEAT-20260916-614 — a caller's ref sees the element, and the resize on
  // input still runs with one present (the internal ref is not replaced).
  test('composes a caller ref with its own', () => {
    const outer = createRef<HTMLTextAreaElement>();
    const { container } = render(
      <AutoTextarea aria-label="Message" ref={outer} />,
    );
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    expect(outer.current).toBe(textarea);
    fireEvent.input(textarea, { target: { value: 'a\nb\nc' } });
    expect(textarea.style.height).not.toBe('');
  });

  test('calls a function ref with the element', () => {
    const seen: (HTMLTextAreaElement | null)[] = [];
    const { container } = render(
      <AutoTextarea
        aria-label="Message"
        ref={(node) => {
          seen.push(node);
        }}
      />,
    );
    expect(seen[0]).toBe(
      container.querySelector('textarea') as HTMLTextAreaElement,
    );
  });
});
