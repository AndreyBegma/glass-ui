import { describe, expect, test } from 'bun:test';
import { act, fireEvent, render } from '@testing-library/react';
import { ScrollHintColumn } from './scroll-hint-column';

function fades(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll('[aria-hidden="true"]'));
}

describe('ScrollHintColumn', () => {
  test('draws the scroll box with the caller’s class and two fades that take no taps', () => {
    const { container } = render(
      <ScrollHintColumn className="max-h-64 overflow-y-auto" data-testid="box">
        <p>content</p>
      </ScrollHintColumn>,
    );
    const box = container.querySelector('[data-testid="box"]');
    expect(box?.className).toBe('max-h-64 overflow-y-auto');

    const [top, bottom] = fades(container);
    expect(top?.className).toContain('pointer-events-none');
    expect(top?.className).toContain('top-0');
    expect(top?.className).toContain('bg-gradient-to-b');
    expect(bottom?.className).toContain('pointer-events-none');
    expect(bottom?.className).toContain('bottom-0');
    expect(bottom?.className).toContain('bg-gradient-to-t');
  });

  test('both fades are mounted and invisible while the content fits', () => {
    const { container } = render(
      <ScrollHintColumn>
        <p>content</p>
      </ScrollHintColumn>,
    );
    for (const fade of fades(container))
      expect(fade.className).toContain('opacity-0');
  });

  test('the bottom fade shows while there is more below, the top one once scrolled', () => {
    const { container } = render(
      <ScrollHintColumn data-testid="box">
        <p>content</p>
      </ScrollHintColumn>,
    );
    const box = container.querySelector('[data-testid="box"]') as HTMLElement;
    Object.defineProperty(box, 'scrollHeight', {
      configurable: true,
      value: 900,
    });
    Object.defineProperty(box, 'clientHeight', {
      configurable: true,
      value: 300,
    });
    box.scrollTop = 0;

    act(() => {
      fireEvent.scroll(box);
    });
    let [top, bottom] = fades(container);
    expect(top?.className).toContain('opacity-0');
    expect(bottom?.className).toContain('opacity-100');

    box.scrollTop = 600;
    act(() => {
      fireEvent.scroll(box);
    });
    [top, bottom] = fades(container);
    expect(top?.className).toContain('opacity-100');
    expect(bottom?.className).toContain('opacity-0');
  });

  test('the fade colour is the token the caller names, on both edges', () => {
    const { container } = render(
      <ScrollHintColumn
        edgeClassName="from-surface"
        wrapperClassName="rounded-surface"
      >
        <p>content</p>
      </ScrollHintColumn>,
    );
    for (const fade of fades(container))
      expect(fade.className).toContain('from-surface');
    expect(container.firstElementChild?.className).toBe(
      'relative rounded-surface',
    );
  });
});
