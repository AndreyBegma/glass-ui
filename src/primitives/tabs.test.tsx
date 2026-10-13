import { describe, expect, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
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
    expect(item.className).toBe('relative min-w-fit flex-1 [&>*]:whitespace-nowrap');
  });

  test('items never wrap their label', () => {
    render(
      <Tabs aria-label="Sections">
        <TabsItem current layoutId="tabs-test-nowrap">
          <a href="/a">A</a>
        </TabsItem>
        <TabsItem current={false} layoutId="tabs-test-nowrap">
          <a href="/b">B</a>
        </TabsItem>
      </Tabs>,
    );
    for (const item of screen.getAllByRole('listitem')) {
      expect(item.className).toContain('[&>*]:whitespace-nowrap');
    }
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
    // The scroller is `ScrollHintRow`'s inner div (BUG-20261013-001), the one
    // carrying `overflow-x-auto`; the list inside it never overflows by itself.
    scrollWidth: (el: HTMLElement) => (el.classList.contains('overflow-x-auto') ? 600 : 0),
    clientWidth: (el: HTMLElement) => (el.classList.contains('overflow-x-auto') ? 200 : 0),
    offsetWidth: (el: HTMLElement) => (el.tagName === 'LI' ? 100 : 0),
    offsetLeft: (el: HTMLElement) => (el.dataset.at ? Number(el.dataset.at) : 0),
    offsetParent: (el: HTMLElement) => el.closest('.overflow-x-auto'),
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
    const { container } = row();
    const scroller = container.querySelector('.overflow-x-auto');
    expect(scroller?.className).toContain('scrollbar-hide');
    // The list is inside the scroller and does not scroll itself.
    expect(scroller?.contains(screen.getByRole('list'))).toBe(true);
    expect(screen.getByRole('list').className).not.toContain('overflow-x-auto');
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
      const scroller = container.querySelector('.overflow-x-auto');
      // 400 − (200 − 100) / 2
      expect(scroller?.scrollLeft).toBe(350);
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

  // BUG-20261013-001 — the fades measure the element that scrolls.
  test('at the start only the end fade shows; scrolled to the end only the start fade does', () => {
    given();
    try {
      const { container } = row();
      const [start, end] = Array.from(
        container.querySelectorAll('[aria-hidden="true"].pointer-events-none'),
      );
      const scroller = container.querySelector('.overflow-x-auto') as HTMLElement;
      scroller.scrollLeft = 0;
      fireEvent.scroll(scroller);
      expect(start?.className).toContain('opacity-0');
      expect(end?.className).toContain('opacity-100');
      scroller.scrollLeft = 400;
      fireEvent.scroll(scroller);
      expect(start?.className).toContain('opacity-100');
      expect(end?.className).toContain('opacity-0');
    } finally {
      restore();
    }
  });
});
