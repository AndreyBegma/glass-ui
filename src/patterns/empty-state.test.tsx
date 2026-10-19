import { describe, expect, mock, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { EmptyState } from './empty-state';
import type { NavLinkRender } from './nav-link';

describe('EmptyState', () => {
  test('title and description', () => {
    render(<EmptyState title="Budgets you have not set yet" description="Cap a project." />);
    expect(screen.getByText('Budgets you have not set yet')).toBeDefined();
    expect(screen.getByText('Cap a project.')).toBeDefined();
  });

  test('a ReactNode action renders as given', () => {
    render(
      <EmptyState
        title="Empty"
        action={
          <button type="button" data-own>
            Mine
          </button>
        }
      />,
    );
    expect(screen.getByRole('button', { name: 'Mine' }).hasAttribute('data-own')).toBe(true);
  });

  test('{ label, onClick } renders a glass Button and calls it (issue 130)', () => {
    const onClick = mock(() => {});
    render(<EmptyState title="Empty" action={{ label: 'New budget', onClick }} />);
    const button = screen.getByRole('button', { name: 'New budget' });
    expect(button.getAttribute('type')).toBe('button');
    expect(button.className).toContain('glass');
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test('{ label, href } renders an anchor styled as the button (issue 130)', () => {
    render(<EmptyState title="Empty" action={{ label: 'Browse', href: '/catalogue' }} />);
    const anchor = screen.getByRole('link', { name: 'Browse' });
    expect(anchor.getAttribute('href')).toBe('/catalogue');
    expect(anchor.className).toContain('glass');
  });

  test('an href action goes through `link` when one is given (issue 130)', () => {
    const link: NavLinkRender = ({ href, className, children }) => (
      <a href={href} className={className} data-router>
        {children}
      </a>
    );
    render(
      <EmptyState title="Empty" link={link} action={{ label: 'Browse', href: '/catalogue' }} />,
    );
    const anchor = screen.getByRole('link', { name: 'Browse' });
    expect(anchor.hasAttribute('data-router')).toBe(true);
    expect(anchor.className).toContain('glass');
  });

  test('a plain string action is still a ReactNode, not data', () => {
    render(<EmptyState title="Empty" action="Nothing to do" />);
    expect(screen.getByText('Nothing to do')).toBeDefined();
    expect(screen.queryByRole('button')).toBeNull();
  });
});

// FEAT-20261013-004 (a35cb71), #168 — one anatomy. `align` and
// `secondaryAction` are props; the disc and the 16/600 title are the
// workspace profile's, beside develop's own classes.
describe('EmptyState anatomy', () => {
  const root = (container: HTMLElement) => container.firstElementChild as HTMLElement;

  test('centred by default, exactly as before', () => {
    const { container } = render(<EmptyState title="Nothing here" />);
    expect(root(container).className.split(' ')).toEqual(
      expect.arrayContaining(['items-center', 'justify-center', 'rounded-surface', 'px-6', 'text-center']),
    );
  });

  test('align="start" starts at the left edge', () => {
    const { container } = render(<EmptyState title="Nothing here" align="start" />);
    const cls = root(container).className.split(' ');
    expect(cls).toContain('items-start');
    expect(cls).toContain('text-left');
    expect(cls).not.toContain('items-center');
    expect(cls).not.toContain('text-center');
  });

  test('the title is 14/500, and 16/600 in the workspace', () => {
    render(<EmptyState title="Nothing here" />);
    const cls = screen.getByText('Nothing here').className.split(' ');
    expect(cls).toEqual(expect.arrayContaining(['text-sm', 'font-medium']));
    expect(cls).toEqual(expect.arrayContaining(['workspace:text-base', 'workspace:font-semibold']));
  });

  test('the icon is quiet ink, and sits in a 40px disc in the workspace', () => {
    const { container } = render(
      <EmptyState title="Nothing here" icon={<svg data-testid="icon" />} />,
    );
    const disc = screen.getByTestId('icon').parentElement as HTMLElement;
    const cls = disc.className.split(' ');
    expect(cls).toContain('text-ink-3');
    expect(cls).toEqual(expect.arrayContaining(['workspace:size-10', 'workspace:rounded-full']));
    expect(root(container).contains(disc)).toBe(true);
  });

  test('action then secondaryAction, in one row', () => {
    render(
      <EmptyState
        title="Nothing here"
        action={<button type="button">Create</button>}
        secondaryAction={<button type="button">Learn more</button>}
      />,
    );
    const first = screen.getByText('Create');
    const second = screen.getByText('Learn more');
    expect(first.parentElement).toBe(second.parentElement as HTMLElement);
    expect(first.nextElementSibling).toBe(second);
  });

  test('a secondaryAction alone still gets the row', () => {
    render(
      <EmptyState title="Nothing here" secondaryAction={<button type="button">Learn more</button>} />,
    );
    expect(screen.getByText('Learn more').parentElement?.className).toContain('flex');
  });

  test('a secondaryAction as data is a ghost', () => {
    const onClick = mock(() => {});
    render(
      <EmptyState
        title="Nothing here"
        action={{ label: 'Create', onClick: () => {} }}
        secondaryAction={{ label: 'Learn more', onClick }}
      />,
    );
    const secondary = screen.getByRole('button', { name: 'Learn more' });
    expect(secondary.className).toContain('text-ink-2');
    expect(secondary.className).not.toContain('glass');
    fireEvent.click(secondary);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test('no actions given → no actions row', () => {
    const { container } = render(<EmptyState title="Nothing here" description="Soon." />);
    expect(container.querySelector('.mt-1')).toBeNull();
    expect(root(container).children.length).toBe(2);
  });
});
