import { describe, test } from 'bun:test';

// #74 — one todo per acceptance bullet. i74-terminal turns each into a test.
describe('Terminal', () => {
  test.todo('with xterm mocked, it calls open, loads the fit addon and applies a theme built from computed tokens');
  test.todo('changing data-theme re-applies the theme');
  test.todo('readOnly disables stdin');
  test.todo('onData fires on input when not read-only');
  test.todo('the handle write reaches the terminal');
  test.todo('unmount disposes the terminal and observers');
  test.todo('nothing touches window during SSR import');
  test.todo('Escape blurs unless captureEscape');
});
