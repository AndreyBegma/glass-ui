import { describe, expect, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { Tooltip } from './tooltip';

describe('Tooltip', () => {
  test('is text-only content, shown when open', () => {
    render(
      <Tooltip content="Collapse" defaultOpen>
        <button type="button">R</button>
      </Tooltip>,
    );
    const tip = screen.getByRole('tooltip');
    expect(tip.textContent).toBe('Collapse');
  });

  test('renders only the trigger when closed', () => {
    render(
      <Tooltip content="Collapse">
        <button type="button">R</button>
      </Tooltip>,
    );
    expect(screen.queryByRole('tooltip')).toBeNull();
    expect(screen.getByRole('button', { name: 'R' })).not.toBeNull();
  });
});
