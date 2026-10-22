import { describe, expect, test } from 'bun:test';
import { render } from '@testing-library/react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from './hover-card';

describe('HoverCard', () => {
  test('renders its trigger', () => {
    const { container } = render(
      <HoverCard>
        <HoverCardTrigger asChild>
          <button type="button">who</button>
        </HoverCardTrigger>
        <HoverCardContent>card</HoverCardContent>
      </HoverCard>,
    );
    expect(container.textContent).toContain('who');
  });

  test.todo('opens after the delay on hover and on focus');
  test.todo('closes on leave and on Escape');
  test.todo('content styling class contract');
});
