import { describe, expect, mock, test } from 'bun:test';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { type DockTab, DockTabs } from './dock-tabs';

const items: DockTab[] = [
  { id: 'orch', label: 'Orchestrator', status: 'running', closable: false },
  { id: 'fe', label: 'Frontend Agent', status: 'waiting' },
  { id: 'be', label: 'Backend Agent', status: 'blocked' },
];

const tab = (name: string) => screen.getByRole('tab', { name });

/** A parent that owns the list, so a close actually removes the tab. */
function Owned({
  initial = items,
  onSelect = () => {},
}: {
  initial?: DockTab[];
  onSelect?: (id: string) => void;
}) {
  const [list, setList] = useState(initial);
  const [active, setActive] = useState('fe');
  return (
    <DockTabs
      items={list}
      activeId={active}
      onSelect={(id) => {
        setActive(id);
        onSelect(id);
      }}
      onClose={(id) => setList((prev) => prev.filter((item) => item.id !== id))}
    />
  );
}

describe('DockTabs', () => {
  test('a named tablist of tabs; the active one is selected and holds the Tab stop', () => {
    render(<DockTabs items={items} activeId="fe" onSelect={() => {}} />);
    expect(screen.getByRole('tablist', { name: 'Open items' })).not.toBeNull();
    expect(screen.getAllByRole('tab').length).toBe(3);
    expect(tab('Frontend Agent').getAttribute('aria-selected')).toBe('true');
    expect(tab('Orchestrator').getAttribute('aria-selected')).toBe('false');
    expect(tab('Frontend Agent').tabIndex).toBe(0);
    expect(tab('Orchestrator').tabIndex).toBe(-1);
    expect(tab('Backend Agent').tabIndex).toBe(-1);
  });

  test('each tab carries the status dot of its status', () => {
    const { container } = render(
      <DockTabs items={items} activeId="fe" onSelect={() => {}} />,
    );
    expect(
      container.querySelector(
        '[data-dock-tab="be"] [data-status-dot="blocked"]',
      ),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-dock-tab="orch"] [data-status-pulse]'),
    ).not.toBeNull();
  });

  test('arrows, Home and End move focus without switching; Enter switches', () => {
    const onSelect = mock();
    render(<DockTabs items={items} activeId="fe" onSelect={onSelect} />);
    tab('Frontend Agent').focus();
    fireEvent.keyDown(tab('Frontend Agent'), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(tab('Backend Agent'));
    fireEvent.keyDown(tab('Backend Agent'), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(tab('Orchestrator'));
    fireEvent.keyDown(tab('Orchestrator'), { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(tab('Backend Agent'));
    fireEvent.keyDown(tab('Backend Agent'), { key: 'Home' });
    expect(document.activeElement).toBe(tab('Orchestrator'));
    fireEvent.keyDown(tab('Orchestrator'), { key: 'End' });
    expect(document.activeElement).toBe(tab('Backend Agent'));
    // The Tab stop followed focus.
    expect(tab('Backend Agent').tabIndex).toBe(0);
    expect(tab('Frontend Agent').tabIndex).toBe(-1);
    expect(onSelect).not.toHaveBeenCalled();
    fireEvent.click(tab('Backend Agent'));
    expect(onSelect).toHaveBeenCalledWith('be');
  });

  test('the × closes, is named, and stays out of the Tab order', () => {
    const onClose = mock();
    render(
      <DockTabs
        items={items}
        activeId="fe"
        onSelect={() => {}}
        onClose={onClose}
      />,
    );
    const close = screen.getByRole('button', { name: 'Close Backend Agent' });
    expect(close.tabIndex).toBe(-1);
    fireEvent.click(close);
    expect(onClose).toHaveBeenCalledWith('be');
  });

  test('a tab that is not closable has no ×, and Delete leaves it', () => {
    const onClose = mock();
    render(
      <DockTabs
        items={items}
        activeId="orch"
        onSelect={() => {}}
        onClose={onClose}
      />,
    );
    expect(
      screen.queryByRole('button', { name: 'Close Orchestrator' }),
    ).toBeNull();
    fireEvent.keyDown(tab('Orchestrator'), { key: 'Delete' });
    expect(onClose).not.toHaveBeenCalled();
  });

  test('without onClose there is no × at all', () => {
    render(<DockTabs items={items} activeId="fe" onSelect={() => {}} />);
    expect(screen.queryByRole('button', { name: /^Close/ })).toBeNull();
  });

  test('Delete closes the focused tab and focus moves to its neighbour', async () => {
    render(<Owned />);
    tab('Frontend Agent').focus();
    await act(async () => {
      fireEvent.keyDown(tab('Frontend Agent'), { key: 'Delete' });
    });
    expect(screen.queryByRole('tab', { name: 'Frontend Agent' })).toBeNull();
    expect(document.activeElement).toBe(tab('Backend Agent'));
    expect(tab('Backend Agent').tabIndex).toBe(0);
  });

  test('the "+" and the status slot', () => {
    const onAdd = mock();
    const { container, rerender } = render(
      <DockTabs
        items={items}
        activeId="fe"
        onSelect={() => {}}
        onAdd={onAdd}
        status="3 agents running"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'New tab' }));
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[data-dock-status]')?.textContent).toBe(
      '3 agents running',
    );
    rerender(<DockTabs items={items} activeId="fe" onSelect={() => {}} />);
    expect(screen.queryByRole('button', { name: 'New tab' })).toBeNull();
    expect(container.querySelector('[data-dock-status]')).toBeNull();
  });

  test('the active tab is scrolled into view when it changes', () => {
    const calls: string[] = [];
    const original = HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = function (this: HTMLElement) {
      calls.push(this.textContent ?? '');
    };
    try {
      const { rerender } = render(
        <DockTabs items={items} activeId="fe" onSelect={() => {}} />,
      );
      rerender(<DockTabs items={items} activeId="be" onSelect={() => {}} />);
      expect(calls).toEqual(['Frontend Agent', 'Backend Agent']);
    } finally {
      HTMLElement.prototype.scrollIntoView = original;
    }
  });

  test('labels override the strings it writes; it is glass and marks the active tab with the accent', () => {
    const { container } = render(
      <DockTabs
        items={items}
        activeId="fe"
        onSelect={() => {}}
        onClose={() => {}}
        onAdd={() => {}}
        labels={{
          tablist: 'Відкриті',
          close: (l) => `Закрити ${l}`,
          add: 'Додати',
        }}
      />,
    );
    expect(screen.getByRole('tablist', { name: 'Відкриті' })).not.toBeNull();
    expect(
      screen.getByRole('button', { name: 'Закрити Backend Agent' }),
    ).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Додати' })).not.toBeNull();
    expect(container.querySelector('[data-dock-tabs]')?.className).toMatch(
      /(^|\s)glass(\s|$)/,
    );
    expect(
      container.querySelector('[data-dock-tab="fe"]')?.className,
    ).toContain('after:bg-accent');
  });
});
