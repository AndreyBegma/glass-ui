import { describe, expect, test } from 'bun:test';
import { render } from '@testing-library/react';
import { Carousel, CarouselSlide } from './carousel';

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
    ).toBe(
      'Highlights',
    );
    expect(
      container.querySelectorAll('[aria-roledescription="slide"]').length,
    ).toBe(2);
  });

  test.todo('navigation buttons and dots');
  test.todo('controlled index');
  test.todo('autoplay pauses on focus and under reduced motion');
  test.todo('slide labels');
});
