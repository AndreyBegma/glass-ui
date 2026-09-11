import { describe, expect, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { isApplePlatform, KeyHint, resolveKeys } from './key-hint';

describe('KeyHint', () => {
  /**
   * The one decision the component makes. Both spellings are driven through
   * the `platform` prop, which is the same string the detection would have
   * produced — `MacIntel` is what Safari and Chrome on a Mac report, `Win32`
   * is Windows, `Linux x86_64` is Linux.
   */
  test('`Mod+K` is ⌘K on a Mac platform string', () => {
    render(<KeyHint keys="Mod+K" platform="MacIntel" />);
    expect(screen.getByText('⌘')).toBeDefined();
    expect(screen.getByText('K')).toBeDefined();
    expect(document.querySelector('kbd')?.textContent).toBe('⌘K');
  });

  test('`Mod+K` is Ctrl+K elsewhere', () => {
    const { unmount } = render(<KeyHint keys="Mod+K" platform="Win32" />);
    expect(document.querySelector('kbd')?.textContent).toBe('Ctrl+K');
    unmount();

    render(<KeyHint keys="Mod+K" platform="Linux x86_64" />);
    expect(document.querySelector('kbd')?.textContent).toBe('Ctrl+K');
  });

  test('every key is its own cap; the joiner is not one', () => {
    render(<KeyHint keys="Mod+Shift+P" platform="Win32" />);
    const caps = document.querySelectorAll('kbd kbd');
    expect([...caps].map((cap) => cap.textContent)).toEqual(['Ctrl', 'Shift', 'P']);
    // The `+` is for the eye; a reader hears the three keys.
    for (const joiner of document.querySelectorAll('[aria-hidden="true"]')) {
      expect(joiner.textContent).toBe('+');
    }
    expect(document.querySelectorAll('[aria-hidden="true"]')).toHaveLength(2);
  });

  test('on Apple the modifiers are glyphs and nothing joins them', () => {
    render(<KeyHint keys="Mod+Shift+P" platform="MacIntel" />);
    expect(document.querySelector('kbd')?.textContent).toBe('⌘⇧P');
    expect(document.querySelectorAll('[aria-hidden="true"]')).toHaveLength(0);
  });

  test('a single letter is upper-cased, a word is left alone', () => {
    expect(resolveKeys('Mod+k', 'Win32')).toEqual(['Ctrl', 'K']);
    expect(resolveKeys('F5', 'Win32')).toEqual(['F5']);
    expect(resolveKeys('Esc', 'MacIntel')).toEqual(['Esc']);
    expect(resolveKeys('Enter', 'MacIntel')).toEqual(['↵']);
    expect(resolveKeys('Enter', 'Win32')).toEqual(['Enter']);
  });

  test('the Apple test covers the strings browsers actually report', () => {
    for (const platform of ['MacIntel', 'macOS', 'iPhone', 'iPad', 'Macintosh']) {
      expect(isApplePlatform(platform)).toBe(true);
    }
    for (const platform of ['Win32', 'Windows', 'Linux x86_64', 'Android', '']) {
      expect(isApplePlatform(platform)).toBe(false);
    }
  });

  test('with no `platform` it reads the browser, and happy-dom is not a Mac', () => {
    render(<KeyHint keys="Mod+K" />);
    // happy-dom reports a Linux-shaped `navigator.platform`; the point is that
    // the component rendered *something* from detection rather than throwing
    // on a missing `userAgentData`.
    expect(document.querySelector('kbd')?.textContent).toMatch(/^(Ctrl\+K|⌘K)$/);
  });

  test('it is third-level ink and it is a `kbd`', () => {
    render(<KeyHint keys="Mod+K" platform="MacIntel" />);
    const hint = document.querySelector('kbd');
    expect(hint?.className.split(' ')).toContain('text-ink-3');
  });
});
