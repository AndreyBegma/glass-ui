import { afterEach, describe, expect, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { Inbox, KanbanSquare, Sun } from 'lucide-react';
import type { NavLinkRender } from './nav-link';
import { NavRail, type NavRailGroup } from './nav-rail';

/**
 * C-281 (AgentDock S-7) — the rail that folds on a tablet, and the one entry
 * drawn as the door.
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
  test('folds to the 64px icon strip in the tablet band', () => {
    viewport(800);
    const { container } = render(
      <NavRail
        aria-label="Project"
        link={link}
        collapsed="tablet"
        groups={groups()}
      />,
    );
    const nav = container.querySelector('nav');
    expect(nav?.getAttribute('data-collapsed')).toBe('true');
    expect(nav?.className).toContain('w-16');
    // The labels leave the eye, not the tree.
    expect(screen.getByRole('link', { name: 'Inbox' })).not.toBeNull();
    expect(container.querySelector('.sr-only')?.textContent).toBe('Project');
  });

  test('stays open on a desktop', () => {
    viewport(1280);
    const { container } = render(
      <NavRail
        aria-label="Project"
        link={link}
        collapsed="tablet"
        groups={groups()}
      />,
    );
    const nav = container.querySelector('nav');
    expect(nav?.hasAttribute('data-collapsed')).toBe(false);
    expect(nav?.className).toContain('w-60');
  });

  test('stays open on a phone, where the capsule is the navigation', () => {
    viewport(390);
    const { container } = render(
      <NavRail
        aria-label="Project"
        link={link}
        collapsed="tablet"
        groups={groups()}
      />,
    );
    expect(container.querySelector('nav')?.className).toContain('w-60');
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
