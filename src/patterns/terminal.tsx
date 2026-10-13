'use client';

import type { FitAddon } from '@xterm/addon-fit';
import type { ITheme, Terminal as XTerm } from '@xterm/xterm';
import { type Ref, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { cn } from '../lib/cn';
import { loadTerminalPeers } from './terminal-peers';

/**
 * #74 — Terminal: an xterm.js wrapper themed from tokens.
 *
 * Exported only from `glass-ui/terminal`, never the barrel (D10): `@xterm/xterm`
 * and `@xterm/addon-fit` are optional peers, and a bundler resolves even a
 * dynamic `import()` of a package that is not installed.
 *
 * **Nothing touches the DOM at import.** Both packages are loaded with a
 * dynamic `import()` inside an effect, so the subpath is SSR-safe and costs
 * nothing until mounted. If either is missing, the component renders an alert
 * naming the packages instead of throwing.
 *
 * **The theme is read, not written.** Every colour is a token's computed value
 * on `<html>`, taken when the terminal mounts and again — once per frame, however
 * many attributes changed — when `data-theme` / `data-material` change or the
 * system colour scheme flips. The ANSI palette borrows `ok` / `warn` / `danger`
 * and the series tokens.
 *
 * **It draws a solid surface** (D12) and fills its parent; the consumer gives
 * the parent a height. xterm's own stylesheet, `@xterm/xterm/css/xterm.css`, is
 * the consumer's to import.
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

const MISSING_PEERS = '@xterm/xterm and @xterm/addon-fit';

function token(style: CSSStyleDeclaration, name: string): string {
  return style.getPropertyValue(name).trim();
}

/** The xterm theme, from the tokens' computed values on `<html>`. */
function buildTheme(readOnly: boolean): ITheme {
  const style = getComputedStyle(document.documentElement);
  const t = (name: string) => token(style, name);
  const ground = t('--color-ground');
  const ink = t('--color-ink');
  const ink2 = t('--color-ink-2');
  const ink3 = t('--color-ink-3');
  const ok = t('--color-ok');
  const warn = t('--color-warn');
  const danger = t('--color-danger');
  const blue = t('--color-series-1');
  const magenta = t('--color-series-4');
  const cyan = t('--color-series-3');
  return {
    background: ground,
    foreground: ink,
    // A read-only terminal has no caret: it is painted in the ground colour.
    cursor: readOnly ? ground : t('--color-accent') || ink,
    cursorAccent: ground,
    selectionBackground: ink3,
    black: ground,
    red: danger,
    green: ok,
    yellow: warn,
    blue,
    magenta,
    cyan,
    white: ink2,
    brightBlack: ink3,
    brightRed: danger,
    brightGreen: ok,
    brightYellow: warn,
    brightBlue: blue,
    brightMagenta: magenta,
    brightCyan: cyan,
    brightWhite: ink,
  };
}

export function Terminal({
  ref,
  'aria-label': ariaLabel,
  readOnly = false,
  onData,
  onResize,
  fontSize = 13,
  scrollback = 5000,
  screenReaderMode = false,
  captureEscape = false,
  className,
}: TerminalProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<XTerm | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  // Writes made before xterm has loaded are replayed in order once it has.
  const queueRef = useRef<Array<(term: XTerm) => void>>([]);
  const [failed, setFailed] = useState(false);

  // Latest props for callbacks that outlive a render.
  const live = useRef({ readOnly, onData, onResize, captureEscape });
  live.current = { readOnly, onData, onResize, captureEscape };

  const run = (action: (term: XTerm) => void) => {
    const term = termRef.current;
    if (term) action(term);
    else queueRef.current.push(action);
  };

  useImperativeHandle(ref, () => ({
    write: (data) => run((t) => t.write(data)),
    writeln: (data) => run((t) => t.writeln(data)),
    clear: () => run((t) => t.clear()),
    focus: () => run((t) => t.focus()),
    fit: () => fitRef.current?.fit(),
  }));

  // Mount: load xterm, open it, wire it. Prop changes are handled below, so
  // this runs once.
  // biome-ignore lint/correctness/useExhaustiveDependencies: props are read through `live` and the sync effect
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    const cleanups: Array<() => void> = [];

    (async () => {
      let xterm: Awaited<ReturnType<typeof loadTerminalPeers>>[0];
      let fitMod: Awaited<ReturnType<typeof loadTerminalPeers>>[1];
      try {
        [xterm, fitMod] = await loadTerminalPeers();
      } catch {
        if (!disposed) setFailed(true);
        return;
      }
      if (disposed) return;

      const term = new xterm.Terminal({
        fontSize,
        scrollback,
        screenReaderMode,
        disableStdin: readOnly,
        cursorBlink: !readOnly,
        cursorInactiveStyle: 'none',
        theme: buildTheme(readOnly),
        fontFamily: getComputedStyle(document.documentElement).getPropertyValue('--font-mono').trim() || 'monospace',
      });
      const fit = new fitMod.FitAddon();
      term.loadAddon(fit);
      term.open(host);
      termRef.current = term;
      fitRef.current = fit;

      term.attachCustomKeyEventHandler((event) => {
        if (event.key === 'Escape' && !live.current.captureEscape) {
          if (event.type === 'keydown') term.blur();
          return false;
        }
        return true;
      });

      const dataSub = term.onData((data) => {
        if (!live.current.readOnly) live.current.onData?.(data);
      });

      let last: TerminalSize | null = null;
      const refit = () => {
        fit.fit();
        const { cols, rows } = term;
        if (last && last.cols === cols && last.rows === rows) return;
        last = { cols, rows };
        live.current.onResize?.({ cols, rows });
      };
      refit();
      const resizeObserver = new ResizeObserver(refit);
      resizeObserver.observe(host);

      // One theme rebuild per frame, however many mutations arrive.
      let frame = 0;
      const retheme = () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          term.options.theme = buildTheme(live.current.readOnly);
        });
      };
      const mutationObserver = new MutationObserver(retheme);
      mutationObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme', 'data-material'],
      });
      const scheme = window.matchMedia?.('(prefers-color-scheme: light)');
      scheme?.addEventListener?.('change', retheme);

      cleanups.push(() => {
        cancelAnimationFrame(frame);
        mutationObserver.disconnect();
        resizeObserver.disconnect();
        scheme?.removeEventListener?.('change', retheme);
        dataSub.dispose();
        term.dispose();
        termRef.current = null;
        fitRef.current = null;
      });

      const pending = queueRef.current;
      queueRef.current = [];
      for (const action of pending) action(term);
    })();

    return () => {
      disposed = true;
      for (const cleanup of cleanups) cleanup();
    };
  }, []);

  // Props that change after mount.
  useEffect(() => {
    const term = termRef.current;
    if (!term) return;
    term.options.disableStdin = readOnly;
    term.options.cursorBlink = !readOnly;
    term.options.theme = buildTheme(readOnly);
  }, [readOnly]);

  useEffect(() => {
    const term = termRef.current;
    if (!term) return;
    term.options.fontSize = fontSize;
    term.options.scrollback = scrollback;
    term.options.screenReaderMode = screenReaderMode;
    fitRef.current?.fit();
  }, [fontSize, scrollback, screenReaderMode]);

  if (failed) {
    return (
      <div
        role="alert"
        className={cn(
          'flex h-full w-full items-center justify-center rounded-(--radius-surface) bg-ground p-4 text-center text-sm text-danger',
          className,
        )}
      >
        Terminal needs {MISSING_PEERS}. Install them to use this component.
      </div>
    );
  }

  return (
    <section
      ref={hostRef}
      aria-label={ariaLabel}
      className={cn(
        'h-full w-full overflow-hidden rounded-(--radius-surface) bg-ground p-2',
        'focus-within:outline-3 focus-within:outline-focus focus-within:-outline-offset-3',
        className,
      )}
    />
  );
}
