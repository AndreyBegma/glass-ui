'use client';

import * as RadixDialog from '@radix-ui/react-dialog';
import {
  AnimatePresence,
  animate,
  motion,
  useReducedMotion,
} from 'motion/react';
import {
  type ComponentProps,
  createContext,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { tv } from 'tailwind-variants';
import { cn } from '../lib/cn';

/**
 * FEAT-20260823-362 — the same dialog, anchored to an edge.
 *
 * A sheet and a modal are the same object in Radix and differ only in where
 * they come from, so this shares the primitive rather than reimplementing it.
 * The distinction that matters is which one a screen should use: a sheet is for
 * something the user is still working *within* — filters over a catalogue, chat
 * over a film — and a modal is for something they must answer before carrying
 * on.
 *
 * `glass-strong` rather than `glass`, because a sheet covers content the user
 * is meant to keep in mind. The heavier blur keeps the page underneath legible
 * as context without it competing for the eye.
 */
/**
 * FEAT-20260830-490 — the sheet knows whether it is open.
 *
 * `SheetRoot` used to be `RadixDialog.Root` re-exported, and that was enough
 * while the sheet had no exit: Radix unmounted the content and the sheet was
 * simply gone. An exit needs the content to outlive the state change, which
 * means `forceMount` on the portal and `AnimatePresence` deciding when the
 * element really leaves — and `AnimatePresence` needs to be told, by something
 * inside the sheet, that the sheet is closing.
 *
 * Radix publishes no hook for that, so the root publishes it here. The props
 * are unchanged and both call sites are controlled; the uncontrolled case is
 * mirrored rather than forwarded so that the context and Radix can never
 * disagree about which one is right.
 */
interface SheetState {
  open: boolean;
  setOpen: (next: boolean) => void;
}

const SheetStateContext = createContext<SheetState | null>(null);

export function SheetRoot({
  open,
  defaultOpen,
  onOpenChange,
  children,
  ...props
}: ComponentProps<typeof RadixDialog.Root>) {
  const [uncontrolled, setUncontrolled] = useState(defaultOpen ?? false);
  const controlled = open !== undefined;
  const resolved = controlled ? open : uncontrolled;

  const setOpen = useCallback(
    (next: boolean) => {
      if (!controlled) setUncontrolled(next);
      onOpenChange?.(next);
    },
    [controlled, onOpenChange],
  );

  const value = useMemo<SheetState>(
    () => ({ open: resolved, setOpen }),
    [resolved, setOpen],
  );

  return (
    <SheetStateContext.Provider value={value}>
      <RadixDialog.Root open={resolved} onOpenChange={setOpen} {...props}>
        {children}
      </RadixDialog.Root>
    </SheetStateContext.Provider>
  );
}

interface SheetProps {
  title: string;
  hideTitle?: boolean;
  description?: string;
  side?: 'bottom' | 'right';
  children: ReactNode;
  /**
   * Pinned below the scrolling body rather than inside it. A sheet's committing
   * action has to stay reachable no matter how long the list of filters is, and
   * `sticky` inside the scroll container leaves the content sliding visibly
   * under a translucent bar — legible on a laptop, mush on a phone.
   */
  footer?: ReactNode;
  className?: string;
  /**
   * FEAT-20260823-364 — the control this sheet grew out of.
   *
   * Pass the same id the trigger carries and the sheet stops arriving over the
   * page: it becomes the trigger, expanded. Two conditions, and both are easy
   * to get wrong silently.
   *
   * The trigger must **unmount** while the sheet is open. Two elements sharing
   * a `layoutId` at the same time is the one case Motion cannot resolve; it
   * crossfades instead, which looks exactly like no animation having been
   * written.
   *
   * And the shell is always `asChild` onto a `motion.div`, whether or not it is
   * morphing, so that the DOM Radix manages is the same element in both cases.
   * Switching the tree shape on a prop would remount the sheet's contents the
   * first time a caller passed `morphFrom`.
   *
   * **Position only, not size.** A sheet morphs *from where the trigger was*, at
   * its own size, rather than growing out of the trigger's rectangle. Animating
   * size across the portal boundary was tried and does not survive it: the
   * target height is whatever the contents settle at, they arrive a frame or two
   * after the animation starts, and the tail turns into a jump. Measured while
   * trying: 106×44 → 121×79 → 162×179, three frames of nothing, then a snap to
   * 375×690. Pinning the height made it worse — one frame, then the snap.
   *
   * `GlobalSearch` does animate size, and can, because its shell is mounted the
   * whole time and only changes shape. That is the difference: Motion needs the
   * source to exist when the target appears, and a Radix portal mounts too late
   * for a source that unmounts in the same commit.
   */
  morphFrom?: string;
  /** `none` for a body that carries its own row padding. `md` is today's `px-6`. */
  pad?: 'none' | 'md';
}

/**
 * FEAT-20260830-490 — apple-design §9. Past the top edge the sheet stops
 * following the finger 1:1 and resists instead, more the further it is pushed.
 * A hard stop reads as frozen; this reads as "responsive, and there is nothing
 * above here".
 */
function rubberband(overshoot: number, dimension: number, constant = 0.55) {
  return (
    (overshoot * dimension * constant) /
    (dimension + constant * Math.abs(overshoot))
  );
}

/** Downward flick, in px/ms, that dismisses however far the sheet has come. */
const DISMISS_VELOCITY = 0.11;
/** Fraction of the sheet's own height that dismisses however slowly it got there. */
const DISMISS_TRAVEL = 0.35;

/**
 * FEAT-20260902-004 — the `Card` `pad` shape, issue #11 item 4 (`u3-shell`,
 * 2026-09-02): `px-6` on the body with no way to opt out lands a second
 * inset on top of a body that carries its own row padding (Denitsa's
 * `AskPanelBody`, `px-4` — 40px on a phone). `none` hands the body's edges
 * to the child entirely; `md` is today's spacing, unchanged.
 */
const sheetBody = tv({
  base: 'min-h-0 flex-1 overflow-y-auto',
  variants: {
    pad: {
      md: 'px-6 pb-4 pt-4',
      none: '',
    },
  },
  defaultVariants: {
    pad: 'md',
  },
});

export function SheetContent({
  title,
  hideTitle = false,
  description,
  side = 'bottom',
  children,
  footer,
  className,
  morphFrom,
  pad = 'md',
}: SheetProps) {
  const reduced = useReducedMotion();
  const state = useContext(SheetStateContext);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const drag = useRef({
    active: false,
    startY: 0,
    offset: 0,
    samples: [] as { y: number; t: number }[],
  });

  if (!state) {
    throw new Error('SheetContent must be rendered inside SheetRoot.');
  }
  const { open, setOpen } = state;

  /**
   * FEAT-20260830-490 — why the morphing sheet does not get an exit of its own.
   *
   * `AnimatePresence` holds the closing sheet for the length of its exit, and
   * the trigger it morphed out of remounts the moment the sheet closes. That is
   * precisely the collision the `morphFrom` note above describes: two elements
   * carrying one `layoutId` at the same time, which Motion resolves as a
   * crossfade. The morph back into the trigger *is* the exit — enter and exit
   * along one path, which is the rule an exit animation exists to satisfy — so
   * this path keeps the handoff and does not wrap.
   */
  const presence = !morphFrom;
  const forceMount = presence ? true : undefined;

  /**
   * Full `transform` strings rather than Motion's `x` / `y` shorthands. The
   * shorthands run on the main thread through `requestAnimationFrame`, and this
   * animation happens while a sheet's worth of content is mounting behind it —
   * exactly the moment the main thread has nothing to spare.
   *
   * Both ends are written in the same unit and the same function. A transform
   * string is interpolated component by component, and `translateY(100%)` to
   * `translateY(0px)` is two different things to interpolate between.
   */
  const closed = side === 'bottom' ? 'translateY(100%)' : 'translateX(100%)';
  const opened = side === 'bottom' ? 'translateY(0%)' : 'translateX(0%)';

  const surfaceMotion = presence
    ? {
        initial: reduced ? { opacity: 0 } : { transform: closed },
        animate: reduced ? { opacity: 1 } : { transform: opened },
        exit: reduced
          ? { opacity: 0, transition: { duration: 0.14 } }
          : {
              transform: closed,
              // Out is faster than in, and along the same line. The entrance is
              // the user's decision arriving; the exit is the system getting
              // out of the way, and a slow one reads as hesitation.
              transition: { duration: 0.22, ease: [0.32, 0.72, 0, 1] as const },
            },
        transition: reduced
          ? { duration: 0.14 }
          : { duration: 0.42, ease: [0.32, 0.72, 0, 1] as const },
      }
    : {
        transition: reduced
          ? { duration: 0 }
          : { type: 'spring' as const, stiffness: 380, damping: 36, mass: 0.9 },
      };

  const overlayMotion = presence
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: {
          duration: reduced ? 0.14 : 0.22,
          ease: 'easeOut' as const,
        },
      }
    : {};

  const grip = side === 'bottom';

  const onGripDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!grip || event.button !== 0) return;
    const el = surfaceRef.current;
    if (!el) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      active: true,
      startY: event.clientY,
      offset: 0,
      samples: [{ y: event.clientY, t: event.timeStamp }],
    };
  };

  const onGripMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const st = drag.current;
    const el = surfaceRef.current;
    if (!st.active || !el) return;
    const height = el.offsetHeight || 1;
    const raw = event.clientY - st.startY;
    // Down is where the sheet is going, so down tracks the finger exactly. Up is
    // a wall, and a wall you can lean on.
    st.offset = raw >= 0 ? raw : -rubberband(-raw, height);
    // The last few moves, not the whole gesture: velocity at release is what a
    // flick is, and averaging it over a two-second drag erases it.
    st.samples.push({ y: event.clientY, t: event.timeStamp });
    if (st.samples.length > 5) st.samples.shift();
    el.style.transform = `translateY(${st.offset}px)`;
  };

  const onGripUp = () => {
    const st = drag.current;
    const el = surfaceRef.current;
    if (!st.active || !el) return;
    st.active = false;

    const height = el.offsetHeight || 1;
    const first = st.samples[0];
    const last = st.samples[st.samples.length - 1];
    // px/ms, positive downward. An upward flick is never a dismissal, however
    // fast it is — the sheet has nowhere to go up there.
    const velocity =
      first && last && last.t > first.t
        ? (last.y - first.y) / (last.t - first.t)
        : 0;

    if (velocity > DISMISS_VELOCITY || st.offset > DISMISS_TRAVEL * height) {
      // Left where the finger let go: the exit carries on from there rather
      // than snapping back to rest first and then leaving.
      setOpen(false);
      return;
    }

    if (reduced || st.offset === 0) {
      el.style.transform = '';
      return;
    }

    // apple-design §5 — the spring starts at the speed the finger had, so there
    // is no seam between the drag and the animation that follows it.
    animate(st.offset, 0, {
      type: 'spring',
      bounce: 0,
      duration: 0.4,
      velocity: velocity * 1000,
      onUpdate: (value) => {
        el.style.transform = `translateY(${value}px)`;
      },
      onComplete: () => {
        el.style.transform = '';
      },
    });
  };

  const heading = (
    <div className="px-6 pt-4">
      {hideTitle ? (
        <RadixDialog.Title className="sr-only">{title}</RadixDialog.Title>
      ) : (
        <RadixDialog.Title className="text-lg font-bold text-ink">
          {title}
        </RadixDialog.Title>
      )}
      {description ? (
        <RadixDialog.Description className="mt-1.5 text-sm text-ink-2">
          {description}
        </RadixDialog.Description>
      ) : null}
    </div>
  );

  /**
   * A keyed array rather than a fragment. `AnimatePresence` tracks its children
   * by key and cannot track a fragment, and the exit it cannot track is the one
   * that does not happen.
   */
  const surface = [
    <RadixDialog.Overlay key="overlay" asChild forceMount={forceMount}>
      <motion.div
        {...overlayMotion}
        className="fixed inset-0 z-overlay bg-black/55 backdrop-blur-sm"
      />
    </RadixDialog.Overlay>,

    <RadixDialog.Content key="content" asChild forceMount={forceMount}>
      {/*
          Two elements, two jobs. The outer one is the sheet arriving and
          leaving, and Motion owns its transform for as long as it is on screen.
          The inner one is the sheet being dragged, and the drag writes its
          transform directly, every frame, from a pointer handler.

          They cannot be one element. Motion writes `style.transform` on every
          frame of an enter or an exit, and so does the drag; one would be
          overwriting the other at 60Hz. Nested, they compose instead — a sheet
          dismissed mid-drag slides away from wherever the finger left it,
          because the exit is added to the offset rather than replacing it.
        */}
      <motion.div
        layoutId={morphFrom}
        layout={morphFrom ? 'position' : undefined}
        {...surfaceMotion}
        className={cn(
          'fixed z-overlay flex flex-col',
          side === 'bottom'
            ? 'inset-x-0 bottom-0 max-h-[85dvh]'
            : 'inset-y-0 right-0 w-[min(26rem,100vw)]',
          className,
        )}
      >
        <div
          ref={surfaceRef}
          className={cn(
            'glass-strong flex min-h-0 flex-1 flex-col',
            side === 'bottom'
              ? [
                  'rounded-t-sheet border-b-0',
                  // The bar sits under the home indicator on a phone; without
                  // this the last row of the sheet is unreachable.
                  'pb-[max(1rem,env(safe-area-inset-bottom))]',
                ]
              : 'rounded-l-sheet border-r-0',
          )}
        >
          {/*
              FEAT-20260830-490 — the handle does what it has always claimed to.

              It was drawn from the beginning as the thing that tells a thumb
              where the edge is, and dragging it did nothing at all. The grip is
              the handle *and* the header, because a thumb reaching for the top
              of a sheet lands on the title as often as on the 9px bar above it,
              and a grip that only works on the bar is a grip that works by
              luck.

              Escape and the overlay click are untouched, so this adds a way out
              rather than replacing the two that keyboards and pointers rely on.
            */}
          {grip ? (
            <div
              className="shrink-0 touch-none"
              onPointerDown={onGripDown}
              onPointerMove={onGripMove}
              onPointerUp={onGripUp}
              onPointerCancel={onGripUp}
            >
              <div
                aria-hidden="true"
                className="mx-auto mt-2.5 h-1 w-9 rounded-full bg-white/25"
              />
              {heading}
            </div>
          ) : (
            <div className="shrink-0">{heading}</div>
          )}

          <div className={sheetBody({ pad })}>{children}</div>

          {footer ? (
            <div className="shrink-0 border-t border-line px-6 pb-2 pt-3">
              {footer}
            </div>
          ) : null}
        </div>
      </motion.div>
    </RadixDialog.Content>,
  ];

  return (
    <RadixDialog.Portal forceMount={forceMount}>
      {presence ? (
        <AnimatePresence>{open ? surface : null}</AnimatePresence>
      ) : (
        surface
      )}
    </RadixDialog.Portal>
  );
}
