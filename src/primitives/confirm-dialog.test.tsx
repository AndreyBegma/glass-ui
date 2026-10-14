import { afterEach, describe, expect, mock, test } from 'bun:test';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

// The dialog moves focus one tick after it opens; wait that tick out.
const settle = () => new Promise((r) => setTimeout(r, 20));
import { ConfirmDialog, type ConfirmDialogProps } from './confirm-dialog';

// Radix portals to `document.body`; without this each test sees the last one's dialog too.
afterEach(cleanup);

function setup(props: Partial<ConfirmDialogProps> = {}) {
  const onOpenChange = mock((_open: boolean) => {});
  const onConfirm = mock(() => {});
  render(
    <ConfirmDialog
      open
      onOpenChange={onOpenChange}
      title="Delete this budget?"
      verb="Delete"
      onConfirm={onConfirm}
      {...props}
    />,
  );
  return { onOpenChange, onConfirm };
}

describe('ConfirmDialog', () => {
  test('the title names the dialog and Cancel sits left of the verb', () => {
    setup();
    expect(screen.getByRole('dialog', { name: 'Delete this budget?' })).not.toBeNull();
    const buttons = screen.getAllByRole('button').filter((b) => b.textContent !== '');
    const labels = buttons.map((b) => b.textContent);
    expect(labels.indexOf('Cancel')).toBeLessThan(labels.indexOf('Delete'));
  });

  test('a string consequence is the dialog description', () => {
    setup({ consequence: 'Its history is removed.' });
    const dialog = screen.getByRole('dialog');
    const id = dialog.getAttribute('aria-describedby');
    expect(id && document.getElementById(id)?.textContent).toBe('Its history is removed.');
  });

  test('a rich consequence is drawn under the title', () => {
    setup({ consequence: <strong>Three runs stop.</strong> });
    expect(screen.getByText('Three runs stop.')).not.toBeNull();
  });

  test('the verb confirms and does not close; Cancel closes without confirming', () => {
    const { onConfirm, onOpenChange } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onOpenChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  test('danger focuses Cancel and paints the verb as danger', async () => {
    setup({ tone: 'danger' });
    await settle();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('button', { name: 'Delete' }).className).toContain('text-danger');
  });

  test('default focuses the verb and paints it solid', async () => {
    setup({ tone: 'default', verb: 'Start' });
    const verb = screen.getByRole('button', { name: 'Start' });
    await settle();
    expect(document.activeElement).toBe(verb);
    expect(verb.className).toContain('bg-accent');
  });

  test('busy disables both buttons, spins the verb and swallows Escape', () => {
    const { onOpenChange } = setup({ busy: true });
    const verb = screen.getByRole('button', { name: 'Delete' }) as HTMLButtonElement;
    expect(verb.disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Cancel' }) as HTMLButtonElement).disabled).toBe(true);
    expect(verb.querySelector('[data-spinner="arc"]')).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  test('Escape asks to close when not busy', () => {
    const { onOpenChange } = setup();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
