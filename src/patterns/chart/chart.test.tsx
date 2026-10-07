import { describe, test } from 'bun:test';

// #74 — one todo per acceptance bullet. i74-chart turns each into a test.
describe('Chart', () => {
  test.todo('three series (area, line, bar) over 7 days render the right number of paths and bars');
  test.todo('stacked areas sum correctly at each x (pure-function tests on the path builder)');
  test.todo('a null y makes a gap in a line and an area, and no bar');
  test.todo('50 000 points down-sample to at most 2 x width points and the caption says so');
  test.todo('the hidden table has one row per x and one column per series');
  test.todo('arrow keys move the focused x and announce it in a polite live region');
  test.todo('renders in light and dark and data-material flat (class and variable assertions)');
  test.todo('uses series tokens only; no raw colour');
  test.todo('the show-table toggle is at least 44px on a coarse pointer');
});
