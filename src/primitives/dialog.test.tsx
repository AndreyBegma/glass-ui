import { describe, expect, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { DialogContent, DialogRoot } from './dialog';

function renderDialog(container?: HTMLElement) {
  return render(
    <DialogRoot defaultOpen>
      <DialogContent title="Remove from watchlist?" container={container}>
        <div data-testid="body">Body</div>
      </DialogContent>
    </DialogRoot>,
  );
}

/**
 * FEAT-20260919-621 — where the dialog lands. The sheet's contract, for
 * symmetry: the same Radix portal, the same one place the default is wrong.
 */
describe('DialogContent container', () => {
  test('portals to `document.body` when none is given', () => {
    const bystander = document.createElement('div');
    document.body.appendChild(bystander);
    try {
      renderDialog();
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
      renderDialog(host);
      expect(host.contains(screen.getByRole('dialog'))).toBe(true);
    } finally {
      host.remove();
    }
  });
});
