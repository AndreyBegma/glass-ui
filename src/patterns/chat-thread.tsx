'use client';

import { ArrowDown, CircleCheck, CircleDashed } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import {
  type ReactNode,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { cn } from '../lib/cn';
import { Avatar } from '../primitives/avatar';
import { Button } from '../primitives/button';
import { Progress } from '../primitives/progress';
import { PromptInput, type PromptInputProps } from '../primitives/prompt-input';

/**
 * #94 — a conversation: a list of messages and the box to add one.
 *
 * **The body is text unless you say otherwise.** `body` is a string, drawn as
 * text with its line breaks kept — never as HTML. Markdown, code blocks and
 * links are `renderBody`'s job, with whatever renderer the application
 * already trusts; the package does not ship one and does not guess which.
 *
 * **It sticks to the bottom, and does not drag you there.** While the list is
 * scrolled to its end, a new message keeps it there. Scrolled up to read,
 * it stays put and a "N new" chip counts what arrived since; the chip, or
 * scrolling back down, catches up. Sending a message counts as wanting the
 * end: the reply should be in view. Smooth scrolling only when motion is
 * allowed.
 *
 * **A message can carry a task.** `progress` draws a small block inside it —
 * a check when done, a bar and its label while not — for "Task in progress
 * 45%" without a second component.
 *
 * The list is `role="log"`, which is polite by default: a reader hears a new
 * message once, without it interrupting. Every string it writes itself is in
 * `labels`.
 */
export interface ChatMessageProgress {
  label: string;
  value: number;
  max?: number;
  /** A check instead of a bar. */
  done?: boolean;
  /** Beside the label: "45%". Copy is the caller's. */
  hint?: string;
}

export interface ChatMessage {
  id: string;
  author: string;
  /** Replaces the initials avatar: an icon tile, an image. */
  avatar?: ReactNode;
  /** As drawn: "10:24 AM". */
  time?: string;
  /** Machine-readable, for the `<time>` element. */
  dateTime?: string;
  /** Text. Rendered as text — see `renderBody` for anything richer. */
  body: string;
  progress?: ChatMessageProgress;
}

export interface ChatThreadLabels {
  /** The log's accessible name. Default "Messages". */
  log: string;
  /** The chip. Default "N new". */
  newMessages: (count: number) => string;
}

const DEFAULT_LABELS: ChatThreadLabels = {
  log: 'Messages',
  newMessages: (count) => `${count} new`,
};

export interface ChatThreadProps {
  messages: readonly ChatMessage[];
  /** Markdown, code, links: the caller's renderer. Default: the body as text. */
  renderBody?: (message: ChatMessage) => ReactNode;
  /** The composer under the list; `null` for a read-only thread. */
  composer?: PromptInputProps | null;
  /** Shown in place of the list while there are no messages. */
  empty?: ReactNode;
  labels?: Partial<ChatThreadLabels>;
  className?: string;
}

/** How close to the end still counts as "at the end", in px. */
const STICK = 24;

function distanceFromEnd(el: HTMLElement) {
  return el.scrollHeight - el.clientHeight - el.scrollTop;
}

function TaskBlock({ progress }: { progress: ChatMessageProgress }) {
  const Icon = progress.done ? CircleCheck : CircleDashed;
  return (
    <div
      data-chat-task={progress.done ? 'done' : 'running'}
      className="mt-2 flex flex-col gap-2 rounded-control border border-line bg-surface p-3"
    >
      {progress.done ? (
        <p className="flex items-center gap-2 text-xs font-medium text-ink">
          <Icon size={16} aria-hidden="true" className="text-ok" />
          {progress.label}
          {progress.hint ? (
            <span className="ml-auto text-ink-2 tabular-nums">
              {progress.hint}
            </span>
          ) : null}
        </p>
      ) : (
        <Progress
          value={progress.value}
          max={progress.max}
          label={progress.label}
          hint={progress.hint}
          tone="ok"
        />
      )}
    </div>
  );
}

export function ChatThread({
  messages,
  renderBody,
  composer,
  empty,
  labels: labelsProp,
  className,
}: ChatThreadProps) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp };
  const reduced = useReducedMotion();
  const scroller = useRef<HTMLDivElement>(null);
  const atEnd = useRef(true);
  const seen = useRef(messages.length);
  const [unseen, setUnseen] = useState(0);

  const toEnd = useCallback(
    (smooth: boolean) => {
      const el = scroller.current;
      if (!el) return;
      const top = el.scrollHeight;
      if (smooth && !reduced && typeof el.scrollTo === 'function') {
        el.scrollTo({ top, behavior: 'smooth' });
      } else {
        el.scrollTop = top;
      }
    },
    [reduced],
  );

  // Before paint, so an appended message never shows a frame above the end.
  useLayoutEffect(() => {
    const added = messages.length - seen.current;
    seen.current = messages.length;
    if (added <= 0) {
      if (added < 0) setUnseen(0);
      return;
    }
    if (atEnd.current) toEnd(false);
    else setUnseen((count) => count + added);
  }, [messages.length, toEnd]);

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    atEnd.current = distanceFromEnd(el) <= STICK;
    if (atEnd.current) setUnseen(0);
  };

  const catchUp = () => {
    atEnd.current = true;
    setUnseen(0);
    toEnd(true);
  };

  return (
    <div data-chat-thread className={cn('flex min-h-0 flex-col', className)}>
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div
          ref={scroller}
          role="log"
          aria-label={labels.log}
          // biome-ignore lint/a11y/noNoninteractiveTabindex: a scroll region must be keyboard-reachable
          tabIndex={0}
          onScroll={onScroll}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 py-2"
        >
          {messages.length === 0 && empty ? (
            empty
          ) : (
            <ol className="flex flex-col gap-4">
              {messages.map((message) => (
                <li
                  key={message.id}
                  data-chat-message={message.id}
                  className="flex gap-3"
                >
                  <div className="shrink-0">
                    {message.avatar ?? (
                      <Avatar
                        size="sm"
                        name={message.author}
                        aria-hidden="true"
                      />
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <p className="flex items-baseline gap-2">
                      <span className="text-[13px] font-semibold text-ink">
                        {message.author}
                      </span>
                      {message.time ? (
                        <time
                          dateTime={message.dateTime}
                          className="text-label text-ink-3"
                        >
                          {message.time}
                        </time>
                      ) : null}
                    </p>
                    <div
                      data-chat-body
                      className="min-w-0 text-[13px] leading-5 text-ink-2 break-words"
                    >
                      {renderBody ? (
                        renderBody(message)
                      ) : (
                        <p className="whitespace-pre-wrap">{message.body}</p>
                      )}
                    </div>
                    {message.progress ? (
                      <TaskBlock progress={message.progress} />
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center">
          {unseen > 0 ? (
            <Button
              variant="solid"
              size="sm"
              data-chat-new=""
              onClick={catchUp}
              className="pointer-events-auto rounded-full shadow-[0_4px_12px_var(--glass-shadow)]"
            >
              <ArrowDown size={14} aria-hidden="true" />
              {labels.newMessages(unseen)}
            </Button>
          ) : null}
        </div>
      </div>
      {composer ? (
        <div className="shrink-0 pt-3">
          <PromptInput
            layout="stacked"
            {...composer}
            onSubmit={(value) => {
              atEnd.current = true;
              composer.onSubmit(value);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
