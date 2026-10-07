import { describe, test } from 'bun:test';

describe('DataTable', () => {
  test.todo('clicking a sortable header calls onSortChange asc → desc → null and sets aria-sort');
  test.todo('header checkbox is indeterminate for partial selection');
  test.todo('Shift+click selects a range');
  test.todo('Space toggles the focused row\'s checkbox');
  test.todo('hidden columns disappear from header and cells');
  test.todo('non-hideable columns are not listed in the Columns menu');
  test.todo('loading shows skeleton rows; empty shows emptyState');
  test.todo('rows are focusable only when onRowActivate is set; Enter and click activate');
  test.todo('10 000 rows with virtualize keep fewer than 100 tr in the DOM');
  test.todo('scrolling renders the right aria-rowindex');
  test.todo('renders under data-theme light, dark and data-material flat');
  test.todo('touch targets are at least 44px on a coarse pointer');
});

describe('sortRows', () => {
  test.todo('sorts numbers, strings and nulls deterministically');
});
