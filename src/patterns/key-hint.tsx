'use client';

import { type ComponentProps, useSyncExternalStore } from 'react';
import { cn } from '../lib/cn';

/**
 * FEAT-20260911-002 — a shortcut, drawn as key caps.
 *
 * `⌘K` is written as text wherever it appears today, and it is written as
 * `⌘K` on every platform — which on Windows is a glyph for a key the keyboard
 * does not have. The hint has to know what machine it is on, and that is one
 * decision, taken here once, rather than in every field that shows a shortcut.
 *
 * **`Mod` is the only key that changes meaning.** It is `⌘` on Apple and `Ctrl`
 * everywhere else, and the caps run together on Apple (`⌘K`, the way the menu
 * bar writes it) and are joined with `+` elsewhere (`Ctrl+K`, the way every
 * Windows and Linux application writes it). Both are conventions the reader
 * already knows; neither is this package's invention.
 *
 * **The platform is read through `useSyncExternalStore`, not during render.**
 * A server has no `navigator`, so the server snapshot is the non-Apple
 * spelling and the client corrects it after hydration — one re-render on a
 * Mac, no hydration mismatch anywhere. The `platform` prop overrides the
 * detection and is what the test drives; a consumer that already knows the
 * platform from a request header can pass it and skip the correction.
 *
 * `--color-ink-3` weight (decision 7). A hint is the third level of text: it
 * sits beside a label and must not compete with it.
 */

/**
 * Apple's platform strings: `MacIntel`, `MacPPC`, `Macintosh`, `iPhone`,
 * `iPad`, `iPod`, and the `macOS` / `iOS` that `userAgentData.platform`
 * reports. Every one of them starts with one of these.
 */
const APPLE = /^(mac|iphone|ipad|ipod|ios)/i;

export function isApplePlatform(platform: string): boolean {
  return APPLE.test(platform.trim());
}

/**
 * `navigator.userAgentData` is the current API and is missing from Safari and
 * Firefox; `navigator.platform` is deprecated and is present everywhere. Read
 * the new one first and fall back, which is the only order that reads right on
 * every browser that exists.
 */
function detectPlatform(): string {
  if (typeof navigator === 'undefined') return '';
  const data = (navigator as Navigator & { userAgentData?: { platform?: string } })
    .userAgentData;
  return data?.platform || navigator.platform || '';
}

const subscribe = () => () => {};
const serverPlatform = () => '';

/**
 * The spellings a cap takes. Keys not in this table are drawn as written,
 * with a single letter upper-cased so `Mod+k` and `Mod+K` are the same hint.
 */
const CAPS: Record<string, { apple: string; other: string }> = {
  mod: { apple: '⌘', other: 'Ctrl' },
  cmd: { apple: '⌘', other: '⌘' },
  meta: { apple: '⌘', other: '⊞' },
  ctrl: { apple: '⌃', other: 'Ctrl' },
  control: { apple: '⌃', other: 'Ctrl' },
  shift: { apple: '⇧', other: 'Shift' },
  alt: { apple: '⌥', other: 'Alt' },
  option: { apple: '⌥', other: 'Alt' },
  enter: { apple: '↵', other: 'Enter' },
  return: { apple: '↵', other: 'Enter' },
  esc: { apple: 'Esc', other: 'Esc' },
  escape: { apple: 'Esc', other: 'Esc' },
  backspace: { apple: '⌫', other: 'Backspace' },
  delete: { apple: '⌦', other: 'Del' },
  tab: { apple: '⇥', other: 'Tab' },
  space: { apple: 'Space', other: 'Space' },
  up: { apple: '↑', other: '↑' },
  down: { apple: '↓', other: '↓' },
  left: { apple: '←', other: '←' },
  right: { apple: '→', other: '→' },
  arrowup: { apple: '↑', other: '↑' },
  arrowdown: { apple: '↓', other: '↓' },
  arrowleft: { apple: '←', other: '←' },
  arrowright: { apple: '→', other: '→' },
};

/**
 * `keys` split on `+`, each part resolved for the platform. Exported so a
 * consumer that needs the shortcut as *text* — an `aria-keyshortcuts`, a
 * tooltip — gets the same answer the caps draw.
 */
export function resolveKeys(keys: string, platform: string): string[] {
  const apple = isApplePlatform(platform);
  return keys
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const cap = CAPS[part.toLowerCase()];
      if (cap) return apple ? cap.apple : cap.other;
      return part.length === 1 ? part.toUpperCase() : part;
    });
}

export interface KeyHintProps extends Omit<ComponentProps<'kbd'>, 'className' | 'children'> {
  /** `Mod+K`, `Shift+Enter`, `Esc`. `+` separates keys. */
  keys: string;
  /** Overrides detection. `navigator.userAgentData.platform` or `navigator.platform` otherwise. */
  platform?: string;
  className?: string;
}

export function KeyHint({ keys, platform, className, ...props }: KeyHintProps) {
  const detected = useSyncExternalStore(subscribe, detectPlatform, serverPlatform);
  const resolved = platform ?? detected;
  const apple = isApplePlatform(resolved);
  const caps = resolveKeys(keys, resolved);

  return (
    <kbd
      className={cn(
        'inline-flex items-center gap-0.5 font-sans text-[11px] font-medium text-ink-3',
        className,
      )}
      {...props}
    >
      {caps.map((cap, index) => (
        // The prefix is the identity, so `Shift+Shift` is nonsense but not a crash.
        <span key={caps.slice(0, index + 1).join('+')} className="inline-flex items-center gap-0.5">
          {index > 0 && !apple ? <span aria-hidden="true">+</span> : null}
          <kbd
            className={cn(
              'inline-flex h-5 min-w-5 items-center justify-center px-1',
              'rounded-[calc(var(--radius-control)-4px)] border border-line',
              'font-sans leading-none',
            )}
          >
            {cap}
          </kbd>
        </span>
      ))}
    </kbd>
  );
}
