import { describe, expect, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { Trash2 } from 'lucide-react';
import { FileItem, formatBytes } from './file-item';
import { RowActions } from './row-actions';

describe('FileItem', () => {
  test('uploading: a role="progressbar" with aria-valuenow in percent', () => {
    render(
      <FileItem
        name="cat.png"
        size={2048}
        status="uploading"
        progress={0.42}
      />,
    );
    const bar = screen.getByRole('progressbar', { name: 'cat.png' });
    expect(bar.getAttribute('aria-valuenow')).toBe('42');
    expect(bar.getAttribute('aria-valuemin')).toBe('0');
    expect(bar.getAttribute('aria-valuemax')).toBe('100');
    const fill = bar.firstElementChild as HTMLElement;
    expect(fill.style.width).toBe('42%');
    // `Progress`'s neutral fill, not a colour of its own.
    expect(fill.className.split(' ')).toContain('bg-ink');
  });

  test('uploading with no progress is indeterminate: a progressbar with no value', () => {
    render(<FileItem name="cat.png" size={1} status="uploading" />);
    expect(
      screen.getByRole('progressbar').getAttribute('aria-valuenow'),
    ).toBeNull();
  });

  test('error: the errorText is shown, and there is no bar', () => {
    render(
      <FileItem
        name="cat.png"
        size={1}
        status="error"
        errorText="The server said no"
      />,
    );
    expect(screen.getByRole('alert').textContent).toBe('The server said no');
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  test('done: no bar, no error', () => {
    render(
      <FileItem name="cat.png" size={1} status="done" errorText="ignored" />,
    );
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  test('a thumbnail is a decorative image; an image without one is a skeleton', () => {
    const { container, rerender } = render(
      <FileItem
        name="cat.png"
        size={1}
        mime="image/png"
        status="done"
        thumbnailUrl="blob:x"
      />,
    );
    expect(container.querySelector('img')?.getAttribute('alt')).toBe('');
    rerender(
      <FileItem name="cat.png" size={1} mime="image/png" status="uploading" />,
    );
    expect(container.querySelector('img')).toBeNull();
    expect(
      container.querySelector('.animate-pulse, [class*="animate-pulse"]'),
    ).not.toBeNull();
  });

  test('is a row, not glass, and hosts RowActions', () => {
    const { container } = render(
      <FileItem
        name="cat.png"
        size={1}
        status="done"
        meta={<span>23h</span>}
        actions={
          <RowActions
            actions={[
              { id: 'rm', label: 'Remove', icon: Trash2, onSelect: () => {} },
            ]}
          />
        }
      />,
    );
    const row = container.firstElementChild as HTMLElement;
    expect(row.className).not.toMatch(/\bglass/);
    expect(row.querySelectorAll('.glass, .glass-strong')).toHaveLength(0);
    expect(row.className.split(' ')).toContain('group/row-actions');
    expect(screen.getByRole('button', { name: 'Remove' })).toBeDefined();
    expect(screen.getByText('23h')).toBeDefined();
  });

  test('formats the size in the locale, as a unit', () => {
    expect(formatBytes(512, 'en')).toBe('512 byte');
    expect(formatBytes(1536, 'en')).toBe('1.5 kB');
    expect(formatBytes(50 * 1024 * 1024, 'en')).toBe('50 MB');
  });
});
