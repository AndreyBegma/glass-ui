import { describe, expect, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { Network } from 'lucide-react';
import { statusTone } from '../primitives/status-pill';
import { MetaBar } from './meta-bar';

const counters = [
  { value: 12, label: 'Agents' },
  { value: 4, label: 'Worktrees' },
  { value: 3, label: 'Running', tone: 'running' },
  { value: 1, label: 'Blocked', tone: 'blocked' },
] as const;

describe('MetaBar', () => {
  test('the title is the page heading, with the status pill beside it', () => {
    const { container } = render(
      <MetaBar
        title="Agent Fleet"
        icon={Network}
        color="series-2"
        status="running"
      />,
    );
    expect(
      screen.getByRole('heading', { level: 1, name: 'Agent Fleet' }),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-status="running"]')?.textContent,
    ).toBe('Running');
    const tile = container.querySelector('[data-meta-tile="series-2"]');
    expect(tile?.getAttribute('aria-hidden')).toBe('true');
    expect(tile?.className).toContain('text-series-2');
    expect(tile?.className).not.toContain('accent');
  });

  test('headingLevel moves the heading down when the bar heads a panel', () => {
    render(<MetaBar title="Backend" headingLevel={2} />);
    expect(
      screen.getByRole('heading', { level: 2, name: 'Backend' }),
    ).not.toBeNull();
  });

  test('counters read as a sentence: the separators are drawn but hidden', () => {
    const { container } = render(<MetaBar title="Fleet" counters={counters} />);
    const items = container.querySelectorAll('[data-meta-counter]');
    expect(Array.from(items, (item) => item.textContent)).toEqual([
      '12 Agents',
      '4 Worktrees',
      '3 Running',
      '1 Blocked',
    ]);
    const separators = container.querySelectorAll('[data-meta-separator]');
    expect(separators.length).toBe(3);
    for (const separator of separators) {
      expect(separator.getAttribute('aria-hidden')).toBe('true');
      expect(separator.textContent).toBe('/');
    }
  });

  test("a counter's tone colours its value from statusTone; untoned values are plain ink", () => {
    const { container } = render(<MetaBar title="Fleet" counters={counters} />);
    const values = Array.from(
      container.querySelectorAll('[data-meta-counter] > span'),
      (span) => span.className,
    );
    expect(values[0]).toContain('text-ink');
    expect(values[2]).toContain(statusTone('running').text);
    expect(values[3]).toContain(statusTone('blocked').text);
  });

  test('the actions slot is drawn on the right, and absent when not given', () => {
    const { container, rerender } = render(
      <MetaBar
        title="Fleet"
        actions={<button type="button">New agent</button>}
      />,
    );
    expect(container.querySelector('[data-meta-actions]')?.textContent).toBe(
      'New agent',
    );
    rerender(<MetaBar title="Fleet" />);
    expect(container.querySelector('[data-meta-actions]')).toBeNull();
    expect(container.querySelector('[data-meta-counters]')).toBeNull();
  });
});
