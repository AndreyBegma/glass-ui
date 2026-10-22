import { describe, expect, test } from 'bun:test';
import { render } from '@testing-library/react';
import { Markdown } from './markdown';

describe('Markdown', () => {
  test('renders', () => {
    const { container } = render(<Markdown>hello</Markdown>);
    expect(container.textContent).toBe('hello');
  });

  test.todo('each GFM construct maps to the right kit element');
  test.todo('script and onerror-image sources render as text or nothing');
  test.todo('a javascript: link is not a link');
  test.todo('a components override wins');
});
