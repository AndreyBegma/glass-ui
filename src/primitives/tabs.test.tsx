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
});
