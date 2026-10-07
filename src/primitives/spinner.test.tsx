import { describe, test } from 'bun:test';

describe('Spinner', () => {
  test.todo('has role="status" and its label (default "Loading")');
  test.todo('is aria-hidden when label is null');
  test.todo('renders the static dots form under prefers-reduced-motion');
  test.todo('renders under data-theme light, dark and data-material flat');
});
