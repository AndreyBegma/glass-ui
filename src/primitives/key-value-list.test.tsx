import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { KeyValueList } from './key-value-list';

const items = [
  { key: 'model', label: 'Model', value: 'opus' },
  {
    key: 'cwd',
    label: 'Cwd',
    value: '/home/archi/dev/glass-ui',
    copyValue: '/home/archi/dev/glass-ui',
  },
];

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

describe('KeyValueList', () => {
  test('renders dl/dt/dd', () => {
    const { container } = render(<KeyValueList items={items} />);
    expect(container.querySelector('dl')).not.toBeNull();
    expect(container.querySelectorAll('dt').length).toBe(2);
    expect(container.querySelectorAll('dd').length).toBe(2);
    expect(container.querySelector('dt')?.textContent).toBe('Model');
    expect(container.querySelector('dd')?.textContent).toBe('opus');
  });

  test('copy button writes copyValue to the (mocked) clipboard and shows "Copied"', async () => {
    render(<KeyValueList items={items} />);
    expect(screen.queryAllByRole('button').length).toBe(1);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy Cwd' }));
    });
    expect(written).toEqual(['/home/archi/dev/glass-ui']);
    expect(screen.getByRole('button', { name: 'Copied' })).not.toBeNull();
    expect(screen.getByText('Copied')).not.toBeNull();
  });

  test('long values truncate with the full text in a Tooltip', async () => {
    const long = 'x'.repeat(200);
    render(<KeyValueList items={[{ key: 'k', label: 'Key', value: long }]} />);
    const cell = screen.getByText(long);
    expect(cell.className.split(' ')).toContain('truncate');
    // The trigger is focusable, and focus opens the tooltip with the full text.
    expect(cell.getAttribute('tabindex')).toBe('0');
    await act(async () => {
      cell.focus();
    });
    expect((await screen.findAllByText(long)).length).toBeGreaterThan(1);
  });

  test('two columns collapse to one below the narrow breakpoint', () => {
    const { container, rerender } = render(
      <KeyValueList items={items} columns={2} />,
    );
    const cls = (container.firstElementChild as HTMLElement).className.split(
      ' ',
    );
    expect(cls).toContain('grid-cols-1');
    expect(cls).toContain('sm:grid-cols-2');
    rerender(<KeyValueList items={items} />);
    expect(
      (container.firstElementChild as HTMLElement).className,
    ).not.toContain('sm:grid-cols-2');
  });

  test('dense tightens the gaps', () => {
    const { container } = render(<KeyValueList items={items} dense />);
    const dl = container.firstElementChild as HTMLElement;
    expect(dl.hasAttribute('data-dense')).toBe(true);
    expect(dl.className.split(' ')).toContain('gap-y-1');
  });

  test('renders under data-theme light, dark and data-material flat', () => {
    for (const attr of [
      ['data-theme', 'light'],
      ['data-theme', 'dark'],
      ['data-material', 'flat'],
    ] as const) {
      document.documentElement.setAttribute(attr[0], attr[1]);
      const { container, unmount } = render(<KeyValueList items={items} />);
      expect(container.innerHTML).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(/i);
      expect(container.querySelectorAll('dd').length).toBe(2);
      unmount();
      document.documentElement.removeAttribute(attr[0]);
    }
  });

  test('touch targets are at least 44px on a coarse pointer', () => {
    render(<KeyValueList items={items} />);
    const cls = screen
      .getByRole('button', { name: 'Copy Cwd' })
      .className.split(' ');
    expect(cls).toContain('after:h-(--size-tap)');
    expect(cls).toContain('[@media(pointer:fine)]:after:hidden');
  });
});
