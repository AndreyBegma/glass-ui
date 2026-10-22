'use client';

import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

/**
 * v0.38.0 wave, Stepper and Wizard. Scaffold stub: the final prop types and
 * placeholder lists. Step status, navigation and the wizard footer are its
 * slot's.
 */
export type Step = {
  id: string;
  label: ReactNode;
  description?: ReactNode;
  optional?: boolean;
  status?: 'error';
};

export type StepperLabels = Record<string, string>;

export type StepperProps = {
  steps: Step[];
  /** The id of the current step. */
  current: string;
  onStepChange?: (id: string) => void;
  orientation?: 'horizontal' | 'vertical';
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
  canAdvance?: boolean;
  /** The current step's panel. */
  children?: ReactNode;
  labels?: Partial<StepperLabels>;
  className?: string;
};

export function Stepper({ steps, className }: StepperProps) {
  return (
    <ol className={cn(className)}>
      {steps.map((step) => (
        <li key={step.id}>{step.label}</li>
      ))}
    </ol>
  );
}

export function Wizard({ steps, children, className }: WizardProps) {
  return (
    <div className={cn(className)}>
      <ol>
        {steps.map((step) => (
          <li key={step.id}>{step.label}</li>
        ))}
      </ol>
      {children}
    </div>
  );
}
