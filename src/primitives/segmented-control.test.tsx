import { describe, expect, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { SegmentedControl, SegmentedControlItem } from './segmented-control';

/**
 * #168 — the class string a page without the workspace profile renders: the
 * `workspace:` classes are inert outside it, so the byte-for-byte promises
 * below are made of everything else. That nothing else was added is asserted
 * on its own, in `the workspace profile` block.
 */
const outside = (element: Element | null | undefined) =>
  (element?.className ?? '')
    .split(' ')
    .filter((c) => !c.startsWith('workspace:'))
    .join(' ');

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
    const wrapper = container.firstElementChild;
    expect(wrapper?.tagName).toBe('DIV');
    expect(wrapper?.getAttribute('role')).toBe('presentation');
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
    expect(
      Array.from(wrapper?.children ?? []).every((el) => el.tagName === 'DIV'),
    ).toBe(true);
  });

  test('an item with no className keeps the default markup', () => {
    const { container } = render(
      <SegmentedControl aria-label="View">
        <SegmentedControlItem active={false} layoutId="view-default">
          Day
        </SegmentedControlItem>
      </SegmentedControl>,
    );
    expect(outside(container.querySelector('li'))).toBe(
      'relative min-w-max flex-1',
    );
  });

  // #93 — "Unread" was clipped: `min-w-0` let a segment shrink below its
  // label. An item is now never narrower than its content.
  test('a segment is never narrower than its label', () => {
    const { container } = render(
      <SegmentedControl aria-label="Filter">
        <SegmentedControlItem active={false} layoutId="filter-fit">
          Unread
        </SegmentedControlItem>
      </SegmentedControl>,
    );
    const classes = Array.from(container.querySelector('li')?.classList ?? []);
    expect(classes).toContain('min-w-max');
    expect(classes).not.toContain('min-w-0');
  });

  // #93 — the selection is the accent: the capsule is accent-soft and the
  // active item's text accent-ink; an inactive item takes neither.
  test('the active item carries the accent ink, an inactive one does not', () => {
    const { container } = render(
      <SegmentedControl aria-label="Filter">
        <SegmentedControlItem active layoutId="filter-accent">
          All
        </SegmentedControlItem>
        <SegmentedControlItem active={false} layoutId="filter-accent">
          Unread
        </SegmentedControlItem>
      </SegmentedControl>,
    );
    const [on, off] = Array.from(container.querySelectorAll('li'));
    expect(on?.classList.contains('text-accent-ink')).toBe(true);
    expect(off?.classList.contains('text-accent-ink')).toBe(false);
  });

  test('a className on SegmentedControlItem reaches the li, overriding flex-1 so the item keeps its width', () => {
    const { container } = render(
      <SegmentedControl aria-label="View">
        <SegmentedControlItem
          active={false}
          layoutId="view-shrink"
          className="flex-none whitespace-nowrap"
        >
          Day
        </SegmentedControlItem>
      </SegmentedControl>,
    );
    const item = container.querySelector('li');
    expect(item?.className).toContain('min-w-max');
    expect(item?.className).toContain('flex-none');
    expect(item?.className).toContain('whitespace-nowrap');
    expect(item?.className).not.toContain('flex-1');
  });

  // FEAT-20260919-624 — the default is the pill. It is the promise a
  // consumer that never heard of `variant` relies on, so it is held to the
  // byte: the header's material at `rounded-full`, the capsule as `bg-hover`.
  test('the default wrapper and capsule are the glass pill, to the byte', () => {
    const { container } = render(
      <SegmentedControl aria-label="View">
        <SegmentedControlItem active layoutId="view-default-capsule">
          Day
        </SegmentedControlItem>
      </SegmentedControl>,
    );
    expect(outside(container.querySelector('ul'))).toBe(
      'flex min-w-max gap-1 rounded-full glass p-1',
    );
    expect(container.querySelector('ul')?.className).not.toContain(
      'bg-surface',
    );
    expect(container.querySelector('li > span')?.className).toBe(
      'absolute inset-0 rounded-full bg-accent-soft',
    );
  });

  // The old name is accepted and means the default — a consumer written
  // against v0.18 keeps compiling and gets the pill, not the well.
  test('`variant="surface"` renders exactly what the default renders', () => {
    const { container } = render(
      <SegmentedControl aria-label="View" variant="surface">
        <SegmentedControlItem active layoutId="view-surface-alias">
          Day
        </SegmentedControlItem>
      </SegmentedControl>,
    );
    expect(outside(container.querySelector('ul'))).toBe(
      'flex min-w-max gap-1 rounded-full glass p-1',
    );
    expect(container.querySelector('li > span')?.className).toBe(
      'absolute inset-0 rounded-full bg-accent-soft',
    );
    expect(container.querySelector('ul')?.hasAttribute('variant')).toBe(false);
  });

  test('`variant="glass"` is the material as a pill, and the capsule is the lift the header uses', () => {
    const { container } = render(
      <SegmentedControl aria-label="View" variant="glass">
        <SegmentedControlItem active layoutId="view-glass">
          Day
        </SegmentedControlItem>
        <SegmentedControlItem active={false} layoutId="view-glass">
          Week
        </SegmentedControlItem>
      </SegmentedControl>,
    );
    const list = container.querySelector('ul');
    expect(outside(list)).toBe('flex min-w-max gap-1 rounded-full glass p-1');
    expect(list?.className).not.toContain('bg-surface');
    expect(list?.hasAttribute('variant')).toBe(false);
    expect(container.querySelector('li > span')?.className).toBe(
      'absolute inset-0 rounded-full bg-accent-soft',
    );
    // The inactive item mounts no capsule in either variant.
    expect(container.querySelectorAll('li > span').length).toBe(1);
  });

  test('the variant follows the items down the `role` passthrough', () => {
    const { container } = render(
      <SegmentedControl role="presentation" variant="glass">
        <SegmentedControlItem active layoutId="view-glass-div">
          Day
        </SegmentedControlItem>
      </SegmentedControl>,
    );
    const wrapper = container.querySelector('[role="presentation"]');
    expect(wrapper?.className).toContain('glass');
    expect(wrapper?.querySelector('div > span')?.className).toBe(
      'absolute inset-0 rounded-full bg-accent-soft',
    );
  });

  // BUG-20260916-613 — the well inside a glass panel: a hairline, no fill,
  // the capsule as the lift the header uses. FEAT-20260919-624 — and no
  // `backdrop-filter`: the material's utilities are the package's only way
  // to carry one, and none of them is on this wrapper. One blur per stack.
  test('`variant="on-glass"` is a hairline well at the control radius with an accent capsule, and no blur', () => {
    const { container } = render(
      <SegmentedControl aria-label="View" variant="on-glass">
        <SegmentedControlItem active layoutId="view-on-glass">
          Day
        </SegmentedControlItem>
        <SegmentedControlItem active={false} layoutId="view-on-glass">
          Week
        </SegmentedControlItem>
      </SegmentedControl>,
    );
    const list = container.querySelector('ul');
    expect(outside(list)).toBe(
      'flex gap-1 rounded-control border border-line p-1',
    );
    expect(list?.className).not.toContain('bg-surface');
    const classes = Array.from(list?.classList ?? []);
    expect(
      classes.some((c) => ['glass', 'glass-strong', 'glass-clear'].includes(c)),
    ).toBe(false);
    expect(container.querySelector('li > span')?.className).toBe(
      'absolute inset-0 rounded-[calc(var(--radius-control)-4px)] bg-accent-soft',
    );
    expect(container.querySelectorAll('li > span').length).toBe(1);
  });

  // #130 — `sm` sits flush with a `Select` in a desk toolbar: the shell is
  // pinned to `--size-control` with a 2px inset, and each item is a flex box
  // so the caller's button stretches to that height.
  test('`size="sm"` pins the shell to the control height and stretches the items', () => {
    const { container } = render(
      <SegmentedControl aria-label="View" size="sm">
        <SegmentedControlItem active layoutId="view-sm">
          Day
        </SegmentedControlItem>
        <SegmentedControlItem active={false} layoutId="view-sm">
          Week
        </SegmentedControlItem>
      </SegmentedControl>,
    );
    const classes = Array.from(container.querySelector('ul')?.classList ?? []);
    expect(classes).toContain('h-(--size-control)');
    expect(classes).toContain('p-0.5');
    expect(classes).not.toContain('p-1');
    expect(classes).toContain('glass');
    const items = Array.from(container.querySelectorAll('li'));
    expect(items.every((li) => li.classList.contains('flex'))).toBe(true);
    expect(container.querySelector('li > span')?.className).toBe(
      'absolute inset-0 rounded-full bg-accent-soft',
    );
  });

  test('`size="sm"` steps the on-glass capsule radius in with the 2px inset', () => {
    const { container } = render(
      <SegmentedControl aria-label="View" size="sm" variant="on-glass">
        <SegmentedControlItem active layoutId="view-sm-on-glass">
          Day
        </SegmentedControlItem>
      </SegmentedControl>,
    );
    expect(outside(container.querySelector('ul'))).toBe(
      'flex gap-1 rounded-control border border-line h-(--size-control) p-0.5',
    );
    expect(container.querySelector('li > span')?.className).toBe(
      'absolute inset-0 rounded-[calc(var(--radius-control)-2px)] bg-accent-soft',
    );
  });

  test('`size="md"` renders exactly what no size renders', () => {
    const { container } = render(
      <SegmentedControl aria-label="View" size="md">
        <SegmentedControlItem active layoutId="view-md">
          Day
        </SegmentedControlItem>
      </SegmentedControl>,
    );
    expect(outside(container.querySelector('ul'))).toBe(
      'flex min-w-max gap-1 rounded-full glass p-1',
    );
    expect(outside(container.querySelector('li'))).toBe(
      'relative min-w-max flex-1 text-accent-ink',
    );
    expect(container.querySelector('ul')?.hasAttribute('size')).toBe(false);
  });

  test('the size follows the items down the `role` passthrough', () => {
    const { container } = render(
      <SegmentedControl role="group" aria-label="View" size="sm">
        <SegmentedControlItem active={false} layoutId="view-sm-div">
          Day
        </SegmentedControlItem>
      </SegmentedControl>,
    );
    const item = container.querySelector('[role="group"] > div');
    expect(item?.classList.contains('flex')).toBe(true);
  });

  test('the className follows the item down the `role` passthrough onto the div', () => {
    const { container } = render(
      <SegmentedControl role="presentation">
        <SegmentedControlItem
          active={false}
          layoutId="view-div"
          className="flex-none"
        >
          Day
        </SegmentedControlItem>
      </SegmentedControl>,
    );
    const item = container.querySelector('[role="presentation"] > div');
    expect(item?.className).toContain('flex-none');
    expect(item?.className).not.toContain('flex-1');
  });
});

const classesOf = (element: Element | null | undefined) =>
  element?.className.split(' ').filter(Boolean) ?? [];

/**
 * #168 — maint's default width is the workspace profile's: a control without
 * `full` is as wide as its labels there, and fills the row everywhere else, as
 * it always has. The only classes the default gains are `workspace:` ones.
 */
describe('SegmentedControl under the workspace profile', () => {
  function control(full?: boolean) {
    return render(
      <SegmentedControl aria-label="View" full={full}>
        <SegmentedControlItem active layoutId="ws">
          <button type="button">Month</button>
        </SegmentedControlItem>
      </SegmentedControl>,
    );
  }

  test('without `full` the workspace sizes it to its labels', () => {
    const { container } = control();
    expect(classesOf(container.querySelector('ul'))).toEqual(
      expect.arrayContaining(['workspace:w-fit', 'workspace:max-w-full']),
    );
    expect(classesOf(container.querySelector('li'))).toContain('workspace:flex-none');
  });

  test('`full` asks for the row, in the workspace too, and renders develop’s default', () => {
    const { container } = control(true);
    const ul = classesOf(container.querySelector('ul'));
    expect(ul).toEqual(['flex', 'min-w-max', 'gap-1', 'rounded-full', 'glass', 'p-1']);
    expect(classesOf(container.querySelector('li')).filter((c) => c.startsWith('workspace:'))).toEqual(
      [],
    );
  });

  test('the default gains nothing but `workspace:` classes', () => {
    const { container } = control();
    const extra = [
      ...classesOf(container.querySelector('ul')),
      ...classesOf(container.querySelector('li')),
    ].filter((c) => c.includes(':') && !c.startsWith('workspace:'));
    expect(extra).toEqual([]);
  });
});

/** FEAT-20261013-005 (W241), BUG-20261013-001 — `overflow="scroll"`. */
describe('SegmentedControl overflow="scroll"', () => {
  function control(full?: boolean) {
    return render(
      <SegmentedControl aria-label="View" overflow="scroll" full={full}>
        <SegmentedControlItem active layoutId="size">
          <button type="button">Month</button>
        </SegmentedControlItem>
        <SegmentedControlItem active={false} layoutId="size">
          <button type="button">Week</button>
        </SegmentedControlItem>
      </SegmentedControl>,
    );
  }

  test('the scroller carries the shell; without `full` the workspace sizes it to its labels', () => {
    const { container } = control();
    const scroller = classesOf(container.querySelector('.overflow-x-auto'));
    expect(scroller).toEqual(expect.arrayContaining(['glass', 'rounded-control', 'p-1']));
    expect(scroller).toEqual(expect.arrayContaining(['workspace:w-fit', 'workspace:max-w-full']));
    for (const item of screen.getAllByRole('listitem')) {
      expect(classesOf(item)).toContain('workspace:flex-none');
    }
  });

  test('`full` shares the row in equal parts, never below a label', () => {
    const { container } = control(true);
    const scroller = classesOf(container.querySelector('.overflow-x-auto'));
    expect(scroller).toContain('w-full');
    expect(scroller.some((c) => c.includes('w-fit'))).toBe(false);
    for (const item of screen.getAllByRole('listitem')) {
      expect(classesOf(item)).toEqual(expect.arrayContaining(['flex-1', 'min-w-max']));
    }
  });

  test('no item can shrink below its label or wrap it, in either width', () => {
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
    for (const fade of fades) expect(fade.className).toContain('from-raised');
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

  test('the list does not wrap: it is as wide as its items, inside the scroller', () => {
    const { container } = control();
    const list = screen.getByRole('list');
    expect(list.className).toContain('w-max');
    expect(list.className).not.toContain('flex-wrap');
    expect(container.querySelector('.overflow-x-auto')?.contains(list)).toBe(true);
  });

  test('inside the rounded-control box the capsule steps in 4px, glass included', () => {
    const { container } = control();
    expect(container.querySelector('.bg-accent-soft')?.className).toContain(
      'rounded-[calc(var(--radius-control)-4px)]',
    );
  });
});

/** FEAT-20261013-709 (W359) — `wrap`: the row breaks, a label does not. */
describe('SegmentedControl wrap', () => {
  function control(props: { full?: boolean; className?: string } = {}) {
    return render(
      <SegmentedControl aria-label="Order" wrap {...props}>
        {['Name', 'Last seen', 'Created'].map((label, i) => (
          <SegmentedControlItem key={label} active={i === 0} layoutId="wrap">
            <button type="button">{label}</button>
          </SegmentedControlItem>
        ))}
      </SegmentedControl>,
    );
  }

  test('the list wraps and is as wide as its row allows, not as its items', () => {
    control();
    const list = screen.getByRole('list', { name: 'Order' });
    expect(list.className).toContain('flex-wrap');
    expect(list.className).not.toContain('w-max');
    expect(list.className).not.toContain('min-w-full');
  });

  test('there is no scroller and no edge fades', () => {
    const { container } = control();
    expect(container.querySelector('.overflow-x-auto')).toBeNull();
    expect(container.querySelector('.scrollbar-hide')).toBeNull();
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(0);
    const box = classesOf(screen.getByRole('list').parentElement);
    expect(box).toEqual(expect.arrayContaining(['rounded-control', 'glass']));
    expect(box).toEqual(expect.arrayContaining(['workspace:w-fit', 'workspace:max-w-full']));
  });

  test('a label still never breaks, and an item never shrinks below it', () => {
    control();
    for (const item of screen.getAllByRole('listitem')) {
      expect(item.className).toContain('[&>*]:whitespace-nowrap');
      expect(item.className).toContain('min-w-max');
      expect(item.className).not.toContain('min-w-0');
    }
  });

  test('with `full`, `full` decides the width and items stretch per line', () => {
    control({ full: true });
    const box = classesOf(screen.getByRole('list').parentElement);
    expect(box).toContain('w-full');
    expect(box.some((c) => c.includes('w-fit'))).toBe(false);
    for (const item of screen.getAllByRole('listitem')) {
      expect(classesOf(item)).toContain('flex-1');
      expect(classesOf(item)).not.toContain('workspace:flex-none');
    }
  });

  test('it wins over `overflow="scroll"`', () => {
    const { container } = render(
      <SegmentedControl aria-label="Both" wrap overflow="scroll">
        <SegmentedControlItem active layoutId="both">
          <button type="button">One</button>
        </SegmentedControlItem>
      </SegmentedControl>,
    );
    expect(container.querySelector('.overflow-x-auto')).toBeNull();
    expect(screen.getByRole('list').className).toContain('flex-wrap');
  });

  test('a consumer `className` lands on the box, as it does on the scroller', () => {
    control({ className: 'mt-2' });
    expect(screen.getByRole('list').parentElement?.className).toContain('mt-2');
  });
});
