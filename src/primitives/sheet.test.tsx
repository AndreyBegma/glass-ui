import { describe, expect, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { SheetContent, SheetRoot } from './sheet';

function renderSheet(pad?: 'none' | 'md') {
  return render(
    <SheetRoot defaultOpen>
      <SheetContent title="Filters" pad={pad}>
        <div data-testid="body">Row</div>
      </SheetContent>
    </SheetRoot>,
  );
}

describe('SheetContent pad', () => {
  test('defaults to `md`, today\'s `px-6`', () => {
    renderSheet();
    const body = screen.getByTestId('body').parentElement;
    expect(body?.className.split(' ')).toEqual(
      expect.arrayContaining(['px-6', 'pb-4', 'pt-4']),
    );
  });

  test('`none` hands the body edges to the child', () => {
    renderSheet('none');
    const body = screen.getByTestId('body').parentElement;
    const classes = body?.className.split(' ') ?? [];
    expect(classes).not.toContain('px-6');
    expect(classes).not.toContain('pb-4');
    expect(classes).not.toContain('pt-4');
    // The scroll shell stays: `pad` only ever governs the inset.
    expect(classes).toEqual(expect.arrayContaining(['min-h-0', 'flex-1', 'overflow-y-auto']));
  });
});

/**
 * FEAT-20260919-621 — where the sheet lands.
 *
 * A player in element fullscreen draws nothing outside the fullscreen
 * element, so a sheet has to be able to go inside it. Held here as a parent
 * check rather than a pixel: happy-dom has no fullscreen and no compositor,
 * and what the fix is made of is the portal's target.
 */
describe('SheetContent container', () => {
  test('portals to `document.body` when none is given', () => {
    const bystander = document.createElement('div');
    document.body.appendChild(bystander);
    try {
      renderSheet();
      const dialog = screen.getByRole('dialog');
      expect(document.body.contains(dialog)).toBe(true);
      expect(bystander.contains(dialog)).toBe(false);
    } finally {
      bystander.remove();
    }
  });

  test('portals into the element it is given', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    try {
      render(
        <SheetRoot defaultOpen>
          <SheetContent title="Keyboard shortcuts" container={host}>
            <div data-testid="body">Row</div>
          </SheetContent>
        </SheetRoot>,
      );
      const dialog = screen.getByRole('dialog');
      expect(host.contains(dialog)).toBe(true);
      // The scrim travels with it: in fullscreen it has to be drawn too.
      expect(host.querySelectorAll('.z-overlay').length).toBeGreaterThanOrEqual(2);
    } finally {
      host.remove();
    }
  });
});
