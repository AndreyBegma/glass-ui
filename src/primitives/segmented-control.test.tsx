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
    expect(Array.from(wrapper?.children ?? []).every((el) => el.tagName === 'DIV')).toBe(true);
  });
});
