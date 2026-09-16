'use client';

import { useScrollEdges } from '../hooks/use-scroll-edges';

/**
 * FEAT-20260916-604 — a vertical scroll box that says when it has more below.
 *
 * `ScrollHintRow` turned on its side. The catalogue's filter rail is a sticky
 * card capped at the viewport with `scrollbar-hide`; on a 1440×900 desk its
 * last sections exist below the fold and nothing said so — the same fault the
 * row was built for, on the other axis.
 *
 * The scroll element is the caller's: it passes the height cap, the overflow
 * and the padding in `className`, and this draws the two fades over its
 * edges. `edgeClassName` is the `from-*` token of the surface the box sits on,
 * so the fade reads as the surface swallowing the content rather than as a
 * shadow. A `rounded-*` on the outer wrapper keeps the fades inside a card's
 * corners.
 */
export function ScrollHintColumn({
  className,
  wrapperClassName,
  edgeClassName = 'from-ground',
  children,
  ...rest
}: {
  className?: string;
  /** For the `relative` wrapper — a `rounded-*` to clip the fades to a card. */
  wrapperClassName?: string;
  /** Tailwind `from-*` colour of the fade — match the surface behind the box. */
  edgeClassName?: string;
  children: React.ReactNode;
} & Omit<React.HTMLAttributes<HTMLDivElement>, 'className' | 'children'>) {
  const { ref, edges, onScroll } = useScrollEdges('y');

  return (
    <div
      className={wrapperClassName ? `relative ${wrapperClassName}` : 'relative'}
    >
      <div ref={ref} onScroll={onScroll} className={className} {...rest}>
        {children}
      </div>
      {/* Both fades stay mounted and change opacity, as in the row: a hard cut
          at the moment the box crosses four pixels of scroll reads as a
          rendering fault rather than as the box running out. */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b to-transparent transition-opacity duration-(--dur-fast) ${edgeClassName} ${
          edges.start ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t to-transparent transition-opacity duration-(--dur-fast) ${edgeClassName} ${
          edges.end ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
}
