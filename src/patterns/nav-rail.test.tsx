import { describe, expect, test } from 'bun:test';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Calendar, Inbox, Sparkles, Sun, Wallet } from 'lucide-react';
import { useState } from 'react';
import type { NavLinkRender } from './nav-link';
import { NavRail, type NavRailGroup } from './nav-rail';
import { scrollToNearest } from './nav-rail-parts';

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

  test('the active item is the accent: its tint, and the ink made for it (#93)', () => {
    render(<NavRail aria-label="Sections" link={link} groups={groups('today')} />);
    const active = screen.getByRole('link', { current: 'page' });
    expect(active.className.split(' ')).toContain('text-accent-ink');
    const capsule = active.querySelector('[aria-hidden="true"].absolute.inset-0');
    expect(capsule?.className.split(' ')).toContain('bg-accent-soft');
    for (const other of screen.getAllByRole('link').filter((a) => a !== active)) {
      expect(other.className).not.toContain('accent');
    }
  });

  test('an expanded item presses like a row, a collapsed one like a control (#93)', () => {
    const { unmount } = render(<NavRail aria-label="Sections" link={link} groups={groups('today')} />);
    for (const item of screen.getAllByRole('link')) {
      expect(item.className.split(' ')).toContain('press-row');
    }
    unmount();
    render(<NavRail aria-label="Sections" link={link} groups={groups('today')} collapsed />);
    for (const item of screen.getAllByRole('link')) {
      expect(item.className.split(' ')).not.toContain('press-row');
    }
  });

  test('the active item carries `aria-current`', () => {
    render(<NavRail aria-label="Sections" link={link} groups={groups('today')} />);
    const current = screen.getByRole('link', { current: 'page' });
    expect(current.textContent).toBe('Today');
  });

  /**
   * #124 — an item that acts rather than navigates is a `<button>`, and a
   * button centres its text by default. The label is a `flex-1` span, so it
   * inherited that and sat centred in the row while the link beside it did
   * not. The alignment is now stated on the row, not inherited.
   */
  test('an item that acts aligns like one that navigates', () => {
    render(<Shell />);

    const inbox = screen.getByRole('button', { name: 'Inbox' });
    expect(inbox.className.split(' ')).toContain('text-left');
  });

  /**
   * The link half of the same claim. `Shell` strips every `href`, so the test
   * above only ever renders buttons — this is the mixed rail #124 describes.
   */
  test('a navigating item states the same alignment', () => {
    render(<NavRail aria-label="Sections" link={link} groups={groups('inbox')} />);

    const inbox = screen.getByRole('link', { name: 'Inbox' });
    expect(inbox.className.split(' ')).toContain('text-left');
  });

  /**
   * The row is never given a `justify-*` of its own, so nothing can merge
   * over the folded square's `justify-center`.
   */
  test('the folded item still centres', () => {
    render(<Shell collapsed />);

    const inbox = screen.getByRole('button', { name: 'Inbox' });
    expect(inbox.className.split(' ')).toContain('justify-center');
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

/**
 * #130 — the rail's first scroll must not touch focus. `scrollIntoView` moved
 * Chromium's sequential-focus starting point to the active item, so the first
 * Tab after a load skipped the skip link and landed on the next rail item.
 */
describe('initial scroll and focus (issue 130)', () => {
  test('mounting scrolls without scrollIntoView and leaves focus where it was', () => {
    const calls: unknown[] = [];
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function () {
      calls.push(this);
    };
    try {
      render(
        <>
          <a href="#main">Skip to content</a>
          <NavRail aria-label="Sections" link={link} groups={groups('finance')} />
        </>,
      );
      expect(calls).toEqual([]);
      expect(document.activeElement).toBe(document.body);
    } finally {
      Element.prototype.scrollIntoView = original;
    }
  });

  const box = (top: number, bottom: number) =>
    ({ getBoundingClientRect: () => ({ top, bottom }) }) as unknown as HTMLElement;
  const scroller = (top: number, bottom: number, scrollTop: number) =>
    Object.assign(box(top, bottom), { scrollTop }) as HTMLElement;

  test('an item below the fold scrolls the rail down just far enough', () => {
    const rail = scroller(0, 200, 0);
    scrollToNearest(rail, box(300, 340));
    expect(rail.scrollTop).toBe(140);
  });

  test('an item above the fold scrolls the rail up just far enough', () => {
    const rail = scroller(0, 200, 500);
    scrollToNearest(rail, box(-60, -20));
    expect(rail.scrollTop).toBe(440);
  });

  test('an item already in view does not move the rail', () => {
    const rail = scroller(0, 200, 80);
    scrollToNearest(rail, box(40, 80));
    expect(rail.scrollTop).toBe(80);
  });
});
