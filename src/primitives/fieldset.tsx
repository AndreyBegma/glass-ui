'use client';

import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

/**
 * v0.38.0 wave, Fieldset, FormSection and ErrorSummary. Scaffold stub: the
 * final prop types and placeholder elements. describedby wiring, the two-column
 * layout and the summary focus are its slot's.
 */
export type ErrorSummaryLabels = Record<string, string>;

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
  disabled,
  children,
  className,
}: FieldsetProps) {
  return (
    <fieldset disabled={disabled} className={cn(className)}>
      <legend>{legend}</legend>
      {children}
    </fieldset>
  );
}

export function FormSection({ title, children, className }: FormSectionProps) {
  return (
    <section className={cn(className)}>
      <h3>{title}</h3>
      {children}
    </section>
  );
}

export function ErrorSummary({ errors, title, className }: ErrorSummaryProps) {
  if (errors.length === 0) return null;
  return (
    <div role="alert" className={cn(className)}>
      {title}
      <ul>
        {errors.map((error) => (
          <li key={error.fieldId}>{error.message}</li>
        ))}
      </ul>
    </div>
  );
}
