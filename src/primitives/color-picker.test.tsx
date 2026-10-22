import { describe, expect, mock, test } from 'bun:test';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { ColorPicker, type ColorPickerProps } from './color-picker';

const RED = '#ff0000';

function Controlled(props: Partial<ColorPickerProps> & { onChange?: (value: string) => void }) {
  const { onChange, value: initial = RED, ...rest } = props;
  const [value, setValue] = useState(initial);
  return (
    <ColorPicker
      {...rest}
      value={value}
      onValueChange={(next) => {
        onChange?.(next);
        setValue(next);
      }}
    />
  );
}

function setup(props: Parameters<typeof Controlled>[0] = {}) {
  const onChange = mock((_value: string) => {});
  const view = render(<Controlled onChange={onChange} {...props} />);
  return { onChange, view };
}

async function open(name = /^Colour/) {
  fireEvent.click(screen.getByRole('button', { name }));
  return screen.findByRole('slider', { name: 'Saturation and brightness' });
}

const last = (fn: ReturnType<typeof mock>) => fn.mock.calls.at(-1)?.[0];

function type(input: HTMLElement, text: string, commit: 'Enter' | 'blur' = 'Enter') {
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: text } });
  if (commit === 'Enter') fireEvent.keyDown(input, { key: 'Enter' });
  else fireEvent.blur(input);
}

describe('ColorPicker — the trigger', () => {
  test('a swatch button named with the value, drawing the value', () => {
    render(<ColorPicker value="oklch(0.6 0.1 250)" />);
    expect(screen.getByRole('button', { name: 'Colour oklch(0.6 0.1 250)' })).toBeTruthy();
    // happy-dom drops an oklch() it cannot parse from inline style, so what is
    // drawn is checked with a hex value.
    cleanup();
    render(<ColorPicker value={RED} />);
    const drawn = screen.getByRole('button').querySelector<HTMLElement>('span span');
    expect(drawn?.style.background).toMatch(/ff0000|255, 0, 0/);
  });

  test('an empty value draws nothing and asks to choose', () => {
    render(<ColorPicker />);
    expect(screen.getByRole('button', { name: 'Choose a colour' })).toBeTruthy();
  });

  test('field mode puts the text input on the page, beside the swatch', () => {
    render(<ColorPicker value={RED} trigger="field" />);
    expect((screen.getByRole('textbox', { name: 'Colour value' }) as HTMLInputElement).value).toBe(
      RED,
    );
    expect(screen.getByRole('button', { name: `Colour ${RED}` })).toBeTruthy();
  });

  test('disabled disables the trigger and the field', () => {
    render(<ColorPicker value={RED} trigger="field" disabled />);
    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('textbox') as HTMLInputElement).disabled).toBe(true);
  });

  test('every visible string can be replaced', async () => {
    render(
      <ColorPicker
        value={RED}
        alpha
        swatches={[RED]}
        labels={{
          trigger: () => 'Farbe',
          area: 'Fläche',
          hue: 'Farbton',
          alpha: 'Deckkraft',
          input: 'Wert',
          swatches: 'Muster',
          swatch: () => 'Rot',
        }}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Farbe' }));
    expect(await screen.findByRole('slider', { name: 'Fläche' })).toBeTruthy();
    expect(screen.getByRole('slider', { name: 'Farbton' })).toBeTruthy();
    expect(screen.getByRole('slider', { name: 'Deckkraft' })).toBeTruthy();
    expect(screen.getByRole('textbox', { name: 'Wert' })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Muster' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Rot' })).toBeTruthy();
  });
});

describe('ColorPicker — keyboard on the area', () => {
  test('names both axes and the colour', async () => {
    setup();
    const area = await open();
    expect(area.getAttribute('aria-roledescription')).toBe('2D slider');
    expect(area.getAttribute('aria-valuenow')).toBe('100');
    expect(area.getAttribute('aria-valuetext')).toBe(
      `Saturation 100%, brightness 100%, ${RED}`,
    );
  });

  test('arrows move one step, Shift ten', async () => {
    const { onChange } = setup();
    const area = await open();
    fireEvent.keyDown(area, { key: 'ArrowDown' });
    expect(area.getAttribute('aria-valuetext')).toStartWith('Saturation 100%, brightness 99%');
    fireEvent.keyDown(area, { key: 'ArrowLeft', shiftKey: true });
    expect(area.getAttribute('aria-valuetext')).toStartWith('Saturation 90%, brightness 99%');
    expect(area.getAttribute('aria-valuenow')).toBe('90');
    // 99% of 255 is 252; 90% saturation lifts the other channels to 25.
    expect(last(onChange)).toBe('#fc1919');
  });

  test('Home, End and the page keys jump', async () => {
    const { onChange } = setup();
    const area = await open();
    fireEvent.keyDown(area, { key: 'PageDown' });
    expect(area.getAttribute('aria-valuetext')).toStartWith('Saturation 100%, brightness 90%');
    fireEvent.keyDown(area, { key: 'Home' });
    expect(area.getAttribute('aria-valuenow')).toBe('0');
    fireEvent.keyDown(area, { key: 'End' });
    expect(area.getAttribute('aria-valuenow')).toBe('100');
    fireEvent.keyDown(area, { key: 'PageUp' });
    expect(last(onChange)).toBe(RED);
  });

  test('the hue survives a trip through grey', async () => {
    const { onChange } = setup({ value: '#00ff00' });
    const area = await open();
    fireEvent.keyDown(area, { key: 'Home' });
    expect(last(onChange)).toBe('#ffffff');
    fireEvent.keyDown(area, { key: 'End' });
    expect(last(onChange)).toBe('#00ff00');
  });

  test('stops at the edges without calling back', async () => {
    const { onChange } = setup();
    const area = await open();
    fireEvent.keyDown(area, { key: 'ArrowUp' });
    fireEvent.keyDown(area, { key: 'ArrowRight', shiftKey: true });
    expect(onChange).not.toHaveBeenCalled();
    expect(area.getAttribute('aria-valuetext')).toStartWith('Saturation 100%, brightness 100%');
  });

  test('an oklch value is written back as oklch', async () => {
    const { onChange } = setup({ value: 'oklch(0.628 0.2577 29.23)' });
    const area = await open();
    fireEvent.keyDown(area, { key: 'ArrowDown', shiftKey: true });
    expect(last(onChange)).toStartWith('oklch(');
  });

  test('format overrides the value’s own', async () => {
    const { onChange } = setup({ value: 'oklch(0.628 0.2577 29.23)', format: 'hex' });
    const area = await open();
    fireEvent.keyDown(area, { key: 'ArrowDown' });
    expect(last(onChange)).toBe('#fc0000');
  });

  test('the hue slider turns the hue', async () => {
    const { onChange } = setup();
    await open();
    fireEvent.change(screen.getByRole('slider', { name: 'Hue' }), { target: { value: '120' } });
    expect(last(onChange)).toBe('#00ff00');
  });

  test('a new value from outside moves the area', async () => {
    const view = render(<ColorPicker value={RED} />);
    const area = await open();
    view.rerender(<ColorPicker value="#808080" />);
    expect(area.getAttribute('aria-valuetext')).toBe('Saturation 0%, brightness 50%, #808080');
  });
});

describe('ColorPicker — text input validation', () => {
  test('hex commits on Enter, normalised', async () => {
    const { onChange } = setup();
    await open();
    type(screen.getByRole('textbox', { name: 'Colour value' }), '#0F0');
    expect(last(onChange)).toBe('#00ff00');
  });

  test('oklch commits on blur, and stays oklch', async () => {
    const { onChange } = setup();
    await open();
    type(screen.getByRole('textbox', { name: 'Colour value' }), 'oklch(70% 0.1 200deg)', 'blur');
    expect(last(onChange)).toBe('oklch(0.7 0.1 200)');
  });

  test('invalid text is kept, marked and explained, and nothing is called', async () => {
    const { onChange } = setup();
    await open();
    const input = screen.getByRole('textbox', { name: 'Colour value' }) as HTMLInputElement;
    type(input, 'not a colour');
    expect(onChange).not.toHaveBeenCalled();
    expect(input.value).toBe('not a colour');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toBe('Enter a hex colour or an oklch() value');
    expect(input.getAttribute('aria-describedby')).toBe(alert.id);
  });

  test('a correction clears the message', async () => {
    const { onChange } = setup({ trigger: 'field' });
    const input = screen.getByRole('textbox', { name: 'Colour value' });
    type(input, 'oklch(0.5 0.1)');
    expect(screen.getByRole('alert')).toBeTruthy();
    type(input, '#123456');
    expect(last(onChange)).toBe('#123456');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  test('an out-of-gamut oklch is accepted and brought into sRGB', () => {
    const { onChange } = setup({ trigger: 'field', format: 'hex' });
    type(screen.getByRole('textbox', { name: 'Colour value' }), 'oklch(0.7 0.4 150)');
    expect(last(onChange)).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe('ColorPicker — alpha', () => {
  test('no opacity slider unless asked, and the output is opaque', async () => {
    const { onChange } = setup();
    await open();
    expect(screen.queryByRole('slider', { name: 'Opacity' })).toBeNull();
    type(screen.getByRole('textbox', { name: 'Colour value' }), '#00ff0080');
    expect(last(onChange)).toBe('#00ff00');
  });

  test('the opacity slider writes eight-digit hex', async () => {
    const { onChange } = setup({ alpha: true });
    await open();
    const slider = screen.getByRole('slider', { name: 'Opacity' });
    expect(slider.getAttribute('aria-valuetext')).toBe('100%');
    fireEvent.change(slider, { target: { value: '50' } });
    expect(last(onChange)).toBe('#ff000080');
    expect(slider.getAttribute('aria-valuetext')).toBe('50%');
  });

  test('and an alpha in oklch', async () => {
    const { onChange } = setup({ alpha: true, value: 'oklch(0.628 0.2577 29.23)' });
    await open();
    fireEvent.change(screen.getByRole('slider', { name: 'Opacity' }), {
      target: { value: '25' },
    });
    expect(last(onChange)).toEndWith(' / 0.25)');
  });

  test('a typed alpha is kept', async () => {
    const { onChange } = setup({ alpha: true });
    await open();
    type(screen.getByRole('textbox', { name: 'Colour value' }), '#00ff0040');
    expect(last(onChange)).toBe('#00ff0040');
    expect((screen.getByRole('slider', { name: 'Opacity' }) as HTMLInputElement).value).toBe('25');
  });
});

describe('ColorPicker — swatches', () => {
  const SWATCHES = [RED, '#00ff00', 'oklch(0.6 0.1 250)', 'nonsense'];

  test('a named group of buttons, the current one pressed', async () => {
    setup({ swatches: SWATCHES });
    await open();
    const group = screen.getByRole('group', { name: 'Swatches' });
    const buttons = [...group.querySelectorAll('button')];
    expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual(SWATCHES);
    expect(buttons.map((b) => b.getAttribute('aria-pressed'))).toEqual([
      'true',
      'false',
      'false',
      'false',
    ]);
  });

  test('a click picks it, in its own format', async () => {
    const { onChange } = setup({ swatches: SWATCHES });
    await open();
    fireEvent.click(screen.getByRole('button', { name: 'oklch(0.6 0.1 250)' }));
    expect(last(onChange)).toStartWith('oklch(0.6 0.1 250');
    fireEvent.click(screen.getByRole('button', { name: '#00ff00' }));
    expect(last(onChange)).toBe('#00ff00');
    expect(screen.getByRole('button', { name: '#00ff00' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
  });

  test('a swatch that is not a colour is drawn disabled, not dropped', async () => {
    setup({ swatches: SWATCHES });
    await open();
    expect((screen.getByRole('button', { name: 'nonsense' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  test('uncontrolled, from defaultValue', async () => {
    const onValueChange = mock((_value: string) => {});
    render(<ColorPicker defaultValue={RED} swatches={SWATCHES} onValueChange={onValueChange} />);
    await open();
    fireEvent.click(screen.getByRole('button', { name: '#00ff00' }));
    expect(last(onValueChange)).toBe('#00ff00');
    expect(screen.getByRole('button', { name: 'Colour #00ff00' })).toBeTruthy();
  });
});
