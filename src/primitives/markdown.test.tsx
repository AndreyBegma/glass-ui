import { describe, expect, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { Markdown } from './markdown';

const md = (source: string, props: Partial<Parameters<typeof Markdown>[0]> = {}) =>
  render(<Markdown {...props}>{source}</Markdown>).container;

describe('Markdown', () => {
  test('renders', () => {
    const { container } = render(<Markdown>hello</Markdown>);
    expect(container.textContent).toBe('hello');
  });

  describe('each GFM construct maps to the right kit element', () => {
    test('headings are on the type scale and carry slug ids', () => {
      const container = md('# Getting started\n\n## Next: steps!\n\n### Small');
      const h1 = container.querySelector('h1') as HTMLElement;
      expect(h1.id).toBe('getting-started');
      expect(h1.className).toContain('text-heading');
      expect(container.querySelector('h2')?.id).toBe('next-steps');
      expect(container.querySelector('h2')?.className).toContain('text-section');
      expect(container.querySelector('h3')?.className).toContain('text-body');
    });

    test('repeated headings get GitHub-style suffixes', () => {
      const container = md('## Notes\n\n## Notes\n\n## Notes');
      const ids = [...container.querySelectorAll('h2')].map((h) => h.id);
      expect(ids).toEqual(['notes', 'notes-1', 'notes-2']);
    });

    test('density is exposed on the root for the compact heading step', () => {
      const container = md('# Title', { density: 'compact' });
      const root = container.firstElementChild as HTMLElement;
      expect(root.dataset.density).toBe('compact');
      expect(root.className).toContain('[&>*+*]:mt-2');
      expect(container.querySelector('h1')?.className).toContain(
        'group-data-[density=compact]/markdown:text-section',
      );
    });

    test('a table renders through the Table primitives', () => {
      const container = md('| Name | Count |\n| :--- | ---: |\n| a | 1 |');
      const table = container.querySelector('table') as HTMLElement;
      expect(table.className).toContain('border-collapse');
      expect(container.querySelector('thead')?.className).toContain('border-line');
      const heads = [...container.querySelectorAll('th')].map((th) => th.textContent);
      expect(heads).toEqual(['Name', 'Count']);
      const cell = container.querySelectorAll('td')[1] as HTMLElement;
      expect(cell.className).toContain('px-3');
      expect(cell.style.textAlign).toBe('right');
    });

    test('task items are disabled Checkboxes named by their text', () => {
      md('- [x] ship it\n- [ ] write docs\n  - nested');
      const done = screen.getByRole('checkbox', { name: 'ship it' }) as HTMLInputElement;
      const todo = screen.getByRole('checkbox', { name: 'write docs' }) as HTMLInputElement;
      expect(done.checked).toBe(true);
      expect(done.disabled).toBe(true);
      expect(todo.checked).toBe(false);
      expect(screen.getByText('nested').tagName).toBe('LI');
    });

    test('a task item in a loose list is still named by its text', () => {
      md('- [x] first\n\n- [ ] second');
      expect((screen.getByRole('checkbox', { name: 'first' }) as HTMLInputElement).checked).toBe(true);
      expect(screen.getByRole('checkbox', { name: 'second' })).toBeTruthy();
    });

    test('a fenced block is a CodeBlock with its language label and copy', () => {
      const container = md('```ts\nconst a = 1;\nconst b = 2;\n```');
      expect(screen.getByText('ts')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Copy code' })).toBeTruthy();
      expect(container.querySelector('pre code')?.textContent).toBe('const a = 1;\nconst b = 2;');
    });

    test('inline code is a token-styled code element', () => {
      const container = md('run `bun test` now');
      const code = container.querySelector('code') as HTMLElement;
      expect(code.textContent).toBe('bun test');
      expect(code.className).toContain('bg-raised');
      expect(container.querySelector('pre')).toBeNull();
    });

    test('blockquote, rule and strikethrough', () => {
      const container = md('> quoted\n\n---\n\n~~gone~~');
      expect(container.querySelector('blockquote')?.className).toContain('border-l-2');
      expect(screen.getByRole('separator')).toBeTruthy();
      expect(container.querySelector('hr')).toBeNull();
      expect(container.querySelector('del')?.textContent).toBe('gone');
    });

    test('an autolink is an external link with rel and, by default, no target', () => {
      md('see https://example.com');
      const link = screen.getByRole('link', { name: 'https://example.com' });
      expect(link.getAttribute('href')).toBe('https://example.com');
      expect(link.getAttribute('rel')).toBe('noreferrer noopener');
      expect(link.hasAttribute('target')).toBe(false);
    });

    test('a relative link gets no rel', () => {
      md('[docs](/docs)');
      expect(screen.getByRole('link', { name: 'docs' }).hasAttribute('rel')).toBe(false);
    });

    test('linkTarget sets the target', () => {
      md('[out](https://example.com) and [in](/here)', {
        linkTarget: (href) => (href.startsWith('http') ? '_blank' : undefined),
      });
      expect(screen.getByRole('link', { name: 'out' }).getAttribute('target')).toBe('_blank');
      expect(screen.getByRole('link', { name: 'in' }).hasAttribute('target')).toBe(false);
    });

    test('footnote chrome takes its labels', () => {
      md('Claim.[^1]\n\n[^1]: Source.', {
        labels: { footnotes: 'Notes', backToReference: (n) => `Up to ${n}` },
      });
      expect(screen.getByRole('heading', { name: 'Notes' }).className).toContain('sr-only');
      expect(screen.getByRole('link', { name: 'Up to 1' })).toBeTruthy();
    });
  });

  test('script and onerror-image sources render as text or nothing', () => {
    const container = md(
      '<script>alert(1)</script>\n\nhi <img src=x onerror="alert(2)"> there\n\n<a href="https://example.com">raw</a>',
    );
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('a')).toBeNull();
    expect(container.textContent).toContain('<script>alert(1)</script>');
    expect(container.textContent).toContain('onerror');
  });

  test('a javascript: link is not a link', () => {
    const container = md(
      '[click](javascript:alert(1)) [data](data:text/html;base64,PHNjcmlwdD4=) [tab](java&#x09;script:alert(1))',
    );
    expect(container.querySelector('a')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
    expect(container.textContent).toContain('click');
  });

  test('a data: image renders nothing', () => {
    const container = md('![pixel](data:image/png;base64,AAAA) ![ok](https://example.com/a.png)');
    const images = container.querySelectorAll('img');
    expect(images.length).toBe(1);
    expect(images[0]?.getAttribute('src')).toBe('https://example.com/a.png');
  });

  test('a components override wins', () => {
    const container = md('# Title\n\n`x`', {
      components: { h1: ({ children }) => <p data-own="h1">{children}</p> },
    });
    expect(container.querySelector('h1')).toBeNull();
    expect(container.querySelector('[data-own="h1"]')?.textContent).toBe('Title');
    // The rest of the mapping stays.
    expect(container.querySelector('code')?.className).toContain('bg-raised');
  });
});
