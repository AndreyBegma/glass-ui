import { describe, expect, test } from 'bun:test';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from './hover-card';

function Card({ openDelay = 20, closeDelay = 20 }) {
  return (
    <HoverCard openDelay={openDelay} closeDelay={closeDelay}>
      <HoverCardTrigger asChild>
        <a href="/users/ada">Ada</a>
      </HoverCardTrigger>
      <HoverCardContent className="extra">Ada Lovelace</HoverCardContent>
    </HoverCard>
  );
}

const wait = (ms: number) =>
  act(() => new Promise<void>((r) => setTimeout(r, ms)));

describe('HoverCard', () => {
  test('renders its trigger and keeps the card closed', () => {
    render(<Card />);
    expect(screen.getByText('Ada')).toBeTruthy();
    expect(screen.queryByText('Ada Lovelace')).toBeNull();
  });

  test('opens only after the delay on hover', async () => {
    render(<Card openDelay={60} />);
    fireEvent.pointerEnter(screen.getByText('Ada'), { pointerType: 'mouse' });
    expect(screen.queryByText('Ada Lovelace')).toBeNull();
    await wait(120);
    expect(screen.getByText('Ada Lovelace')).toBeTruthy();
  });

  test('opens on keyboard focus', async () => {
    render(<Card />);
    fireEvent.focus(screen.getByText('Ada'));
    await wait(60);
    expect(screen.getByText('Ada Lovelace')).toBeTruthy();
  });

  test('closes when the pointer leaves', async () => {
    render(<Card />);
    const link = screen.getByText('Ada');
    fireEvent.pointerEnter(link, { pointerType: 'mouse' });
    await wait(60);
    expect(screen.getByText('Ada Lovelace')).toBeTruthy();
    fireEvent.pointerLeave(link, { pointerType: 'mouse' });
    await wait(60);
    expect(screen.queryByText('Ada Lovelace')).toBeNull();
  });

  test('closes on Escape', async () => {
    render(<Card />);
    fireEvent.focus(screen.getByText('Ada'));
    await wait(60);
    const card = screen.getByText('Ada Lovelace');
    fireEvent.keyDown(card, { key: 'Escape' });
    await wait(10);
    expect(screen.queryByText('Ada Lovelace')).toBeNull();
  });

  test('does not open on a touch pointer', async () => {
    render(<Card />);
    fireEvent.pointerEnter(screen.getByText('Ada'), { pointerType: 'touch' });
    await wait(60);
    expect(screen.queryByText('Ada Lovelace')).toBeNull();
  });

  test('content carries the glass surface contract and merges className', async () => {
    render(<Card />);
    fireEvent.focus(screen.getByText('Ada'));
    await wait(60);
    const cls = screen.getByText('Ada Lovelace').className;
    for (const c of ['glass-strong', 'z-overlay', 'rounded-surface', 'extra']) {
      expect(cls).toContain(c);
    }
    expect(cls).toContain('motion-safe:data-[state=open]:animate-');
  });
});
