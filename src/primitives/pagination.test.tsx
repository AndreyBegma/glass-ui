import { describe, expect, test } from 'bun:test';
import { render } from '@testing-library/react';
import { CursorPagination, Pagination } from './pagination';

describe('Pagination', () => {
  test('renders', () => {
    const { container } = render(
      <Pagination page={1} pageCount={3} onPageChange={() => {}} />,
    );
    expect(container.querySelector('nav')).not.toBeNull();
  });

  test.todo(
    'pageRange edge cases: one page, near start, near end, large counts',
  );
  test.todo('keyboard');
  test.todo('the first and last page buttons are disabled at the ends');
});

describe('CursorPagination', () => {
  test('renders', () => {
    const { container } = render(
      <CursorPagination
        hasPrevious={false}
        hasNext
        onPrevious={() => {}}
        onNext={() => {}}
        summary="1–20"
      />,
    );
    expect(container.textContent).toContain('1–20');
  });

  test.todo('loading disables both buttons');
});
