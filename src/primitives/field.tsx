import { Search } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../lib/cn';

/**
 * FEAT-20260823-362 — text entry.
 *
 * `globals.css` turns the global focus outline off for `input`, `textarea` and
 * `select`, on the grounds that a form control should manage its own — and then
 * nothing did, consistently. Four call sites lightened the border, others drew
 * a ring, others did nothing at all, so on a television it was possible to be
 * focused inside a form with no indication of where.
 *
 * These three components restore that: the border lightens and a ring appears,
 * in ink rather than in an accent colour, thick enough to find from a sofa.
 */
const base = [
  'w-full bg-surface text-ink placeholder:text-ink-3',
  'border border-line-strong rounded-control',
  'transition-[border-color,box-shadow] duration-(--dur-fast)',
  'focus:border-ink/70 focus:ring-2 focus:ring-white/22 focus:outline-none',
  'disabled:opacity-40',
].join(' ');

type InputProps = Omit<ComponentProps<'input'>, 'className'> & {
  className?: string;
};

export function Input({ className, ...props }: InputProps) {
  return <input className={cn(base, 'h-11 px-3.5 text-sm', className)} {...props} />;
}

type TextareaProps = Omit<ComponentProps<'textarea'>, 'className'> & {
  className?: string;
};

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea className={cn(base, 'px-3.5 py-3 text-sm resize-none', className)} {...props} />
  );
}

/**
 * FEAT-20260823-374 — the select, on the same footing as the input.
 *
 * `/remote` had four hand-rolled `<select>` elements sharing one long class
 * string and their own `focus:` treatment, written before this file existed.
 * They are the same control as `Input` with a different tag, so they get the
 * same border, the same radius and the same focus ring rather than a fifth
 * opinion about what a focused form control looks like.
 *
 * `h-11` matches `Input`, which matters where the two sit side by side.
 */
type SelectProps = Omit<ComponentProps<'select'>, 'className'> & {
  className?: string;
};

export function Select({ className, ...props }: SelectProps) {
  return <select className={cn(base, 'h-11 px-3 text-sm', className)} {...props} />;
}

/**
 * Search, with the magnifier inside the field where it labels what the field is
 * for, rather than sitting outside it as decoration on a button.
 *
 * `trailing` is for whatever the field itself owns — a clear cross, a spinner.
 * Where a search genuinely has to be submitted rather than running as you type,
 * as the TMDB lookup on `/downloads` does, the submit control stays a real
 * `Button` outside the field: it is a separate action and it should look like
 * one.
 */
type SearchFieldProps = InputProps & { trailing?: ReactNode; inputClassName?: string };

/**
 * `className` styles the wrapper, not the input, because what a caller almost
 * always wants to say here is `flex-1` — and putting that on the input, which
 * is already `w-full` inside a shrink-to-fit wrapper, silently does nothing.
 * `inputClassName` is there for the rare case that really means the field.
 */
export function SearchField({
  className,
  inputClassName,
  trailing,
  ...props
}: SearchFieldProps) {
  return (
    <div className={cn('relative flex items-center', className)}>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3.5 size-4 text-ink-3"
      />
      <input
        type="search"
        className={cn(base, 'h-11 pl-10 pr-3.5 text-sm', trailing ? 'pr-11' : '', inputClassName)}
        {...props}
      />
      {trailing ? <div className="absolute right-2 flex items-center">{trailing}</div> : null}
    </div>
  );
}

/**
 * FEAT-20260831-002 — the surround: a label, one line of help, and an error.
 *
 * The three components above are the controls. This is the thing around them,
 * and it is a genuinely separate concern — which is why Luna Watch got this far
 * without one. A media centre has almost no forms; Denitsa has twenty-three,
 * and every one of them was writing its own label markup.
 *
 * Brought in from Denitsa, with the focus ring taken out. Theirs drew an accent
 * outline on the control; this package has no accent, and `base.css` already
 * owns the focus ring for the whole document. A component that draws its own is
 * the thing the rule exists to stop.
 *
 * `error` **replaces** `hint` rather than joining it. Two lines of small quiet
 * text under one input is how a person reads neither.
 */
export function Field({
  label,
  hint,
  error,
  htmlFor,
  required,
  children,
}: {
  label: string;
  hint?: string;
  /** When present, replaces the hint. */
  error?: string;
  htmlFor?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-ink-2 text-xs font-medium">
        {label}
        {required && (
          <span className="text-danger ml-0.5" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {error ? (
        // `role="alert"` so a screen reader hears it when it appears, rather
        // than only if the user happens to move focus back over the field.
        <span role="alert" className="text-danger text-xs">
          {error}
        </span>
      ) : (
        hint && <span className="text-ink-3 text-xs">{hint}</span>
      )}
    </div>
  );
}
