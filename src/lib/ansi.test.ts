import { describe, expect, test } from 'bun:test';
import { ansiClassName, parseAnsi, stripAnsi } from './ansi';

const ESC = '\x1b';

describe('parseAnsi', () => {
  test('plain text is one unstyled segment', () => {
    expect(parseAnsi('hello')).toEqual([{ text: 'hello', style: {} }]);
  });

  test('red then reset', () => {
    expect(parseAnsi(`${ESC}[31merror${ESC}[0m ok`)).toEqual([
      { text: 'error', style: { fg: 'red' } },
      { text: ' ok', style: {} },
    ]);
  });

  test('an empty SGR is a reset', () => {
    expect(parseAnsi(`${ESC}[1mA${ESC}[mB`)).toEqual([
      { text: 'A', style: { bold: true } },
      { text: 'B', style: {} },
    ]);
  });

  test('bold, dim, italic, underline combine and switch off one by one', () => {
    const segments = parseAnsi(`${ESC}[1;2;3;4mA${ESC}[22mB${ESC}[23mC${ESC}[24mD`);
    expect(segments).toEqual([
      { text: 'A', style: { bold: true, dim: true, italic: true, underline: true } },
      { text: 'B', style: { italic: true, underline: true } },
      { text: 'C', style: { underline: true } },
      { text: 'D', style: {} },
    ]);
  });

  test('bright and background colours', () => {
    expect(parseAnsi(`${ESC}[92;101mX${ESC}[39mY${ESC}[49mZ`)).toEqual([
      { text: 'X', style: { fg: 'green', bg: 'red' } },
      { text: 'Y', style: { bg: 'red' } },
      { text: 'Z', style: {} },
    ]);
  });

  test('256-colour and truecolour are consumed and render default ink', () => {
    // Without consuming them, `196` and `1` would be misread as codes.
    expect(parseAnsi(`${ESC}[31m${ESC}[38;5;196mA${ESC}[48;2;255;1;4mB`)).toEqual([
      { text: 'AB', style: {} },
    ]);
    expect(parseAnsi(`${ESC}[38;2;1;2;3;4mC`)).toEqual([{ text: 'C', style: { underline: true } }]);
    expect(parseAnsi(`${ESC}[33m${ESC}[38:2::10:20:30mD`)).toEqual([{ text: 'D', style: {} }]);
  });

  test('adjacent runs of the same style merge', () => {
    expect(parseAnsi(`${ESC}[31ma${ESC}[31mb`)).toEqual([{ text: 'ab', style: { fg: 'red' } }]);
  });
});

describe('stripAnsi', () => {
  test('removes SGR', () => {
    expect(stripAnsi(`${ESC}[1;31mfail${ESC}[0m`)).toBe('fail');
  });

  test('strips cursor movement, clearing, OSC and two-byte escapes', () => {
    expect(stripAnsi(`a${ESC}[2Kb${ESC}[10;5Hc${ESC}[?1049hd`)).toBe('abcd');
    expect(stripAnsi(`${ESC}]0;title\x07x${ESC}]8;;http://e${ESC}\\y`)).toBe('xy');
    expect(stripAnsi(`${ESC}(Bp${ESC}=q${ESC}`)).toBe('pq');
  });

  test('strips control characters but keeps tabs', () => {
    expect(stripAnsi('a\tb\rc\x07d\x7f')).toBe('a\tbcd');
  });

  test('parseAnsi drops the same sequences', () => {
    const text = `x${ESC}[2J${ESC}]0;t\x07y`;
    expect(parseAnsi(text)).toEqual([{ text: stripAnsi(text), style: {} }]);
  });
});

describe('ansiClassName', () => {
  test('default ink has no class', () => {
    expect(ansiClassName({})).toBe('');
  });

  test('colours map to tokens', () => {
    expect(ansiClassName({ fg: 'red' })).toBe('text-danger');
    expect(ansiClassName({ fg: 'green' })).toBe('text-ok');
    expect(ansiClassName({ fg: 'yellow' })).toBe('text-warn');
    expect(ansiClassName({ fg: 'blue' })).toBe('text-[var(--color-accent,var(--color-ink-2))]');
    expect(ansiClassName({ fg: 'cyan' })).toBe('text-[var(--color-accent,var(--color-ink-2))]');
    expect(ansiClassName({ fg: 'magenta' })).toBe('text-ink-2');
    expect(ansiClassName({ fg: 'white' })).toBe('text-ink');
    expect(ansiClassName({ fg: 'black' })).toBe('text-ink-3');
  });

  test('attributes', () => {
    expect(ansiClassName({ bold: true, dim: true, italic: true, underline: true, bg: 'yellow' })).toBe(
      'bg-warn/20 font-bold opacity-60 italic underline',
    );
  });
});
