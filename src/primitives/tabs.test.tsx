import { describe, expect, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { Tabs, TabsItem } from './tabs';

describe('Tabs', () => {
  test('the current item carries the travelling capsule and its own aria-current, the other does not', () => {
    render(
      <Tabs aria-label="Sections">
        <TabsItem current layoutId="tabs-test">
          <a href="/a" aria-current="page">
            A
          </a>
        </TabsItem>
        <TabsItem current={false} layoutId="tabs-test">
          <a href="/b">B</a>
        </TabsItem>
      </Tabs>,
    );

    const linkA = screen.getByRole('link', { name: 'A' });
    const linkB = screen.getByRole('link', { name: 'B' });
    expect(linkA.getAttribute('aria-current')).toBe('page');
    expect(linkB.getAttribute('aria-current')).toBeNull();

    const items = screen.getAllByRole('listitem');
    expect(items[0]?.querySelector('.bg-raised')).not.toBeNull();
    expect(items[1]?.querySelector('.bg-raised')).toBeNull();
  });

  test('an item with no className keeps the default markup', () => {
    render(
      <Tabs aria-label="Sections">
        <TabsItem current={false} layoutId="tabs-test-default">
          <a href="/a">A</a>
        </TabsItem>
      </Tabs>,
    );

    const item = screen.getByRole('listitem');
    expect(item.className).toBe('relative min-w-fit flex-1');
  });

  test('a className on TabsItem reaches the li, overriding flex-1 so the item keeps its width', () => {
    render(
      <Tabs aria-label="Sections">
        <TabsItem current={false} layoutId="tabs-test-shrink" className="shrink-0 flex-none whitespace-nowrap">
          <a href="/a">A</a>
        </TabsItem>
      </Tabs>,
    );

    const item = screen.getByRole('listitem');
    expect(item.className).toContain('min-w-fit');
    expect(item.className).toContain('flex-none');
    expect(item.className).toContain('whitespace-nowrap');
    expect(item.className).not.toContain('flex-1');
  });
});

/**
 * FEAT-20260930-004 (SYS-16, TASKS-1) — a row that does not fit says so.
 *
 * happy-dom has no layout, so the geometry is given: a 200px row holding
 * 600px of tabs, the current one at 400px. What is asserted is what the
 * component does with it — the row scrolls, fades on the side with more, and
 * brings the current tab to the middle.
 */
describe('Tabs in a row too narrow for them', () => {
  const geometry: Record<string, PropertyDescriptor | undefined> = {};
  const GIVEN = {
    scrollWidth: (el: HTMLElement) => (el.tagName === 'UL' ? 600 : 0),
    clientWidth: (el: HTMLElement) => (el.tagName === 'UL' ? 200 : 0),
    offsetWidth: (el: HTMLElement) => (el.tagName === 'LI' ? 100 : 0),
    offsetLeft: (el: HTMLElement) => (el.dataset.at ? Number(el.dataset.at) : 0),
  };

  function given() {
    for (const [name, get] of Object.entries(GIVEN)) {
      geometry[name] = Object.getOwnPropertyDescriptor(HTMLElement.prototype, name);
      Object.defineProperty(HTMLElement.prototype, name, {
        configurable: true,
        get() {
          return get(this);
        },
      });
    }
  }

  function restore() {
    for (const [name, descriptor] of Object.entries(geometry)) {
      if (descriptor) Object.defineProperty(HTMLElement.prototype, name, descriptor);
    }
  }

  function row() {
    return render(
      <Tabs aria-label="Views">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <TabsItem key={i} current={i === 4} layoutId="tabs-scroll">
            <a href={`/${i}`}>{`View ${i}`}</a>
          </TabsItem>
        ))}
      </Tabs>,
    );
  }

  test('the row scrolls sideways, with its bar hidden', () => {
    row();
    const list = screen.getByRole('list');
    expect(list.className).toContain('overflow-x-auto');
    expect(list.className).toContain('scrollbar-hide');
  });

  test('the current tab is scrolled to the middle of the row on mount', () => {
    given();
    try {
      // `offsetLeft` is read from `data-at`, which the link's ref sets on its
      // item — refs attach before the item's layout effect runs.
      const { container } = render(
        <Tabs aria-label="Views">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <TabsItem key={i} current={i === 4} layoutId="tabs-scroll-mid">
              <a href={`/${i}`} ref={(a) => a?.parentElement?.setAttribute('data-at', String(i * 100))}>
                {`View ${i}`}
              </a>
            </TabsItem>
          ))}
        </Tabs>,
      );
      const list = container.querySelector('ul');
      // 400 − (200 − 100) / 2
      expect(list?.scrollLeft).toBe(350);
    } finally {
      restore();
    }
  });

  test('the side with more is faded, the side without is not', () => {
    given();
    try {
      const { container } = row();
      const fades = container.querySelectorAll('[aria-hidden="true"].pointer-events-none');
      expect(fades).toHaveLength(2);
      for (const fade of fades) expect(fade.className).toContain('from-surface');
    } finally {
      restore();
    }
  });
});
