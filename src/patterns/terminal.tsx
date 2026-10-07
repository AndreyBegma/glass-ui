import type { Ref } from 'react';
import { cn } from '../lib/cn';

/**
 * #74 — Terminal: an xterm.js wrapper themed from tokens.
 *
 * Exported only from `glass-ui/terminal`, never the barrel (D10). The real
 * implementation loads `@xterm/xterm` and `@xterm/addon-fit`, optional peers,
 * with a dynamic `import()` inside an effect, so the subpath is SSR-safe.
 *
 * This file is the scaffold: the final prop types and a placeholder body that
 * imports no xterm at all. i74-terminal replaces the body.
 */
export type TerminalHandle = {
  write: (data: string) => void;
  writeln: (data: string) => void;
  clear: () => void;
  focus: () => void;
  fit: () => void;
};

export type TerminalSize = { cols: number; rows: number };

export type TerminalProps = {
  ref?: Ref<TerminalHandle>;
  /** Required: a terminal has no visible name of its own. */
  'aria-label': string;
  /** Sets `disableStdin` and hides the cursor. */
  readOnly?: boolean;
  /** Keystrokes, when not read-only. */
  onData?: (data: string) => void;
  onResize?: (size: TerminalSize) => void;
  fontSize?: number;
  scrollback?: number;
  screenReaderMode?: boolean;
  /** Keep `Escape` for the program; by default it blurs the terminal. */
  captureEscape?: boolean;
  className?: string;
};

export function Terminal({ 'aria-label': ariaLabel, className }: TerminalProps) {
  return (
    <section
      aria-label={ariaLabel}
      data-terminal-scaffold
      className={cn('h-full w-full rounded-(--radius-surface) bg-ground', className)}
    />
  );
}
