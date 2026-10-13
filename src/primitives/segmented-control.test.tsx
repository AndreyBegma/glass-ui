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
    control();
    const list = screen.getByRole('list');
    expect(list.className).toContain('w-fit');
    expect(list.className).toContain('max-w-full');
    for (const item of screen.getAllByRole('listitem')) {
      expect(item.className).toContain('flex-none');
      expect(item.className).not.toContain('flex-1');
    }
  });

  test('`full` shares the row in equal parts, never below a label', () => {
    control(true);
    const list = screen.getByRole('list');
    expect(list.className).toContain('w-full');
    expect(list.className).not.toContain('w-fit');
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
    const list = screen.getByRole('list');
    expect(list.className).toContain('overflow-x-auto');
    expect(list.className).toContain('scrollbar-hide');
    const fades = container.querySelectorAll('[aria-hidden="true"].pointer-events-none');
    expect(fades).toHaveLength(2);
    for (const fade of fades) expect(fade.className).toContain('from-surface');
  });

  test('the active pill uses the tabs radius', () => {
    const { container } = control();
    expect(container.querySelector('.bg-raised')?.className).toContain(
      'rounded-[calc(var(--radius-control)*2/3)]',
    );
  });
});
