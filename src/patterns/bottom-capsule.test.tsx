import { describe, expect, test } from 'bun:test';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  Calendar,
  CheckSquare,
  Inbox,
  Sparkles,
  Sun,
} from 'lucide-react';
import { useState } from 'react';
import { BottomCapsule, type BottomCapsuleTab } from './bottom-capsule';
import type { NavLinkRender } from './nav-link';

/** The consumer's anchor. In an application this is `next/link`. */
const link: NavLinkRender = ({ href, className, children, ...rest }) => (
  <a href={href} className={className} {...rest}>
    {children}
  </a>
);

function tabs(activeId: string): BottomCapsuleTab[] {
  return [
    { id: 'today', label: 'Today', icon: Sun, href: '/today' },
    { id: 'inbox', label: 'Inbox', icon: Inbox, href: '/inbox' },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare, href: '/tasks' },
    { id: 'calendar', label: 'Calendar', icon: Calendar, href: '/calendar' },
  ].map((tab) => ({ ...tab, active: tab.id === activeId }));
}

/** The shell as a consumer writes it: every piece of state is out here. */
function Shell({ initial = 'today' }: { initial?: string }) {
  const [activeId, setActiveId] = useState(initial);
  const [moreOpen, setMoreOpen] = useState(false);
  const [askOpen, setAskOpen] = useState(false);

  return (
    <BottomCapsule
      aria-label="Main navigation"
      link={link}
      tabs={tabs(activeId).map((tab) => ({
        ...tab,
        href: undefined,
        onSelect: () => setActiveId(tab.id),
      }))}
      more={{
        label: 'More',
        title: 'Everything else',
        open: moreOpen,
        onOpenChange: setMoreOpen,
        children: <a href="/projects">Projects</a>,
      }}
      action={{
        label: 'Ask Denitsa',
        icon: Sparkles,
        morphFrom: 'ask-surface',
        open: askOpen,
        onSelect: () => setAskOpen(true),
      }}
    />
  );
}

describe('BottomCapsule', () => {
  test('renders four tabs through the consumer’s link, and marks the active one', () => {
    render(
      <BottomCapsule
        aria-label="Main navigation"
        link={link}
        tabs={tabs('tasks')}
      />,
    );

    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(4);
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '/today',
      '/inbox',
      '/tasks',
      '/calendar',
    ]);

    const current = screen.getByRole('link', { current: 'page' });
    expect(current.textContent).toBe('Tasks');
    expect(nav.className).toContain('glass');
  });

  test('a tab with no `href` is a button', () => {
    render(
      <BottomCapsule
        aria-label="Main navigation"
        tabs={[{ id: 'today', label: 'Today', icon: Sun, active: true }]}
      />,
    );

    expect(screen.queryAllByRole('link')).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Today' })).toBeDefined();
  });

  /**
   * The travelling capsule: exactly one of them, always, and it lives inside
   * whichever tab is selected. Two at once is the case Motion crossfades, and
   * zero is a bar with no selection.
   */
  test('one capsule, inside the selected tab, and it travels', async () => {
    render(<Shell />);

    const capsules = () => document.querySelectorAll('nav [aria-hidden="true"].absolute');
    const today = screen.getByRole('button', { name: 'Today' });
    const tasks = screen.getByRole('button', { name: 'Tasks' });

    expect(capsules()).toHaveLength(1);
    expect(today.querySelector('[aria-hidden="true"].absolute')).not.toBeNull();

    fireEvent.click(tasks);

    await waitFor(() => {
      expect(capsules()).toHaveLength(1);
      expect(tasks.querySelector('[aria-hidden="true"].absolute')).not.toBeNull();
    });
    expect(today.querySelector('[aria-hidden="true"].absolute')).toBeNull();
  });

  /**
   * The ordinary case that breaks the `layoutId` invariant if nothing stops it:
   * a person on Today taps `More`, Today is still the active route, and two
   * elements own one `layoutId`. Motion crossfades instead of travelling, and
   * it does so silently.
   */
  test('opening `More` takes the selection, so there is still only one capsule', async () => {
    render(<Shell />);

    const today = screen.getByRole('button', { name: 'Today' });
    expect(today.querySelector('[aria-hidden="true"].absolute')).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'More' }));

    await waitFor(() =>
      expect(
        document.querySelectorAll('nav [aria-hidden="true"].absolute'),
      ).toHaveLength(1),
    );
    expect(
      screen
        .getByRole('button', { name: 'More', hidden: true })
        .querySelector('[aria-hidden="true"].absolute'),
    ).not.toBeNull();
    expect(
      screen
        .getByRole('button', { name: 'Today', hidden: true })
        .querySelector('[aria-hidden="true"].absolute'),
    ).toBeNull();
  });

  test('the action is a circle beside the capsule, not a fifth tab', () => {
    render(<Shell />);

    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    const ask = screen.getByRole('button', { name: 'Ask Denitsa' });

    expect(nav.contains(ask)).toBe(false);
    expect(ask.getAttribute('aria-current')).toBeNull();
  });

  /**
   * The `morphFrom` handoff, which is the whole reason `open` is a prop rather
   * than a class: the circle has to leave the tree for the surface carrying the
   * same `layoutId` to be the only owner of it.
   */
  test('the action circle unmounts while its surface is open', async () => {
    render(<Shell />);

    fireEvent.click(screen.getByRole('button', { name: 'Ask Denitsa' }));

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Ask Denitsa' })).toBeNull(),
    );
  });

  test('`More` opens a sheet holding whatever did not fit', async () => {
    render(<Shell />);

    const more = screen.getByRole('button', { name: 'More' });
    expect(more.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(more);

    const sheet = await screen.findByRole('dialog', { name: 'Everything else' });
    expect(sheet.textContent).toContain('Projects');

    // `hidden: true` because the sheet is modal: Radix marks the rest of the
    // document `aria-hidden` while it is up, so the bar is genuinely out of the
    // accessibility tree — which is the behaviour we want, not an obstacle.
    expect(
      screen
        .getByRole('button', { name: 'More', hidden: true })
        .getAttribute('aria-expanded'),
    ).toBe('true');
  });

  /**
   * The spacer ships with the bar, so a page rendered without the capsule has
   * no dead space at the bottom either — and it carries the safe-area inset,
   * without which the last row of a list sits under the home indicator.
   */
  test('ships its own bottom spacer, inset included', () => {
    const { container } = render(
      <BottomCapsule
        aria-label="Main navigation"
        link={link}
        tabs={tabs('today')}
      />,
    );

    const spacer = container.firstElementChild;
    expect(spacer?.getAttribute('aria-hidden')).toBe('true');
    expect(spacer?.className).toBe(
      'h-[calc(6rem+env(safe-area-inset-bottom))]',
    );
  });

  test('the bar is glass and carries no breakpoint of its own', () => {
    render(
      <BottomCapsule
        aria-label="Main navigation"
        link={link}
        tabs={tabs('today')}
        className="lg:hidden"
      />,
    );

    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    const bar = nav.parentElement;
    // The consumer decides when a phone is a phone; the package takes the
    // class and has none of its own.
    expect(bar?.className).toContain('lg:hidden');
    expect(nav.className.split(' ')).toContain('glass');
  });
});
