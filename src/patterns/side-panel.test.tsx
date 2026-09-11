import { beforeEach, describe, expect, test } from 'bun:test';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SidePanel, type SidePanelProps, useSidePanel } from './side-panel';

const labels = { resize: 'Resize the panel', expand: 'Show the panel' };

function Panel(props: Partial<SidePanelProps>) {
  return (
    <SidePanel
      storageKey="test-panel"
      aria-label="Sections"
      labels={labels}
      minWidth={240}
      maxWidth={480}
      defaultWidth={288}
      {...props}
    >
      <p>Sections go here</p>
    </SidePanel>
  );
}

/** A consumer's own collapse control, drawn from the panel's state. */
function Header() {
  const panel = useSidePanel();
  return (
    <button type="button" onClick={panel.collapse}>
      Hide ({panel.width})
    </button>
  );
}

const handle = () => screen.getByRole('separator', { name: 'Resize the panel' });
const panel = () => screen.getByRole('complementary', { name: 'Sections' });
const widthOf = () => panel().style.getPropertyValue('--side-panel-width');
const now = () => Number(handle().getAttribute('aria-valuenow'));

const drag = (from: number, to: number) => {
  fireEvent.pointerDown(handle(), { button: 0, clientX: from, pointerId: 1 });
  fireEvent.pointerMove(handle(), { clientX: to, pointerId: 1 });
  fireEvent.pointerUp(handle(), { clientX: to, pointerId: 1 });
};

beforeEach(() => {
  localStorage.clear();
});

describe('SidePanel', () => {
  test('the handle is a separator that reports where it is', () => {
    render(<Panel />);
    const h = handle();
    expect(h.getAttribute('aria-orientation')).toBe('vertical');
    expect(h.getAttribute('aria-valuemin')).toBe('240');
    expect(h.getAttribute('aria-valuemax')).toBe('480');
    expect(h.getAttribute('aria-valuenow')).toBe('288');
    expect(h.tabIndex).toBe(0);
    expect(widthOf()).toBe('288px');
  });

  describe('keyboard alone', () => {
    test('arrows move it by 16, towards the content to widen', () => {
      render(<Panel side="start" />);
      handle().focus();

      fireEvent.keyDown(handle(), { key: 'ArrowRight' });
      expect(now()).toBe(304);
      fireEvent.keyDown(handle(), { key: 'ArrowLeft' });
      fireEvent.keyDown(handle(), { key: 'ArrowLeft' });
      expect(now()).toBe(272);
    });

    test('on the end edge the arrows point the other way', () => {
      render(<Panel side="end" />);
      fireEvent.keyDown(handle(), { key: 'ArrowLeft' });
      expect(now()).toBe(304);
    });

    test('Home and End go to the ends, and the ends are the props', () => {
      render(<Panel />);
      fireEvent.keyDown(handle(), { key: 'End' });
      expect(now()).toBe(480);
      fireEvent.keyDown(handle(), { key: 'Home' });
      expect(now()).toBe(240);
      // Past the end, it stays at the end.
      fireEvent.keyDown(handle(), { key: 'ArrowLeft' });
      expect(now()).toBe(240);
    });

    test('Enter collapses an open panel and restores a collapsed one, at its width', () => {
      render(<Panel />);
      fireEvent.keyDown(handle(), { key: 'ArrowRight' });
      expect(now()).toBe(304);

      fireEvent.keyDown(handle(), { key: 'Enter' });
      expect(panel().getAttribute('data-collapsed')).toBe('true');
      expect(screen.queryByText('Sections go here')).toBeNull();
      // The handle does not go away with the panel — it is the way back.
      expect(handle()).toBeDefined();

      fireEvent.keyDown(handle(), { key: 'Enter' });
      expect(panel().getAttribute('data-collapsed')).toBeNull();
      expect(now()).toBe(304);
      expect(screen.getByText('Sections go here')).toBeDefined();
    });
  });

  describe('pointer', () => {
    test('a drag widens and narrows, clamped to the props', () => {
      render(<Panel side="start" />);
      drag(288, 350);
      expect(now()).toBe(350);
      drag(350, 900);
      expect(now()).toBe(480);
      drag(480, 250);
      expect(now()).toBe(250);
    });

    test('a drag on the end edge widens leftward', () => {
      render(<Panel side="end" />);
      drag(1000, 950);
      expect(now()).toBe(338);
    });

    test('a drag past half the minimum collapses to the strip rather than below it', () => {
      render(<Panel side="start" />);
      drag(288, 100);
      expect(panel().getAttribute('data-collapsed')).toBe('true');
      expect(widthOf()).toBe('calc(var(--size-nav) + 1rem)');
      // Not narrower than the strip and never zero: the value the handle
      // reports is the minimum, which is the least a panel can be.
      expect(now()).toBe(240);
      expect(screen.getByRole('button', { name: 'Show the panel' })).toBeDefined();
    });

    test('a drag between half the minimum and the minimum lands at the minimum', () => {
      render(<Panel side="start" />);
      drag(288, 180);
      expect(panel().getAttribute('data-collapsed')).toBeNull();
      expect(now()).toBe(240);
    });

    test('dragging a collapsed panel out reopens it', () => {
      render(<Panel side="start" defaultCollapsed />);
      expect(panel().getAttribute('data-collapsed')).toBe('true');
      drag(44, 344);
      expect(panel().getAttribute('data-collapsed')).toBeNull();
      expect(now()).toBe(300);
    });
  });

  test('the strip carries the expand button and the `rail` slot, and nothing else', () => {
    render(<Panel defaultCollapsed rail={<span>pinned</span>} />);
    expect(screen.queryByText('Sections go here')).toBeNull();
    expect(screen.getByText('pinned')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Show the panel' }));

    expect(screen.getByText('Sections go here')).toBeDefined();
    expect(screen.queryByText('pinned')).toBeNull();
  });

  test('a consumer draws its own collapse control from `useSidePanel()`', () => {
    render(
      <SidePanel storageKey="test-panel" aria-label="Sections" labels={labels}>
        <Header />
      </SidePanel>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Hide (288)' }));
    expect(panel().getAttribute('data-collapsed')).toBe('true');
  });

  /**
   * The acceptance criterion: collapse and width survive a reload. A reload
   * is an unmount and a fresh mount against the same `localStorage`, which
   * is what happy-dom's is between these two renders.
   */
  test('collapse and width survive a reload', async () => {
    const first = render(<Panel />);
    fireEvent.keyDown(handle(), { key: 'End' });
    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem('test-panel') ?? '{}')).toEqual({
        width: 480,
        collapsed: false,
      });
    });
    fireEvent.keyDown(handle(), { key: 'Enter' });
    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem('test-panel') ?? '{}').collapsed).toBe(true);
    });
    first.unmount();

    render(<Panel />);
    await waitFor(() => {
      expect(panel().getAttribute('data-collapsed')).toBe('true');
    });
    fireEvent.keyDown(handle(), { key: 'Enter' });
    expect(now()).toBe(480);
  });

  test('a stored width outside the props is clamped, and junk is ignored', async () => {
    localStorage.setItem('test-panel', JSON.stringify({ width: 9000, collapsed: 'yes' }));
    const { unmount } = render(<Panel />);
    await waitFor(() => expect(now()).toBe(480));
    expect(panel().getAttribute('data-collapsed')).toBeNull();
    unmount();

    localStorage.setItem('other', 'not json');
    render(<Panel storageKey="other" />);
    expect(now()).toBe(288);
  });

  test('two panels with two keys keep two records', async () => {
    render(
      <>
        <Panel storageKey="left" aria-label="Sections" side="start" />
        <Panel storageKey="right" aria-label="Ask" side="end" />
      </>,
    );
    const [left] = screen.getAllByRole('separator');
    fireEvent.keyDown(left as HTMLElement, { key: 'End' });
    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem('left') ?? '{}').width).toBe(480);
      expect(JSON.parse(localStorage.getItem('right') ?? '{}').width).toBe(288);
    });
  });

  test('it is chrome: `glass` by default, `glass-strong` on request', () => {
    const { unmount } = render(<Panel />);
    expect(panel().className.split(' ')).toContain('glass');
    unmount();
    render(<Panel material="glass-strong" />);
    expect(panel().className.split(' ')).toContain('glass-strong');
  });
});
