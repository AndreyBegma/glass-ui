'use client';

import { CircleAlert } from 'lucide-react';
import { type MouseEvent, type ReactNode, useEffect, useId, useRef } from 'react';
import { cn } from '../lib/cn';
import { Separator } from './separator';

/**
 * v0.38.0 wave — Fieldset, FormSection and ErrorSummary: grouping for long
 * settings forms.
 *
 * **`Fieldset`** is a real `<fieldset>`/`<legend>`, so `disabled` is the
 * browser's own: every native control inside is disabled and skipped by
 * focus, with no context and no prop drilling. The description and the error
 * are both named in `aria-describedby`. The error is danger-coloured *and*
 * carries an icon, so colour is never the only signal.
 *
 * **`FormSection`** is the settings layout: the copy on the left, the fields
 * on the right, stacked below the `md` breakpoint, a `Separator` above every
 * section but the first. A solid surface, never glass.
 *
 * **`ErrorSummary`** lists every error at the top of the form. It focuses
 * itself when errors appear or change — once per change, not on every render
 * — and each item is a link that focuses the field by id and scrolls it into
 * view. Empty, it renders nothing.
 */
export type ErrorSummaryLabels = {
  /** The heading, when `title` is not given. */
  title: string;
  /** The list's accessible name. */
  list: string;
};

const DEFAULT_LABELS: ErrorSummaryLabels = {
  title: 'There is a problem',
  list: 'Errors',
};

export type FieldsetProps = {
  legend: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  disabled?: boolean;
  children?: ReactNode;
  className?: string;
};

export type FormSectionProps = {
  title: ReactNode;
  description?: ReactNode;
  /** Beside the copy, e.g. a help link. */
  aside?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export type ErrorSummaryItem = {
  fieldId: string;
  message: ReactNode;
};

export type ErrorSummaryProps = {
  errors: ErrorSummaryItem[];
  title?: ReactNode;
  labels?: Partial<ErrorSummaryLabels>;
  className?: string;
};

export function Fieldset({
  legend,
  description,
  error,
  disabled,
  children,
  className,
}: FieldsetProps) {
  const id = useId();
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;
  const describedBy =
    [description ? descriptionId : null, error ? errorId : null].filter(Boolean).join(' ') ||
    undefined;

  return (
    <fieldset
      disabled={disabled}
      aria-describedby={describedBy}
      aria-invalid={error ? true : undefined}
      className={cn(
        'm-0 flex min-w-0 flex-col gap-3 border-0 p-0 disabled:opacity-40',
        'motion-safe:transition-opacity motion-safe:duration-(--dur-fast)',
        className,
      )}
    >
      <legend className="p-0 text-sm font-medium text-ink">{legend}</legend>
      {description ? (
        <p id={descriptionId} className="text-xs text-ink-3">
          {description}
        </p>
      ) : null}
      {children}
      {error ? (
        <p id={errorId} role="alert" className="flex items-start gap-1.5 text-xs text-danger">
          <CircleAlert aria-hidden="true" className="mt-px size-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      ) : null}
    </fieldset>
  );
}

export function FormSection({ title, description, aside, children, className }: FormSectionProps) {
  const id = useId();
  return (
    <section
      aria-labelledby={`${id}-title`}
      className={cn(
        'group/section grid grid-cols-1 gap-x-10 gap-y-5 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]',
        className,
      )}
    >
      <Separator className="col-span-full group-first/section:hidden" />
      <div className="flex flex-col gap-1.5">
        <h3 id={`${id}-title`} className="text-sm font-medium text-ink">
          {title}
        </h3>
        {description ? <p className="text-xs text-ink-3">{description}</p> : null}
        {aside ? <div className="mt-1 text-xs text-ink-2">{aside}</div> : null}
      </div>
      <div className="flex min-w-0 flex-col gap-4">{children}</div>
    </section>
  );
}

export function ErrorSummary({ errors, title, labels: labelsProp, className }: ErrorSummaryProps) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp };
  const ref = useRef<HTMLDivElement>(null);
  const headingId = useId();

  // Once per change: the key is the list's content, not its identity, so a
  // parent re-rendering with an equal array does not pull focus back.
  const key = errors
    .map((e) => `${e.fieldId}:${typeof e.message === 'string' ? e.message : ''}`)
    .join('\n');
  const lastKey = useRef('');
  // biome-ignore lint/correctness/useExhaustiveDependencies: `key` is the change signal.
  useEffect(() => {
    if (key === '' && errors.length === 0) {
      lastKey.current = '';
      return;
    }
    if (key === lastKey.current) return;
    lastKey.current = key;
    ref.current?.focus();
  }, [key]);

  if (errors.length === 0) return null;

  function go(event: MouseEvent<HTMLAnchorElement>, fieldId: string) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    event.preventDefault();
    field.focus({ preventScroll: true });
    const reduce =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    field.scrollIntoView?.({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
  }

  return (
    <div
      ref={ref}
      role="alert"
      tabIndex={-1}
      aria-labelledby={headingId}
      className={cn(
        'flex flex-col gap-2 rounded-control border border-danger bg-surface p-4 text-sm',
        className,
      )}
    >
      <p id={headingId} className="flex items-center gap-2 font-medium text-danger">
        <CircleAlert aria-hidden="true" className="size-4 shrink-0" />
        {title ?? labels.title}
      </p>
      <ul aria-label={labels.list} className="m-0 flex list-disc flex-col gap-1 pl-9 text-ink">
        {errors.map((error) => (
          <li key={error.fieldId}>
            <a
              href={`#${error.fieldId}`}
              onClick={(event) => go(event, error.fieldId)}
              className="underline underline-offset-2"
            >
              {error.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
