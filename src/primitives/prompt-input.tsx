'use client';

import { SendHorizontal } from 'lucide-react';
import {
  type KeyboardEvent,
  type ReactNode,
  type Ref,
  useId,
  useRef,
  useState,
} from 'react';
import { cn } from '../lib/cn';
import { AutoTextarea } from './auto-textarea';
import { Button } from './button';
import type { FieldTone } from './field';

/**
 * #94 — a field that sends: the prompt box under a chat, the one-line
 * "Enter prompt for this agent…" in a card's footer.
 *
 * It is a field and a button drawn as one control: the border, the fill and
 * the focus treatment are `Field`'s, moved from the input to the frame
 * (`focus-within`), so the send button and the leading actions sit *inside*
 * the box rather than beside it. The ring is `ring-ink/22`, `fieldClassName`'s
 * token-built stand-in for `field.tsx`'s literal white, which the palette
 * spec allows in that one file.
 *
 * **Enter sends; Shift+Enter is a newline.** Not while an input method is
 * composing — a Japanese or Chinese user presses Enter to accept a candidate,
 * and sending half a sentence then is the bug every chat box ships once.
 * An empty or whitespace-only value never sends, whichever way it was asked.
 *
 * **Controlled or not.** Pass `value` and `onValueChange` to own the text, and
 * clear it yourself in `onSubmit`; leave them out and the field clears itself
 * after a send.
 *
 * **Disabled says why.** `disabledReason` takes the placeholder's place, and
 * is the field's description for a reader (`aria-describedby`) — a greyed box
 * with no reason is a dead end.
 *
 * `multiline` (the default) grows with `AutoTextarea` up to `maxHeight`, then
 * scrolls; `multiline={false}` is a plain one-line `input`. `layout="stacked"`
 * puts the leading actions and the send button on a row under the text, the
 * composer shape; `inline` (the default) keeps everything on one line.
 */
export interface PromptInputProps {
  onSubmit: (value: string) => void;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  /** The field's accessible name. Defaults to the placeholder. */
  'aria-label'?: string;
  multiline?: boolean;
  /** Where a multiline field stops growing. Default 160px. */
  maxHeight?: number;
  /** Action icons before the text (attach, code). Bring your own buttons. */
  leading?: ReactNode;
  layout?: 'inline' | 'stacked';
  size?: 'sm' | 'md';
  /** Where the box sits: the flat ground (default) or inside a glass panel. */
  tone?: FieldTone;
  disabled?: boolean;
  /** Why it is disabled. Shown in place of the placeholder, and described. */
  disabledReason?: string;
  /** The send button's accessible name. Default "Send". */
  sendLabel?: string;
  autoFocus?: boolean;
  name?: string;
  id?: string;
  inputRef?: Ref<HTMLTextAreaElement | HTMLInputElement>;
  className?: string;
}

const FILL: Record<FieldTone, string> = {
  surface: 'bg-surface',
  'on-glass': 'bg-hover',
};

/** The field's own chrome is the frame's now, so the element itself is bare. */
const BARE =
  'min-w-0 flex-1 border-0 bg-transparent p-0 text-ink placeholder:text-ink-3 shadow-none rounded-none ' +
  'focus:border-0 focus:ring-0 focus:outline-none disabled:opacity-100 disabled:cursor-not-allowed';

export function PromptInput({
  onSubmit,
  value: controlled,
  defaultValue = '',
  onValueChange,
  placeholder,
  'aria-label': ariaLabel,
  multiline = true,
  maxHeight = 160,
  leading,
  layout = 'inline',
  size = 'md',
  tone = 'surface',
  disabled = false,
  disabledReason,
  sendLabel = 'Send',
  autoFocus,
  name,
  id,
  inputRef,
  className,
}: PromptInputProps) {
  const [own, setOwn] = useState(defaultValue);
  const isControlled = controlled !== undefined;
  const value = isControlled ? controlled : own;
  const reasonId = useId();
  // A composition can end on the same keydown that would send; the flag set
  // by `compositionend` lets the next Enter through and no earlier one.
  const composing = useRef(false);

  const change = (next: string) => {
    if (!isControlled) setOwn(next);
    onValueChange?.(next);
  };

  const canSend = !disabled && value.trim().length > 0;

  const send = () => {
    if (!canSend) return;
    onSubmit(value);
    if (!isControlled) setOwn('');
  };

  const onKeyDown = (
    event: KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>,
  ) => {
    if (event.key !== 'Enter' || event.shiftKey) return;
    if (
      composing.current ||
      event.nativeEvent.isComposing ||
      event.keyCode === 229
    )
      return;
    event.preventDefault();
    send();
  };

  const shared = {
    id,
    name,
    value,
    disabled,
    autoFocus,
    placeholder: disabled && disabledReason ? disabledReason : placeholder,
    'aria-label': ariaLabel ?? placeholder,
    'aria-describedby': disabled && disabledReason ? reasonId : undefined,
    onKeyDown,
    onCompositionStart: () => {
      composing.current = true;
    },
    onCompositionEnd: () => {
      composing.current = false;
    },
  };

  const text = size === 'sm' ? 'text-xs' : 'text-sm';
  const field = multiline ? (
    <AutoTextarea
      {...shared}
      ref={inputRef as Ref<HTMLTextAreaElement>}
      maxHeight={maxHeight}
      className={cn(BARE, text, 'leading-5', size === 'sm' ? 'py-1.5' : 'py-2')}
      onChange={(event) => change(event.currentTarget.value)}
    />
  ) : (
    <input
      {...shared}
      ref={inputRef as Ref<HTMLInputElement>}
      type="text"
      className={cn(BARE, text, 'h-full')}
      onChange={(event) => change(event.currentTarget.value)}
    />
  );

  const sendButton = (
    <Button
      variant="solid"
      size="sm"
      icon
      aria-label={sendLabel}
      disabled={!canSend}
      onClick={send}
      className={cn('shrink-0', size === 'sm' && 'h-7')}
    >
      <SendHorizontal size={size === 'sm' ? 14 : 16} aria-hidden="true" />
    </Button>
  );

  const leadingRow = leading ? (
    <div
      data-prompt-leading
      className="flex shrink-0 items-center gap-0.5 text-ink-2"
    >
      {leading}
    </div>
  ) : null;

  return (
    <div
      data-prompt-input
      data-disabled={disabled || undefined}
      title={disabled && disabledReason ? disabledReason : undefined}
      className={cn(
        FILL[tone],
        'border border-line-strong rounded-control',
        'transition-[border-color,box-shadow] duration-(--dur-fast)',
        'focus-within:border-ink/70 focus-within:ring-2 focus-within:ring-ink/22',
        disabled && 'opacity-60',
        layout === 'stacked'
          ? 'flex flex-col gap-1.5 px-3 pt-1.5 pb-2'
          : cn(
              // A growing field keeps its buttons on the last line, as a
              // composer does; a one-line field centres them.
              'flex gap-2',
              multiline ? 'items-end' : 'items-center',
              size === 'sm'
                ? 'min-h-9 py-1 pr-1 pl-3'
                : 'min-h-(--size-field) py-1.5 pr-1.5 pl-3.5',
            ),
        className,
      )}
    >
      {layout === 'stacked' ? (
        <>
          {field}
          <div className="flex items-center justify-between gap-2">
            {leadingRow ?? <span />}
            {sendButton}
          </div>
        </>
      ) : (
        <>
          {leadingRow}
          {field}
          {sendButton}
        </>
      )}
      {disabled && disabledReason ? (
        <span id={reasonId} className="sr-only">
          {disabledReason}
        </span>
      ) : null}
    </div>
  );
}
