import { describe, test } from 'bun:test';

describe('LogViewer', () => {
  test.todo('has role="log" with aria-live="off", labelled by label');
  test.todo('renders "\\x1b[31merror\\x1b[0m ok" with "error" in the danger token class and "ok" plain');
  test.todo('256-colour and truecolour sequences render default ink');
  test.todo('other escape sequences are stripped');
  test.todo('with 50 000 lines and wrap off, fewer than 200 line nodes are in the DOM');
  test.todo('appending lines while following keeps the last line visible');
  test.todo('after scrolling up, appending shows the "N new lines" pill and does not move the viewport');
  test.todo('Jump to latest resumes following');
  test.todo('search highlights matches and Enter moves to the next');
  test.todo('copy writes ANSI-stripped text (mocked clipboard)');
  test.todo('wrap on trims to the last 5 000 lines with an "N earlier lines hidden" marker');
  test.todo('renders under data-theme light, dark and data-material flat');
  test.todo('touch targets are at least 44px on a coarse pointer');
});
