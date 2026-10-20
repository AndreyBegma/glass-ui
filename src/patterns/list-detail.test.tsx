import { describe, expect, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { ListDetail } from './list-detail';

const panes = (root: HTMLElement) => ({
  grid: root.querySelector<HTMLElement>('[data-list-detail]'),
  list: root.querySelector<HTMLElement>('[data-list-detail-list]'),
  detail: root.querySelector<HTMLElement>('[data-list-detail-detail]'),
});

describe('ListDetail', () => {
  test('one column on a phone, list then detail; two columns from tablet up', () => {
    const { container } = render(
      <ListDetail list={<p>list</p>} detail={<p>detail</p>} />,
    );
    const { grid, list, detail } = panes(container);
    expect(grid?.className).toContain('grid-cols-1');
    expect(grid?.className).toContain(
      'tablet:grid-cols-[minmax(0,var(--list-detail-width))_minmax(0,1fr)]',
    );
    // Source order is reading order on a phone: the list first.
    expect(list?.compareDocumentPosition(detail as Node)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(list?.className).not.toContain('hidden');
    expect(detail?.className).not.toContain('hidden');
  });

  test('phoneView shows one pane below the tablet edge and both from it', () => {
    const { container, rerender } = render(
      <ListDetail phoneView="list" list="list" detail="detail" />,
    );
    expect(panes(container).detail?.className).toContain('max-tablet:hidden');
    expect(panes(container).list?.className).not.toContain('max-tablet:hidden');
    rerender(<ListDetail phoneView="detail" list="list" detail="detail" />);
    expect(panes(container).list?.className).toContain('max-tablet:hidden');
    expect(panes(container).detail?.className).not.toContain(
      'max-tablet:hidden',
    );
  });

  test('listWidth sets the list column; a number is pixels', () => {
    const { container, rerender } = render(<ListDetail list="l" detail="d" />);
    expect(
      panes(container).grid?.style.getPropertyValue('--list-detail-width'),
    ).toBe('280px');
    rerender(<ListDetail list="l" detail="d" listWidth={168} />);
    expect(
      panes(container).grid?.style.getPropertyValue('--list-detail-width'),
    ).toBe('168px');
    rerender(<ListDetail list="l" detail="d" listWidth="30%" />);
    expect(
      panes(container).grid?.style.getPropertyValue('--list-detail-width'),
    ).toBe('30%');
  });

  test('stickyList pins the list from tablet up; listLabel names it', () => {
    const { container } = render(
      <ListDetail
        stickyList
        listLabel="Settings sections"
        list="l"
        detail="d"
      />,
    );
    expect(panes(container).list?.className).toContain('tablet:sticky');
    expect(
      screen.getByRole('complementary', { name: 'Settings sections' }),
    ).not.toBeNull();
  });
});
