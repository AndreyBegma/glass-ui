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
