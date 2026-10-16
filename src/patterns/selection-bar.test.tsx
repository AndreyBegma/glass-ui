import { describe, expect, mock, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { Archive, Trash2 } from 'lucide-react';
import { hasReducedMotionListener, prefersReducedMotion } from 'motion-dom';
import { SelectionBar, type SelectionBarAction } from './selection-bar';

function actions(onMove = () => {}): SelectionBarAction[] {
  return [
    {
      id: 'move',
      label: 'Move to Completed',
      onSelect: onMove,
      count: 40,
      of: 42,
    },
    {
      id: 'archive',
      label: 'Archive',
      icon: Archive,
      onSelect: () => {},
      count: 42,
      of: 42,
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: Trash2,
      tone: 'danger',
      onSelect: () => {},
      count: 0,
      of: 42,
    },
  ];
}

const bar = () => screen.getByRole('toolbar', { name: 'Selection actions' });

function mockMatchMedia(matching: string) {
  const original = window.matchMedia;
  window.matchMedia = ((query: string) => ({
    // Motion asks for "(prefers-reduced-motion)", with no value.
    matches: query.includes(matching),
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
  return () => {
    window.matchMedia = original;
  };
}

describe('SelectionBar', () => {
  // Motion reads the media query once and caches it for the process, hence the
  // reset on both sides of this test.
  test('reduced motion: no transform animation', () => {
    const restore = mockMatchMedia('prefers-reduced-motion');
    // Another file may have rendered Motion first and cached "no preference".
    hasReducedMotionListener.current = false;
    prefersReducedMotion.current = null;
    try {
      render(<SelectionBar count={2} onClear={() => {}} />);
      expect(bar().style.transform).toBe('');
    } finally {
      restore();
      // Un-cache it, or every later test in the process renders as reduced.
      hasReducedMotionListener.current = false;
      prefersReducedMotion.current = null;
    }
  });

  test('without reduced motion the bar rises into place', () => {
    render(<SelectionBar count={2} onClear={() => {}} />);
    expect(bar().style.transform).toContain('translateY');
  });

  test('renders nothing at count 0', () => {
    const { container } = render(
      <SelectionBar count={0} onClear={() => {}} actions={actions()} />,
    );
    expect(container.innerHTML).toBe('');
    expect(screen.queryByRole('toolbar')).toBeNull();
  });

  test('renders the bar at count 1 and above, with "N selected"', () => {
    const { rerender } = render(
      <SelectionBar count={1} onClear={() => {}} actions={actions()} />,
    );
    expect(bar().textContent).toContain('1 selected');
    rerender(
      <SelectionBar count={42} onClear={() => {}} actions={actions()} />,
    );
    expect(bar().textContent).toContain('42 selected');
  });

  test('a label render prop replaces "N selected"', () => {
    render(
      <SelectionBar
        count={3}
        onClear={() => {}}
        label={(n) => `${n} cards chosen`}
      />,
    );
    expect(bar().textContent).toContain('3 cards chosen');
    expect(bar().textContent).not.toContain('selected');
  });

  test('the Clear button calls onClear', () => {
    const onClear = mock(() => {});
    render(<SelectionBar count={2} onClear={onClear} />);
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  test('Escape with focus inside the bar calls onClear', () => {
    const onClear = mock(() => {});
    render(<SelectionBar count={2} onClear={onClear} actions={actions()} />);
    const move = screen.getByRole('button', { name: /Move to Completed/ });
    move.focus();
    fireEvent.keyDown(move, { key: 'Escape' });
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  test('Escape outside the bar does not call onClear', () => {
    const onClear = mock(() => {});
    render(
      <>
        <button type="button">elsewhere</button>
        <SelectionBar count={2} onClear={onClear} />
      </>,
    );
    fireEvent.keyDown(screen.getByRole('button', { name: 'elsewhere' }), {
      key: 'Escape',
    });
    expect(onClear).not.toHaveBeenCalled();
  });

  test('the count lives in a polite live region and its text follows the count', () => {
    const { rerender } = render(<SelectionBar count={3} onClear={() => {}} />);
    const region = () => bar().querySelector('[aria-live="polite"]');
    expect(region()?.textContent).toBe('3 selected');
    rerender(<SelectionBar count={5} onClear={() => {}} />);
    expect(region()?.textContent).toBe('5 selected');
  });

  test('an action draws "N of M" and calls onSelect', () => {
    const onMove = mock(() => {});
    render(
      <SelectionBar count={42} onClear={() => {}} actions={actions(onMove)} />,
    );
    const move = screen.getByRole('button', { name: /Move to Completed/ });
    expect(move.textContent).toContain('40 of 42');
    fireEvent.click(move);
    expect(onMove).toHaveBeenCalledTimes(1);
  });

  test('an action that applies to none is disabled', () => {
    render(<SelectionBar count={42} onClear={() => {}} actions={actions()} />);
    expect(
      (screen.getByRole('button', { name: /Delete/ }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(
      (screen.getByRole('button', { name: /Archive/ }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });

  test('arrow keys move focus between the enabled buttons, skipping disabled ones, and wrap', () => {
    render(<SelectionBar count={42} onClear={() => {}} actions={actions()} />);
    const clear = screen.getByRole('button', { name: 'Clear' });
    const move = screen.getByRole('button', { name: /Move to Completed/ });
    const archive = screen.getByRole('button', { name: /Archive/ });

    clear.focus();
    fireEvent.keyDown(clear, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(move);
    fireEvent.keyDown(move, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(archive);
    // Delete is disabled, so the next stop after the last enabled one is the first.
    fireEvent.keyDown(archive, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(clear);
    fireEvent.keyDown(clear, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(archive);
    fireEvent.keyDown(archive, { key: 'Home' });
    expect(document.activeElement).toBe(clear);
    fireEvent.keyDown(clear, { key: 'End' });
    expect(document.activeElement).toBe(archive);
  });

  test('anchors to the viewport by default, to the container on request, above bottomOffset', () => {
    const { container, rerender } = render(
      <SelectionBar count={1} onClear={() => {}} bottomOffset={72} />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.classList.contains('fixed')).toBe(true);
    expect(root.style.bottom).toContain('72px');
    rerender(<SelectionBar count={1} onClear={() => {}} anchor="container" />);
    expect(
      (container.firstElementChild as HTMLElement).classList.contains(
        'absolute',
      ),
    ).toBe(true);
  });

  test('the actions wrap rather than overflow, so a narrow bar grows a row', () => {
    render(<SelectionBar count={42} onClear={() => {}} actions={actions()} />);
    expect(bar().classList.contains('flex-wrap')).toBe(true);
    expect(
      screen
        .getByRole('button', { name: /Archive/ })
        .parentElement?.classList.contains('flex-wrap'),
    ).toBe(true);
  });
});
