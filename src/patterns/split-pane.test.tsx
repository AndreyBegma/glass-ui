import { describe, test } from 'bun:test';

describe('SplitPane', () => {
  test.todo('the separator has role="separator", aria-orientation and aria-valuenow / min / max');
  test.todo('arrow keys change the size by 16 px within min / max');
  test.todo('Home / End jump to min / max');
  test.todo('the size persists under storageKey and is restored after remount');
  test.todo('the first render matches the server render (no storage read before mount)');
  test.todo('double-click on the separator resets to defaultSize');
  test.todo('pointer drag with pointer capture resizes the first pane');
  test.todo('storage writes are debounced at 150 ms');
  test.todo('collapsedFirst hides the first pane');
  test.todo('the separator hit area is at least 44px on a coarse pointer');
  test.todo('renders under data-theme light, dark and data-material flat');
});
