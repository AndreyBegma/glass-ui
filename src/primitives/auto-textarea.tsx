'use client';

import { useLayoutEffect, useRef } from 'react';
import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';
import { Textarea } from './field';

/**
 * FEAT-20260902-004 — the chat-composer shape: grows, then scrolls.
 *
 * Seven sites in the gap document's tally copy `Textarea`'s class string and
 * add their own grow-to-a-cap script. `maxHeight` (default 160px) is where a
 * composer stops growing and starts scrolling internally instead — the
 * message list behind it should never reflow because someone kept typing.
 *
 * Resized on the native `input` event, not on the `value` prop: a keystroke
 * resizes the element the same frame it happens whether the caller controls
 * `value` or not, and it needs no dependency array a linter can second-guess
 * (`scrollHeight` is read off the DOM, not off a React value). The layout
 * effect covers the one case typing does not — the caller setting `value`
 * itself, from outside a keystroke.
 */
type AutoTextareaProps = Omit<ComponentProps<typeof Textarea>, 'rows'> & {
  maxHeight?: number;
};

function resize(el: HTMLTextAreaElement, maxHeight: number) {
  el.style.height = 'auto';
  el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
}

export function AutoTextarea({
  maxHeight = 160,
  className,
  style,
  onInput,
  ...props
}: AutoTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    if (ref.current) resize(ref.current, maxHeight);
  });

  return (
    <Textarea
      ref={ref}
      rows={1}
      className={cn('resize-none overflow-y-auto', className)}
      style={{ ...style, maxHeight }}
      onInput={(event) => {
        resize(event.currentTarget, maxHeight);
        onInput?.(event);
      }}
      {...props}
    />
  );
}
