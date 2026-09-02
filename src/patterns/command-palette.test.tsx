import { describe, expect, test } from 'bun:test';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useCallback, useState } from 'react';
import { useCommandPaletteShortcut } from '../hooks/use-command-palette-shortcut';
import {
  CommandPalette,
  type CommandPaletteGroup,
  type CommandPaletteItem,
} from './command-palette';

const SECTIONS: CommandPaletteGroup = {
  id: 'sections',
  title: 'Sections',
  items: [
    { id: 'tasks', label: 'Tasks', hint: 'Today' },
    { id: 'notes', label: 'Notes', hint: 'Today' },
  ],
};

const ACTIONS: CommandPaletteGroup = {
  id: 'actions',
  title: 'Actions',
  items: [{ id: 'capture', label: 'Capture…' }],
};

/**
 * The shell, as a consumer writes it: the shortcut hook, the open state, and a
 * search function that is entirely the consumer's business. The palette is
 * given nothing else.
 */
function Shell({
  search,
  onPick,
}: {
  search: (
    query: string,
  ) => CommandPaletteGroup[] | Promise<CommandPaletteGroup[]>;
  onPick?: (item: CommandPaletteItem, group: CommandPaletteGroup) => void;
}) {
  const [open, setOpen] = useState(false);
  const onOpen = useCallback(() => setOpen(true), []);
  useCommandPaletteShortcut(onOpen);

  return (
    <div>
      <button type="button" onClick={onOpen}>
        Open palette
      </button>
      <input aria-label="capture" />
      <div data-command-palette-ignore>
        <input aria-label="editor" />
      </div>
      <CommandPalette
        open={open}
        onOpenChange={setOpen}
        search={search}
        onSelect={(item, group) => onPick?.(item, group)}
        empty="Nothing matched."
      />
    </div>
  );
}

const everything = () => [SECTIONS, ACTIONS];

function rows() {
  return screen.getAllByRole('option');
}

function activeRow() {
  const input = screen.getByRole('combobox');
  const id = input.getAttribute('aria-activedescendant');
  return id ? document.getElementById(id) : null;
}

describe('useCommandPaletteShortcut', () => {
  test('⌘K and Ctrl-K open the palette', async () => {
    render(<Shell search={everything} />);
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    await screen.findByRole('dialog');

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    await screen.findByRole('dialog');
  });

  test('a bare k, and ⌘⇧K, are somebody else’s', () => {
    render(<Shell search={everything} />);
    fireEvent.keyDown(document, { key: 'k' });
    fireEvent.keyDown(document, { key: 'k', metaKey: true, shiftKey: true });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  test('a field that claims the key keeps it', () => {
    render(<Shell search={everything} />);

    // Marked as owning it, without preventing the default.
    fireEvent.keyDown(screen.getByLabelText('editor'), {
      key: 'k',
      metaKey: true,
    });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  test('an ordinary text field does not', async () => {
    render(<Shell search={everything} />);
    fireEvent.keyDown(screen.getByLabelText('capture'), {
      key: 'k',
      metaKey: true,
    });
    await screen.findByRole('dialog');
  });
});

describe('CommandPalette', () => {
  test('lists the consumer’s groups, with their headings', async () => {
    render(<Shell search={everything} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open palette' }));
    await screen.findByRole('dialog');

    expect(screen.getByText('Sections')).toBeDefined();
    expect(screen.getByText('Actions')).toBeDefined();
    expect(rows().map((r) => r.textContent)).toEqual([
      'TasksToday',
      'NotesToday',
      'Capture…',
    ]);
  });

  test('typing goes through the consumer’s function, not through the palette', async () => {
    const seen: string[] = [];
    const search = (query: string) => {
      seen.push(query);
      // Deliberately not a filter on `label`: the palette must not care.
      return query === 'zzz' ? [] : [SECTIONS];
    };

    render(<Shell search={search} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open palette' }));
    await screen.findByRole('dialog');

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'zzz' } });

    await waitFor(() => expect(screen.queryAllByRole('option')).toHaveLength(0));
    expect(screen.getByText('Nothing matched.')).toBeDefined();
    expect(seen).toEqual(['', 'zzz']);
  });

  test('arrows move the highlight and wrap; the first row starts active', async () => {
    render(<Shell search={everything} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open palette' }));
    await screen.findByRole('dialog');

    const input = screen.getByRole('combobox');
    expect(activeRow()?.textContent).toBe('TasksToday');
    expect(rows()[0]?.getAttribute('aria-selected')).toBe('true');

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    await waitFor(() => expect(activeRow()?.textContent).toBe('NotesToday'));

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    await waitFor(() => expect(activeRow()?.textContent).toBe('TasksToday'));

    fireEvent.keyDown(input, { key: 'ArrowUp' });
    await waitFor(() => expect(activeRow()?.textContent).toBe('Capture…'));
  });

  test('Enter selects the highlighted row, with its group, and closes', async () => {
    const picked: string[] = [];
    render(
      <Shell
        search={everything}
        onPick={(item, group) => picked.push(`${group.id}/${item.id}`)}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open palette' }));
    await screen.findByRole('dialog');

    const input = screen.getByRole('combobox');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(picked).toEqual(['actions/capture']);
  });

  test('a click selects the row that was clicked', async () => {
    const picked: string[] = [];
    render(
      <Shell
        search={everything}
        onPick={(item, group) => picked.push(`${group.id}/${item.id}`)}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open palette' }));
    await screen.findByRole('dialog');

    const notes = rows()[1];
    if (!notes) throw new Error('expected a second row');
    fireEvent.click(notes);

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(picked).toEqual(['sections/notes']);
  });

  test('Escape closes it and focus goes back to what opened it', async () => {
    render(<Shell search={everything} />);
    const trigger = screen.getByRole('button', { name: 'Open palette' });
    trigger.focus();
    fireEvent.click(trigger);
    await screen.findByRole('dialog');

    fireEvent.keyDown(document.activeElement ?? document.body, {
      key: 'Escape',
    });

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    // Radix restores focus a tick after the content unmounts, so this is a
    // `waitFor` rather than a bare assertion — the dialog being gone and the
    // focus being back are two separate moments.
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  /**
   * The case Radix cannot handle on its own, and the reason the palette records
   * the focused element itself: opened by ⌘K there is no `Dialog.Trigger` for
   * `Dialog.Content` to return focus to, and it lands on `document.body`.
   */
  test('opened by ⌘K, focus returns to the field that had it', async () => {
    render(<Shell search={everything} />);
    const capture = screen.getByLabelText('capture');
    capture.focus();

    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    await screen.findByRole('dialog');

    fireEvent.keyDown(document.activeElement ?? document.body, {
      key: 'Escape',
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(capture));
  });

  test('the query does not survive a close', async () => {
    render(<Shell search={everything} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open palette' }));
    await screen.findByRole('dialog');
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'tas' } });
    await waitFor(() =>
      expect((screen.getByRole('combobox') as HTMLInputElement).value).toBe(
        'tas',
      ),
    );

    fireEvent.keyDown(document.activeElement ?? document.body, {
      key: 'Escape',
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    fireEvent.click(screen.getByRole('button', { name: 'Open palette' }));
    await screen.findByRole('dialog');
    expect((screen.getByRole('combobox') as HTMLInputElement).value).toBe('');
  });

  describe('an asynchronous search', () => {
    test('draws skeleton rows while it is in flight', async () => {
      let release: (groups: CommandPaletteGroup[]) => void = () => {};
      const search = () =>
        new Promise<CommandPaletteGroup[]>((resolve) => {
          release = resolve;
        });

      render(<Shell search={search} />);
      fireEvent.click(screen.getByRole('button', { name: 'Open palette' }));
      await screen.findByRole('dialog');

      // `Skeleton` is `aria-hidden` and carries no role, which is the whole
      // point of it — the pending state is announced by the live region above
      // the list, not by three empty rectangles.
      await waitFor(() =>
        expect(
          document.querySelectorAll('[role="listbox"] [aria-hidden="true"]')
            .length,
        ).toBe(3),
      );

      release([SECTIONS]);
      await waitFor(() => expect(screen.queryAllByRole('option')).toHaveLength(2));
    });

    /**
     * The ordinary case rather than the edge one: a short query resolving after
     * a longer one that was typed later. Without the request counter the older
     * result wins and the list contradicts the field.
     */
    test('drops a result that arrives after a newer one', async () => {
      const pending: {
        query: string;
        resolve: (groups: CommandPaletteGroup[]) => void;
      }[] = [];
      const search = (query: string) =>
        new Promise<CommandPaletteGroup[]>((resolve) => {
          pending.push({ query, resolve });
        });

      render(<Shell search={search} />);
      fireEvent.click(screen.getByRole('button', { name: 'Open palette' }));
      await screen.findByRole('dialog');

      fireEvent.change(screen.getByRole('combobox'), {
        target: { value: 'tas' },
      });
      await waitFor(() => expect(pending).toHaveLength(2));

      // The newer one lands first, the older one afterwards.
      pending[1]?.resolve([ACTIONS]);
      await waitFor(() => expect(screen.queryAllByRole('option')).toHaveLength(1));

      pending[0]?.resolve([SECTIONS]);
      await waitFor(() =>
        expect(rows().map((r) => r.textContent)).toEqual(['Capture…']),
      );
    });
  });

  /**
   * The material rule, asserted rather than reviewed: the panel is
   * `glass-strong` and nothing inside it is glass of any kind. A second blur
   * inside a surface that has already flattened its backdrop has nothing left
   * to refract.
   */
  test('nothing inside the panel is glass', async () => {
    render(<Shell search={everything} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open palette' }));
    const panel = await screen.findByRole('dialog');

    expect(panel.className).toContain('glass-strong');
    expect(panel.querySelectorAll('.glass, .glass-strong')).toHaveLength(0);
  });
});
