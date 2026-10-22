'use client';

import type { ReactNode } from 'react';

/**
 * v0.38.0 wave, Tour. Scaffold stub: the final prop types, rendering nothing.
 * Targeting, the spotlight and focus handling are its slot's.
 */
export type TourStep = {
  id: string;
  /** A selector, or a function returning the element. */
  target: string | (() => Element | null);
  title: ReactNode;
  body?: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
};

export type TourLabels = Record<string, string>;

export type TourProps = {
  steps: TourStep[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The id of the current step. */
  step?: string;
  onStepChange?: (id: string) => void;
  onFinish?: () => void;
  /** Default true. */
  spotlight?: boolean;
  labels?: Partial<TourLabels>;
};

export function Tour(_props: TourProps) {
  return null;
}
