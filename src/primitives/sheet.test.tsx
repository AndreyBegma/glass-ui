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
