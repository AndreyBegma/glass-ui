import { describe, test } from 'bun:test';

describe('Timeline', () => {
  test.todo('items on three days render three groups headed "Today", "Yesterday" and a date (frozen clock)');
  test.todo('href items are links and onSelect items are buttons');
  test.todo('"Load more" calls onLoadMore and is disabled while loadingMore');
  test.todo('newCount shows the "N new" pill and calls onShowNew');
  test.todo('tone shows as a dot plus the icon, never colour alone');
  test.todo('formatTime formats each item time; the default is HH:mm');
  test.todo('renders the empty slot when there are no items');
  test.todo('items are solid surfaces, never glass');
  test.todo('renders under data-theme light, dark and data-material flat');
  test.todo('touch targets are at least 44px on a coarse pointer');
});
