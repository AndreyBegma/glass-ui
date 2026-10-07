/**
 * FEAT-20260930-070 (D5) — the SGR subset of ANSI, and nothing else.
 *
 * A log line from a build or an agent carries colour as `ESC[…m`. This reads
 * exactly that: reset, bold, dim, italic, underline, and the 8 + 8 bright
 * foreground and background colours. It is not a terminal emulator — cursor
 * movement, clearing and the alternate screen belong to a later `Terminal`
 * (xterm.js), so every other escape sequence is stripped rather than half
 * interpreted.
 *
 * **Colours are tokens, never values.** A palette colour is mapped to the
 * semantic it nearly always means in a log — red to `danger`, green to `ok`,
 * yellow to `warn` — and the rest to the ink ladder. Blue and cyan read the
 * desk accent where it is defined and `ink-2` everywhere else, the same
 * fallback `TraceTree` uses. 256-colour and truecolour sequences are parsed so
 * their parameters are not misread as codes, and then render as default ink:
 * a raw colour from a log would be the one colour on the page no theme can
 * move. Bright variants map to the same token as their normal colour.
 *
 * Colour is never the only signal for an error: `LogViewer` takes a `level`
 * per line for its gutter mark.
 */

export type AnsiColor = 'black' | 'red' | 'green' | 'yellow' | 'blue' | 'magenta' | 'cyan' | 'white';

export type AnsiStyle = {
  fg?: AnsiColor;
  bg?: AnsiColor;
  bold?: boolean;
  dim?: boolean;
  italic?: boolean;
  underline?: boolean;
};

export type AnsiSegment = { text: string; style: AnsiStyle };

const COLORS: AnsiColor[] = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'];

const FG: Record<AnsiColor, string> = {
  black: 'text-ink-3',
  red: 'text-danger',
  green: 'text-ok',
  yellow: 'text-warn',
  blue: 'text-[var(--color-accent,var(--color-ink-2))]',
  magenta: 'text-ink-2',
  cyan: 'text-[var(--color-accent,var(--color-ink-2))]',
  white: 'text-ink',
};

const BG: Record<AnsiColor, string> = {
  black: 'bg-ground',
  red: 'bg-danger/20',
  green: 'bg-ok/20',
  yellow: 'bg-warn/20',
  blue: 'bg-[var(--color-accent-soft,var(--color-hover))]',
  magenta: 'bg-hover',
  cyan: 'bg-[var(--color-accent-soft,var(--color-hover))]',
  white: 'bg-hover',
};

/**
 * One escape sequence or stray control character, in the order they are
 * tried: a CSI (`ESC[` parameters, intermediates, one final byte), an OSC
 * (`ESC]` up to BEL or `ESC\`), any other `ESC` sequence (intermediates and a
 * final byte), a lone `ESC`, and a C0 control or DEL other than tab.
 */
const SEQUENCE =
  // biome-ignore lint/suspicious/noControlCharactersInRegex: matching control characters is the point
  /\x1b\[([0-?]*)[ -/]*([@-~])|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)?|\x1b[ -/]*[0-~]|\x1b|[\x00-\x08\x0a-\x1a\x1c-\x1f\x7f]/g;

function applySgr(style: AnsiStyle, params: string): AnsiStyle {
  const next = { ...style };
  const codes = params === '' ? ['0'] : params.split(';');
  for (let i = 0; i < codes.length; i++) {
    const raw = codes[i];
    // `38:5:n` / `38:2::r:g:b` — the sub-parameter form is one token.
    if (raw.includes(':')) {
      const head = Number(raw.split(':')[0]);
      if (head === 38) next.fg = undefined;
      else if (head === 48) next.bg = undefined;
      continue;
    }
    const code = raw === '' ? 0 : Number(raw);
    if (code === 0) {
      for (const key of Object.keys(next) as (keyof AnsiStyle)[]) delete next[key];
    } else if (code === 1) next.bold = true;
    else if (code === 2) next.dim = true;
    else if (code === 3) next.italic = true;
    else if (code === 4) next.underline = true;
    else if (code === 22) {
      next.bold = undefined;
      next.dim = undefined;
    } else if (code === 23) next.italic = undefined;
    else if (code === 24) next.underline = undefined;
    else if (code >= 30 && code <= 37) next.fg = COLORS[code - 30];
    else if (code === 39) next.fg = undefined;
    else if (code >= 40 && code <= 47) next.bg = COLORS[code - 40];
    else if (code === 49) next.bg = undefined;
    else if (code >= 90 && code <= 97) next.fg = COLORS[code - 90];
    else if (code >= 100 && code <= 107) next.bg = COLORS[code - 100];
    else if (code === 38 || code === 48) {
      // Extended colour: consume its parameters, render default ink.
      const mode = codes[i + 1];
      i += mode === '5' ? 2 : mode === '2' ? 4 : 1;
      if (code === 38) next.fg = undefined;
      else next.bg = undefined;
    }
  }
  return clean(next);
}

function clean(style: AnsiStyle): AnsiStyle {
  const out: AnsiStyle = {};
  for (const [key, value] of Object.entries(style) as [keyof AnsiStyle, AnsiStyle[keyof AnsiStyle]][]) {
    if (value !== undefined && value !== false) (out as Record<string, unknown>)[key] = value;
  }
  return out;
}

function sameStyle(a: AnsiStyle, b: AnsiStyle): boolean {
  return (
    a.fg === b.fg &&
    a.bg === b.bg &&
    !!a.bold === !!b.bold &&
    !!a.dim === !!b.dim &&
    !!a.italic === !!b.italic &&
    !!a.underline === !!b.underline
  );
}

/** The text split into runs of one style each; escapes are consumed. */
export function parseAnsi(input: string): AnsiSegment[] {
  const segments: AnsiSegment[] = [];
  let style: AnsiStyle = {};
  let last = 0;
  const push = (text: string) => {
    if (!text) return;
    const prev = segments.at(-1);
    if (prev && sameStyle(prev.style, style)) prev.text += text;
    else segments.push({ text, style });
  };
  for (const match of input.matchAll(SEQUENCE)) {
    push(input.slice(last, match.index));
    last = match.index + match[0].length;
    if (match[2] === 'm') style = applySgr(style, match[1]);
  }
  push(input.slice(last));
  return segments;
}

/** The text a person reads: every escape and control character removed. */
export function stripAnsi(input: string): string {
  return input.replace(SEQUENCE, '');
}

/** Token classes for a style; empty for default ink. */
export function ansiClassName(style: AnsiStyle): string {
  const classes: string[] = [];
  if (style.fg) classes.push(FG[style.fg]);
  if (style.bg) classes.push(BG[style.bg]);
  if (style.bold) classes.push('font-bold');
  if (style.dim) classes.push('opacity-60');
  if (style.italic) classes.push('italic');
  if (style.underline) classes.push('underline');
  return classes.join(' ');
}
