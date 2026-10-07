import { afterEach, beforeEach, describe, expect, mock, setSystemTime, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { Timeline, type TimelineItem } from './timeline';

// Local-time noon on a fixed day, so "Today" / "Yesterday" are deterministic.
const NOW = new Date(2026, 9, 7, 12, 0, 0);
const at = (daysAgo: number, h = 9, m = 5) =>
  new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - daysAgo, h, m);

const items = (extra: Partial<TimelineItem> = {}): TimelineItem[] => [
  { id: 'a', at: at(0), title: 'Today thing', ...extra },
  { id: 'b', at: at(1), title: 'Yesterday thing' },
  { id: 'c', at: at(5), title: 'Older thing' },
];

beforeEach(() => setSystemTime(NOW));
afterEach(() => setSystemTime());

describe('Timeline', () => {
  test('items on three days render three groups headed "Today", "Yesterday" and a date (frozen clock)', () => {
    const { container } = render(<Timeline items={items()} />);
    const heads = [...container.querySelectorAll('h3')].map((h) => h.textContent);
    expect(heads).toHaveLength(3);
    expect(heads[0]).toBe('Today');
    expect(heads[1]).toBe('Yesterday');
    expect(heads[2]).not.toBe('Today');
    expect(heads[2]).not.toBe('Yesterday');
    expect(heads[2]).toContain('2');
    expect(container.querySelectorAll('section ol')).toHaveLength(3);
  });

  test('day header aria-level is configurable', () => {
    const { container } = render(<Timeline items={items()} dayHeadingLevel={4} />);
    expect(container.querySelector('h3')?.getAttribute('aria-level')).toBe('4');
  });

  test('href items are links and onSelect items are buttons', () => {
    const onSelect = mock(() => {});
    render(
      <Timeline
        items={[
          { id: '1', at: at(0), title: 'Linked', href: '/x' },
          { id: '2', at: at(0), title: 'Pressed', onSelect },
          { id: '3', at: at(0), title: 'Plain' },
        ]}
      />,
    );
    expect(screen.getByRole('link', { name: /Linked/ }).getAttribute('href')).toBe('/x');
    fireEvent.click(screen.getByRole('button', { name: /Pressed/ }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('link', { name: /Plain/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Plain/ })).toBeNull();
  });

  test('"Load more" calls onLoadMore and is disabled while loadingMore', () => {
    const onLoadMore = mock(() => {});
    const { rerender } = render(<Timeline items={items()} hasMore onLoadMore={onLoadMore} />);
    fireEvent.click(screen.getByRole('button', { name: 'Load more' }));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
    rerender(<Timeline items={items()} hasMore loadingMore onLoadMore={onLoadMore} />);
    const btn = screen.getByRole('button', { name: 'Load more' }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    fireEvent.click(btn);
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  test('no Load more button without hasMore', () => {
    render(<Timeline items={items()} />);
    expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull();
  });

  test('newCount shows the "N new" pill and calls onShowNew', () => {
    const onShowNew = mock(() => {});
    render(<Timeline items={items()} newCount={3} onShowNew={onShowNew} />);
    fireEvent.click(screen.getByRole('button', { name: '3 new' }));
    expect(onShowNew).toHaveBeenCalledTimes(1);
  });

  test('no pill when newCount is 0 or absent', () => {
    render(<Timeline items={items()} newCount={0} />);
    expect(screen.queryByText(/new$/)).toBeNull();
  });

  test('tone shows as a dot plus the icon, never colour alone', () => {
    const { container } = render(
      <Timeline
        items={[
          { id: '1', at: at(0), title: 'Boom', tone: 'danger', icon: <i data-testid="ic" /> },
        ]}
      />,
    );
    expect(container.querySelector('[data-dot]')?.className).toContain('bg-danger');
    expect(screen.getByTestId('ic')).not.toBeNull();
    expect(container.textContent).toContain('Error: Boom');
  });

  test('formatTime formats each item time; the default is HH:mm', () => {
    const { container, unmount } = render(<Timeline items={items()} />);
    expect(container.querySelector('time')?.textContent).toBe('09:05');
    unmount();
    const r = render(<Timeline items={items()} formatTime={() => 'just now'} />);
    expect(r.container.querySelector('time')?.textContent).toBe('just now');
  });

  test('renders the actor avatar', () => {
    const { container } = render(
      <Timeline items={[{ id: '1', at: at(0), title: 'x', actor: { name: 'Ada Lovelace' } }]} />,
    );
    expect(container.textContent).toContain('AL');
  });

  test('renders the empty slot when there are no items', () => {
    render(<Timeline items={[]} empty={<p>Nothing yet</p>} />);
    expect(screen.getByText('Nothing yet')).not.toBeNull();
  });

  test('items are solid surfaces, never glass', () => {
    const { container } = render(<Timeline items={items()} />);
    expect(container.querySelector('li')?.className).toContain('bg-raised');
    expect(container.querySelector('[class*="glass"]')).toBeNull();
  });

  test('renders under data-theme light, dark and data-material flat', () => {
    for (const attrs of [
      { 'data-theme': 'light' },
      { 'data-theme': 'dark' },
      { 'data-material': 'flat' },
    ]) {
      const { container, unmount } = render(
        <div {...attrs}>
          <Timeline items={items()} />
        </div>,
      );
      expect(container.querySelector('li')?.className).toContain('bg-raised');
      expect(container.querySelector('[class*="glass"]')).toBeNull();
      expect(container.querySelector('h3')?.className).toContain('text-ink-3');
      unmount();
    }
  });

  test('touch targets are at least 44px on a coarse pointer', () => {
    render(
      <Timeline
        hasMore
        newCount={1}
        items={[{ id: '1', at: at(0), title: 'Pressed', onSelect: () => {} }]}
      />,
    );
    for (const name of [/Pressed/, 'Load more', '1 new'])
      expect(screen.getByRole('button', { name }).className).toContain(
        'pointer-coarse:min-h-(--size-tap)',
      );
  });
});
