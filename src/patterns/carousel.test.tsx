import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { Carousel, CarouselSlide } from './carousel';

// A function, not a component: the carousel counts its direct children.
const slides = (n = 4) =>
  Array.from({ length: n }, (_, i) => (
    // biome-ignore lint/suspicious/noArrayIndexKey: fixed list.
    <CarouselSlide key={i}>slide {i + 1}</CarouselSlide>
  ));

function mockMatchMedia(matching: string) {
  const original = window.matchMedia;
  window.matchMedia = ((query: string) => ({
    matches: query === matching,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
  return () => {
    window.matchMedia = original;
  };
}

const viewport = (c: HTMLElement) =>
  c.querySelector('[data-carousel-viewport]') as HTMLElement;
const dots = () =>
  screen.getAllByRole('button', { name: /^Go to slide/ });

let scrollTo: ReturnType<typeof mock>;
const proto = HTMLElement.prototype as unknown as {
  scrollTo?: unknown;
};
let originalScrollTo: unknown;

beforeEach(() => {
  originalScrollTo = proto.scrollTo;
  scrollTo = mock(() => {});
  proto.scrollTo = scrollTo;
});

afterEach(() => {
  proto.scrollTo = originalScrollTo;
});

describe('Carousel', () => {
  test('renders its slides in a named region', () => {
    const { container } = render(
      <Carousel label="Highlights">
        <CarouselSlide>one</CarouselSlide>
        <CarouselSlide>two</CarouselSlide>
      </Carousel>,
    );
    expect(
      container
        .querySelector('[aria-roledescription="carousel"]')
        ?.getAttribute('aria-label'),
    ).toBe('Highlights');
    expect(
      container.querySelectorAll('[aria-roledescription="slide"]').length,
    ).toBe(2);
  });

  test('navigation buttons and dots', () => {
    const onIndexChange = mock((_: number) => {});
    render(
      <Carousel label="Gallery" onIndexChange={onIndexChange}>
        {slides()}
      </Carousel>,
    );
    const prev = screen.getByRole('button', { name: 'Previous slide' });
    const next = screen.getByRole('button', { name: 'Next slide' });
    expect((prev as HTMLButtonElement).disabled).toBe(true);
    expect(dots()).toHaveLength(4);
    expect(dots()[0]?.getAttribute('aria-current')).toBe('true');

    fireEvent.click(next);
    expect(onIndexChange).toHaveBeenLastCalledWith(1);
    expect(dots()[1]?.getAttribute('aria-current')).toBe('true');
    expect(scrollTo).toHaveBeenCalled();

    fireEvent.click(dots()[3] as HTMLElement);
    expect(onIndexChange).toHaveBeenLastCalledWith(3);
    expect((next as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(prev);
    expect(onIndexChange).toHaveBeenLastCalledWith(2);
  });

  test('loop wraps at both ends', () => {
    render(
      <Carousel label="Gallery" loop>
        {slides(3)}
      </Carousel>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Previous slide' }));
    expect(dots()[2]?.getAttribute('aria-current')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Next slide' }));
    expect(dots()[0]?.getAttribute('aria-current')).toBe('true');
  });

  test('slidesPerView reduces the resting positions', () => {
    render(
      <Carousel label="Gallery" slidesPerView={2}>
        {slides(5)}
      </Carousel>,
    );
    expect(dots()).toHaveLength(4);
  });

  test('controlled index', () => {
    function Harness() {
      const [index, setIndex] = useState(2);
      return (
        <>
          <button type="button" onClick={() => setIndex(0)}>
            reset
          </button>
          <Carousel label="Gallery" index={index} onIndexChange={setIndex}>
            {slides()}
          </Carousel>
        </>
      );
    }
    render(<Harness />);
    expect(dots()[2]?.getAttribute('aria-current')).toBe('true');
    scrollTo.mockClear();

    fireEvent.click(screen.getByRole('button', { name: 'reset' }));
    expect(dots()[0]?.getAttribute('aria-current')).toBe('true');
    expect(scrollTo).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Next slide' }));
    expect(dots()[1]?.getAttribute('aria-current')).toBe('true');
  });

  test('a controlled index is not moved by the component alone', () => {
    render(
      <Carousel label="Gallery" index={1} onIndexChange={() => {}}>
        {slides()}
      </Carousel>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Next slide' }));
    expect(dots()[1]?.getAttribute('aria-current')).toBe('true');
  });

  test('the index follows the scroll position', () => {
    const entries: IntersectionObserverCallback[] = [];
    const original = globalThis.IntersectionObserver;
    globalThis.IntersectionObserver = class {
      constructor(cb: IntersectionObserverCallback) {
        entries.push(cb);
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof IntersectionObserver;
    try {
      const { container } = render(
        <Carousel label="Gallery">
          {slides()}
        </Carousel>,
      );
      const found = container.querySelectorAll('[aria-roledescription="slide"]');
      act(() => {
        entries[0]?.(
          [
            { target: found[0], intersectionRatio: 0.1 },
            { target: found[1], intersectionRatio: 0.9 },
          ] as unknown as IntersectionObserverEntry[],
          {} as IntersectionObserver,
        );
      });
      expect(dots()[1]?.getAttribute('aria-current')).toBe('true');
    } finally {
      globalThis.IntersectionObserver = original;
    }
  });

  test('slide labels', () => {
    const { container } = render(
      <Carousel label="Gallery">
        {slides(3)}
      </Carousel>,
    );
    const found = container.querySelectorAll('[aria-roledescription="slide"]');
    expect(found[2]?.getAttribute('aria-label')).toBe('3 of 3');
    expect(found[0]?.getAttribute('role')).toBe('group');
  });

  test('labels override every string', () => {
    const { container } = render(
      <Carousel
        label="Galerie"
        autoplay={1000}
        labels={{
          previous: 'Zurück',
          next: 'Weiter',
          goTo: (n) => `Folie ${n}`,
          pause: 'Anhalten',
          slide: (n, t) => `${n} von ${t}`,
        }}
      >
        {slides(2)}
      </Carousel>,
    );
    expect(screen.getByRole('button', { name: 'Zurück' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Weiter' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Folie 2' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Anhalten' })).toBeTruthy();
    expect(
      container
        .querySelectorAll('[aria-roledescription="slide"]')[1]
        ?.getAttribute('aria-label'),
    ).toBe('2 von 2');
  });
});

describe('Carousel autoplay', () => {
  const tick = (ms: number) => act(() => new Promise((r) => setTimeout(r, ms)));
  const current = () =>
    dots().findIndex((d) => d.getAttribute('aria-current') === 'true');

  test('is off by default and draws no pause button', async () => {
    render(
      <Carousel label="Gallery">
        {slides()}
      </Carousel>,
    );
    await tick(60);
    expect(current()).toBe(0);
    expect(screen.queryByRole('button', { name: 'Pause autoplay' })).toBeNull();
  });

  test('advances, and the pause button stops it', async () => {
    render(
      <Carousel label="Gallery" autoplay={20}>
        {slides()}
      </Carousel>,
    );
    await tick(50);
    expect(current()).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Pause autoplay' }));
    const at = current();
    await tick(80);
    expect(current()).toBe(at);
    expect(screen.getByRole('button', { name: 'Start autoplay' })).toBeTruthy();
  });

  test('pauses while focus is within and resumes after', async () => {
    const { container } = render(
      <Carousel label="Gallery" autoplay={20}>
        {slides()}
      </Carousel>,
    );
    const region = container.querySelector('section') as HTMLElement;
    const next = screen.getByRole('button', { name: 'Next slide' });
    act(() => next.focus());
    await tick(5);
    const at = current();
    await tick(80);
    expect(current()).toBe(at);

    fireEvent.blur(next, { relatedTarget: document.body });
    expect(region.contains(document.body)).toBe(false);
    await tick(50);
    expect(current()).not.toBe(at);
  });

  test('pauses while the pointer is over it', async () => {
    const { container } = render(
      <Carousel label="Gallery" autoplay={20}>
        {slides()}
      </Carousel>,
    );
    fireEvent.mouseEnter(container.querySelector('section') as HTMLElement);
    await tick(80);
    expect(current()).toBe(0);
  });

  test('never runs under reduced motion', async () => {
    const restore = mockMatchMedia('(prefers-reduced-motion: reduce)');
    try {
      render(
        <Carousel label="Gallery" autoplay={20}>
          {slides()}
        </Carousel>,
      );
      await tick(80);
      expect(current()).toBe(0);
      expect(screen.queryByRole('button', { name: 'Pause autoplay' })).toBeNull();
    } finally {
      restore();
    }
  });

  test('scrolls instantly under reduced motion', () => {
    const restore = mockMatchMedia('(prefers-reduced-motion: reduce)');
    try {
      const { container } = render(
        <Carousel label="Gallery">
          {slides()}
        </Carousel>,
      );
      fireEvent.click(screen.getByRole('button', { name: 'Next slide' }));
      expect(viewport(container)).toBeTruthy();
      expect(scrollTo.mock.calls.at(-1)?.[0]).toMatchObject({ behavior: 'auto' });
    } finally {
      restore();
    }
  });
});
