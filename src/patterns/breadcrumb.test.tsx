import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { Folder } from 'lucide-react';
import { Breadcrumb, type BreadcrumbItem } from './breadcrumb';
import type { NavLinkRender } from './nav-link';

const link: NavLinkRender = ({ href, className, children, ...rest }) => (
  <a href={href} className={className} {...rest}>
    {children}
  </a>
);

const trail: BreadcrumbItem[] = [
  { id: 'documents', label: 'Documents', href: '/documents', icon: Folder },
  { id: 'finance', label: 'Finance', href: '/documents/finance' },
  { id: '2026', label: '2026', href: '/documents/finance/2026' },
  { id: 'q3', label: 'Q3', href: '/documents/finance/2026/q3' },
  { id: 'review', label: 'Quarterly review', href: '/documents/finance/2026/q3/review' },
];

/**
 * happy-dom has no layout, so `clientWidth` and `scrollWidth` are 0 on every
 * element and nothing would ever fold. The measurement is simulated on the
 * prototype for the duration of each test: the list is `width` wide, every
 * visible crumb is 120 wide, the overflow button 40 — which is what a five-
 * level trail looks like in a 390px column, and why the acceptance criterion
 * names that number. The 390px *viewport* is a screenshot, not this file.
 */
const CRUMB = 120;
const OVERFLOW = 40;
let width = 390;

// happy-dom puts `clientWidth` on `HTMLElement` and `scrollWidth` on
// `Element`; both are shadowed on `HTMLElement`, the nearer of the two, and
// put back exactly as found.
const descriptors = {
  clientWidth: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth'),
  scrollWidth: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollWidth'),
};

beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get(this: Element) {
      return this.tagName === 'OL' ? width : 0;
    },
  });
  Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
    configurable: true,
    get(this: Element) {
      if (this.tagName !== 'OL') return 0;
      const crumbs = this.querySelectorAll('li').length;
      const overflow = this.querySelector('button') ? OVERFLOW : 0;
      return crumbs * CRUMB + overflow;
    },
  });
});

afterEach(() => {
  for (const [name, descriptor] of Object.entries(descriptors)) {
    if (descriptor) Object.defineProperty(HTMLElement.prototype, name, descriptor);
    else delete (HTMLElement.prototype as unknown as Record<string, unknown>)[name];
  }
  width = 390;
});

const labels = () =>
  [...screen.getByRole('list').querySelectorAll('li')].map(
    (li) => li.querySelector('a, span[aria-current], li > span')?.textContent,
  );

describe('Breadcrumb', () => {
  test('at 390px a five-level trail is first / overflow / last', () => {
    render(<Breadcrumb aria-label="Path" overflowLabel="Show the path" link={link} items={trail} />);

    expect(labels()).toEqual(['Documents', 'Quarterly review']);
    expect(screen.getByRole('button', { name: 'Show the path' })).toBeDefined();
  });

  test('the overflow menu lists the rest, in order, as links', async () => {
    render(<Breadcrumb aria-label="Path" overflowLabel="Show the path" link={link} items={trail} />);

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Show the path' }), {
      button: 0,
      ctrlKey: false,
      pointerType: 'mouse',
    });

    const items = await screen.findAllByRole('menuitem');
    expect(items.map((item) => item.textContent)).toEqual(['Finance', '2026', 'Q3']);
    expect(items.map((item) => item.getAttribute('href'))).toEqual([
      '/documents/finance',
      '/documents/finance/2026',
      '/documents/finance/2026/q3',
    ]);
  });

  test('where it fits, nothing folds and there is no overflow button', () => {
    width = 1200;
    render(<Breadcrumb aria-label="Path" overflowLabel="Show the path" link={link} items={trail} />);

    expect(labels()).toEqual(['Documents', 'Finance', '2026', 'Q3', 'Quarterly review']);
    expect(screen.queryByRole('button')).toBeNull();
  });

  /**
   * Not one item at a time. Five crumbs are 600 and do not fit in 520; four
   * and the button would be exactly 520 and would — and the trail still
   * folds to first / overflow / last, because which middle items survive
   * must not depend on how long their labels happen to be.
   */
  test('when it does not fit, the whole middle folds at once', () => {
    width = 520;
    render(<Breadcrumb aria-label="Path" overflowLabel="Show the path" link={link} items={trail} />);

    expect(labels()).toEqual(['Documents', 'Quarterly review']);
  });

  test('the last item is the page: `aria-current`, and not a link', () => {
    width = 1200;
    render(<Breadcrumb aria-label="Path" overflowLabel="Show the path" link={link} items={trail} />);

    const current = screen.getByText('Quarterly review').closest('[aria-current="page"]');
    expect(current).not.toBeNull();
    expect(current?.tagName).toBe('SPAN');
    expect(screen.queryByRole('link', { name: /Quarterly review/ })).toBeNull();
    expect(screen.getAllByRole('link')).toHaveLength(4);
  });

  test('the first and the last never fold, whatever the width', () => {
    width = 10;
    render(<Breadcrumb aria-label="Path" overflowLabel="Show the path" link={link} items={trail} />);

    expect(labels()).toEqual(['Documents', 'Quarterly review']);
  });

  test('a two-level trail has nothing to fold', () => {
    width = 10;
    render(
      <Breadcrumb
        aria-label="Path"
        overflowLabel="Show the path"
        link={link}
        items={trail.slice(0, 2)}
      />,
    );
    expect(labels()).toEqual(['Documents', 'Finance']);
    expect(screen.queryByRole('button')).toBeNull();
  });

  test('a new trail is measured afresh', () => {
    width = 1200;
    const { rerender } = render(
      <Breadcrumb aria-label="Path" overflowLabel="Show the path" link={link} items={trail} />,
    );
    expect(labels()).toHaveLength(5);

    width = 390;
    rerender(
      <Breadcrumb
        aria-label="Path"
        overflowLabel="Show the path"
        link={link}
        items={[...trail]}
      />,
    );
    expect(labels()).toEqual(['Documents', 'Quarterly review']);
  });

  test('it is a `nav` with a name, over an ordered list', () => {
    render(<Breadcrumb aria-label="Path" overflowLabel="Show the path" link={link} items={trail} />);
    const nav = screen.getByRole('navigation', { name: 'Path' });
    expect(nav.querySelector('ol')).not.toBeNull();
    // The chevrons are for the eye.
    for (const svg of nav.querySelectorAll('svg')) {
      expect(svg.getAttribute('aria-hidden')).toBe('true');
    }
  });
});
