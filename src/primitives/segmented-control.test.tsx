import { describe, expect, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
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
    expect(container.querySelector('li')?.className).toBe(
      'relative min-w-0 flex-1',
    );
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
    expect(item?.className).toContain('min-w-0');
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
    expect(container.querySelector('ul')?.className).toBe(
      'flex gap-1 rounded-full glass p-1',
    );
    expect(container.querySelector('ul')?.className).not.toContain(
      'bg-surface',
    );
    expect(container.querySelector('li > span')?.className).toBe(
      'absolute inset-0 rounded-full bg-hover',
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
    expect(container.querySelector('ul')?.className).toBe(
      'flex gap-1 rounded-full glass p-1',
    );
    expect(container.querySelector('li > span')?.className).toBe(
      'absolute inset-0 rounded-full bg-hover',
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
    expect(list?.className).toBe('flex gap-1 rounded-full glass p-1');
    expect(list?.className).not.toContain('bg-surface');
    expect(list?.hasAttribute('variant')).toBe(false);
    expect(container.querySelector('li > span')?.className).toBe(
      'absolute inset-0 rounded-full bg-hover',
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
      'absolute inset-0 rounded-full bg-hover',
    );
  });

  // BUG-20260916-613 — the well inside a glass panel: a hairline, no fill,
  // the capsule as the lift the header uses. FEAT-20260919-624 — and no
  // `backdrop-filter`: the material's utilities are the package's only way
  // to carry one, and none of them is on this wrapper. One blur per stack.
  test('`variant="on-glass"` is a hairline well at the control radius with a `bg-hover` capsule, and no blur', () => {
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
    expect(list?.className).toBe(
      'flex gap-1 rounded-control border border-line p-1',
    );
    expect(list?.className).not.toContain('bg-surface');
    const classes = Array.from(list?.classList ?? []);
    expect(
      classes.some((c) => ['glass', 'glass-strong', 'glass-clear'].includes(c)),
    ).toBe(false);
    expect(container.querySelector('li > span')?.className).toBe(
      'absolute inset-0 rounded-[calc(var(--radius-control)-4px)] bg-hover',
    );
    expect(container.querySelectorAll('li > span').length).toBe(1);
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
