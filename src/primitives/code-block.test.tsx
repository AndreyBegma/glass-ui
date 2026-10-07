import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { CodeBlock } from './code-block';

const code = 'const a = 1;\nconst b = 2;';

let written: string[];
const original = Object.getOwnPropertyDescriptor(navigator, 'clipboard');

beforeEach(() => {
  written = [];
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText: async (text: string) => {
        written.push(text);
      },
    },
  });
});

afterEach(() => {
  if (original) Object.defineProperty(navigator, 'clipboard', original);
  else Reflect.deleteProperty(navigator, 'clipboard');
});

const pre = (container: HTMLElement) =>
  container.querySelector('pre') as HTMLElement;

describe('CodeBlock', () => {
  test('renders <pre><code> in font-mono with the language label', () => {
    const { container } = render(<CodeBlock code={code} language="ts" />);
    expect(pre(container).className.split(' ')).toContain('font-mono');
    expect(container.querySelector('pre > code')?.textContent).toBe(code);
    expect(screen.getByText('ts')).not.toBeNull();
  });

  test('copy writes the code to the (mocked) clipboard and shows "Copied"', async () => {
    render(<CodeBlock code={code} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy code' }));
    });
    expect(written).toEqual([code]);
    expect(screen.getByRole('button', { name: 'Copied' })).not.toBeNull();
  });

  test('copy={false} drops the copy button', () => {
    render(<CodeBlock code={code} copy={false} />);
    expect(screen.queryByRole('button', { name: 'Copy code' })).toBeNull();
  });

  test('wrap toggles white-space', () => {
    const { container } = render(<CodeBlock code={code} />);
    expect(pre(container).style.whiteSpace).toBe('pre');
    fireEvent.click(screen.getByRole('button', { name: 'Wrap lines' }));
    expect(pre(container).style.whiteSpace).toBe('pre-wrap');
    fireEvent.click(screen.getByRole('button', { name: 'Wrap lines' }));
    expect(pre(container).style.whiteSpace).toBe('pre');
  });

  test('controlled wrap follows the prop and reports through onWrapChange', () => {
    const seen: boolean[] = [];
    const { container, rerender } = render(
      <CodeBlock code={code} wrap={false} onWrapChange={(w) => seen.push(w)} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Wrap lines' }));
    expect(seen).toEqual([true]);
    // The parent did not accept it: the block does not move on its own.
    expect(pre(container).style.whiteSpace).toBe('pre');
    rerender(<CodeBlock code={code} wrap onWrapChange={(w) => seen.push(w)} />);
    expect(pre(container).style.whiteSpace).toBe('pre-wrap');
    expect(
      screen
        .getByRole('button', { name: 'Wrap lines' })
        .getAttribute('aria-pressed'),
    ).toBe('true');
  });

  test('uncontrolled wrap starts from defaultWrap', () => {
    const { container } = render(<CodeBlock code={code} defaultWrap />);
    expect(pre(container).style.whiteSpace).toBe('pre-wrap');
    fireEvent.click(screen.getByRole('button', { name: 'Wrap lines' }));
    expect(pre(container).style.whiteSpace).toBe('pre');
  });

  test('maxHeight bounds the scroll area', () => {
    const { container } = render(<CodeBlock code={code} maxHeight={120} />);
    expect(pre(container).style.maxHeight).toBe('120px');
    expect(pre(container).className.split(' ')).toContain('overflow-auto');
  });

  test('no sonner in the module graph when importing only the subpath', async () => {
    const files = [
      './code-block.tsx',
      './code-block-copy.ts',
      './button.tsx',
      './tooltip.tsx',
    ];
    for (const f of files) {
      const src = await Bun.file(new URL(f, import.meta.url)).text();
      expect(src).not.toMatch(
        /from ['"]sonner['"]|from ['"][^'"]*toast[^'"]*['"]/,
      );
    }
  });

  test('renders under data-theme light, dark and data-material flat', () => {
    for (const attr of [
      ['data-theme', 'light'],
      ['data-theme', 'dark'],
      ['data-material', 'flat'],
    ] as const) {
      document.documentElement.setAttribute(attr[0], attr[1]);
      const { container, unmount } = render(<CodeBlock code={code} />);
      expect(container.innerHTML).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(/i);
      // A solid surface, never glass.
      expect((container.firstElementChild as HTMLElement).className).toContain(
        'bg-raised',
      );
      expect(
        (container.firstElementChild as HTMLElement).className,
      ).not.toContain('glass');
      unmount();
      document.documentElement.removeAttribute(attr[0]);
    }
  });

  test('touch targets are at least 44px on a coarse pointer', () => {
    render(<CodeBlock code={code} />);
    for (const name of ['Wrap lines', 'Copy code']) {
      const cls = screen.getByRole('button', { name }).className.split(' ');
      expect(cls).toContain('after:h-(--size-tap)');
      expect(cls).toContain('[@media(pointer:fine)]:after:hidden');
    }
  });
});
