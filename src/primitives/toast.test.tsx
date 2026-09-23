import { describe, expect, test } from 'bun:test';
import { render, waitFor } from '@testing-library/react';
import { Toaster, toast } from './toast';

/**
 * BUG-20260923-660 — sonner's stylesheet is unlayered and every Tailwind
 * utility is layered, so a class on a toast only beats sonner when it is `!`.
 * The material was the one class without it, and every plain `toast()` came out
 * a white pill with `text-ink` on it. The cascade itself needs a browser; what
 * this holds is the precondition — no class sonner also sets goes out bare.
 */
async function showToast(): Promise<HTMLElement> {
  render(<Toaster />);
  toast('A new version of Luna is ready.');
  // sonner hands a new toast to its toaster on the next task, not synchronously.
  return waitFor(() => {
    const found = document.querySelector<HTMLElement>('[data-sonner-toast]');
    if (!found) throw new Error('sonner rendered no toast');
    return found;
  });
}

function classes(element: Element): string[] {
  return element.className.split(/\s+/).filter(Boolean);
}

describe('Toaster', () => {
  test('the material wins over sonner: `glass-strong` is important', async () => {
    const shown = await showToast();
    expect(classes(shown)).toContain('!glass-strong');
    expect(classes(shown)).not.toContain('glass-strong');
  });

  test('the close button is drawn from tokens, not from sonner’s palette', async () => {
    const shown = await showToast();
    const close = shown.querySelector('[data-close-button]');
    if (!close) throw new Error('no close button');
    expect(classes(close)).toEqual(
      expect.arrayContaining(['!bg-raised', '!text-ink', '!border-line']),
    );
  });
});
