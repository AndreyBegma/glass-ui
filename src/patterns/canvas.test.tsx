import { describe, expect, test } from 'bun:test';
import { render } from '@testing-library/react';
import { Canvas } from './canvas';

describe('Canvas', () => {
  test('draws the `.canvas` layer, hidden from the accessibility tree', () => {
    const { container } = render(<Canvas />);
    const layer = container.firstElementChild as HTMLElement;
    expect(layer.className).toBe('canvas');
    expect(layer.getAttribute('aria-hidden')).toBe('true');
    expect(layer.childElementCount).toBe(0);
  });

  test('takes a class beside its own', () => {
    const { container } = render(<Canvas className="opacity-50" />);
    expect((container.firstElementChild as HTMLElement).className).toBe('canvas opacity-50');
  });
});
