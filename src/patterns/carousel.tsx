'use client';

import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import {
  Children,
  createContext,
  type CSSProperties,
  type FocusEvent,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { cn } from '../lib/cn';
import { Button } from '../primitives/button';

/**
 * #188 — a row of slides that scrolls on its own and is steered by buttons.
 *
 * **The scroll is the browser's.** The slides sit in an `overflow-x` row with
 * CSS scroll-snap, so touch, trackpad and the wheel work with no script. The
 * buttons and dots only call `scrollTo`; the index then follows wherever the
 * row actually rests (an `IntersectionObserver` on the slides), so a swipe
 * moves the dots and a dot moves the row, and neither is the source of truth.
 *
 * **The index is a fact about the data**, so it is controlled: `index` +
 * `onIndexChange`, or neither and it keeps its own. A change to `index` scrolls
 * the row there. While a programmatic scroll is still on its way the observer
 * stays quiet, so a smooth scroll across three slides reports one change, not
 * three.
 *
 * **Autoplay is off unless asked for, and it gives way.** It stops while the
 * pointer is over the carousel, while focus is inside it, and while the page
 * is hidden; the pause button stops it for good until pressed again; and under
 * `prefers-reduced-motion` it never runs at all, and no pause button is drawn
 * for something that cannot move. The slide row is `aria-live="off"` while
 * playing and `polite` otherwise, as the APG carousel asks.
 *
 * **Shape follows the APG carousel.** A region with
 * `aria-roledescription="carousel"`; every slide a `role="group"` with
 * `aria-roledescription="slide"` named "3 of 7". The current dot is wider as
 * well as filled: colour is not the only signal. With `loop`, next on the last
 * slide goes to the first; without it the button is disabled at the end.
 *
 * Every string it writes itself is in `labels`.
 */
export interface CarouselLabels {
  /** Default "Previous slide". */
  previous: string;
  /** Default "Next slide". */
  next: string;
  /** The dot for slide `n` (1-based). Default "Go to slide n". */
  goTo: (slide: number) => string;
  /** The dots' group name. Default "Choose a slide". */
  dots: string;
  /** Default "Pause autoplay". */
  pause: string;
  /** Default "Start autoplay". */
  play: string;
  /** A slide's name, 1-based. Default "n of total". */
  slide: (slide: number, total: number) => string;
}

const DEFAULT_LABELS: CarouselLabels = {
  previous: 'Previous slide',
  next: 'Next slide',
  goTo: (slide) => `Go to slide ${slide}`,
  dots: 'Choose a slide',
  pause: 'Pause autoplay',
  play: 'Start autoplay',
  slide: (slide, total) => `${slide} of ${total}`,
};

export type CarouselProps = {
  /** The region's accessible name. */
  label: string;
  /** How many slides share the row; `'auto'` leaves each at its own width. */
  slidesPerView?: number | 'auto';
  /** Between slides, in px. Default 16. */
  gap?: number;
  /** Next on the last slide goes to the first, and back. Default off. */
  loop?: boolean;
  /** Milliseconds between slides; off by default. */
  autoplay?: number;
  /** Controlled first visible slide, 0-based. */
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

type SlideInfo = { index: number; total: number; label: string };

const SlideContext = createContext<SlideInfo | null>(null);

const REDUCED = '(prefers-reduced-motion: reduce)';

function subscribeReduced(onChange: () => void) {
  if (typeof window.matchMedia !== 'function') return () => {};
  const query = window.matchMedia(REDUCED);
  query.addEventListener?.('change', onChange);
  return () => query.removeEventListener?.('change', onChange);
}

function readReduced() {
  return typeof window.matchMedia === 'function'
    ? window.matchMedia(REDUCED).matches
    : false;
}

function useReduced() {
  return useSyncExternalStore(subscribeReduced, readReduced, () => false);
}

function useHidden() {
  return useSyncExternalStore(
    (onChange) => {
      document.addEventListener('visibilitychange', onChange);
      return () => document.removeEventListener('visibilitychange', onChange);
    },
    () => document.hidden,
    () => false,
  );
}

/** A slide this far into the row (0..1) counts as "the one in view". */
const SEEN = 0.5;
/** A programmatic scroll that never reports back stops being waited for. */
const SETTLE_MS = 800;

export function Carousel({
  label,
  slidesPerView = 1,
  gap = 16,
  loop = false,
  autoplay,
  index: indexProp,
  onIndexChange,
  labels: labelsProp,
  className,
  children,
}: CarouselProps) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp };
  const slides = Children.toArray(children);
  const total = slides.length;
  const perView = slidesPerView === 'auto' ? 1 : Math.max(1, slidesPerView);
  // Positions the row can rest at: with three in view, ten slides rest at eight.
  const positions = Math.max(1, total - perView + 1);

  const controlled = indexProp !== undefined;
  const [inner, setInner] = useState(0);
  const current = Math.min(Math.max(controlled ? indexProp : inner, 0), positions - 1);

  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef(current);
  currentRef.current = current;
  const onChangeRef = useRef(onIndexChange);
  onChangeRef.current = onIndexChange;
  // The index the row was last sent to or seen at; a prop that differs from it
  // is a request to scroll.
  const settledRef = useRef(current);
  const pendingRef = useRef<number | null>(null);
  const pendingTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const mountedRef = useRef(false);

  const reduced = useReduced();
  const hidden = useHidden();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [userPaused, setUserPaused] = useState(false);

  const commit = useCallback(
    (next: number) => {
      if (next === currentRef.current) return;
      currentRef.current = next;
      setInner(next);
      onChangeRef.current?.(next);
    },
    [],
  );

  const scrollToIndex = useCallback(
    (next: number, instant = false) => {
      const viewport = viewportRef.current;
      const slide = trackRef.current?.children[next] as HTMLElement | undefined;
      if (!viewport || !slide) return;
      pendingRef.current = next;
      clearTimeout(pendingTimer.current);
      pendingTimer.current = setTimeout(() => {
        pendingRef.current = null;
      }, SETTLE_MS);
      const options: ScrollToOptions = {
        left: slide.offsetLeft,
        behavior: reduced || instant ? 'auto' : 'smooth',
      };
      if (typeof viewport.scrollTo === 'function') viewport.scrollTo(options);
      else viewport.scrollLeft = slide.offsetLeft;
    },
    [reduced],
  );

  const go = useCallback(
    (target: number) => {
      const next = Math.min(Math.max(target, 0), positions - 1);
      settledRef.current = next;
      scrollToIndex(next);
      commit(next);
    },
    [positions, scrollToIndex, commit],
  );

  const step = useCallback(
    (direction: 1 | -1) => {
      const at = currentRef.current + direction;
      if (at < 0) return go(loop ? positions - 1 : 0);
      if (at > positions - 1) return go(loop ? 0 : positions - 1);
      go(at);
    },
    [go, loop, positions],
  );

  // A controlled `index` that moved: bring the row to it.
  useEffect(() => {
    if (!controlled || indexProp === settledRef.current) {
      mountedRef.current = true;
      return;
    }
    const next = Math.min(Math.max(indexProp, 0), positions - 1);
    settledRef.current = next;
    scrollToIndex(next, !mountedRef.current);
    mountedRef.current = true;
  }, [controlled, indexProp, positions, scrollToIndex]);

  // The index follows the row, whoever moved it.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `total` is not read, but a changed slide count means new elements to observe.
  useEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;

    const settle = (seen: number) => {
      if (pendingRef.current !== null) {
        if (seen !== pendingRef.current) return;
        pendingRef.current = null;
        clearTimeout(pendingTimer.current);
      }
      const next = Math.min(seen, positions - 1);
      settledRef.current = next;
      commit(next);
    };

    // Pinned to an end, the row cannot reach the slide a dot would name.
    const edge = () => {
      if (pendingRef.current !== null) return;
      const max = viewport.scrollWidth - viewport.clientWidth;
      if (max <= 0) return;
      if (viewport.scrollLeft <= 1) settle(0);
      else if (viewport.scrollLeft >= max - 1) settle(positions - 1);
    };
    viewport.addEventListener('scroll', edge, { passive: true });

    let observer: IntersectionObserver | undefined;
    if (typeof IntersectionObserver === 'function') {
      const ratios = new Map<Element, number>();
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            ratios.set(entry.target, entry.intersectionRatio);
          }
          const els = Array.from(track.children);
          let seen = els.findIndex((el) => (ratios.get(el) ?? 0) >= SEEN);
          if (seen < 0) {
            let best = 0;
            els.forEach((el, i) => {
              if ((ratios.get(el) ?? 0) > (ratios.get(els[best]) ?? 0)) best = i;
            });
            seen = best;
          }
          settle(seen);
        },
        { root: viewport, threshold: [0, 0.25, SEEN, 0.75, 1] },
      );
      for (const el of Array.from(track.children)) observer.observe(el);
    }

    return () => {
      viewport.removeEventListener('scroll', edge);
      observer?.disconnect();
    };
  }, [total, positions, commit]);

  useEffect(() => () => clearTimeout(pendingTimer.current), []);

  const playing =
    autoplay !== undefined && autoplay > 0 && !reduced && !userPaused;
  const running = playing && !hovered && !focused && !hidden && positions > 1;

  useEffect(() => {
    if (!running || autoplay === undefined) return;
    const id = setInterval(() => {
      go(currentRef.current >= positions - 1 ? 0 : currentRef.current + 1);
    }, autoplay);
    return () => clearInterval(id);
  }, [running, autoplay, positions, go]);

  const onFocus = (event: FocusEvent<HTMLElement>) => {
    // The play/pause button is the user speaking: its focus is not a reason
    // to stay paused after pressing play.
    if ((event.target as HTMLElement).dataset.carouselToggle !== undefined) return;
    setFocused(true);
  };
  const onBlur = (event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setFocused(false);
    }
  };

  const basis =
    slidesPerView === 'auto'
      ? 'auto'
      : `calc((100% - ${gap * (perView - 1)}px) / ${perView})`;
  const viewportStyle = { '--carousel-slide': basis } as CSSProperties;

  return (
    <section
      aria-roledescription="carousel"
      aria-label={label}
      data-carousel=""
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={onFocus}
      onBlur={onBlur}
      className={cn('flex flex-col gap-3', className)}
    >
      <div
        ref={viewportRef}
        data-carousel-viewport=""
        style={viewportStyle}
        className="relative overflow-x-auto overscroll-x-contain snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div
          ref={trackRef}
          aria-live={playing ? 'off' : 'polite'}
          style={{ gap }}
          className="flex"
        >
          {slides.map((slide, i) => (
            <SlideContext.Provider
              // biome-ignore lint/suspicious/noArrayIndexKey: slides are positional; their number is their identity.
              key={i}
              value={{ index: i, total, label: labels.slide(i + 1, total) }}
            >
              {slide}
            </SlideContext.Provider>
          ))}
        </div>
      </div>

      {total > 1 ? (
        <div className="flex items-center justify-center gap-3">
          <Button
            icon
            size="sm"
            aria-label={labels.previous}
            disabled={!loop && current <= 0}
            onClick={() => step(-1)}
          >
            <ChevronLeft size={16} aria-hidden="true" />
          </Button>
          {/* biome-ignore lint/a11y/useSemanticElements: a named cluster of buttons, not a form fieldset. */}
          <div role="group" aria-label={labels.dots} className="flex items-center gap-2">
            {Array.from({ length: positions }, (_, i) => (
              <button
                // biome-ignore lint/suspicious/noArrayIndexKey: positions are positional.
                key={i}
                type="button"
                aria-label={labels.goTo(i + 1)}
                aria-current={i === current ? 'true' : undefined}
                onClick={() => go(i)}
                className={cn(
                  'h-2 rounded-full bg-ink-2/40 transition-[width,background-color] duration-(--dur-fast) motion-reduce:transition-none hover:bg-ink-2',
                  i === current ? 'w-6 bg-ink' : 'w-2',
                )}
              />
            ))}
          </div>
          <Button
            icon
            size="sm"
            aria-label={labels.next}
            disabled={!loop && current >= positions - 1}
            onClick={() => step(1)}
          >
            <ChevronRight size={16} aria-hidden="true" />
          </Button>
          {autoplay !== undefined && autoplay > 0 && !reduced ? (
            <Button
              icon
              size="sm"
              data-carousel-toggle=""
              aria-label={userPaused ? labels.play : labels.pause}
              onClick={() => setUserPaused((paused) => !paused)}
            >
              {userPaused ? (
                <Play size={16} aria-hidden="true" />
              ) : (
                <Pause size={16} aria-hidden="true" />
              )}
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export function CarouselSlide({ className, children }: CarouselSlideProps) {
  const info = useContext(SlideContext);
  return (
    // biome-ignore lint/a11y/useSemanticElements: the APG carousel slide is role="group" with aria-roledescription="slide"; <fieldset> would add a legend contract.
    <div
      role="group"
      aria-roledescription="slide"
      aria-label={info?.label}
      className={cn(
        'min-w-0 shrink-0 grow-0 basis-(--carousel-slide) snap-start',
        className,
      )}
    >
      {children}
    </div>
  );
}
