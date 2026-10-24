import { describe, expect, mock, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { PinInput, type PinInputProps } from './pin-input';

function Harness(props: Partial<PinInputProps>) {
  const [value, setValue] = useState('');
  return (
    <PinInput
      label="Code"
      {...props}
      value={value}
      onValueChange={(v) => {
        setValue(v);
        props.onValueChange?.(v);
      }}
    />
  );
}

const input = () => screen.getByLabelText('Code') as HTMLInputElement;
const type = (v: string) => fireEvent.change(input(), { target: { value: v } });
const paste = (text: string) =>
  fireEvent.paste(input(), { clipboardData: { getData: () => text } });
const cells = (c: HTMLElement) => [...c.querySelectorAll('span[aria-hidden]')];

describe('PinInput', () => {
  test('one labelled field with one-time-code autofill', () => {
    const { container } = render(<Harness />);
    expect(container.querySelectorAll('input').length).toBe(1);
    expect(input().getAttribute('autocomplete')).toBe('one-time-code');
    expect(input().getAttribute('inputmode')).toBe('numeric');
    expect(cells(container).length).toBe(6);
  });

  test('typing and backspace', () => {
    const { container } = render(<Harness />);
    type('1');
    type('12');
    expect(input().value).toBe('12');
    expect(cells(container).map((c) => c.textContent).join('')).toBe('12');
    type('1');
    expect(input().value).toBe('1');
  });

  test('paste of a full code and of a partial code', () => {
    const { container } = render(<Harness />);
    paste('12 34-5');
    expect(input().value).toBe('1234' + '5');
    paste('987654321');
    expect(input().value).toBe('987654');
    expect(cells(container).map((c) => c.textContent).join('')).toBe('987654');
  });

  test('invalid characters are rejected', () => {
    const onValueChange = mock(() => {});
    render(<Harness onValueChange={onValueChange} />);
    type('a');
    expect(onValueChange).not.toHaveBeenCalled();
    expect(input().value).toBe('');
    type('1');
    type('1b');
    expect(input().value).toBe('1');
  });

  test('alphanumeric accepts letters', () => {
    render(<Harness type="alphanumeric" length={4} />);
    type('a1-B');
    expect(input().value).toBe('a1B');
    expect(input().getAttribute('inputmode')).toBe('text');
  });

  test('onComplete fires once', () => {
    const onComplete = mock((_: string) => {});
    render(<Harness length={4} onComplete={onComplete} />);
    type('123');
    expect(onComplete).not.toHaveBeenCalled();
    type('1234');
    type('12345');
    paste('1234');
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith('1234');
    type('123');
    type('1234');
    expect(onComplete).toHaveBeenCalledTimes(2);
  });

  test('mask hides characters in cells and uses a password field', () => {
    const { container } = render(<Harness mask />);
    type('12');
    expect(input().type).toBe('password');
    expect(cells(container).map((c) => c.textContent).join('')).toBe('••');
  });

  test('active cell follows the value while focused', () => {
    const { container } = render(<Harness length={4} />);
    expect(container.querySelector('[data-active]')).toBeNull();
    fireEvent.focus(input());
    type('12');
    expect(cells(container).findIndex((c) => c.hasAttribute('data-active'))).toBe(2);
    type('1234');
    expect(cells(container).findIndex((c) => c.hasAttribute('data-active'))).toBe(3);
  });

  test('disabled and custom progress label', () => {
    render(
      <Harness
        disabled
        labels={{ progress: (n, l) => `${n}/${l}` }}
      />,
    );
    expect(input().disabled).toBe(true);
    expect(screen.getByText('0/6')).toBeTruthy();
  });
});
