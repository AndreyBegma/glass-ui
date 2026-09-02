import { describe, expect, test } from 'bun:test';
import { render } from '@testing-library/react';
import { AutoTextarea } from './auto-textarea';

describe('AutoTextarea', () => {
  test('caps its inline max-height style at maxHeight (default 160px)', () => {
    const { container } = render(<AutoTextarea aria-label="Message" />);
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea.style.maxHeight).toBe('160px');
  });

  test('accepts a custom maxHeight', () => {
    const { container } = render(<AutoTextarea aria-label="Message" maxHeight={240} />);
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea.style.maxHeight).toBe('240px');
  });

  test('starts as a single row and stays resize-none', () => {
    const { container } = render(<AutoTextarea aria-label="Message" />);
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea.getAttribute('rows')).toBe('1');
    expect(textarea.className).toContain('resize-none');
  });
});
