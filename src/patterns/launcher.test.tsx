import { afterEach, describe, expect, test } from 'bun:test';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Launcher } from './launcher';

const Icon = () => <svg aria-hidden="true" />;

afterEach(cleanup);

describe('Launcher', () => {
  test('is a round button named by its label', () => {
    let clicks = 0;
    render(
      <Launcher label="Assistant" icon={<Icon />} onClick={() => clicks++} />,
    );
    const button = screen.getByRole('button', { name: 'Assistant' });
    expect(button.getAttribute('type')).toBe('button');
    expect(button.className).toContain('rounded-full');
    fireEvent.click(button);
    expect(clicks).toBe(1);
  });

  test('shows a count badge, capped at 99+, and announces it', () => {
    const { rerender } = render(
      <Launcher label="Assistant" icon={<Icon />} badge={3} />,
    );
    expect(screen.getByRole('button', { name: 'Assistant 3' })).toBeTruthy();

    rerender(<Launcher label="Assistant" icon={<Icon />} badge={250} />);
    expect(
      screen.getByRole('button').querySelector('[data-launcher-badge]')
        ?.textContent,
    ).toBe('99+');
  });

  test('badgeLabel replaces what is announced for the badge', () => {
    render(
      <Launcher
        label="Assistant"
        icon={<Icon />}
        badge={3}
        badgeLabel="3 unread"
      />,
    );
    expect(
      screen.getByRole('button', { name: 'Assistant 3 unread' }),
    ).toBeTruthy();
  });

  test('no badge for zero or nothing', () => {
    const { rerender } = render(
      <Launcher label="Assistant" icon={<Icon />} badge={0} />,
    );
    expect(
      screen.getByRole('button').querySelector('[data-launcher-badge]'),
    ).toBeNull();
    rerender(<Launcher label="Assistant" icon={<Icon />} />);
    expect(
      screen.getByRole('button').querySelector('[data-launcher-badge]'),
    ).toBeNull();
  });

  test('a string badge is shown as given', () => {
    render(<Launcher label="Assistant" icon={<Icon />} badge="new" />);
    expect(screen.getByRole('button', { name: 'Assistant new' })).toBeTruthy();
  });

  test('expanded is aria-expanded', () => {
    render(<Launcher label="Assistant" icon={<Icon />} expanded />);
    expect(screen.getByRole('button').getAttribute('aria-expanded')).toBe(
      'true',
    );
  });

  test('below lg it rises above the bottom capsule; from lg it sits 24 px in', () => {
    const { rerender } = render(<Launcher label="Assistant" icon={<Icon />} />);
    const classes = () => screen.getByRole('button').className;
    expect(classes()).toContain(
      'bottom-[calc(6rem+env(safe-area-inset-bottom))]',
    );
    expect(classes()).toContain('lg:bottom-6');

    rerender(
      <Launcher label="Assistant" icon={<Icon />} clearCapsule={false} />,
    );
    expect(classes()).not.toContain('6rem');
    expect(classes()).toContain(
      'bottom-[calc(1rem+env(safe-area-inset-bottom))]',
    );
  });
});
