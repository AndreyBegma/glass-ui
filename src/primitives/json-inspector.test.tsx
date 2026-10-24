import { afterEach, describe, expect, test } from 'bun:test';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { JsonInspector } from './json-inspector';

afterEach(cleanup);

const rowOf = (text: string) => {
  const row = screen
    .getAllByRole('treeitem')
    .find((el) => el.textContent?.includes(text));
  if (!row) throw new Error(`no row containing ${text}`);
  return row;
};

const press = (el: HTMLElement, key: string) => fireEvent.keyDown(el, { key });

describe('JsonInspector', () => {
  test('renders', () => {
    const { container } = render(
      <JsonInspector value={{ a: 1 }} rootLabel="root" />,
    );
    expect(container.textContent).toContain('root');
  });

  test('expands to the default depth', () => {
    render(<JsonInspector value={{ a: { b: { c: 1 } }, n: 2 }} />);
    // Root open, its children shown but collapsed.
    expect(screen.getAllByRole('treeitem')).toHaveLength(3);
    expect(rowOf('a:').getAttribute('aria-expanded')).toBe('false');
    expect(rowOf('{1}')).toBeTruthy();
    expect(screen.queryByText('c: ')).toBeNull();
  });

  test('defaultExpandDepth opens deeper', () => {
    render(
      <JsonInspector value={{ a: { b: { c: 1 } } }} defaultExpandDepth={3} />,
    );
    expect(screen.getAllByRole('treeitem')).toHaveLength(4);
  });

  test('collapsed containers show a summary and a preview of the first keys', () => {
    render(
      <JsonInspector
        value={{ box: { x: 1, y: 2, z: 3, w: 4 }, list: [1, 2] }}
      />,
    );
    const box = rowOf('box');
    expect(box.textContent).toContain('{4}');
    expect(box.textContent).toContain('x, y, z, …');
    expect(rowOf('list').textContent).toContain('[2]');
  });

  test('a circular input does not loop', () => {
    const a: Record<string, unknown> = { name: 'a' };
    a.self = a;
    render(<JsonInspector value={a} />);
    expect(rowOf('self').textContent).toContain('[Circular]');
    expect(rowOf('self').getAttribute('aria-expanded')).toBeNull();
  });

  test("a circular label is the consumer's", () => {
    const a: Record<string, unknown> = {};
    a.self = a;
    render(<JsonInspector value={a} labels={{ circular: 'cycle' }} />);
    expect(rowOf('self').textContent).toContain('cycle');
  });

  test('path strings follow the dollar-path form', () => {
    const seen: string[] = [];
    render(
      <JsonInspector
        value={{
          items: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }],
          'odd key': 1,
        }}
        defaultExpandDepth={Number.POSITIVE_INFINITY}
        onExpandedChange={(set) => seen.push(...set)}
      />,
    );
    // Collapse the items array: the callback reports the remaining paths.
    press(rowOf('items'), 'ArrowLeft');
    expect(seen).toContain('$');
    expect(seen).not.toContain('$.items');
    press(rowOf('items'), 'ArrowRight');
    expect(seen).toContain('$.items');
    expect(seen).toContain('$.items[3]');
  });

  test('copy path writes the dollar path of the row', async () => {
    const written: string[] = [];
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async (t: string) => void written.push(t) },
    });
    render(
      <JsonInspector
        value={{ items: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }] }}
        defaultExpandDepth={Number.POSITIVE_INFINITY}
        copyable
      />,
    );
    const row = rowOf('id: 4');
    await act(async () => {
      fireEvent.click(
        row.querySelector('button[aria-label="Copy path"]') as Element,
      );
    });
    expect(written).toEqual(['$.items[3].id']);
    expect(
      row.querySelector('button')?.getAttribute('aria-label'),
    ).toBeTruthy();
    expect(row.textContent).toContain('Copied');
  });

  test('copy value serialises circular, bigint, date, map and set input', async () => {
    const written: string[] = [];
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async (t: string) => void written.push(t) },
    });
    const v: Record<string, unknown> = {
      n: 10n,
      d: new Date(0),
      m: new Map([['k', 1]]),
      s: new Set([1]),
    };
    v.self = v;
    render(<JsonInspector value={v} copyable />);
    const root = screen.getAllByRole('treeitem')[0];
    await act(async () => {
      press(root, 'c');
    });
    const parsed = JSON.parse(written[0]);
    expect(parsed).toEqual({
      n: '10n',
      d: '1970-01-01T00:00:00.000Z',
      m: [['k', 1]],
      s: [1],
      self: '[Circular]',
    });
  });

  test('keyboard expand and collapse', () => {
    render(<JsonInspector value={{ a: { b: 1 }, c: 2 }} />);
    const [root] = screen.getAllByRole('treeitem');
    const a = rowOf('a:');
    // One tab stop.
    expect(
      screen.getAllByRole('treeitem').filter((r) => r.tabIndex === 0),
    ).toEqual([root]);

    root.focus();
    press(root, 'ArrowDown');
    expect(document.activeElement).toBe(a);
    press(a, 'ArrowRight');
    expect(a.getAttribute('aria-expanded')).toBe('true');
    press(a, 'ArrowRight');
    expect(document.activeElement).toBe(rowOf('b:'));
    press(rowOf('b:'), 'ArrowLeft');
    expect(document.activeElement).toBe(a);
    press(a, 'ArrowLeft');
    expect(a.getAttribute('aria-expanded')).toBe('false');
    press(a, 'Enter');
    expect(a.getAttribute('aria-expanded')).toBe('true');
    press(a, 'End');
    expect(document.activeElement).toBe(rowOf('c:'));
    press(rowOf('c:'), 'Home');
    expect(document.activeElement).toBe(root);
  });

  test('star opens every sibling container', () => {
    render(<JsonInspector value={{ a: { x: 1 }, b: { y: 2 }, c: 3 }} />);
    press(rowOf('a:'), '*');
    expect(rowOf('a:').getAttribute('aria-expanded')).toBe('true');
    expect(rowOf('b:').getAttribute('aria-expanded')).toBe('true');
    expect(screen.getAllByRole('treeitem')).toHaveLength(6);
  });

  test('controlled expanded wins and reports changes', () => {
    const calls: ReadonlySet<string>[] = [];
    render(
      <JsonInspector
        value={{ a: { b: 1 } }}
        expanded={new Set(['$'])}
        onExpandedChange={(s) => calls.push(s)}
      />,
    );
    press(rowOf('a:'), 'ArrowRight');
    expect([...calls[0]].sort()).toEqual(['$', '$.a']);
    // Controlled: nothing moved until the consumer says so.
    expect(rowOf('a:').getAttribute('aria-expanded')).toBe('false');
  });

  test('long strings truncate with a show-more control', () => {
    render(
      <JsonInspector value={{ s: 'x'.repeat(50) }} maxStringLength={10} />,
    );
    expect(rowOf('s:').textContent).toContain(`"${'x'.repeat(10)}…"`);
    fireEvent.click(screen.getByRole('button', { name: 'Show full string' }));
    expect(rowOf('s:').textContent).toContain(`"${'x'.repeat(50)}"`);
    expect(screen.getByRole('button', { name: 'Show less' })).toBeTruthy();
  });

  test('ten thousand siblings render a hundred and a show-more row', () => {
    const big: Record<string, number> = {};
    for (let i = 0; i < 10_000; i++) big[`k${i}`] = i;
    render(<JsonInspector value={big} />);
    // Root + 100 keys + the "more" row.
    expect(screen.getAllByRole('treeitem')).toHaveLength(102);
    const more = rowOf('Show 100 more');
    fireEvent.click(more);
    expect(screen.getAllByRole('treeitem')).toHaveLength(202);
  });

  test('the last page of show-more moves focus to the first revealed row', () => {
    const big: number[] = Array.from({ length: 130 }, (_, i) => i);
    render(<JsonInspector value={big} />);
    const more = rowOf('Show 30 more');
    more.focus();
    press(more, 'Enter');
    expect(screen.queryByText(/Show .* more/)).toBeNull();
    expect(document.activeElement).toBe(rowOf('100:'));
  });

  test('distinguishes types by shape as well as colour', () => {
    render(
      <JsonInspector
        value={{ s: 'str', n: 1, b: true, z: null, u: undefined, big: 5n }}
      />,
    );
    expect(rowOf('s:').textContent).toContain('"str"');
    expect(rowOf('z:').textContent).toContain('null');
    expect(rowOf('z:').querySelector('.italic')).toBeTruthy();
    expect(rowOf('u:').querySelector('.italic')).toBeTruthy();
    expect(rowOf('n:').querySelector('.tabular-nums')).toBeTruthy();
    expect(rowOf('big:').textContent).toContain('5n');
  });

  test('sortKeys orders object keys', () => {
    render(<JsonInspector value={{ b: 1, a: 2 }} sortKeys />);
    const rows = screen.getAllByRole('treeitem');
    expect(rows[1].textContent).toContain('a:');
    expect(rows[2].textContent).toContain('b:');
  });

  test('Map and Set open with positional paths', () => {
    render(
      <JsonInspector
        value={{ m: new Map([['k', 1]]), s: new Set(['v']) }}
        defaultExpandDepth={3}
      />,
    );
    expect(rowOf('m:').textContent).toContain('Map(1)');
    expect(rowOf('s:').textContent).toContain('Set(1)');
    expect(rowOf('k:').textContent).toContain('1');
  });
});
