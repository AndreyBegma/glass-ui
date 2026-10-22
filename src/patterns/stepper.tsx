'use client';

import { Check, CircleAlert } from 'lucide-react';
import { type ReactNode, useEffect, useRef } from 'react';
import { cn } from '../lib/cn';
import { Button } from '../primitives/button';

/**
 * #181 — steps for onboarding and multi-step forms.
 *
 * **Where you are is the caller's.** `current` and `completed` are facts about
 * the flow, so both are controlled; the stepper keeps nothing but focus. When
 * `completed` is left out, the steps before `current` count as completed.
 *
 * **Who can be clicked.** `navigable` is `none` (the default: a read-only
 * progress display), `completed` (finished steps only — going back) or `all`
 * (every step but the current one). A clickable step is a real button in the
 * normal Tab order; there is no WAI-ARIA pattern for a stepper, and one tab
 * stop per step is the plain, predictable reading of a list of buttons.
 *
 * **Colour is never the only signal.** Completed shows a check, an error shows
 * an icon *and* the word, optional steps say so in text.
 *
 * **Narrow containers collapse.** Below the `sm` container width a horizontal
 * stepper shows "Step 2 of 4 · Secrets" instead; the list stays in the
 * accessibility tree. `Wizard` is `Stepper` + the current step's panel + Back /
 * Next / Finish, and moves focus to the panel heading when the step changes.
 *
 * Every string it writes itself is in `labels`.
 */
export type Step = {
  id: string;
  label: ReactNode;
  description?: ReactNode;
  optional?: boolean;
  status?: 'error';
};

export interface StepperLabels {
  /** The list's accessible name. Default "Steps". */
  steps: string;
  /** Marks a finished step for assistive tech. Default "Completed". */
  completed: string;
  /** Beside a step in error. Default "Error". */
  error: string;
  /** Beside an optional step. Default "Optional". */
  optional: string;
  /** The collapsed summary. Default "Step 2 of 4 · Secrets". */
  stepOf: (index: number, total: number, label: ReactNode) => ReactNode;
  /** Wizard footer. Default "Back". */
  back: string;
  /** Wizard footer. Default "Next". */
  next: string;
  /** Wizard footer, last step. Default "Finish". */
  finish: string;
}

const DEFAULT_LABELS: StepperLabels = {
  steps: 'Steps',
  completed: 'Completed',
  error: 'Error',
  optional: 'Optional',
  stepOf: (index, total, label) => (
    <>
      Step {index} of {total} · {label}
    </>
  ),
  back: 'Back',
  next: 'Next',
  finish: 'Finish',
};

export type StepperProps = {
  steps: Step[];
  /** The id of the current step. */
  current: string;
  onStepChange?: (id: string) => void;
  orientation?: 'horizontal' | 'vertical';
  /** Finished steps. Default: the steps before `current`. */
  completed?: ReadonlySet<string>;
  navigable?: 'none' | 'completed' | 'all';
  labels?: Partial<StepperLabels>;
  className?: string;
};

export type WizardProps = {
  steps: Step[];
  current: string;
  onStepChange: (id: string) => void;
  onFinish: () => void;
  /** `false` disables Next / Finish. Default `true`. */
  canAdvance?: boolean;
  /** The current step's panel. */
  children?: ReactNode;
  labels?: Partial<StepperLabels>;
  className?: string;
};

type Phase = 'current' | 'completed' | 'error' | 'upcoming';

const MARKER: Record<Phase, string> = {
  current: 'border-accent bg-accent text-on-accent',
  completed: 'border-accent bg-surface text-accent',
  error: 'border-danger bg-surface text-danger',
  upcoming: 'border-line bg-surface text-ink-3',
};

const CONNECTOR =
  'bg-line motion-safe:transition-colors duration-(--dur-base) data-[filled=true]:bg-accent';

export function Stepper({
  steps,
  current,
  onStepChange,
  orientation = 'horizontal',
  completed,
  navigable = 'none',
  labels: labelsProp,
  className,
}: StepperProps) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp };
  const vertical = orientation === 'vertical';
  const currentIndex = steps.findIndex((s) => s.id === current);
  const currentStep = steps[currentIndex];

  return (
    <div className={cn('@container', className)} data-stepper={orientation}>
      {vertical || !currentStep ? null : (
        <p
          aria-hidden="true"
          data-stepper-summary
          className="text-sm font-medium text-ink @sm:hidden"
        >
          {labels.stepOf(currentIndex + 1, steps.length, currentStep.label)}
        </p>
      )}
      <ol
        aria-label={labels.steps}
        className={cn(
          'flex',
          vertical ? 'flex-col' : 'items-start @max-sm:sr-only',
        )}
      >
        {steps.map((step, index) => {
          const isCurrent = index === currentIndex;
          const isDone = completed
            ? completed.has(step.id)
            : currentIndex >= 0 && index < currentIndex;
          const phase: Phase = step.status
            ? 'error'
            : isCurrent
              ? 'current'
              : isDone
                ? 'completed'
                : 'upcoming';
          const interactive =
            !isCurrent &&
            !!onStepChange &&
            (navigable === 'all' || (navigable === 'completed' && isDone));
          const last = index === steps.length - 1;
          const filled = index < currentIndex;
          const Body = interactive ? 'button' : 'div';

          return (
            <li
              key={step.id}
              data-step={step.id}
              data-phase={phase}
              aria-current={isCurrent ? 'step' : undefined}
              className={cn(
                'relative flex',
                vertical ? 'gap-3 pb-6 last:pb-0' : 'flex-1 last:flex-none',
              )}
            >
              <Body
                {...(interactive
                  ? {
                      type: 'button' as const,
                      onClick: () => onStepChange?.(step.id),
                    }
                  : {})}
                className={cn(
                  'flex items-start gap-3 text-left',
                  interactive &&
                    'cursor-pointer rounded-control motion-safe:transition-colors duration-(--dur-fast) hover:bg-hover',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'grid size-8 shrink-0 place-items-center rounded-full border-2 text-xs font-semibold tabular-nums',
                    MARKER[phase],
                  )}
                >
                  {phase === 'error' ? (
                    <CircleAlert size={16} />
                  ) : phase === 'completed' ? (
                    <Check size={16} />
                  ) : (
                    index + 1
                  )}
                </span>
                <span className="flex min-w-0 flex-col pt-1">
                  <span
                    className={cn(
                      'text-sm font-medium',
                      phase === 'upcoming' ? 'text-ink-2' : 'text-ink',
                    )}
                  >
                    {step.label}
                  </span>
                  {phase === 'completed' ? (
                    <span className="sr-only">{labels.completed}</span>
                  ) : null}
                  {phase === 'error' ? (
                    <span className="text-xs text-danger">{labels.error}</span>
                  ) : null}
                  {step.optional ? (
                    <span className="text-xs text-ink-3">
                      {labels.optional}
                    </span>
                  ) : null}
                  {step.description ? (
                    <span className="text-xs text-ink-2">
                      {step.description}
                    </span>
                  ) : null}
                </span>
              </Body>
              {last ? null : vertical ? (
                <span
                  aria-hidden="true"
                  data-connector
                  data-filled={filled}
                  className={cn(
                    CONNECTOR,
                    'absolute left-4 top-9 bottom-1 w-0.5 -translate-x-1/2',
                  )}
                />
              ) : (
                <span
                  aria-hidden="true"
                  data-connector
                  data-filled={filled}
                  className={cn(CONNECTOR, 'mx-3 mt-4 h-0.5 flex-1')}
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function Wizard({
  steps,
  current,
  onStepChange,
  onFinish,
  canAdvance = true,
  children,
  labels: labelsProp,
  className,
}: WizardProps) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp };
  const index = steps.findIndex((s) => s.id === current);
  const step = steps[index];
  const first = index <= 0;
  const last = index === steps.length - 1;
  const heading = useRef<HTMLHeadingElement>(null);
  const mounted = useRef(false);

  // Not on mount: opening the page must not steal focus from the page.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `current` is the trigger.
  useEffect(() => {
    if (mounted.current) heading.current?.focus();
    mounted.current = true;
  }, [current]);

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      <Stepper
        steps={steps}
        current={current}
        onStepChange={onStepChange}
        navigable="completed"
        labels={labelsProp}
      />
      <section className="rounded-surface border border-line bg-surface p-6">
        {step ? (
          <h2
            ref={heading}
            tabIndex={-1}
            className="mb-4 text-lg font-semibold text-ink outline-none focus-visible:underline"
          >
            {step.label}
          </h2>
        ) : null}
        {children}
      </section>
      <div className="flex justify-between gap-3">
        <Button
          variant="ghost"
          disabled={first}
          onClick={() => {
            const prev = steps[index - 1];
            if (prev) onStepChange(prev.id);
          }}
        >
          {labels.back}
        </Button>
        {last ? (
          <Button variant="solid" disabled={!canAdvance} onClick={onFinish}>
            {labels.finish}
          </Button>
        ) : (
          <Button
            variant="solid"
            disabled={!canAdvance}
            onClick={() => {
              const next = steps[index + 1];
              if (next) onStepChange(next.id);
            }}
          >
            {labels.next}
          </Button>
        )}
      </div>
    </div>
  );
}
