'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * BUG-20260822-287 — a horizontal row that says when it has more to show.
 *
 * Four rows in this app scroll sideways with `scrollbar-hide`: the genre chips
 * in the catalog, the browse tabs, the mood pills, and the catalog's own filter
 * pills. Hiding the scrollbar was deliberate — a grey bar under a row of pills
 * looks like a mistake — but it left nothing at all: on a touch device, where
 * there is no scrollbar to begin with, the row simply ended mid-word at the
 * screen edge and the rest existed only for whoever guessed to swipe.
 *
 * The fade appears on a side only while there is something on that side, and
 * goes when the row is scrolled to that end. It is `pointer-events-none`, so it
 * never eats a tap meant for the chip underneath.
 */
export function ScrollHintRow({
  className,
  edgeClassName = 'from-ground',
  children,
  ...rest
}: {
  className?: string;
  /** Tailwind `from-*` colour of the fade — match the surface behind the row. */
  edgeClassName?: string;
  children: React.ReactNode;
} & Omit<React.HTMLAttributes<HTMLDivElement>, 'className' | 'children'>) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    // A pixel or two of rounding is not "more content".
    setEdges({ start: el.scrollLeft > 4, end: max - el.scrollLeft > 4 });
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    measure();
    // The row's own width and its contents both change — chips arrive from a
    // request, the viewport rotates — and either changes the answer.
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    for (const child of Array.from(el.children)) observer.observe(child);
    return () => observer.disconnect();
  }, [measure]);

  return (
    <div className="relative">
      <div ref={ref} onScroll={measure} className={className} {...rest}>
        {children}
      </div>
      {/* FEAT-20260830-490 — both fades stay mounted and change opacity.
          Mounting and unmounting them meant the hint appeared and vanished on
          the frame the scroll crossed four pixels, which is the one thing a
          fade is for: a hard cut at the edge of a row reads as a rendering
          fault rather than as the row running out. */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r to-transparent transition-opacity duration-(--dur-fast) ${edgeClassName} ${
          edges.start ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l to-transparent transition-opacity duration-(--dur-fast) ${edgeClassName} ${
          edges.end ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
}
