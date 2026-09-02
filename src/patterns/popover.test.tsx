import { describe, expect, test } from 'bun:test';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PopoverContent, PopoverRoot, PopoverTrigger } from './popover';

/**
 * FEAT-20260902-004 — the four things the specification asks a popover to do:
 * open anchored, dismiss on Escape, dismiss on an outside click, and carry an
 * accessible name. The anchoring itself is not asserted — a headless DOM has no
 * layout, so a position assertion would be testing the stub in `test-setup.ts`
 * rather than the component.
 */
function Bell() {
  return (
    <div>
      <button type="button">outside</button>
      <PopoverRoot>
        <PopoverTrigger>Notifications</PopoverTrigger>
        <PopoverContent
          title="Notifications"
          headerAction={<button type="button">Mark all read</button>}
        >
          <p>Nothing new.</p>
        </PopoverContent>
      </PopoverRoot>
    </div>
  );
}

describe('Popover', () => {
  test('opens from its trigger with a name from `title`', async () => {
    render(<Bell />);
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));

    const panel = await screen.findByRole('dialog', { name: 'Notifications' });
    expect(panel.textContent).toContain('Nothing new.');
  });

  test('the header action sits inside the panel', async () => {
    render(<Bell />);
    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));

    const panel = await screen.findByRole('dialog', { name: 'Notifications' });
    const action = screen.getByRole('button', { name: 'Mark all read' });
    expect(panel.contains(action)).toBe(true);
  });

  test('`hideTitle` keeps the name and drops the heading', async () => {
    render(
      <PopoverRoot defaultOpen>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent title="Quick actions" hideTitle>
          <p>body</p>
        </PopoverContent>
      </PopoverRoot>,
    );

    const panel = await screen.findByRole('dialog', { name: 'Quick actions' });
    expect(
      panel.querySelector('h2')?.className.includes('sr-only'),
    ).toBe(true);
  });

  test('Escape dismisses it and focus goes back to the trigger', async () => {
    render(<Bell />);
    const trigger = screen.getByRole('button', { name: 'Notifications' });
    fireEvent.click(trigger);
    await screen.findByRole('dialog');

    fireEvent.keyDown(document.activeElement ?? document.body, {
      key: 'Escape',
    });

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.activeElement).toBe(trigger);
  });

  test('a click outside dismisses it', async () => {
    render(<Bell />);
    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
    await screen.findByRole('dialog');

    const outside = screen.getByRole('button', { name: 'outside' });
    fireEvent.pointerDown(outside, { button: 0, ctrlKey: false });
    fireEvent.click(outside);

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  /**
   * The default that the header comment argues for. A modal popover locks the
   * page's scroll, and the scroll lock is what `base.css` reads to push the
   * page back behind a sheet — which a panel hanging off a bell is not.
   */
  test('is not modal, so the page behind it is not hidden from a reader', async () => {
    render(<Bell />);
    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
    await screen.findByRole('dialog');

    expect(screen.getByRole('button', { name: 'outside' })).toBeDefined();
  });
});
