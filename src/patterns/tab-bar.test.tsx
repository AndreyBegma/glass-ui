import { describe, expect, test } from 'bun:test';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Bot, Gauge, Inbox, ListChecks, Settings, Wrench } from 'lucide-react';
import { useState } from 'react';
import type { NavLinkRender } from './nav-link';
import { TabBar, type TabBarItem } from './tab-bar';

/** The consumer's anchor. In an application this is `next/link`. */
const link: NavLinkRender = ({ href, className, children, ...rest }) => (
  <a href={href} className={className} {...rest}>
    {children}
  </a>
);

const FIVE = [
  { id: 'inbox', label: 'Inbox', icon: Inbox, href: '/inbox' },
  { id: 'agents', label: 'Agents', icon: Bot, href: '/agents' },
  { id: 'tasks', label: 'Tasks', icon: ListChecks, href: '/tasks' },
  { id: 'usage', label: 'Usage', icon: Gauge, href: '/usage' },
  { id: 'tools', label: 'Tools', icon: Wrench, href: '/tools' },
];

const items = (activeId: string): TabBarItem[] =>
  FIVE.map((item) => ({ ...item, active: item.id === activeId }));

const pills = () => document.querySelectorAll('[data-tab-bar-pill]');

function Shell() {
  const [activeId, setActiveId] = useState('inbox');
  const [moreOpen, setMoreOpen] = useState(false);
  return (
    <TabBar
      aria-label="Main"
      items={items(activeId).map((item) => ({
        ...item,
        href: undefined,
        onSelect: () => setActiveId(item.id),
      }))}
      more={{
        label: 'More',
        title: 'Everything else',
        open: moreOpen,
        onOpenChange: setMoreOpen,
        children: (
          <a href="/settings">
            <Settings aria-hidden="true" /> Settings
          </a>
        ),
      }}
    />
  );
}

describe('TabBar', () => {
  test('five items through the consumer’s link, the active one marked as the page', () => {
    render(<TabBar aria-label="Main" link={link} items={items('tasks')} />);
    const links = screen.getAllByRole('link');
    expect(links.map((a) => a.getAttribute('href'))).toEqual(FIVE.map((i) => i.href));
    const current = screen.getByRole('link', { current: 'page' });
    expect(current.textContent).toBe('Tasks');
  });

  test('a glass strip pinned to the bottom edge, full width, with a hairline on top', () => {
    render(<TabBar aria-label="Main" link={link} items={items('inbox')} />);
    const nav = screen.getByRole('navigation', { name: 'Main' });
    const classes = Array.from(nav.classList);
    for (const c of ['glass', 'fixed', 'inset-x-0', 'bottom-0', 'border-t', 'z-chrome']) {
      expect(classes).toContain(c);
    }
  });

  test('safe-area aware: the inset is inside the bar and inside the clearance below the page', () => {
    const { container } = render(<TabBar aria-label="Main" link={link} items={items('inbox')} />);
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(nav.classList.contains('pb-[env(safe-area-inset-bottom)]')).toBe(true);
    const spacer = container.firstElementChild as HTMLElement;
    expect(spacer.getAttribute('aria-hidden')).toBe('true');
    expect(spacer.className).toContain('env(safe-area-inset-bottom)');
  });

  test('the active item is the accent; the others are ink-3', () => {
    render(<TabBar aria-label="Main" link={link} items={items('usage')} />);
    for (const a of screen.getAllByRole('link')) {
      const active = a.getAttribute('aria-current') === 'page';
      expect(a.classList.contains('text-accent-ink')).toBe(active);
      expect(a.classList.contains('text-ink-3')).toBe(!active);
    }
    expect(pills()).toHaveLength(1);
    expect(
      screen.getByRole('link', { current: 'page' }).querySelector('[data-tab-bar-pill]')?.className,
    ).toContain('bg-accent-soft');
  });

  test('an item with no `href` is a button that calls onSelect, and the pill travels', async () => {
    render(<Shell />);
    expect(screen.queryAllByRole('link')).toHaveLength(0);
    const tasks = screen.getByRole('button', { name: 'Tasks' });
    fireEvent.click(tasks);
    await waitFor(() => {
      expect(pills()).toHaveLength(1);
      expect(tasks.querySelector('[data-tab-bar-pill]')).not.toBeNull();
    });
    expect(tasks.getAttribute('aria-current')).toBe('page');
  });

  test('`More` opens a bottom sheet and holds the selection while it is open', async () => {
    render(<Shell />);
    const more = screen.getByRole('button', { name: 'More' });
    expect(more.getAttribute('aria-haspopup')).toBe('dialog');
    expect(more.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(more);
    const sheet = await screen.findByRole('dialog', { name: 'Everything else' });
    expect(sheet.textContent).toContain('Settings');
    await waitFor(() => expect(pills()).toHaveLength(1));
    expect(
      screen
        .getByRole('button', { name: 'More', hidden: true })
        .querySelector('[data-tab-bar-pill]'),
    ).not.toBeNull();
  });

  test('press feedback respects reduced motion', () => {
    render(<TabBar aria-label="Main" link={link} items={items('inbox')} />);
    const cls = Array.from(screen.getAllByRole('link')[0]?.classList ?? []);
    expect(cls).toContain('motion-safe:active:scale-[0.97]');
  });

  test('a className reaches the bar', () => {
    render(<TabBar aria-label="Main" link={link} items={items('inbox')} className="lg:hidden" />);
    expect(screen.getByRole('navigation', { name: 'Main' }).classList.contains('lg:hidden')).toBe(
      true,
    );
  });
});

describe('item badge (issue 130)', () => {
  const withBadge = (badge: TabBarItem['badge']): TabBarItem[] =>
    items('inbox').map((item) => (item.id === 'tasks' ? { ...item, badge } : item));

  test('a count rides the glyph and is spoken after the label', () => {
    render(
      <TabBar
        aria-label="Main"
        link={link}
        items={withBadge({ count: 3, tone: 'warn', label: '3 waiting approvals' })}
      />,
    );
    const tasks = screen.getByRole('link', { name: 'Tasks 3 waiting approvals' });
    const hidden = Array.from(tasks.querySelectorAll('[aria-hidden="true"]'));
    expect(hidden.map((el) => el.textContent)).toContain('3');
  });

  test('without a label the count itself is spoken', () => {
    render(<TabBar aria-label="Main" link={link} items={withBadge({ count: 120 })} />);
    expect(screen.getByRole('link', { name: 'Tasks 120' })).toBeDefined();
  });

  test('a zero count draws nothing', () => {
    const { container } = render(
      <TabBar aria-label="Main" link={link} items={withBadge({ count: 0 })} />,
    );
    const plain = render(<TabBar aria-label="Main" link={link} items={items('inbox')} />);
    expect(screen.getAllByRole('link', { name: 'Tasks' })).toHaveLength(2);
    expect(container.innerHTML).toBe(plain.container.innerHTML);
  });
});
