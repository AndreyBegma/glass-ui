import { describe, expect, mock, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import type { NavLinkRender } from '../patterns/nav-link';
import {
  NavTab,
  NavTabs,
  Tab,
  TabGroup,
  TabList,
  TabPanel,
  Tabs,
  TabsItem,
} from './tabs';

function Settings({
  initial = 'general',
  onChange,
}: {
  initial?: string;
  onChange?: (value: string) => void;
}) {
  const [tab, setTab] = useState(initial);
  return (
    <TabGroup
      value={tab}
      onValueChange={(v) => {
        onChange?.(v);
        setTab(v);
      }}
    >
      <TabList aria-label="Project settings">
        <Tab value="general">General</Tab>
        <Tab value="members">Members</Tab>
        <Tab value="billing" disabled>
          Billing
        </Tab>
        <Tab value="danger zone">Danger zone</Tab>
      </TabList>
      <TabPanel value="general">General body</TabPanel>
      <TabPanel value="members">Members body</TabPanel>
      <TabPanel value="billing">Billing body</TabPanel>
      <TabPanel value="danger zone" keepMounted>
        Danger body
      </TabPanel>
    </TabGroup>
  );
}

const tab = (name: string) => screen.getByRole('tab', { name });

// Issue 130. The suite names spell it out: `tokens.spec.ts` reads a hash and
// three hex digits in a string as a colour literal.
describe('TabList — ARIA tabs', () => {
  test('roles, selection and the id wiring between each tab and its panel', () => {
    render(<Settings />);
    expect(screen.getByRole('tablist', { name: 'Project settings' })).not.toBeNull();
    expect(screen.getAllByRole('tab').length).toBe(4);

    const general = tab('General');
    expect(general.getAttribute('aria-selected')).toBe('true');
    expect(tab('Members').getAttribute('aria-selected')).toBe('false');

    const panel = screen.getByRole('tabpanel');
    expect(panel.textContent).toBe('General body');
    expect(general.getAttribute('aria-controls')).toBe(panel.id);
    expect(panel.getAttribute('aria-labelledby')).toBe(general.id);

    // A value with a space still makes a valid id.
    expect(tab('Danger zone').id).not.toContain(' ');
    expect(document.getElementById(tab('Danger zone').getAttribute('aria-controls') ?? '')).not.toBeNull();
  });

  test('one Tab stop: only the selected tab is in the sequence', () => {
    render(<Settings />);
    expect(screen.getAllByRole('tab').map((t) => t.tabIndex)).toEqual([0, -1, -1, -1]);
  });

  test('ArrowRight and ArrowLeft move focus, wrap, and pass over a disabled tab', () => {
    const onChange = mock();
    render(<Settings onChange={onChange} />);
    tab('General').focus();

    fireEvent.keyDown(document.activeElement as Element, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(tab('Members'));
    fireEvent.keyDown(document.activeElement as Element, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(tab('Danger zone'));
    fireEvent.keyDown(document.activeElement as Element, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(tab('General'));
    fireEvent.keyDown(document.activeElement as Element, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(tab('Danger zone'));

    // Manual activation: moving focus selects nothing.
    expect(onChange).not.toHaveBeenCalled();
    expect(tab('General').getAttribute('aria-selected')).toBe('true');
  });

  test('Home and End go to the first and last enabled tab', () => {
    render(<Settings initial="members" />);
    tab('Members').focus();
    fireEvent.keyDown(tab('Members'), { key: 'End' });
    expect(document.activeElement).toBe(tab('Danger zone'));
    fireEvent.keyDown(tab('Danger zone'), { key: 'Home' });
    expect(document.activeElement).toBe(tab('General'));
  });

  test('activation (click, which Enter and Space produce on a button) selects, moves the Tab stop and swaps the panel', () => {
    const onChange = mock();
    render(<Settings onChange={onChange} />);
    tab('Members').focus();
    fireEvent.click(tab('Members'));
    expect(onChange).toHaveBeenCalledWith('members');
    expect(tab('Members').getAttribute('aria-selected')).toBe('true');
    expect(screen.getAllByRole('tab').map((t) => t.tabIndex)).toEqual([-1, 0, -1, -1]);
    expect(screen.getByRole('tabpanel').textContent).toBe('Members body');
  });

  test('a disabled tab announces it and ignores a click', () => {
    const onChange = mock();
    render(<Settings onChange={onChange} />);
    expect(tab('Billing').getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(tab('Billing'));
    expect(onChange).not.toHaveBeenCalled();
  });

  test('clicking the selected tab does not call onValueChange again', () => {
    const onChange = mock();
    render(<Settings onChange={onChange} />);
    fireEvent.click(tab('General'));
    expect(onChange).not.toHaveBeenCalled();
  });

  test('controlled: a new `value` from outside moves the selection', () => {
    const { rerender } = render(
      <TabGroup value="a" onValueChange={() => {}}>
        <TabList aria-label="X">
          <Tab value="a">A</Tab>
          <Tab value="b">B</Tab>
        </TabList>
      </TabGroup>,
    );
    expect(tab('A').getAttribute('aria-selected')).toBe('true');
    rerender(
      <TabGroup value="b" onValueChange={() => {}}>
        <TabList aria-label="X">
          <Tab value="a">A</Tab>
          <Tab value="b">B</Tab>
        </TabList>
      </TabGroup>,
    );
    expect(tab('B').getAttribute('aria-selected')).toBe('true');
    expect(tab('A').tabIndex).toBe(-1);
  });

  test('hidden panels keep their element but not their children, unless keepMounted', () => {
    const { container } = render(<Settings />);
    const panels = Array.from(container.querySelectorAll('[role="tabpanel"]'));
    expect(panels.length).toBe(4);
    const [general, members, , danger] = panels;
    expect(general?.hasAttribute('hidden')).toBe(false);
    expect(members?.hasAttribute('hidden')).toBe(true);
    expect(members?.textContent).toBe('');
    expect(danger?.hasAttribute('hidden')).toBe(true);
    expect(danger?.textContent).toBe('Danger body');
  });

  test('an explicit `id` is the base of the tab and panel ids', () => {
    render(
      <TabGroup id="settings" value="a" onValueChange={() => {}}>
        <TabList aria-label="X">
          <Tab value="a">A</Tab>
        </TabList>
        <TabPanel value="a">A body</TabPanel>
      </TabGroup>,
    );
    expect(tab('A').id).toBe('settings-tab-a');
    expect(screen.getByRole('tabpanel').id).toBe('settings-panel-a');
  });

  test('the selected tab carries the travelling capsule, the others do not', () => {
    render(<Settings />);
    expect(tab('General').querySelector('.bg-raised')).not.toBeNull();
    expect(tab('Members').querySelector('.bg-raised')).toBeNull();
  });

  test('a Tab outside a TabGroup says so', () => {
    const error = console.error;
    console.error = () => {};
    try {
      expect(() => render(<Tab value="a">A</Tab>)).toThrow('inside a TabGroup');
    } finally {
      console.error = error;
    }
  });
});

describe('NavTabs — navigation tabs', () => {
  test('a nav landmark of links; the current one is aria-current="page"', () => {
    render(
      <NavTabs aria-label="Project">
        <NavTab href="/queue" current>
          Queue
        </NavTab>
        <NavTab href="/fleet" current={false}>
          Fleet
        </NavTab>
      </NavTabs>,
    );
    expect(screen.getByRole('navigation', { name: 'Project' })).not.toBeNull();
    const queue = screen.getByRole('link', { name: 'Queue' });
    const fleet = screen.getByRole('link', { name: 'Fleet' });
    expect(queue.getAttribute('href')).toBe('/queue');
    expect(queue.getAttribute('aria-current')).toBe('page');
    expect(fleet.getAttribute('aria-current')).toBeNull();
    const items = screen.getAllByRole('listitem');
    expect(items[0]?.querySelector('.bg-raised')).not.toBeNull();
    expect(items[1]?.querySelector('.bg-raised')).toBeNull();
  });

  test('the consumer’s `link` renders the anchor and receives href, class and aria-current', () => {
    const calls: Parameters<NavLinkRender>[0][] = [];
    const link: NavLinkRender = (props) => {
      calls.push(props);
      const { children, ...rest } = props;
      return (
        <a data-router="yes" {...rest}>
          {children}
        </a>
      );
    };
    render(
      <NavTabs aria-label="Project" link={link}>
        <NavTab href="/queue" current>
          Queue
        </NavTab>
        <NavTab href="/fleet" current={false}>
          Fleet
        </NavTab>
      </NavTabs>,
    );
    expect(calls.map((c) => c.href)).toEqual(['/queue', '/fleet']);
    expect(calls[0]?.['aria-current']).toBe('page');
    expect(calls[1]?.['aria-current']).toBeUndefined();
    expect(calls[0]?.className).toContain('text-ink');
    const queue = screen.getByRole('link', { name: 'Queue' });
    expect(queue.getAttribute('data-router')).toBe('yes');
    expect(queue.getAttribute('aria-current')).toBe('page');
  });
});

describe('Tabs (deprecated)', () => {
  test('still renders the same list after the ARIA tabs arrived', () => {
    render(
      <Tabs aria-label="Old">
        <TabsItem current layoutId="old">
          <a href="/a">A</a>
        </TabsItem>
      </Tabs>,
    );
    expect(screen.getByRole('list', { name: 'Old' }).className).toBe(
      'flex gap-1 rounded-control bg-surface p-1',
    );
  });
});

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
    expect(item.className).toBe('relative min-w-0 flex-1');
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
    expect(item.className).toContain('min-w-0');
    expect(item.className).toContain('flex-none');
    expect(item.className).toContain('whitespace-nowrap');
    expect(item.className).not.toContain('flex-1');
  });
});

/**
 * FEAT-20260930-004 (SYS-16, TASKS-1), #168 — `scroll`: a row that does not
 * fit says so.
 *
 * happy-dom has no layout, so the geometry is given: a 200px row holding
 * 600px of tabs, the current one at 400px. What is asserted is what the
 * component does with it — the row scrolls, fades on the side with more, and
 * brings the current tab to the middle.
 */
describe('Tabs scroll, in a row too narrow for them', () => {
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
      <Tabs aria-label="Views" scroll>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <TabsItem key={i} current={i === 4} layoutId="tabs-scroll">
            <a href={`/${i}`}>{`View ${i}`}</a>
          </TabsItem>
        ))}
      </Tabs>,
    );
  }

  test('items are their content’s width and never wrap their label', () => {
    row();
    for (const item of screen.getAllByRole('listitem')) {
      expect(item.className).toBe('relative min-w-fit flex-1 [&>*]:whitespace-nowrap');
    }
  });

  test('the row scrolls sideways, with its bar hidden', () => {
    const { container } = row();
    const scroller = container.querySelector('.overflow-x-auto');
    expect(scroller?.className).toContain('scrollbar-hide');
    // The list is inside the scroller and does not scroll itself.
    expect(scroller?.contains(screen.getByRole('list', { name: 'Views' }))).toBe(true);
    expect(screen.getByRole('list', { name: 'Views' }).className).not.toContain('overflow-x-auto');
  });

  test('the current tab is scrolled to the middle of the row on mount', () => {
    given();
    try {
      // `offsetLeft` is read from `data-at`, which the link's ref sets on its
      // item — refs attach before the item's layout effect runs.
      const { container } = render(
        <Tabs aria-label="Views" scroll>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <TabsItem key={i} current={i === 4} layoutId="tabs-scroll-mid">
              <a
                href={`/${i}`}
                ref={(a) => a?.parentElement?.setAttribute('data-at', String(i * 100))}
              >
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

  test('without `scroll` there is no scroller, and the row is what it was', () => {
    const { container } = render(
      <Tabs aria-label="Plain">
        <TabsItem current layoutId="tabs-plain">
          <a href="/a">A</a>
        </TabsItem>
      </Tabs>,
    );
    expect(container.querySelector('.overflow-x-auto')).toBeNull();
    expect(screen.getByRole('listitem').className).toBe('relative min-w-0 flex-1');
  });
});
