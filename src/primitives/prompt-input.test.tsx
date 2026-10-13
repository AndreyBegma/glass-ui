import { describe, expect, mock, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { PromptInput } from './prompt-input';

const field = () => screen.getByRole('textbox') as HTMLTextAreaElement;
const send = () =>
  screen.getByRole('button', { name: 'Send' }) as HTMLButtonElement;

describe('PromptInput', () => {
  test('Enter sends the value and an uncontrolled field clears itself', () => {
    const onSubmit = mock();
    render(<PromptInput placeholder="Ask" onSubmit={onSubmit} />);
    fireEvent.change(field(), { target: { value: 'hello' } });
    fireEvent.keyDown(field(), { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalledWith('hello');
    expect(field().value).toBe('');
  });

  test('Shift+Enter does not send', () => {
    const onSubmit = mock();
    render(<PromptInput placeholder="Ask" onSubmit={onSubmit} />);
    fireEvent.change(field(), { target: { value: 'line one' } });
    fireEvent.keyDown(field(), { key: 'Enter', shiftKey: true });
    expect(onSubmit).not.toHaveBeenCalled();
    expect(field().value).toBe('line one');
  });

  test('Enter while an input method is composing does not send', () => {
    const onSubmit = mock();
    render(<PromptInput placeholder="Ask" onSubmit={onSubmit} />);
    fireEvent.change(field(), { target: { value: 'にほん' } });
    fireEvent.compositionStart(field());
    fireEvent.keyDown(field(), { key: 'Enter' });
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.compositionEnd(field());
    fireEvent.keyDown(field(), { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalledWith('にほん');
  });

  test('a whitespace-only value never sends, and the button says so', () => {
    const onSubmit = mock();
    render(<PromptInput placeholder="Ask" onSubmit={onSubmit} />);
    expect(send().disabled).toBe(true);
    fireEvent.change(field(), { target: { value: '   ' } });
    expect(send().disabled).toBe(true);
    fireEvent.keyDown(field(), { key: 'Enter' });
    fireEvent.click(send());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test('the send button sends', () => {
    const onSubmit = mock();
    render(<PromptInput placeholder="Ask" onSubmit={onSubmit} />);
    fireEvent.change(field(), { target: { value: 'go' } });
    fireEvent.click(send());
    expect(onSubmit).toHaveBeenCalledWith('go');
  });

  test('controlled: the value is the caller’s, and is not cleared for them', () => {
    const onSubmit = mock();
    function Host() {
      const [value, setValue] = useState('draft');
      return (
        <PromptInput
          placeholder="Ask"
          value={value}
          onValueChange={setValue}
          onSubmit={onSubmit}
        />
      );
    }
    render(<Host />);
    expect(field().value).toBe('draft');
    fireEvent.change(field(), { target: { value: 'draft 2' } });
    fireEvent.keyDown(field(), { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalledWith('draft 2');
    expect(field().value).toBe('draft 2');
  });

  test('disabled with a reason: the reason replaces the placeholder and describes the field', () => {
    const onSubmit = mock();
    render(
      <PromptInput
        placeholder="Ask"
        aria-label="Prompt"
        disabled
        disabledReason="The agent is paused"
        defaultValue="x"
        onSubmit={onSubmit}
      />,
    );
    const input = screen.getByRole('textbox', {
      name: 'Prompt',
    }) as HTMLTextAreaElement;
    expect(input.disabled).toBe(true);
    expect(input.placeholder).toBe('The agent is paused');
    const describedBy = input.getAttribute('aria-describedby');
    expect(
      describedBy && document.getElementById(describedBy)?.textContent,
    ).toBe('The agent is paused');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSubmit).not.toHaveBeenCalled();
    expect(send().disabled).toBe(true);
  });

  test('multiline={false} is a one-line input', () => {
    render(
      <PromptInput placeholder="Ask" multiline={false} onSubmit={() => {}} />,
    );
    expect(field().tagName).toBe('INPUT');
  });

  test('leading actions render before the text, and stacked puts them under it', () => {
    const { container, rerender } = render(
      <PromptInput
        placeholder="Ask"
        leading={<button type="button">Attach</button>}
        onSubmit={() => {}}
      />,
    );
    const frame = container.querySelector('[data-prompt-input]');
    expect(frame?.firstElementChild?.hasAttribute('data-prompt-leading')).toBe(
      true,
    );
    rerender(
      <PromptInput
        placeholder="Ask"
        layout="stacked"
        leading={<button type="button">Attach</button>}
        onSubmit={() => {}}
      />,
    );
    expect(frame?.firstElementChild?.tagName).toBe('TEXTAREA');
    expect(screen.getByRole('button', { name: 'Attach' })).not.toBeNull();
  });

  test('the send label is replaceable', () => {
    render(
      <PromptInput placeholder="Ask" sendLabel="Envoyer" onSubmit={() => {}} />,
    );
    expect(screen.getByRole('button', { name: 'Envoyer' })).not.toBeNull();
  });
});
