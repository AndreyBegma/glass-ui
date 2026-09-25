import type { ComponentProps } from 'react';
import { tv, type VariantProps } from 'tailwind-variants';
import { cn } from '../lib/cn';

/**
 * FEAT-20260902-004 — a person, in tokens.
 *
 * `share-dialog.tsx:102` renders people as truncated text today; this is the
 * shape it becomes. `bg-hover border-line-strong text-ink-2` is not a new
 * decision — it is Luna's own avatar shape, carried over rather than
 * invented, so there is no second opinion about what a circle with initials
 * in it looks like.
 */
const avatar = tv({
  base: 'inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full border border-line-strong bg-hover font-medium text-ink-2',
  variants: {
    size: {
      sm: 'size-8 text-xs',
      md: 'size-10 text-sm',
      lg: 'size-14 text-base',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return (parts[0] ?? '').slice(0, 2).toUpperCase();
  const first = parts[0]?.[0] ?? '';
  const last = parts[parts.length - 1]?.[0] ?? '';
  return `${first}${last}`.toUpperCase();
}

type AvatarProps = Omit<ComponentProps<'span'>, 'className'> &
  VariantProps<typeof avatar> & {
    className?: string;
    name?: string;
    image?: string;
    alt?: string;
  };

export function Avatar({ size, name, image, alt, className, ...props }: AvatarProps) {
  return (
    <span className={cn(avatar({ size }), className)} {...props}>
      {image ? (
        <img src={image} alt={alt ?? name ?? ''} className="size-full object-cover" />
      ) : (
        <span aria-hidden={alt ? undefined : 'true'}>{name ? initials(name) : ''}</span>
      )}
    </span>
  );
}
