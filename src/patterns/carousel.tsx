'use client';

import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

/**
 * v0.38.0 wave, Carousel and CarouselSlide. Scaffold stub: the final prop types
 * and placeholder regions. Navigation, dots, autoplay and slide labels are its
 * slot's.
 */
export type CarouselLabels = Record<string, string>;

export type CarouselProps = {
  /** The region's accessible name. */
  label: string;
  slidesPerView?: number | 'auto';
  gap?: number;
  loop?: boolean;
  /** Milliseconds between slides; off by default. */
  autoplay?: number;
  index?: number;
  onIndexChange?: (index: number) => void;
  labels?: Partial<CarouselLabels>;
  className?: string;
  children?: ReactNode;
};

export type CarouselSlideProps = {
  className?: string;
  children?: ReactNode;
};

export function Carousel({ label, className, children }: CarouselProps) {
  return (
    <section
      aria-roledescription="carousel"
      aria-label={label}
      className={cn(className)}
    >
      {children}
    </section>
  );
}

export function CarouselSlide({ className, children }: CarouselSlideProps) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: the APG carousel slide is role="group" with aria-roledescription="slide"; <fieldset> would add a legend contract.
    <div role="group" aria-roledescription="slide" className={cn(className)}>
      {children}
    </div>
  );
}
