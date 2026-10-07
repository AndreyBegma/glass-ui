import { describe, test } from 'bun:test';

describe('TraceTree', () => {
  test.todo('arrows move and expand, Home/End jump, Enter activates, one tab stop');
  test.todo('bars are positioned proportionally to start/end (computed style)');
  test.todo('expanding calls onExpandedChange and renders nothing it did not receive');
  test.todo('running nodes extend to the root\'s end');
  test.todo('renders 500 visible rows');
  test.todo('renders under data-theme light, dark and data-material flat');
  test.todo('touch targets are at least 44px on a coarse pointer');
});
