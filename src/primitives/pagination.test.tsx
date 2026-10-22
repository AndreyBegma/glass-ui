import { describe, expect, mock, test } from 'bun:test';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach } from 'bun:test';
import { CursorPagination, Pagination, pageRange } from './pagination';

afterEach(cleanup);

const E1 = 'ellipsis-start';
const E2 = 'ellipsis-end';

describe('pageRange', () => {
  test('no pages gives nothing, one page gives itself', () => {
    expect(pageRange(1, 0)).toEqual([]);
    expect(pageRange(1, 1)).toEqual([1]);
  });

  test('few pages are all shown', () => {
    expect(pageRange(3, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(pageRange(1, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  test('near the start', () => {
    expect(pageRange(1, 20)).toEqual([1, 2, 3, 4, 5, E2, 20]);
    expect(pageRange(4, 20)).toEqual([1, 2, 3, 4, 5, E2, 20]);
  });

  test('near the end', () => {
    expect(pageRange(20, 20)).toEqual([1, E1, 16, 17, 18, 19, 20]);
    expect(pageRange(17, 20)).toEqual([1, E1, 16, 17, 18, 19, 20]);
  });

  test('in the middle of a large count', () => {
    expect(pageRange(10, 20)).toEqual([1, E1, 9, 10, 11, E2, 20]);
    expect(pageRange(5000, 10000)).toEqual([1, E1, 4999, 5000, 5001, E2, 10000]);
  });

  test('a gap of one page shows the page, not an ellipsis', () => {
    expect(pageRange(5, 10, 1, 2)).toEqual([1, 2, 3, 4, 5, 6, E2, 9, 10]);
  });

  test('the length does not change as the page moves', () => {
    const lengths = new Set(
      Array.from({ length: 20 }, (_, i) => pageRange(i + 1, 20).length),
    );
    expect(lengths.size).toBe(1);
  });

  test('sibling and boundary counts', () => {
    expect(pageRange(10, 20, 2, 2)).toEqual([1, 2, E1, 8, 9, 10, 11, 12, E2, 19, 20]);
    expect(pageRange(10, 20, 0, 0)).toEqual([E1, 10, E2]);
  });

  test('a page outside the range is clamped', () => {
    expect(pageRange(99, 20)).toEqual(pageRange(20, 20));
    expect(pageRange(-3, 20)).toEqual(pageRange(1, 20));
  });
});

describe('Pagination', () => {
  test('is a labelled nav and marks the current page', () => {
    render(<Pagination page={3} pageCount={10} onPageChange={() => {}} />);
    expect(screen.getByRole('navigation', { name: 'Pagination' })).not.toBeNull();
    const current = screen.getByRole('button', { name: 'Page 3' });
    expect(current.getAttribute('aria-current')).toBe('page');
    expect(
      screen.getByRole('button', { name: 'Page 4' }).getAttribute('aria-current'),
    ).toBeNull();
  });

  test('ellipses are not focusable', () => {
    const { container } = render(
      <Pagination page={10} pageCount={20} onPageChange={() => {}} />,
    );
    const ellipses = [...container.querySelectorAll('li[aria-hidden]')];
    expect(ellipses.length).toBe(2);
    for (const li of ellipses) {
      expect(li.querySelector('button, a, [tabindex]')).toBeNull();
    }
  });

  test('previous is disabled on the first page, next on the last', () => {
    const first = render(<Pagination page={1} pageCount={5} onPageChange={() => {}} />);
    expect((screen.getByRole('button', { name: 'Previous page' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Next page' }) as HTMLButtonElement).disabled).toBe(false);
    first.unmount();
    render(<Pagination page={5} pageCount={5} onPageChange={() => {}} />);
    expect((screen.getByRole('button', { name: 'Previous page' }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole('button', { name: 'Next page' }) as HTMLButtonElement).disabled).toBe(true);
  });

  test('pressing a page, previous or next reports the page', () => {
    const onPageChange = mock((_: number) => {});
    render(<Pagination page={5} pageCount={10} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Page 6' }));
    fireEvent.click(screen.getByRole('button', { name: 'Previous page' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPageChange.mock.calls.map((c) => c[0])).toEqual([6, 4, 6]);
  });

  test('keyboard: every control is a native button in tab order, ellipses skipped', () => {
    render(<Pagination page={10} pageCount={20} onPageChange={() => {}} />);
    const buttons = screen.getAllByRole('button') as HTMLButtonElement[];
    // previous, 1, 9, 10, 11, 20, next
    expect(buttons.length).toBe(7);
    for (const b of buttons) {
      expect(b.tagName).toBe('BUTTON');
      expect(b.tabIndex).toBe(0);
    }
    buttons[1]?.focus();
    expect(document.activeElement).toBe(buttons[1]);
  });

  test('renders the compact "Page N of M" form beside the numbered row', () => {
    render(<Pagination page={3} pageCount={12} onPageChange={() => {}} />);
    expect(screen.getByText('Page 3 of 12')).not.toBeNull();
  });

  test('shows the range summary when the total is known', () => {
    render(
      <Pagination page={2} pageCount={13} pageSize={25} total={312} onPageChange={() => {}} />,
    );
    expect(screen.getByText('26–50 of 312')).not.toBeNull();
  });

  test('the last range stops at the total', () => {
    render(
      <Pagination page={13} pageCount={13} pageSize={25} total={312} onPageChange={() => {}} />,
    );
    expect(screen.getByText('301–312 of 312')).not.toBeNull();
  });

  test('no summary without a total', () => {
    const { container } = render(
      <Pagination page={1} pageCount={3} pageSize={25} onPageChange={() => {}} />,
    );
    expect(container.querySelector('[aria-live]')).toBeNull();
  });

  test('the page-size select reports the new size', () => {
    const onPageSizeChange = mock((_: number) => {});
    render(
      <Pagination
        page={1}
        pageCount={3}
        pageSize={25}
        pageSizeOptions={[10, 25, 50]}
        onPageSizeChange={onPageSizeChange}
        onPageChange={() => {}}
      />,
    );
    const select = screen.getByRole('combobox', { name: 'Rows per page' }) as HTMLSelectElement;
    expect(select.value).toBe('25');
    fireEvent.change(select, { target: { value: '50' } });
    expect(onPageSizeChange).toHaveBeenCalledWith(50);
  });

  test('no select without options and a handler', () => {
    render(<Pagination page={1} pageCount={3} pageSizeOptions={[10]} onPageChange={() => {}} />);
    expect(screen.queryByRole('combobox')).toBeNull();
  });

  test('every visible string can be overridden', () => {
    render(
      <Pagination
        page={2}
        pageCount={4}
        pageSize={10}
        total={40}
        pageSizeOptions={[10]}
        onPageSizeChange={() => {}}
        onPageChange={() => {}}
        labels={{
          nav: 'Seiten',
          previous: 'Zurück',
          next: 'Weiter',
          page: (n) => `Seite ${n}`,
          pageOf: (n, m) => `Seite ${n} von ${m}`,
          range: (a, b, t) => `${a}–${b} von ${t}`,
          pageSize: 'Zeilen',
          pageSizeOption: (s) => `${s} pro Seite`,
        }}
      />,
    );
    expect(screen.getByRole('navigation', { name: 'Seiten' })).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Zurück' })).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Weiter' })).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Seite 2' })).not.toBeNull();
    expect(screen.getByText('Seite 2 von 4')).not.toBeNull();
    expect(screen.getByText('11–20 von 40')).not.toBeNull();
    expect(screen.getByRole('combobox', { name: 'Zeilen' })).not.toBeNull();
    expect(screen.getByText('10 pro Seite')).not.toBeNull();
  });
});

describe('CursorPagination', () => {
  const base = { onPrevious: () => {}, onNext: () => {} };

  test('shows the summary and has no page numbers', () => {
    render(<CursorPagination {...base} hasPrevious hasNext summary="1–20" />);
    expect(screen.getByText('1–20')).not.toBeNull();
    expect(screen.getAllByRole('button').length).toBe(2);
  });

  test('previous and next follow hasPrevious and hasNext', () => {
    render(<CursorPagination {...base} hasPrevious={false} hasNext />);
    expect((screen.getByRole('button', { name: 'Previous page' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Next page' }) as HTMLButtonElement).disabled).toBe(false);
  });

  test('loading disables both buttons and marks the nav busy', () => {
    const onPrevious = mock(() => {});
    const onNext = mock(() => {});
    render(
      <CursorPagination hasPrevious hasNext loading onPrevious={onPrevious} onNext={onNext} />,
    );
    const prev = screen.getByRole('button', { name: 'Previous page' }) as HTMLButtonElement;
    const next = screen.getByRole('button', { name: 'Next page' }) as HTMLButtonElement;
    expect(prev.disabled).toBe(true);
    expect(next.disabled).toBe(true);
    expect(screen.getByRole('navigation').getAttribute('aria-busy')).toBe('true');
    fireEvent.click(prev);
    fireEvent.click(next);
    expect(onPrevious).not.toHaveBeenCalled();
    expect(onNext).not.toHaveBeenCalled();
  });

  test('pressing the buttons calls the handlers', () => {
    const onPrevious = mock(() => {});
    const onNext = mock(() => {});
    render(<CursorPagination hasPrevious hasNext onPrevious={onPrevious} onNext={onNext} />);
    fireEvent.click(screen.getByRole('button', { name: 'Previous page' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPrevious).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  test('labels can be overridden', () => {
    render(
      <CursorPagination
        {...base}
        hasPrevious
        hasNext
        labels={{ nav: 'Seiten', previous: 'Zurück', next: 'Weiter' }}
      />,
    );
    expect(screen.getByRole('navigation', { name: 'Seiten' })).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Zurück' })).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Weiter' })).not.toBeNull();
  });
});
