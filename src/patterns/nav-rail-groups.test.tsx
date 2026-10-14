import { describe, expect, mock, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { Inbox, ShieldCheck, Sun } from 'lucide-react';
import { useState } from 'react';
import { AppRail } from './app-rail';
import { NavRail, type NavRailGroup } from './nav-rail';
import { badgeSpeech, hasBadge } from './nav-rail-parts';

function makeGroups(
  activeId: string,
  extra: Partial<NavRailGroup> = {},
): NavRailGroup[] {
  const base: NavRailGroup[] = [
    {
      id: 'work',
      title: 'Work',
      collapsible: true,
      items: [
        { id: 'inbox', label: 'Inbox', icon: Inbox, onSelect: () => {} },
        {
          id: 'approvals',
          label: 'Approvals',
          icon: ShieldCheck,
          badge: { count: 3, tone: 'warn', label: '3 pending' },
          onSelect: () => {},
        },
      ],
      ...extra,
    },
    {
      id: 'other',
      title: 'Other',
      collapsible: true,
      defaultOpen: false,
      items: [{ id: 'today', label: 'Today', icon: Sun, onSelect: () => {} }],
    },
  ];
  return base.map((g) => ({
    ...g,
    items: g.items.map((i) => ({ ...i, active: i.id === activeId })),
  }));
}

describe('NavRail collapsible group', () => {
  test('the heading is a toggle with aria-expanded and aria-controls', () => {
    render(<NavRail aria-label="Nav" groups={makeGroups('inbox')} />);

    const toggle = screen.getByRole('button', { name: 'Work' });
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    const panel = document.getElementById(
      toggle.getAttribute('aria-controls') ?? '',
    );
    expect(panel).not.toBeNull();
    expect(panel?.querySelector('ul')).not.toBeNull();
    expect(panel?.hasAttribute('inert')).toBe(false);

    fireEvent.click(toggle);

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(panel?.hasAttribute('inert')).toBe(true);
    expect(panel?.style.gridTemplateRows).toBe('0fr');
  });

  test('uncontrolled default: `defaultOpen={false}` starts shut', () => {
    render(<NavRail aria-label="Nav" groups={makeGroups('inbox')} />);
    expect(
      screen
        .getByRole('button', { name: 'Other' })
        .getAttribute('aria-expanded'),
    ).toBe('false');
  });

  test('a group holding the active item starts open despite `defaultOpen={false}`', () => {
    render(<NavRail aria-label="Nav" groups={makeGroups('today')} />);
    expect(
      screen
        .getByRole('button', { name: 'Other' })
        .getAttribute('aria-expanded'),
    ).toBe('true');
  });

  test('a shut group opens itself when the active item moves into it', () => {
    function Shell() {
      const [active, setActive] = useState('inbox');
      return (
        <>
          <button type="button" onClick={() => setActive('today')}>
            go
          </button>
          <NavRail aria-label="Nav" groups={makeGroups(active)} />
        </>
      );
    }
    render(<Shell />);
    const other = screen.getByRole('button', { name: 'Other' });
    expect(other.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(screen.getByRole('button', { name: 'go' }));

    expect(other.getAttribute('aria-expanded')).toBe('true');
  });

  test('controlled: the prop decides and `onOpenChange` hears the toggle', () => {
    const onOpenChange = mock((_open: boolean) => {});
    render(
      <NavRail
        aria-label="Nav"
        groups={makeGroups('inbox', { open: false, onOpenChange })}
      />,
    );
    // The active item is in the group, so the rail asks to open it...
    expect(onOpenChange).toHaveBeenCalledWith(true);
    // ...but the owner has not obeyed, and the prop wins.
    const toggle = screen.getByRole('button', { name: 'Work' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(toggle);
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  test('a group that is not `collapsible` keeps a plain heading', () => {
    render(
      <NavRail
        aria-label="Nav"
        groups={makeGroups('inbox').map((g) => ({ ...g, collapsible: false }))}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Work' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Work' })).toBeDefined();
  });

  test('an icon-only rail ignores collapsing', () => {
    render(<NavRail aria-label="Nav" collapsed groups={makeGroups('inbox')} />);
    expect(screen.queryByRole('button', { name: 'Work' })).toBeNull();
    expect(
      screen.getAllByRole('button', { name: /Inbox|Approvals|Today/ }),
    ).toHaveLength(3);
  });
});

describe('item badge', () => {
  test('a count renders beside the label and its label is spoken', () => {
    render(<NavRail aria-label="Nav" groups={makeGroups('inbox')} />);
    const item = screen.getByRole('button', { name: 'Approvals 3 pending' });
    expect(item.textContent).toContain('3');
    expect(item.querySelector('.bg-warn')).not.toBeNull();
  });

  test('a zero count draws nothing', () => {
    expect(hasBadge({ count: 0 })).toBe(false);
    expect(hasBadge({ dot: true })).toBe(true);
    expect(hasBadge(undefined)).toBe(false);
    expect(badgeSpeech({ count: 4 })).toBe('4');
  });

  test('a dot renders in the tone given', () => {
    render(
      <NavRail
        aria-label="Nav"
        groups={[
          {
            id: 'g',
            title: 'G',
            items: [
              {
                id: 'a',
                label: 'Alerts',
                icon: Inbox,
                badge: { dot: true, tone: 'danger', label: 'new' },
              },
            ],
          },
        ]}
      />,
    );
    const item = screen.getByRole('button', { name: 'Alerts new' });
    expect(item.querySelectorAll('.bg-danger')).toHaveLength(1);
  });

  test('icon-only: the badge rides the glyph and still speaks', () => {
    render(<NavRail aria-label="Nav" collapsed groups={makeGroups('inbox')} />);
    const item = screen.getByRole('button', { name: 'Approvals 3 pending' });
    expect(item.querySelector('.absolute.-right-2')).not.toBeNull();
  });

  test('AppRail items take the same badge', () => {
    render(
      <AppRail
        aria-label="Apps"
        apps={[
          {
            id: 'a',
            label: 'Mail',
            icon: Inbox,
            badge: { count: 120, tone: 'danger', label: 'unread' },
          },
          { id: 'b', label: 'Docs', icon: Sun, badge: { count: 0 } },
        ]}
      />,
    );
    const mail = screen.getByRole('button', { name: 'Mail unread' });
    expect(mail.textContent).toContain('99+');
    expect(screen.getByRole('button', { name: 'Docs' }).textContent).toBe(
      'Docs',
    );
  });
});

describe('scroll', () => {
  test('the active item is scrolled into view on mount', () => {
    const calls: unknown[] = [];
    const original = HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = function (
      arg?: boolean | ScrollIntoViewOptions,
    ) {
      calls.push([this.textContent, arg]);
    };
    try {
      render(<NavRail aria-label="Nav" groups={makeGroups('approvals')} />);
      expect(calls).toHaveLength(1);
      expect((calls[0] as [string, unknown])[0]).toStartWith('Approvals');
      expect((calls[0] as [string, unknown])[1]).toEqual({ block: 'nearest' });
    } finally {
      HTMLElement.prototype.scrollIntoView = original;
    }
  });

  test('no overflow, no fade mask', () => {
    render(<NavRail aria-label="Nav" groups={makeGroups('inbox')} />);
    const scroller = screen
      .getByRole('navigation')
      .querySelector('.overflow-y-auto');
    expect((scroller as HTMLElement).style.maskImage ?? '').toBe('');
  });
});
