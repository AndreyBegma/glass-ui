import { describe, expect, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { Spinner } from './spinner';

describe('Spinner', () => {
  test('has role="status" and its label (default "Loading")', () => {
    render(<Spinner />);
    expect(screen.getByRole('status', { name: 'Loading' })).not.toBeNull();
  });

  test('takes a custom label', () => {
    render(<Spinner label="Saving" />);
    expect(screen.getByRole('status', { name: 'Saving' })).not.toBeNull();
  });

  test('is aria-hidden, with no role, when label is null', () => {
    const { container } = render(<Spinner label={null} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute('aria-hidden')).toBe('true');
    expect(root.getAttribute('role')).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
  });

  test('sizes are 12 / 16 / 24 px', () => {
    const { container } = render(
      <>
        <Spinner size="sm" />
        <Spinner size="md" />
        <Spinner size="lg" />
      </>,
    );
    const [sm, md, lg] = Array.from(container.children).map((el) =>
      el.className.split(' '),
    );
    expect(sm).toContain('size-3');
    expect(md).toContain('size-4');
    expect(lg).toContain('size-6');
  });

  test('tone sets the text colour token', () => {
    const { container } = render(<Spinner tone="danger" />);
    expect(
      (container.firstElementChild as HTMLElement).className.split(' '),
    ).toContain('text-danger');
  });

  test('renders the static dots form under prefers-reduced-motion', () => {
    const { container } = render(<Spinner />);
    const arc = container.querySelector('[data-spinner="arc"]') as Element;
    const dots = container.querySelector('[data-spinner="dots"]') as Element;
    expect(arc.getAttribute('class')).toContain('animate-spin');
    expect(arc.getAttribute('class')).toContain('motion-reduce:hidden');
    expect(dots.getAttribute('class')).toContain('hidden');
    expect(dots.getAttribute('class')).toContain('motion-reduce:flex');
    expect(dots.children.length).toBe(3);
    // Both forms are decoration: the one accessible name is on the root.
    expect(dots.getAttribute('aria-hidden')).toBe('true');
  });

  test('renders under data-theme light, dark and data-material flat', () => {
    for (const attr of [
      ['data-theme', 'light'],
      ['data-theme', 'dark'],
      ['data-material', 'flat'],
    ] as const) {
      document.documentElement.setAttribute(attr[0], attr[1]);
      const { container, unmount } = render(<Spinner />);
      // Tokens only: `currentColor` arc, colour from a token class, nothing literal.
      expect(container.innerHTML).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(/i);
      expect(screen.getByRole('status')).not.toBeNull();
      unmount();
      document.documentElement.removeAttribute(attr[0]);
    }
  });
});
