import { describe, expect, test } from 'bun:test';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BookOpen, ChefHat, ListTodo, Sun, Wallet } from 'lucide-react';
import { useState } from 'react';
import { AppRail, type AppRailItem } from './app-rail';
import type { NavLinkRender } from './nav-link';

const link: NavLinkRender = ({ href, className, children, ...rest }) => (
  <a href={href} className={className} {...rest}>
    {children}
  </a>
);

const apps: AppRailItem[] = [
  { id: 'today', label: 'Today', icon: Sun, href: '/today' },
  { id: 'work', label: 'Work', icon: ListTodo, href: '/tasks' },
  { id: 'documents', label: 'Documents', icon: BookOpen, href: '/documents' },
  { id: 'recipes', label: 'Recipes', icon: ChefHat, href: '/recipes', unavailable: 'unavailable' },
  { id: 'finance', label: 'Finance', icon: Wallet, href: '/finance' },
];

function Shell() {
  const [activeId, setActiveId] = useState('today');
  return (
    <AppRail
      aria-label="Applications"
      activeId={activeId}
      apps={apps.map((app) => ({
        ...app,
        href: undefined,
        onSelect: () => setActiveId(app.id),
      }))}
    />
  );
}

const capsulesIn = (root: ParentNode) =>
  root.querySelectorAll('[aria-hidden="true"].absolute.inset-0');

describe('AppRail', () => {
  test('one list of applications, every item a link with its name for a reader', () => {
    render(<AppRail aria-label="Applications" link={link} apps={apps} activeId="today" />);

    expect(screen.getByRole('navigation', { name: 'Applications' })).toBeDefined();
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(5);
    // Icon-only: the visible label is the tooltip, the accessible one is
    // `sr-only` — and every item has one.
    expect(links.map((a) => a.querySelector('span.sr-only')?.textContent)).toEqual([
      'Today',
      'Work',
      'Documents',
      'Recipes',
      'Finance',
    ]);
  });

  test('the rail is glass and nothing inside it is', () => {
    render(<AppRail aria-label="Applications" link={link} apps={apps} activeId="today" />);
    const rail = screen.getByRole('navigation', { name: 'Applications' });
    expect(rail.className.split(' ')).toContain('glass');
    expect(rail.querySelectorAll('.glass, .glass-strong')).toHaveLength(0);
  });

  /**
   * The first of the accent's four places. The glyph reads `--color-accent`
   * and the capsule `--color-accent-soft`, each through a `var()` whose
   * fallback is the sofa's look for the same place — so off the desk this is
   * `NavRail`'s active item, and under it the accent. Neither is a fifth use.
   */
  test('the active item carries the accent, with the sofa look as the fallback', () => {
    render(<AppRail aria-label="Applications" link={link} apps={apps} activeId="work" />);

    const work = screen.getByRole('link', { current: 'page' });
    expect(work.textContent).toBe('Work');
    expect(work.className.split(' ')).toContain(
      'text-[var(--color-accent,var(--color-ink))]',
    );
    const capsule = capsulesIn(work)[0];
    expect(capsule?.className.split(' ')).toContain(
      'bg-[var(--color-accent-soft,var(--color-hover))]',
    );
    // Nowhere else. The other four items read `ink-2`.
    for (const other of screen.getAllByRole('link').filter((a) => a !== work)) {
      expect(other.className).not.toContain('--color-accent');
      expect(capsulesIn(other)).toHaveLength(0);
    }
  });

  test('one capsule, in the active item, and it travels', async () => {
    render(<Shell />);
    const rail = screen.getByRole('navigation', { name: 'Applications' });
    const today = screen.getByRole('button', { name: 'Today' });
    const documents = screen.getByRole('button', { name: 'Documents' });

    expect(capsulesIn(rail)).toHaveLength(1);
    expect(capsulesIn(today)).toHaveLength(1);

    fireEvent.click(documents);

    await waitFor(() => {
      expect(capsulesIn(rail)).toHaveLength(1);
      expect(capsulesIn(documents)).toHaveLength(1);
    });
    expect(capsulesIn(today)).toHaveLength(0);
  });

  /**
   * `E-50`, one level up. The dot is for the eye and the phrase for the
   * reader, the item keeps its `href`, and nothing about it is dimmed or
   * removed — the page behind it says what is wrong.
   */
  test('an unavailable application is marked, named and still navigable', () => {
    render(<AppRail aria-label="Applications" link={link} apps={apps} activeId="today" />);

    const recipes = screen.getByRole('link', { name: 'Recipes unavailable' });
    expect(recipes.getAttribute('href')).toBe('/recipes');
    expect(recipes.querySelectorAll('.bg-warn')).toHaveLength(1);
    expect(recipes.getAttribute('aria-disabled')).toBeNull();
    expect(recipes.className).not.toContain('opacity');
    expect(recipes.className).not.toContain('pointer-events-none');
  });

  test('an unavailable application can be the active one — the two marks compose', () => {
    render(<AppRail aria-label="Applications" link={link} apps={apps} activeId="recipes" />);

    const recipes = screen.getByRole('link', { name: 'Recipes unavailable' });
    expect(recipes.getAttribute('aria-current')).toBe('page');
    expect(recipes.querySelectorAll('.bg-warn')).toHaveLength(1);
    expect(capsulesIn(recipes)).toHaveLength(1);
  });

  test('the visible name is a `Tooltip`, opened on focus', async () => {
    render(<AppRail aria-label="Applications" link={link} apps={apps} activeId="today" />);
    const work = screen.getByRole('link', { name: 'Work' });
    expect(work.getAttribute('title')).toBeNull();
    expect(screen.queryByRole('tooltip')).toBeNull();

    fireEvent.focus(work);

    const tip = await screen.findByRole('tooltip');
    expect(tip.textContent).toBe('Work');
  });

  test('items size themselves from the density scale, not a written height', () => {
    render(<AppRail aria-label="Applications" link={link} apps={apps} activeId="today" />);
    const classes = screen.getByRole('link', { name: 'Work' }).className.split(' ');
    expect(classes).toContain('h-[var(--size-nav)]');
    expect(classes).toContain('w-[var(--size-nav)]');
    expect(classes.filter((c) => /^(h|w|size)-\d/.test(c))).toEqual([]);
  });

  test('head and footer are drawn where they are given', () => {
    render(
      <AppRail
        aria-label="Applications"
        link={link}
        apps={apps}
        activeId="today"
        head={<span>D</span>}
        footer={<span>me</span>}
      />,
    );
    const rail = screen.getByRole('navigation', { name: 'Applications' });
    expect(rail.firstElementChild?.textContent).toBe('D');
    expect(rail.lastElementChild?.textContent).toBe('me');
  });
});
