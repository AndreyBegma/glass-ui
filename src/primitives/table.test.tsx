import { describe, expect, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { Table, TableCell, TableHead, TableRow } from './table';

function Matrix({ scroll }: { scroll?: boolean }) {
  return (
    <Table scroll={scroll}>
      <TableHead>
        <TableRow>
          <TableCell head>Preference</TableCell>
          <TableCell head>Email</TableCell>
        </TableRow>
      </TableHead>
      <tbody>
        <TableRow>
          <TableCell>Weekly digest</TableCell>
          <TableCell>On</TableCell>
        </TableRow>
      </tbody>
    </Table>
  );
}

describe('Table', () => {
  test('renders a real table with a header row and a header cell as a real <th>', () => {
    render(<Matrix />);
    expect(screen.getByRole('table')).not.toBeNull();
    const header = screen.getByRole('columnheader', { name: 'Preference' });
    expect(header.tagName).toBe('TH');
  });

  test('wraps in the scroll-hint row only when asked', () => {
    const { container: plain } = render(<Matrix />);
    expect(plain.querySelector('table')?.parentElement?.className).not.toContain('overflow-x-auto');

    const { container: scrolled } = render(<Matrix scroll />);
    const scrollParent = scrolled.querySelector('table')?.parentElement;
    expect(scrollParent?.className).toContain('overflow-x-auto');
  });
});
