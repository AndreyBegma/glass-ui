import { afterEach, describe, expect, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { Inbox, KanbanSquare, Sun } from 'lucide-react';
import { renderToString } from 'react-dom/server';
import type { NavLinkRender } from './nav-link';
import { NavRail, type NavRailGroup } from './nav-rail';

/**
 * C-281 (AgentDock S-7) — the rail that folds on a tablet, and the one entry
 * drawn as the door.
 *
 * The fold is CSS (`tablet:max-desktop:`), so the server's HTML is already
 * right at every width; only the tooltips wait for `useBreakpoint`.
 */
const link: NavLinkRender = ({ href, className, children, ...rest }) => (
  <a href={href} className={className} {...rest}>
    {children}
  </a>
);

function groups(activeId = 'inbox'): NavRailGroup[] {
  return [
    {
      id: 'project',
      title: 'Project',
      items: [
        {
          id: 'board',
          label: 'Board',
          icon: KanbanSquare,
          href: '/board',
          primary: true,
        },
        { id: 'inbox', label: 'Inbox', icon: Inbox, href: '/inbox' },
        { id: 'today', label: 'Today', icon: Sun, href: '/today' },
      ].map((item) => ({ ...item, active: item.id === activeId })),
    },
  ];
}

const original = window.matchMedia;
function viewport(width: number) {
  window.matchMedia = ((query: string) => {
    const min = query.match(/min-width: (\d+)px/);
    const max = query.match(/max-width: (\d+)px/);
    return {
      media: query,
      matches:
        (!min || width >= Number(min[1])) && (!max || width <= Number(max[1])),
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    };
  }) as unknown as typeof window.matchMedia;
}
afterEach(() => {
  window.matchMedia = original;
});

describe('NavRail collapsed="tablet"', () => {
  const BAND = 'tablet:max-desktop:';
  const rail = () => (
    <NavRail
      aria-label="Project"
      link={link}
      collapsed="tablet"
      groups={groups()}
    />
  );

  test('the fold is in the server HTML: CSS-band classes, no JavaScript', () => {
    // No DOM, no matchMedia, no hydration: what a tablet paints first.
    const html = renderToString(rail());
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const nav = doc.querySelector('nav');
    expect(nav?.getAttribute('data-collapsed')).toBe('tablet');
    expect(nav?.className).toContain('w-60');
    expect(nav?.className).toContain(`${BAND}w-16`);
    const inbox = doc.querySelector('a[href="/inbox"]');
    expect(inbox?.className).toContain(`${BAND}justify-center`);
    expect(inbox?.className).toContain(`${BAND}px-0`);
    // One label layer: visible open, `sr-only` in the band.
    const label = Array.from(inbox?.querySelectorAll('span') ?? []).find(
      (span) => span.textContent === 'Inbox',
    );
    expect(label?.className).toContain('truncate');
    expect(label?.className).toContain(`${BAND}sr-only`);
    // The heading leaves the eye in the band, and only there.
    expect(doc.querySelector('h2')?.className).toContain(`${BAND}sr-only`);
    // The primary entry: 38px open, a 44px square in the band.
    const board = doc.querySelector('a[href="/board"]');
    expect(board?.className).toContain('min-h-[38px]');
    expect(board?.className).toContain(`${BAND}size-11`);
  });

  test('the client draws the same classes at every width, so hydration moves nothing', () => {
    const classesAt = (width: number) => {
      viewport(width);
      const { container, unmount } = render(rail());
      const out = Array.from(
        container.querySelectorAll('nav, a, h2, span'),
        (el) => el.getAttribute('class') ?? '',
      );
      unmount();
      return out;
    };
    const desktop = classesAt(1280);
    expect(classesAt(800)).toEqual(desktop);
    expect(classesAt(390)).toEqual(desktop);
  });

  test('in the band the names stay in the tree and the tooltips arrive after hydration', () => {
    viewport(800);
    const { container } = render(rail());
    expect(container.querySelector('nav')?.getAttribute('data-collapsed')).toBe(
      'tablet',
    );
    expect(screen.getByRole('link', { name: 'Inbox' })).not.toBeNull();
    expect(screen.getByRole('list', { name: 'Project' })).not.toBeNull();
  });

  test('badges: the inline mark outside the band, the glyph-riding mark in it, one speech each', () => {
    const html = renderToString(
      <NavRail
        aria-label="Project"
        link={link}
        collapsed="tablet"
        groups={[
          {
            id: 'p',
            title: 'Project',
            items: [
              {
                id: 'queue',
                label: 'Queue',
                icon: Inbox,
                href: '/queue',
                badge: { count: 2, label: '2 need you' },
                unavailable: 'unavailable',
              },
            ],
          },
        ]}
      />,
    );
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const item = doc.querySelector('a[href="/queue"]');
    const wrappers = Array.from(item?.querySelectorAll('span') ?? []).map(
      (span) => span.className,
    );
    expect(wrappers).toContain(`contents ${BAND}hidden`);
    expect(wrappers.filter((c) => c === `hidden ${BAND}contents`)).toHaveLength(
      2,
    );
    // The warn dot: inline dot hidden in the band, the glyph one shown only there.
    expect(item?.innerHTML).toContain(`${BAND}inline-flex`);
    expect(item?.innerHTML).toContain(`size-1.5 shrink-0 ${BAND}hidden`);
  });

  test('a boolean still means what it meant, at any width', () => {
    viewport(1280);
    const { container } = render(
      <NavRail aria-label="Project" link={link} collapsed groups={groups()} />,
    );
    expect(container.querySelector('nav')?.className).toContain('w-16');
  });
});

describe('NavRail primary entry', () => {
  test('draws the accent frame and the accent tile, and nothing else is framed', () => {
    const { container } = render(
      <NavRail aria-label="Project" link={link} groups={groups()} />,
    );
    const board = screen.getByRole('link', { name: 'Board' });
    expect(board.className).toContain('border-accent/40');
    expect(board.className).toContain('bg-accent/8');
    expect(board.className).toContain('text-ink');
    expect(
      board.querySelector('[data-nav-rail-primary-tile]')?.className,
    ).toContain('bg-accent');
    expect(container.querySelectorAll('[data-nav-rail-primary]')).toHaveLength(
      1,
    );
    expect(screen.getByRole('link', { name: 'Inbox' }).className).not.toContain(
      'border-accent',
    );
  });

  test('is still an ordinary item to a reader: aria-current, name, href', () => {
    render(
      <NavRail aria-label="Project" link={link} groups={groups('board')} />,
    );
    const board = screen.getByRole('link', { name: 'Board' });
    expect(board.getAttribute('aria-current')).toBe('page');
    expect(board.getAttribute('href')).toBe('/board');
    // Active, it keeps ink rather than turning accent-ink: the frame already
    // says "this one".
    expect(board.className).not.toContain('text-accent-ink');
  });

  test('folded, it is a 44px square', () => {
    render(
      <NavRail aria-label="Project" link={link} collapsed groups={groups()} />,
    );
    expect(screen.getByRole('link', { name: 'Board' }).className).toContain(
      'size-11',
    );
  });
});
