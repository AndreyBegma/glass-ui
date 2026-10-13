import { describe, expect, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { STATUSES, StatusDot, StatusPill, statusTone } from './status-pill';

describe('statusTone', () => {
  test('maps every status to its semantic family', () => {
    expect(
      Object.fromEntries(STATUSES.map((s) => [s, statusTone(s).tone])),
    ).toEqual({
      running: 'ok',
      waiting: 'info',
      paused: 'warn',
      blocked: 'danger',
      done: 'ok',
      error: 'danger',
      idle: 'neutral',
    });
  });

  test('every class is a token utility, and none is the accent', () => {
    for (const status of STATUSES) {
      const { text, soft, dot, rim, glow } = statusTone(status);
      for (const cls of [text, soft, dot, rim, glow])
        expect(cls).not.toContain('accent');
      expect(text).toMatch(/^text-/);
      expect(dot).toMatch(/^bg-/);
      expect(rim).toMatch(/^border-/);
    }
  });

  test('only running pulses, and only idle has no glow', () => {
    expect(STATUSES.filter((s) => statusTone(s).pulse)).toEqual(['running']);
    expect(STATUSES.filter((s) => statusTone(s).glow === '')).toEqual(['idle']);
  });

  test('statuses that share a hue still differ in label', () => {
    const labels = STATUSES.map((s) => statusTone(s).label);
    expect(new Set(labels).size).toBe(STATUSES.length);
  });

  // #109
  test('each state reads its own status tokens, and idle the quiet ink', () => {
    for (const status of STATUSES.filter((s) => s !== 'idle')) {
      const { text, soft, dot, rim, glow } = statusTone(status);
      expect(text).toBe(`text-status-${status}-ink`);
      expect(soft).toBe(`bg-status-${status}-soft`);
      expect(dot).toBe(`bg-status-${status}`);
      expect(rim).toMatch(new RegExp(`^border-status-${status}/\\d+$`));
      expect(glow).toContain(`var(--color-status-${status}-glow)`);
    }
    expect(statusTone('idle').text).toBe('text-ink-2');
    const dots = STATUSES.map((s) => statusTone(s).dot);
    expect(new Set(dots).size).toBe(STATUSES.length);
  });
});

describe('StatusPill', () => {
  test.each([
    ...STATUSES,
  ])('%s: draws the dot and the label in its tone', (status) => {
    const { container } = render(<StatusPill status={status} />);
    const pill = container.querySelector(`[data-status="${status}"]`);
    const tone = statusTone(status);
    expect(pill?.textContent).toBe(tone.label);
    expect(pill?.className).toContain(tone.text);
    expect(pill?.className).toContain(tone.soft);
    expect(
      pill
        ?.querySelector(`[data-status-dot="${status}"]`)
        ?.getAttribute('aria-hidden'),
    ).toBe('true');
  });

  test('a label replaces the English default', () => {
    render(<StatusPill status="running" label="En cours" />);
    expect(screen.getByText('En cours')).not.toBeNull();
    expect(screen.queryByText('Running')).toBeNull();
  });

  test('the glow is opt-in', () => {
    const { container, rerender } = render(<StatusPill status="blocked" />);
    const glow = statusTone('blocked').glow;
    expect(container.querySelector('[data-status]')?.className).not.toContain(
      glow,
    );
    rerender(<StatusPill status="blocked" glow />);
    expect(container.querySelector('[data-status]')?.className).toContain(glow);
  });

  test('the running pulse is motion-safe only', () => {
    const { container } = render(<StatusDot status="running" />);
    const pulse = container.querySelector('[data-status-pulse]');
    expect(pulse?.className).toContain('motion-safe:animate-ping');
    expect(pulse?.className).not.toMatch(/(^|\s)animate-ping/);
  });

  test('a still status has no pulse element', () => {
    const { container } = render(<StatusDot status="paused" />);
    expect(container.querySelector('[data-status-pulse]')).toBeNull();
  });
});
