import { describe, test } from 'bun:test';

describe('Banner', () => {
  test.todo('warn and danger have role="alert"; info and ok have role="status"');
  test.todo('dismiss button is named "Dismiss" and calls onDismiss');
  test.todo('dismiss has a 44px hit area on a coarse pointer');
  test.todo('tone uses token classes only');
  test.todo('icon={false} hides the icon; a custom icon replaces the default');
  test.todo('is a solid surface, never glass');
  test.todo('renders under data-theme light, dark and data-material flat');
});
