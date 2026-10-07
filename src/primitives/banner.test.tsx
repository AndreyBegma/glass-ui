import { describe, expect, mock, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { Banner } from './banner';

describe('Banner', () => {
  test('warn and danger have role="alert"; info and ok have role="status"', () => {
    for (const [tone, role] of [
      ['warn', 'alert'],
      ['danger', 'alert'],
      ['info', 'status'],
      ['ok', 'status'],
    ] as const) {
      const { unmount } = render(<Banner tone={tone}>msg</Banner>);
      expect(screen.getByRole(role)).not.toBeNull();
      unmount();
    }
  });

  test('dismiss button is named "Dismiss" and calls onDismiss', () => {
    const onDismiss = mock(() => {});
    render(
      <Banner tone="info" onDismiss={onDismiss}>
        x
      </Banner>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  test('no dismiss button without onDismiss', () => {
    render(<Banner tone="info">x</Banner>);
    expect(screen.queryByRole('button')).toBeNull();
  });

  test('dismiss has a 44px hit area on a coarse pointer', () => {
    render(
      <Banner tone="info" onDismiss={() => {}}>
        x
      </Banner>,
    );
    expect(screen.getByRole('button', { name: 'Dismiss' }).className).toContain(
      'pointer-coarse:size-11',
    );
  });

  test('tone uses token classes only', () => {
    const expected = { info: 'bg-hover', ok: 'bg-ok/10', warn: 'bg-warn/10', danger: 'bg-danger/10' };
    for (const tone of ['info', 'ok', 'warn', 'danger'] as const) {
      const { container, unmount } = render(<Banner tone={tone}>x</Banner>);
      const root = container.firstElementChild as HTMLElement;
      expect(root.className).toContain(expected[tone]);
      expect(root.className).not.toMatch(/#[0-9a-f]{3,8}|rgb|-(red|green|amber|blue)-\d/);
      unmount();
    }
  });

  test('renders title, children and action', () => {
    render(
      <Banner tone="warn" title="Heads up" action={<button type="button">Retry</button>}>
        Body text
      </Banner>,
    );
    for (const t of ['Heads up', 'Body text']) expect(screen.getByText(t)).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Retry' })).not.toBeNull();
  });

  test('icon={false} hides the icon; a custom icon replaces the default', () => {
    const a = render(<Banner tone="ok">x</Banner>);
    expect(a.container.querySelector('[data-banner-icon] svg')).not.toBeNull();
    a.unmount();
    const b = render(
      <Banner tone="ok" icon={false}>
        x
      </Banner>,
    );
    expect(b.container.querySelector('[data-banner-icon]')).toBeNull();
    b.unmount();
    const c = render(
      <Banner tone="ok" icon={<i data-testid="mine" />}>
        x
      </Banner>,
    );
    expect(c.container.querySelector('[data-banner-icon] [data-testid="mine"]')).not.toBeNull();
    expect(c.container.querySelector('[data-banner-icon] svg')).toBeNull();
  });

  test('is a solid surface, never glass', () => {
    const { container } = render(<Banner tone="info">x</Banner>);
    expect(container.querySelector('[class*="glass"]')).toBeNull();
  });

  test('renders under data-theme light, dark and data-material flat', () => {
    for (const attrs of [
      { 'data-theme': 'light' },
      { 'data-theme': 'dark' },
      { 'data-material': 'flat' },
    ]) {
      const { container, unmount } = render(
        <div {...attrs}>
          <Banner tone="danger" title="t">
            x
          </Banner>
        </div>,
      );
      const root = container.querySelector('[data-tone]') as HTMLElement;
      expect(root.className).toContain('rounded-surface');
      expect(root.className).toContain('text-ink');
      expect(container.querySelector('[class*="glass"]')).toBeNull();
      unmount();
    }
  });
});
