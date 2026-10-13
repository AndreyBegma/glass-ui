import { describe, expect, mock, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { Bot, GitBranch, Pause, Trash2, Users } from 'lucide-react';
import { statusTone } from '../primitives/status-pill';
import { NodeCard } from './node-card';

const full = {
  title: 'Backend Agent',
  icon: Bot,
  color: 'series-3',
  status: 'running',
  description: 'Implement backend services.',
  meta: [
    { icon: Users, value: '2', label: 'agents' },
    { icon: GitBranch, value: '1', label: 'worktrees' },
  ],
  tag: { label: 'worktree', value: 'feature/backend' },
} as const;

const card = (container: HTMLElement) =>
  container.querySelector('[data-node-card]') as HTMLElement;

describe('NodeCard', () => {
  test('renders the title as a heading, the status, the description, meta and tag', () => {
    const { container } = render(<NodeCard {...full} />);
    expect(
      screen.getByRole('heading', { level: 3, name: 'Backend Agent' }),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-status="running"]')?.textContent,
    ).toBe('Running');
    expect(screen.getByText('Implement backend services.')).not.toBeNull();
    const meta = container.querySelectorAll('[data-node-meta] li');
    expect(meta.length).toBe(2);
    // The counter's meaning is read out, not only drawn as an icon.
    expect(meta[0].textContent).toBe('2 agents');
    expect(meta[0].getAttribute('title')).toBe('agents');
    const tag = container.querySelector('[data-node-tag]');
    expect(tag?.textContent).toBe('worktree:feature/backend');
    expect(tag?.querySelector('code')?.textContent).toBe('feature/backend');
  });

  test('the status draws the rim and the glow from statusTone, and glow={false} keeps only the rim', () => {
    const tone = statusTone('blocked');
    const { container, rerender } = render(
      <NodeCard title="QA" status="blocked" />,
    );
    expect(card(container).className).toContain(tone.rim);
    expect(card(container).className).toContain(tone.glow);
    rerender(<NodeCard title="QA" status="blocked" glow={false} />);
    expect(card(container).className).toContain(tone.rim);
    expect(card(container).className).not.toContain(tone.glow);
  });

  test('without a status it is the plain content surface', () => {
    const { container } = render(<NodeCard title="Plain" />);
    expect(card(container).className).toContain('bg-content');
    expect(card(container).className).toContain('border-line');
    expect(card(container).className).not.toMatch(
      /(^|\s)glass(-strong|-clear)?(\s|$)/,
    );
  });

  test('the tile colour is an identity and never the accent', () => {
    const { container } = render(<NodeCard {...full} />);
    const tile = container.querySelector('[data-node-tile="series-3"]');
    expect(tile?.className).toContain('text-series-3');
    expect(tile?.className).not.toContain('accent');
  });

  test('selected is the accent ring', () => {
    const { container } = render(<NodeCard title="Pm" selected />);
    expect(card(container).className).toContain('ring-accent');
    expect(card(container).getAttribute('data-selected')).toBe('true');
  });

  test('pressable only with onSelect: the title becomes the button', () => {
    const onSelect = mock();
    const { rerender } = render(<NodeCard title="Pm" />);
    expect(screen.queryByRole('button', { name: 'Pm' })).toBeNull();
    rerender(<NodeCard title="Pm" onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: 'Pm' }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  test('progress takes the status family, and needs its label', () => {
    render(
      <NodeCard
        title="Ui"
        status="paused"
        progress={{ value: 32, label: 'Progress', hint: '32%' }}
      />,
    );
    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBe('32');
    expect(bar.innerHTML).toContain('bg-warn');
  });

  test('the footer renders above the stretched hit area', () => {
    const { container } = render(
      <NodeCard
        title="Pm"
        onSelect={() => {}}
        footer={<input aria-label="Prompt" />}
      />,
    );
    const input = screen.getByRole('textbox', { name: 'Prompt' });
    expect(input.parentElement?.className).toContain('z-[1]');
    expect(container.querySelector('button')?.className).toContain(
      'after:inset-0',
    );
  });

  test('the header menu lists the actions and runs one', () => {
    const onPause = mock();
    render(
      <NodeCard
        title="Pm"
        actions={[
          { id: 'pause', label: 'Pause', icon: Pause, onSelect: onPause },
          {
            id: 'delete',
            label: 'Delete',
            icon: Trash2,
            onSelect: () => {},
            tone: 'danger',
          },
        ]}
      />,
    );
    const trigger = screen.getByRole('button', { name: 'Actions for Pm' });
    fireEvent.pointerDown(trigger, { button: 0, pointerType: 'mouse' });
    fireEvent.click(screen.getByRole('menuitem', { name: 'Pause' }));
    expect(onPause).toHaveBeenCalledTimes(1);
  });

  test('compact is smaller and clamps the description', () => {
    const { container } = render(<NodeCard {...full} size="compact" />);
    expect(card(container).className).toContain('p-3');
    expect(screen.getByText('Implement backend services.').className).toContain(
      'line-clamp-2',
    );
  });

  test('the heading level is the caller’s', () => {
    render(<NodeCard title="Pm" headingLevel={2} />);
    expect(
      screen.getByRole('heading', { level: 2, name: 'Pm' }),
    ).not.toBeNull();
  });
});
