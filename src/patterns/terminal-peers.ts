/**
 * #74 — the one place Terminal reaches for its optional peers.
 *
 * Dynamic `import()`, called from an effect and never at module top level, so
 * the subpath is SSR-safe and costs nothing until a terminal mounts. Kept in its
 * own file so a test can make it reject: a mocked module cannot, because a
 * missing package is a resolution failure and not a thrown error.
 */
export function loadTerminalPeers() {
  return Promise.all([import('@xterm/xterm'), import('@xterm/addon-fit')]);
}
