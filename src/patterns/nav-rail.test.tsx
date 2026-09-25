import { describe, expect, test } from 'bun:test';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Calendar, Inbox, Sparkles, Sun, Wallet } from 'lucide-react';
import { useState } from 'react';
import type { NavLinkRender } from './nav-link';
import { NavRail, type NavRailGroup } from './nav-rail';

const link: NavLinkRender = ({ href, className, children, ...rest }) => (
  <a href={href} className={className} {...rest}>
    {children}
  </a>
);

function groups(activeId: string): NavRailGroup[] {
  return [
    {
      id: 'today',
      title: 'Today',
      items: [
        { id: 'inbox', label: 'Inbox', icon: Inbox, href: '/inbox' },
        { id: 'today', label: 'Today', icon: Sun, href: '/today' },
        { id: 'calendar', label: 'Calendar', icon: Calendar, href: '/calendar' },
      ],
    },
    {
      id: 'sections',
      title: 'Sections',
      items: [
        { id: 'reflection', label: 'Reflection', icon: Sparkles, href: '/reflection' },
        {
          id: 'finance',
          label: 'Finance',
          icon: Wallet,
          href: '/finance',
          unavailable: 'unavailable',
        },
      ],
    },
  ].map((group) => ({
    ...group,
    items: group.items.map((item) => ({
      ...item,
      active: item.id === activeId,
    })),
  }));
}

function Shell({ collapsed = false }: { collapsed?: boolean }) {
  const [activeId, setActiveId] = useState('inbox');
  return (
    <NavRail
      aria-label="Sections"
      collapsed={collapsed}
      groups={groups(activeId).map((group) => ({
        ...group,
        items: group.items.map((item) => ({
          ...item,
          href: undefined,
          onSelect: () => setActiveId(item.id),
        })),
      }))}
    />
  );
}

const capsulesIn = (root: ParentNode) =>
  root.querySelectorAll('[aria-hidden="true"].absolute.inset-0');

describe('NavRail', () => {
  test('renders each group as a list named by its heading', () => {
    render(<NavRail aria-label="Sections" link={link} groups={groups('inbox')} />);

    // A named `<ul>`, not a `role="group"` wrapper: "list, Today, three items"
    // is what assistive technology already announces for this shape.
    const rendered = screen.getAllByRole('list');
    expect(rendered).toHaveLength(2);
    expect(
      rendered.map((g) =>
        document.getElementById(g.getAttribute('aria-labelledby') ?? '')
          ?.textContent,
      ),
    ).toEqual(['Today', 'Sections']);
    expect(screen.getByRole('list', { name: 'Today' })).toBeDefined();

    expect(screen.getAllByRole('link')).toHaveLength(5);
  });

  test('the rail is glass and nothing inside it is', () => {
    render(<NavRail aria-label="Sections" link={link} groups={groups('inbox')} />);

    const rail = screen.getByRole('navigation', { name: 'Sections' });
    expect(rail.className.split(' ')).toContain('glass');
    expect(rail.querySelectorAll('.glass, .glass-strong')).toHaveLength(0);
  });

  test('one capsule, in the active item, and it travels', async () => {
    render(<Shell />);

    const rail = screen.getByRole('navigation', { name: 'Sections' });
    const inbox = screen.getByRole('button', { name: 'Inbox' });
    const calendar = screen.getByRole('button', { name: 'Calendar' });

    expect(capsulesIn(rail)).toHaveLength(1);
    expect(capsulesIn(inbox)).toHaveLength(1);

    fireEvent.click(calendar);

    await waitFor(() => {
      expect(capsulesIn(rail)).toHaveLength(1);
      expect(capsulesIn(calendar)).toHaveLength(1);
    });
    expect(capsulesIn(inbox)).toHaveLength(0);
  });

  test('the active item carries `aria-current`', () => {
    render(<NavRail aria-label="Sections" link={link} groups={groups('today')} />);
    const current = screen.getByRole('link', { current: 'page' });
    expect(current.textContent).toBe('Today');
  });

  /**
   * A coloured dot is nothing at all in the accessibility tree, so the marker
   * is two halves: the dot for the eye and a phrase the consumer wrote for the
   * reader. The section stays in the rail and stays navigable — a missing row
   * cannot say why it is missing.
   */
  test('an unavailable item is marked, named and still navigable', () => {
    render(<NavRail aria-label="Sections" link={link} groups={groups('inbox')} />);

    const finance = screen.getByRole('link', { name: 'Finance unavailable' });
    expect(finance.getAttribute('href')).toBe('/finance');
    expect(finance.querySelectorAll('.bg-warn')).toHaveLength(1);
  });

  describe('collapsed', () => {
    test('every item keeps its name for a reader and its place in the order', () => {
      render(
        <NavRail
          aria-label="Sections"
          link={link}
          collapsed
          groups={groups('inbox')}
        />,
      );

      const links = screen.getAllByRole('link');
      expect(links).toHaveLength(5);
      // `textContent` concatenates the two spans with no separator; the
      // accessible name, which is what a reader hears, joins them with one —
      // that is the `Finance unavailable` lookup in the test above.
      expect(links.map((a) => a.textContent)).toEqual([
        'Inbox',
        'Today',
        'Calendar',
        'Reflection',
        'Financeunavailable',
      ]);
      expect(
        screen.getByRole('link', { name: 'Finance unavailable' }),
      ).toBeDefined();
    });

    test('the labels leave the eye but not the tree', () => {
      const { rerender } = render(
        <NavRail aria-label="Sections" link={link} groups={groups('inbox')} />,
      );
      const open = screen
        .getByRole('link', { name: 'Inbox' })
        .querySelector('span.truncate');
      expect(open).not.toBeNull();

      rerender(
        <NavRail
          aria-label="Sections"
          link={link}
          collapsed
          groups={groups('inbox')}
        />,
      );
      const shut = screen.getByRole('link', { name: 'Inbox' });
      expect(shut.querySelector('span.truncate')).toBeNull();
      expect(shut.querySelector('span.sr-only')?.textContent).toBe('Inbox');
    });

    test('the visible name is a `Tooltip`, opened on focus', async () => {
      render(
        <NavRail
          aria-label="Sections"
          link={link}
          collapsed
          groups={groups('inbox')}
        />,
      );
      const inbox = screen.getByRole('link', { name: 'Inbox' });
      expect(inbox.getAttribute('title')).toBeNull();
      expect(screen.queryByRole('tooltip')).toBeNull();

      fireEvent.focus(inbox);

      const tip = await screen.findByRole('tooltip');
      expect(tip.textContent).toBe('Inbox');
    });

    test('the group headings go, and a hairline takes their place', () => {
      render(
        <NavRail
          aria-label="Sections"
          link={link}
          collapsed
          groups={groups('inbox')}
        />,
      );

      const rendered = screen.getAllByRole('list');
      const heading = document.getElementById(
        rendered[0]?.getAttribute('aria-labelledby') ?? '',
      );
      expect(heading?.className).toContain('sr-only');
      // The hairline is on the wrapper, which is the list's parent.
      expect(rendered[1]?.parentElement?.className).toContain('border-t');
    });
  });

  test('head and footer are drawn where they are given', () => {
    render(
      <NavRail
        aria-label="Sections"
        link={link}
        groups={groups('inbox')}
        head={<span>Denitsa</span>}
        footer={<span>v0.2.0</span>}
      />,
    );

    const rail = screen.getByRole('navigation', { name: 'Sections' });
    expect(rail.firstElementChild?.textContent).toBe('Denitsa');
    expect(rail.lastElementChild?.textContent).toBe('v0.2.0');
  });
});
