import { describe, expect, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { SegmentedControl, SegmentedControlItem } from './segmented-control';

describe('SegmentedControl', () => {
  test('is a named list by default', () => {
    render(
      <SegmentedControl aria-label="View">
        <li>Day</li>
      </SegmentedControl>,
    );
    const list = screen.getByRole('list', { name: 'View' });
    expect(list.tagName).toBe('UL');
  });

  test('a `role` drops the `<ul>` for a `<div>` carrying it', () => {
    const { container } = render(
      <SegmentedControl role="presentation">
        <li>Day</li>
      </SegmentedControl>,
    );
    expect(container.querySelector('ul')).toBeNull();
    const wrapper = container.querySelector('[role="presentation"]');
    expect(wrapper?.tagName).toBe('DIV');
  });

  test('default `SegmentedControl` renders `ul > li` items', () => {
    const { container } = render(
      <SegmentedControl aria-label="View">
        <SegmentedControlItem active layoutId="view">
          Day
        </SegmentedControlItem>
        <SegmentedControlItem active={false} layoutId="view">
          Week
        </SegmentedControlItem>
      </SegmentedControl>,
    );
    const list = container.querySelector('ul');
    expect(list).not.toBeNull();
    const items = list?.querySelectorAll(':scope > li');
    expect(items?.length).toBe(2);
  });

  test('`role="presentation"` renders no `li` and no `ul`, items are direct children of the role wrapper', () => {
    const { container } = render(
      <SegmentedControl role="presentation">
        <SegmentedControlItem active layoutId="view">
          Day
        </SegmentedControlItem>
        <SegmentedControlItem active={false} layoutId="view">
          Week
        </SegmentedControlItem>
      </SegmentedControl>,
    );
    expect(container.querySelector('ul')).toBeNull();
    expect(container.querySelector('li')).toBeNull();
    const wrapper = container.querySelector('[role="presentation"]');
    expect(wrapper).not.toBeNull();
    expect(wrapper?.children.length).toBe(2);
    expect(Array.from(wrapper?.children ?? []).every((el) => el.tagName === 'DIV')).toBe(true);
  });
});

/** FEAT-20261013-005 (W241) — sized to its labels, stretched only on request. */
describe('SegmentedControl sizing', () => {
  function control(full?: boolean) {
    return render(
      <SegmentedControl aria-label="View" full={full}>
        <SegmentedControlItem active layoutId="size">
          <button type="button">Month</button>
        </SegmentedControlItem>
        <SegmentedControlItem active={false} layoutId="size">
          <button type="button">Week</button>
        </SegmentedControlItem>
      </SegmentedControl>,
    );
  }

  test('by default the control is as wide as its labels and its items do not grow', () => {
    const { container } = control();
    const scroller = container.querySelector('.overflow-x-auto');
    expect(scroller?.className).toContain('w-fit');
    expect(scroller?.className).toContain('max-w-full');
    for (const item of screen.getAllByRole('listitem')) {
      expect(item.className).toContain('flex-none');
      expect(item.className).not.toContain('flex-1');
    }
  });

  test('`full` shares the row in equal parts, never below a label', () => {
    const { container } = control(true);
    const scroller = container.querySelector('.overflow-x-auto');
    expect(scroller?.className).toContain('w-full');
    expect(scroller?.className).not.toContain('w-fit');
    for (const item of screen.getAllByRole('listitem')) {
      expect(item.className).toContain('flex-1');
      expect(item.className).toContain('min-w-fit');
    }
  });

  test('no item can shrink below its label or wrap it, in either mode', () => {
    for (const full of [false, true]) {
      const { unmount } = control(full);
      for (const item of screen.getAllByRole('listitem')) {
        expect(item.className).not.toContain('min-w-0');
        expect(item.className).toContain('[&>*]:whitespace-nowrap');
      }
      unmount();
    }
  });

  test('the control sits inside a ScrollHintRow, the bar hidden', () => {
    const { container } = control();
    const scroller = container.querySelector('.overflow-x-auto');
    expect(scroller?.className).toContain('scrollbar-hide');
    expect(scroller?.contains(screen.getByRole('list'))).toBe(true);
    const fades = container.querySelectorAll('[aria-hidden="true"].pointer-events-none');
    expect(fades).toHaveLength(2);
    for (const fade of fades) expect(fade.className).toContain('from-surface');
  });

  // BUG-20261013-001 — the fades measure the element that scrolls. happy-dom
  // has no layout, so the geometry is given: 600px of items in a 200px row.
  test('an overflowing control shows the end fade; scrolled to the end, the start fade', () => {
    const names = ['scrollWidth', 'clientWidth'] as const;
    const saved = names.map((n) => Object.getOwnPropertyDescriptor(HTMLElement.prototype, n));
    names.forEach((n, i) => {
      Object.defineProperty(HTMLElement.prototype, n, {
        configurable: true,
        get() {
          return this.classList.contains('overflow-x-auto') ? [600, 200][i] : 0;
        },
      });
    });
    try {
      const { container } = control();
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
      names.forEach((n, i) => {
        const d = saved[i];
        if (d) Object.defineProperty(HTMLElement.prototype, n, d);
      });
    }
  });

  test('the active pill uses the tabs radius', () => {
    const { container } = control();
    expect(container.querySelector('.bg-raised')?.className).toContain(
      'rounded-[calc(var(--radius-control)*2/3)]',
    );
  });
});
