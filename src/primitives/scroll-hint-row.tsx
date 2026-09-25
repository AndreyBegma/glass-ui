'use client';

import { useScrollEdges } from '../hooks/use-scroll-edges';

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
 *
 * FEAT-20260916-604 — the measuring moved to `useScrollEdges`, shared with
 * `ScrollHintColumn`. The props and the markup are unchanged.
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
  const { ref, edges, onScroll } = useScrollEdges('x');

  return (
    <div className="relative">
      <div ref={ref} onScroll={onScroll} className={className} {...rest}>
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
