import { describe, test } from 'bun:test';

// #74 — one todo per acceptance bullet. i74-cron turns each into a test.
describe('CronInput', () => {
  test.todo('0 9 * * 1-5 shows "At 09:00 AM, Monday through Friday" (asserted loosely)');
  test.todo('lists the next 5 runs in Europe/Berlin across a DST change correctly (frozen clock)');
  test.todo('61 * * * * shows an error and calls onChange with valid: false');
  test.todo('presets set the expression');
  test.todo('choosing Custom focuses the field');
  test.todo('next runs are shown only when the expression is valid');
  test.todo('importing without the peers installed fails with a message naming them (mocked import failure)');
  test.todo('the preset select is at least 44px on a coarse pointer');
  test.todo('renders in light and dark and data-material flat');
});
