import { afterEach, describe, expect, test } from 'bun:test';
import { cleanup, render } from '@testing-library/react';
import { DepthOrigin } from './depth-origin';

/**
 * BUG-20260924-698 — the page goes back around the middle of the viewport.
 *
 * `DepthOrigin` writes `--depth-origin-y` on `#main-content` when Radix's
 * scroll lock appears on `<body>`, and `base.css` reads it as the origin of
 * the scale (see `base.spec.ts` for that half). happy-dom lays nothing out,
 * so `offsetTop` is 0 and the arithmetic under test is the scroll offset plus
 * half the viewport; the geometry in a real Chromium is in the bug report.
 */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function mountPage(): HTMLElement {
  const page = document.createElement('div');
  page.id = 'main-content';
  document.body.appendChild(page);
  return page;
}

function scrollTo(y: number) {
  Object.defineProperty(window, 'scrollY', { configurable: true, value: y });
}

const origin = (page: HTMLElement) =>
  page.style.getPropertyValue('--depth-origin-y');

afterEach(() => {
  cleanup();
  document.body.removeAttribute('data-scroll-locked');
  document.getElementById('main-content')?.remove();
  scrollTo(0);
});

describe('DepthOrigin', () => {
  test('writes nothing while nothing holds the lock', async () => {
    const page = mountPage();
    render(<DepthOrigin />);
    scrollTo(1200);
    await flush();
    expect(origin(page)).toBe('');
  });

  test('when the lock appears, the origin is the middle of the viewport in page coordinates', async () => {
    const page = mountPage();
    render(<DepthOrigin />);
    scrollTo(1200);
    document.body.setAttribute('data-scroll-locked', '1');
    await flush();
    expect(origin(page)).toBe(`${1200 + window.innerHeight / 2}px`);
  });

  test('the value is kept after the lock goes, so the page comes forward around the same point', async () => {
    const page = mountPage();
    render(<DepthOrigin />);
    scrollTo(300);
    document.body.setAttribute('data-scroll-locked', '1');
    await flush();
    const open = origin(page);
    document.body.removeAttribute('data-scroll-locked');
    await flush();
    expect(origin(page)).toBe(open);
  });

  test('a lock already held when it mounts is measured at once', () => {
    const page = mountPage();
    scrollTo(500);
    document.body.setAttribute('data-scroll-locked', '1');
    render(<DepthOrigin />);
    expect(origin(page)).toBe(`${500 + window.innerHeight / 2}px`);
  });

  test('an application without `#main-content` is left alone', async () => {
    render(<DepthOrigin />);
    document.body.setAttribute('data-scroll-locked', '1');
    await flush();
    expect(document.querySelector('[style*="--depth-origin-y"]')).toBeNull();
  });

  test('it renders nothing', () => {
    const { container } = render(<DepthOrigin />);
    expect(container.innerHTML).toBe('');
  });
});
