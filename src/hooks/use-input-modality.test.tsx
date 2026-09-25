import { describe, expect, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { useInputModality } from './use-input-modality';

/**
 * BUG-20260919-625 — a surface remembers which input touched it last.
 *
 * Rendered rather than `renderHook`ed, because the contract is the spread:
 * a `pointermove` on the element writes `data-input="pointer"`, a `keydown`
 * writes `"keyboard"`, and the element's own handlers keep running.
 */
function Surface({ onPointerMove, onKeyDown }: { onPointerMove?: () => void; onKeyDown?: () => void }) {
  const inputModality = useInputModality<HTMLDivElement>({ onPointerMove, onKeyDown });
  return (
    <div data-testid="surface" {...inputModality}>
      <button type="button">a control</button>
    </div>
  );
}

describe('useInputModality', () => {
  test('writes nothing until the surface has seen an input', () => {
    render(<Surface />);
    expect(screen.getByTestId('surface').hasAttribute('data-input')).toBe(false);
  });

  test('a pointermove writes `pointer`, a keydown writes `keyboard`, and back', () => {
    render(<Surface />);
    const surface = screen.getByTestId('surface');
    const control = screen.getByRole('button');

    fireEvent.pointerMove(control, { pointerType: 'mouse' });
    expect(surface.getAttribute('data-input')).toBe('pointer');

    fireEvent.keyDown(control, { key: 'ArrowDown' });
    expect(surface.getAttribute('data-input')).toBe('keyboard');

    fireEvent.pointerMove(control, { pointerType: 'mouse' });
    expect(surface.getAttribute('data-input')).toBe('pointer');
  });

  test('a finger and a pen are pointers too', () => {
    render(<Surface />);
    const surface = screen.getByTestId('surface');
    fireEvent.pointerMove(surface, { pointerType: 'touch' });
    expect(surface.getAttribute('data-input')).toBe('pointer');
  });

  test("the caller's own handlers still run", () => {
    let moves = 0;
    let keys = 0;
    render(<Surface onPointerMove={() => moves++} onKeyDown={() => keys++} />);
    const surface = screen.getByTestId('surface');

    fireEvent.pointerMove(surface, { pointerType: 'mouse' });
    fireEvent.keyDown(surface, { key: 'Escape' });
    expect(moves).toBe(1);
    expect(keys).toBe(1);
    expect(surface.getAttribute('data-input')).toBe('keyboard');
  });
});
