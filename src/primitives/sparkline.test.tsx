import { describe, test } from 'bun:test';

describe('Sparkline', () => {
  test.todo('[] renders a flat baseline with no NaN in the path');
  test.todo('[5] renders a flat baseline with no NaN in the path');
  test.todo('a 200-point series renders without NaN in the path');
  test.todo('label yields role="img" and aria-label; without it, aria-hidden');
  test.todo('renders under data-theme light, dark and data-material flat');
});
