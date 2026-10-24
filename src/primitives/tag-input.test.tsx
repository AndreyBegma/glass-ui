import { describe, expect, mock, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { type ComponentProps, useState } from 'react';
import { TagInput } from './tag-input';

function Harness(props: Partial<ComponentProps<typeof TagInput>> & { start?: string[] }) {
  const { start = [], onValueChange, ...rest } = props;
  const [value, setValue] = useState(start);
  return (
    <TagInput
      value={value}
      onValueChange={(next) => {
        setValue(next);
        onValueChange?.(next);
      }}
      {...rest}
    />
  );
}

function input() {
  return (screen.queryByRole('textbox') ?? screen.getByRole('combobox')) as HTMLInputElement;
}

function type(text: string) {
  fireEvent.change(input(), { target: { value: text } });
}

function tagsShown() {
  return screen.queryAllByRole('button').map((b) => b.getAttribute('aria-label'));
}

describe('TagInput', () => {
  test('renders the tags, each with a labelled remove button', () => {
    render(<TagInput value={['a', 'b']} onValueChange={() => {}} />);
    expect(screen.getByLabelText('Remove a')).toBeTruthy();
    expect(screen.getByLabelText('Remove b')).toBeTruthy();
  });

  test('works uncontrolled from defaultValue', () => {
    const onValueChange = mock();
    render(<TagInput defaultValue={['x']} onValueChange={onValueChange} />);
    type('y,');
    expect(onValueChange).toHaveBeenCalledWith(['x', 'y']);
    expect(screen.getByLabelText('Remove y')).toBeTruthy();
  });

  describe('commit', () => {
    test('Enter commits the draft and clears the input', () => {
      const onValueChange = mock();
      render(<Harness onValueChange={onValueChange} />);
      type('alpha');
      fireEvent.keyDown(input(), { key: 'Enter' });
      expect(onValueChange).toHaveBeenCalledWith(['alpha']);
      expect(input().value).toBe('');
    });

    test('Enter on an empty input commits nothing and is not swallowed', () => {
      const onValueChange = mock();
      render(<Harness onValueChange={onValueChange} />);
      const notPrevented = fireEvent.keyDown(input(), { key: 'Enter' });
      expect(notPrevented).toBe(true);
      expect(onValueChange).not.toHaveBeenCalled();
    });

    test('a typed character separator commits the text before it', () => {
      const onValueChange = mock();
      render(<Harness onValueChange={onValueChange} />);
      type('alpha,');
      expect(onValueChange).toHaveBeenCalledWith(['alpha']);
      expect(input().value).toBe('');
    });

    test('custom separators replace the defaults', () => {
      const onValueChange = mock();
      render(<Harness separators={[';']} onValueChange={onValueChange} />);
      type('a,b');
      expect(onValueChange).not.toHaveBeenCalled();
      type('a,b;');
      expect(onValueChange).toHaveBeenCalledWith(['a,b']);
      fireEvent.keyDown(input(), { key: 'Enter' });
      expect(onValueChange).toHaveBeenCalledTimes(1);
    });

    test('Tab is a separator when named, and only with a draft', () => {
      render(<Harness separators={['Tab']} />);
      expect(fireEvent.keyDown(input(), { key: 'Tab' })).toBe(true);
      type('t');
      expect(fireEvent.keyDown(input(), { key: 'Tab' })).toBe(false);
      expect(screen.getByLabelText('Remove t')).toBeTruthy();
    });

    test('trims, and ignores empty pieces', () => {
      const onValueChange = mock();
      render(<Harness onValueChange={onValueChange} />);
      type('  a ,, b ,');
      expect(onValueChange).toHaveBeenLastCalledWith(['a', 'b']);
    });
  });

  describe('paste', () => {
    function paste(text: string) {
      return fireEvent.paste(input(), { clipboardData: { getData: () => text } });
    }

    test('splits on separators and commits every piece, the last included', () => {
      const onValueChange = mock();
      render(<Harness onValueChange={onValueChange} />);
      paste('a, b ,c');
      expect(onValueChange).toHaveBeenCalledWith(['a', 'b', 'c']);
      expect(input().value).toBe('');
    });

    test('splits on newlines when Enter is a separator', () => {
      const onValueChange = mock();
      render(<Harness onValueChange={onValueChange} />);
      paste('one\ntwo\r\nthree');
      expect(onValueChange).toHaveBeenCalledWith(['one', 'two', 'three']);
    });

    test('joins the pasted text to what was already typed', () => {
      const onValueChange = mock();
      render(<Harness onValueChange={onValueChange} />);
      type('ab');
      paste('c,d');
      expect(onValueChange).toHaveBeenCalledWith(['abc', 'd']);
    });

    test('a paste with no separator is left to the browser', () => {
      render(<Harness />);
      expect(paste('plain')).toBe(true);
    });
  });

  describe('chips and the keyboard', () => {
    test('Backspace on an empty input selects the last chip, a second removes it', () => {
      const onValueChange = mock();
      render(<Harness start={['a', 'b']} onValueChange={onValueChange} />);
      fireEvent.keyDown(input(), { key: 'Backspace' });
      expect(onValueChange).not.toHaveBeenCalled();
      const chip = screen.getByText('b').closest('[data-tag]') as HTMLElement;
      expect(document.activeElement).toBe(chip);
      fireEvent.keyDown(chip, { key: 'Backspace' });
      expect(onValueChange).toHaveBeenCalledWith(['a']);
    });

    test('Backspace with text in the input edits the text, not the tags', () => {
      render(<Harness start={['a']} />);
      type('x');
      const prevented = !fireEvent.keyDown(input(), { key: 'Backspace' });
      expect(prevented).toBe(false);
      expect(tagsShown()).toEqual(['Remove a']);
    });

    test('ArrowLeft at the start of the input enters the chips; arrows move between them', () => {
      render(<Harness start={['a', 'b', 'c']} />);
      input().setSelectionRange(0, 0);
      fireEvent.keyDown(input(), { key: 'ArrowLeft' });
      const chip = (t: string) => screen.getByText(t).closest('[data-tag]') as HTMLElement;
      expect(document.activeElement).toBe(chip('c'));
      fireEvent.keyDown(chip('c'), { key: 'ArrowLeft' });
      expect(document.activeElement).toBe(chip('b'));
      fireEvent.keyDown(chip('b'), { key: 'ArrowRight' });
      expect(document.activeElement).toBe(chip('c'));
      fireEvent.keyDown(chip('c'), { key: 'ArrowRight' });
      expect(document.activeElement).toBe(input());
    });

    test('Delete removes the focused chip and focus moves on', async () => {
      const onValueChange = mock();
      render(<Harness start={['a', 'b', 'c']} onValueChange={onValueChange} />);
      const chip = screen.getByText('b').closest('[data-tag]') as HTMLElement;
      chip.focus();
      fireEvent.keyDown(chip, { key: 'Delete' });
      expect(onValueChange).toHaveBeenCalledWith(['a', 'c']);
      await Promise.resolve();
      expect(document.activeElement).toBe(screen.getByText('c').closest('[data-tag]'));
    });

    test('removing the only chip returns focus to the input', () => {
      render(<Harness start={['a']} />);
      const chip = screen.getByText('a').closest('[data-tag]') as HTMLElement;
      chip.focus();
      fireEvent.keyDown(chip, { key: 'Delete' });
      expect(document.activeElement).toBe(input());
    });

    test('the remove button removes its tag', () => {
      const onValueChange = mock();
      render(<Harness start={['a', 'b']} onValueChange={onValueChange} />);
      fireEvent.click(screen.getByLabelText('Remove a'));
      expect(onValueChange).toHaveBeenCalledWith(['b']);
    });
  });

  describe('validate', () => {
    const noSpaces = (t: string) => (t.includes(' ') ? 'No spaces' : null);

    test('an invalid entry stays in the input with its message, never dropped', () => {
      const onValueChange = mock();
      render(<Harness validate={noSpaces} onValueChange={onValueChange} />);
      type('a b');
      fireEvent.keyDown(input(), { key: 'Enter' });
      expect(onValueChange).not.toHaveBeenCalled();
      expect(input().value).toBe('a b');
      expect(screen.getByRole('alert').textContent).toBe('No spaces');
      expect(input().getAttribute('aria-invalid')).toBe('true');
      expect(input().getAttribute('aria-describedby')).toBe(screen.getByRole('alert').id);
    });

    test('typing clears the message', () => {
      render(<Harness validate={noSpaces} />);
      type('a b');
      fireEvent.keyDown(input(), { key: 'Enter' });
      type('a');
      expect(screen.queryByRole('alert')).toBeNull();
    });

    test('in a paste, valid pieces commit and invalid ones stay', () => {
      const onValueChange = mock();
      render(<Harness validate={noSpaces} onValueChange={onValueChange} />);
      fireEvent.paste(input(), { clipboardData: { getData: () => 'ok,no way,fine' } });
      expect(onValueChange).toHaveBeenCalledWith(['ok', 'fine']);
      expect(input().value).toBe('no way');
      expect(screen.getByRole('alert').textContent).toBe('No spaces');
    });
  });

  describe('max', () => {
    test('stops at max and says so, keeping the text', () => {
      const onValueChange = mock();
      render(<Harness max={2} start={['a', 'b']} onValueChange={onValueChange} />);
      type('c');
      fireEvent.keyDown(input(), { key: 'Enter' });
      expect(onValueChange).not.toHaveBeenCalled();
      expect(input().value).toBe('c');
      expect(screen.getByRole('alert').textContent).toBe('At most 2 tags');
    });

    test('a paste fills up to max and keeps the overflow', () => {
      const onValueChange = mock();
      render(<Harness max={2} onValueChange={onValueChange} />);
      fireEvent.paste(input(), { clipboardData: { getData: () => 'a,b,c' } });
      expect(onValueChange).toHaveBeenCalledWith(['a', 'b']);
      expect(input().value).toBe('c');
    });

    test('removing a tag makes room again', () => {
      const onValueChange = mock();
      render(<Harness max={1} start={['a']} onValueChange={onValueChange} />);
      fireEvent.click(screen.getByLabelText('Remove a'));
      type('b,');
      expect(onValueChange).toHaveBeenLastCalledWith(['b']);
    });
  });

  describe('duplicates', () => {
    test('rejected by default, with a message, text kept', () => {
      const onValueChange = mock();
      render(<Harness start={['a']} onValueChange={onValueChange} />);
      type('a');
      fireEvent.keyDown(input(), { key: 'Enter' });
      expect(onValueChange).not.toHaveBeenCalled();
      expect(input().value).toBe('a');
      expect(screen.getByRole('alert').textContent).toBe('"a" is already added');
    });

    test('a paste does not add the same tag twice', () => {
      const onValueChange = mock();
      render(<Harness onValueChange={onValueChange} />);
      fireEvent.paste(input(), { clipboardData: { getData: () => 'a,a,b' } });
      expect(onValueChange).toHaveBeenCalledWith(['a', 'b']);
      expect(input().value).toBe('a');
    });

    test('allowed with allowDuplicates', () => {
      const onValueChange = mock();
      render(<Harness allowDuplicates start={['a']} onValueChange={onValueChange} />);
      type('a,');
      expect(onValueChange).toHaveBeenCalledWith(['a', 'a']);
    });
  });

  describe('suggestions', () => {
    const suggestions = ['apple', 'apricot', 'banana'];

    test('open on typing, filtered, as a listbox of options', () => {
      render(<Harness suggestions={suggestions} />);
      fireEvent.focus(input());
      type('ap');
      expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
        'apple',
        'apricot',
      ]);
      expect(input().getAttribute('role')).toBe('combobox');
      expect(input().getAttribute('aria-expanded')).toBe('true');
    });

    test('nothing is highlighted until an arrow key, so Enter commits the typed text', () => {
      const onValueChange = mock();
      render(<Harness suggestions={suggestions} onValueChange={onValueChange} />);
      fireEvent.focus(input());
      type('ap');
      expect(input().getAttribute('aria-activedescendant')).toBeNull();
      fireEvent.keyDown(input(), { key: 'Enter' });
      expect(onValueChange).toHaveBeenCalledWith(['ap']);
    });

    test('arrows move the highlight, wrap, and Enter commits it', () => {
      const onValueChange = mock();
      render(<Harness suggestions={suggestions} onValueChange={onValueChange} />);
      fireEvent.focus(input());
      type('ap');
      fireEvent.keyDown(input(), { key: 'ArrowDown' });
      const options = screen.getAllByRole('option');
      expect(options[0]?.getAttribute('aria-selected')).toBe('true');
      expect(input().getAttribute('aria-activedescendant')).toBe(options[0]?.id as string);
      fireEvent.keyDown(input(), { key: 'ArrowDown' });
      fireEvent.keyDown(input(), { key: 'ArrowDown' });
      expect(screen.getAllByRole('option')[0]?.getAttribute('aria-selected')).toBe('true');
      fireEvent.keyDown(input(), { key: 'ArrowUp' });
      fireEvent.keyDown(input(), { key: 'Enter' });
      expect(onValueChange).toHaveBeenCalledWith(['apricot']);
      expect(input().value).toBe('');
    });

    test('Escape closes the list', () => {
      render(<Harness suggestions={suggestions} />);
      fireEvent.focus(input());
      type('ap');
      fireEvent.keyDown(input(), { key: 'Escape' });
      expect(screen.queryByRole('listbox')).toBeNull();
    });

    test('a click commits the option; tags already added are not offered', () => {
      const onValueChange = mock();
      render(<Harness suggestions={suggestions} start={['apple']} onValueChange={onValueChange} />);
      fireEvent.focus(input());
      type('ap');
      expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['apricot']);
      fireEvent.click(screen.getByRole('option'));
      expect(onValueChange).toHaveBeenCalledWith(['apple', 'apricot']);
    });

    test('without suggestions the input is a plain textbox', () => {
      render(<Harness />);
      expect(input().getAttribute('role')).toBeNull();
      expect(screen.queryByRole('listbox')).toBeNull();
    });
  });

  test('labels override every string', () => {
    render(
      <Harness
        start={['a']}
        max={1}
        labels={{
          remove: (t) => `Quitar ${t}`,
          maxReached: (n) => `Máximo ${n}`,
          input: 'Etiqueta',
          tags: 'Etiquetas',
        }}
      />,
    );
    expect(screen.getByLabelText('Quitar a')).toBeTruthy();
    expect(screen.getByRole('group').getAttribute('aria-label')).toBe('Etiquetas');
    type('b');
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(screen.getByRole('alert').textContent).toBe('Máximo 1');
    expect(input().getAttribute('aria-label')).toBe('Etiqueta');
  });

  test('disabled disables the input and the remove buttons', () => {
    render(<TagInput value={['a']} onValueChange={() => {}} disabled />);
    expect(input().disabled).toBe(true);
    expect((screen.getByLabelText('Remove a') as HTMLButtonElement).disabled).toBe(true);
  });
});
