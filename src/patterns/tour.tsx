'use client';

import { useReducedMotion } from 'motion/react';
import {
  type ComponentProps,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../lib/cn';
import { Button } from '../primitives/button';
import { PopoverAnchor, PopoverContent, PopoverRoot } from './popover';

/**
 * v0.38.0 wave, Tour — a guided walk through an interface, one coachmark at a
 * time, each anchored to an element already on the page.
 *
 * **The card is a popover with no trigger.** `PopoverAnchor` takes a virtual
 * element whose rectangle is the target's, and whose `contextElement` is the
 * target itself: Floating UI's `autoUpdate` walks that element's scrolling
 * ancestors, so the card re-anchors on scroll and resize without a listener of
 * its own. The glass is `PopoverContent`'s; nothing here draws a second one.
 *
 * **Non-modal dialog** (APG). Focus moves to the card on every step and goes
 * back to whatever had it before the tour opened; Tab is not fenced. Escape,
 * Skip and Done close it. A click or focus outside does not: a tour that
 * vanishes because the reader clicked the thing it was pointing at is the
 * usual complaint about tours, and under the spotlight the outside is blocked
 * anyway.
 *
 * **A missing target is skipped**, in the direction of travel, with a warning
 * in development. "2 of 5" counts only the steps whose targets resolve, so the
 * count never promises a step that will be jumped over.
 */
export type TourStep = {
  id: string;
  /** A selector, or a function returning the element. */
  target: string | (() => Element | null);
  title: ReactNode;
  body?: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
};

export type TourLabels = {
  /** The card's hidden heading for a screen reader, above the step's title. */
  tour: string;
  back: string;
  next: string;
  done: string;
  skip: string;
  /** "2 of 5". */
  progress: (current: number, total: number) => string;
};

const DEFAULT_LABELS: TourLabels = {
  tour: 'Tour',
  back: 'Back',
  next: 'Next',
  done: 'Done',
  skip: 'Skip',
  progress: (current, total) => `${current} of ${total}`,
};

export type TourProps = {
  steps: TourStep[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The id of the current step. Omit it and the tour keeps its own, starting
   *  from the first step each time it opens. */
  step?: string;
  onStepChange?: (id: string) => void;
  /** Done on the last step. Not Skip, not Escape. */
  onFinish?: () => void;
  /** Default true. */
  spotlight?: boolean;
  labels?: Partial<TourLabels>;
};

/** The gap between the target and the edge of the cut-out, in pixels. */
const SPOTLIGHT_PADDING = 6;

type Measurable = NonNullable<
  NonNullable<ComponentProps<typeof PopoverAnchor>['virtualRef']>['current']
>;

type View = { id: string; target: Element; ids: string[] };

// Bundlers replace `process.env.NODE_ENV`; without one there is no `process`.
declare const process: { env: { NODE_ENV?: string } };
function isDevelopment() {
  try {
    return process.env.NODE_ENV !== 'production';
  } catch {
    return false;
  }
}

function resolveTarget(target: TourStep['target']) {
  return typeof target === 'function' ? target() : document.querySelector(target);
}

function isEditable(element: EventTarget) {
  return (
    element instanceof HTMLElement &&
    (element.isContentEditable ||
      element.tagName === 'INPUT' ||
      element.tagName === 'TEXTAREA' ||
      element.tagName === 'SELECT')
  );
}

export function Tour({
  steps,
  open,
  onOpenChange,
  step: stepProp,
  onStepChange,
  onFinish,
  spotlight = true,
  labels: labelsProp,
}: TourProps) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp };
  const reduced = useReducedMotion();
  const controlled = stepProp !== undefined;
  const [internalStep, setInternalStep] = useState<string>();
  const currentId = controlled ? stepProp : internalStep;
  const [view, setView] = useState<View | null>(null);

  const direction = useRef<1 | -1>(1);
  const finished = useRef(false);
  const warned = useRef(new Set<string>());
  const returnTo = useRef<HTMLElement | null>(null);
  const card = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onOpenChange, onStepChange });
  useLayoutEffect(() => {
    callbacks.current = { onOpenChange, onStepChange };
  });

  const titleId = useId();
  const bodyId = useId();
  const progressId = useId();

  function goTo(id: string, towards: 1 | -1) {
    direction.current = towards;
    if (!controlled) setInternalStep(id);
    callbacks.current.onStepChange?.(id);
  }

  // Focus is taken when the tour opens and given back when it closes — or
  // when it unmounts while open, which is a close the parent did not announce.
  // Noted in a layout effect, before the card can take it; given back in a
  // passive one, because React puts focus back where it was after a commit's
  // mutations, and a layout cleanup runs among them.
  useLayoutEffect(() => {
    if (!open) return;
    const active = document.activeElement;
    returnTo.current = active instanceof HTMLElement ? active : null;
    finished.current = false;
    warned.current.clear();
    direction.current = 1;
  }, [open]);
  useEffect(() => {
    if (!open) return;
    return () => {
      const previous = returnTo.current;
      returnTo.current = null;
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [open]);

  // Which step is shown, and against which element. Run after every render —
  // a target can appear or vanish without anything here changing, and `steps`
  // is usually a fresh array anyway — so the state is only replaced when what
  // it says has changed.
  useLayoutEffect(() => {
    if (!open) {
      setView(null);
      if (!controlled) setInternalStep(undefined);
      return;
    }

    const found = steps.map((s) => ({ step: s, target: resolveTarget(s.target) }));
    if (isDevelopment()) {
      for (const { step: s, target } of found) {
        if (target || warned.current.has(s.id)) continue;
        warned.current.add(s.id);
        console.warn(`Tour: the target of step "${s.id}" is not on the page; the step is skipped.`);
      }
    }

    const live = found.filter((f) => f.target);
    if (live.length === 0) {
      setView(null);
      callbacks.current.onOpenChange(false);
      return;
    }

    const at = Math.max(
      0,
      steps.findIndex((s) => s.id === currentId),
    );
    const towards = direction.current;
    const ahead = (i: number) => (towards === 1 ? i >= at : i <= at);
    const order = found.map((f, i) => ({ ...f, i }));
    const pick =
      (towards === 1 ? order : [...order].reverse()).find((f) => f.target && ahead(f.i)) ??
      (towards === 1 ? [...order].reverse() : order).find((f) => f.target);
    if (!pick?.target) return;

    if (pick.step.id !== currentId) {
      // The first step of an uncontrolled tour is not a change anyone asked
      // for; a skip is, and the parent is told about it.
      if (currentId === undefined) setInternalStep(pick.step.id);
      else goTo(pick.step.id, towards);
    }

    const next: View = {
      id: pick.step.id,
      target: pick.target,
      ids: live.map((l) => l.step.id),
    };
    setView((prev) =>
      prev &&
      prev.id === next.id &&
      prev.target === next.target &&
      prev.ids.join('\n') === next.ids.join('\n')
        ? prev
        : next,
    );
  });

  // Into view, centred; instant when the reader has asked for no motion.
  useEffect(() => {
    view?.target.scrollIntoView({
      block: 'center',
      inline: 'nearest',
      behavior: reduced ? 'instant' : 'smooth',
    });
  }, [view?.target, reduced]);

  // The card takes focus on every step. Radix's own open focus is prevented
  // below, because it would land on the first button rather than the card.
  // Two moments: the card's mount, which Radix's portal puts a commit after
  // the step is known (the ref), and each later step (the effect).
  const focusCard = useCallback((node: HTMLDivElement | null) => {
    card.current = node;
    node?.focus({ preventScroll: true });
  }, []);
  // biome-ignore lint/correctness/useExhaustiveDependencies: refocus per step, by id
  useEffect(() => {
    if (view) card.current?.focus({ preventScroll: true });
  }, [view?.id]);

  const virtualRef = useMemo(() => {
    const target = view?.target;
    const measurable = target
      ? { getBoundingClientRect: () => target.getBoundingClientRect(), contextElement: target }
      : null;
    return { current: measurable as Measurable | null };
  }, [view?.target]);

  const current = view ? steps.find((s) => s.id === view.id) : undefined;
  const index = view ? view.ids.indexOf(view.id) : -1;
  const total = view?.ids.length ?? 0;
  const isLast = index === total - 1;

  function back() {
    if (view && index > 0) goTo(view.ids[index - 1], -1);
  }
  function next() {
    if (view && !isLast) goTo(view.ids[index + 1], 1);
  }
  function finish() {
    if (finished.current) return;
    finished.current = true;
    onFinish?.();
    onOpenChange(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey || isEditable(event.target)) return;
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      next();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      back();
    }
  }

  return (
    <>
      {open && spotlight && view ? <Spotlight target={view.target} /> : null}
      <PopoverRoot
        open={open && view !== null}
        onOpenChange={(next) => {
          if (!next) onOpenChange(false);
        }}
      >
        <PopoverAnchor virtualRef={virtualRef} />
        {current ? (
          <PopoverContent
            ref={focusCard}
            title={labels.tour}
            hideTitle
            aria-labelledby={titleId}
            aria-describedby={current.body ? `${progressId} ${bodyId}` : progressId}
            tabIndex={-1}
            side={current.side ?? 'bottom'}
            sideOffset={SPOTLIGHT_PADDING + 8}
            // One above the spotlight, which is at the overlay layer.
            className="z-[calc(var(--z-index-overlay)+1)] outline-none"
            onOpenAutoFocus={(event) => event.preventDefault()}
            onCloseAutoFocus={(event) => event.preventDefault()}
            onInteractOutside={(event) => event.preventDefault()}
            onKeyDown={onKeyDown}
            data-tour-step={current.id}
            footer={
              <div className="flex items-center gap-2">
                <span id={progressId} className="text-ink-2 text-label mr-auto tabular-nums">
                  {labels.progress(index + 1, total)}
                </span>
                {isLast ? null : (
                  <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                    {labels.skip}
                  </Button>
                )}
                {index > 0 ? (
                  <Button variant="glass" size="sm" onClick={back}>
                    {labels.back}
                  </Button>
                ) : null}
                {isLast ? (
                  <Button variant="solid" size="sm" onClick={finish}>
                    {labels.done}
                  </Button>
                ) : (
                  <Button variant="solid" size="sm" onClick={next}>
                    {labels.next}
                  </Button>
                )}
              </div>
            }
          >
            <h3 id={titleId} className="text-ink text-section">
              {current.title}
            </h3>
            {current.body ? (
              <div id={bodyId} className="text-ink-2 text-body mt-1">
                {current.body}
              </div>
            ) : null}
          </PopoverContent>
        ) : null}
      </PopoverRoot>
    </>
  );
}

/**
 * The dimmed page with a hole where the target is. One box at the target's
 * rectangle whose shadow is the scrim — the shadow is the dimming and the box
 * is the hole, so there is no clip path to keep in step with it. The layer
 * under it takes every pointer event: the page cannot be clicked through it,
 * the target included. Only the card, a layer above, takes clicks.
 */
function Spotlight({ target }: { target: Element }) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useLayoutEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      setRect(target.getBoundingClientRect());
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);
    const observer = new ResizeObserver(schedule);
    observer.observe(target);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
      observer.disconnect();
    };
  }, [target]);

  return createPortal(
    <div aria-hidden="true" data-tour-spotlight="" className="fixed inset-0 z-overlay">
      {rect ? (
        <div
          className={cn(
            'absolute rounded-control shadow-[0_0_0_100vmax_var(--color-scrim)]',
            'motion-safe:transition-[top,left,width,height] motion-safe:duration-(--dur-base) motion-safe:ease-(--ease-out-expo)',
          )}
          style={{
            top: rect.top - SPOTLIGHT_PADDING,
            left: rect.left - SPOTLIGHT_PADDING,
            width: rect.width + SPOTLIGHT_PADDING * 2,
            height: rect.height + SPOTLIGHT_PADDING * 2,
          }}
        />
      ) : (
        <div className="bg-scrim absolute inset-0" />
      )}
    </div>,
    document.body,
  );
}
