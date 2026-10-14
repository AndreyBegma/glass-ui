'use client';

import { type ReactNode, useEffect, useRef } from 'react';
import { Button } from './button';
import { DialogContent, DialogRoot } from './dialog';
import { Spinner } from './spinner';

/**
 * #130 — the question before a thing that cannot be taken back.
 *
 * AgentDock had about ten of these written by hand over `DialogContent`
 * (budgets, users, the Fleet stop dialogs), and no two agreed: "Delete
 * budget" as a title on one, "Stop the orchestrator?" on the next; Cancel as
 * `glass` here and `ghost` there; the destructive verb on the left on one
 * screen. A confirmation is the one dialog where a muscle-memory click lands
 * on the answer, so its layout has to be the same everywhere. This is that
 * layout, and only that: it owns no state and closes nothing.
 *
 * **The title is a question** ("Delete this budget?"), and `verb` is the
 * answer in one word ("Delete"), so the button reads as the reply to the
 * heading rather than as a second, vaguer label.
 *
 * **Initial focus is the safe answer.** For `danger` it lands on Cancel, so an
 * Enter pressed by reflex as the dialog opens does not delete anything; for
 * `default` the action is the expected one and takes the focus. `DialogContent`
 * itself focuses the panel (so a screen reader hears the title first); the
 * choice is made one tick later, after Radix's own focus move, rather than by
 * touching `dialog.tsx`.
 *
 * **`onConfirm` does not close the dialog.** The caller usually has a request
 * in flight and must not close on a failure; it calls `onOpenChange(false)`
 * itself when the work is done. While `busy`, both buttons are disabled, the
 * verb shows a spinner, and Escape or the close button are ignored — closing
 * a dialog whose request is already on its way would only hide the result.
 */
export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** A question: "Delete this budget?". */
  title: string;
  /**
   * What happens, and whether it can be undone. A string is announced as the
   * dialog's description; anything richer is drawn under the title.
   */
  consequence?: ReactNode;
  /** The answer, in one word: "Delete", "Stop", "Revoke". */
  verb: string;
  /** `danger` (default) is a destructive verb and focuses Cancel; `default` is a `solid` verb and focuses it. */
  tone?: 'danger' | 'default';
  onConfirm: () => void;
  /** A request is in flight: both buttons are disabled and the verb shows a spinner. */
  busy?: boolean;
  /** Default "Cancel". */
  cancelLabel?: string;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  consequence,
  verb,
  tone = 'danger',
  onConfirm,
  busy = false,
  cancelLabel = 'Cancel',
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const verbRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => {
      (tone === 'danger' ? cancelRef : verbRef).current?.focus();
    }, 0);
    return () => clearTimeout(id);
  }, [open, tone]);

  const described = typeof consequence === 'string' ? consequence : undefined;
  const rich = described === undefined && consequence ? consequence : null;

  return (
    <DialogRoot
      open={open}
      onOpenChange={(next) => {
        if (busy && !next) return;
        onOpenChange(next);
      }}
    >
      <DialogContent
        title={title}
        description={described}
        dismissible={!busy}
        footer={
          <>
            <Button
              ref={cancelRef}
              variant="ghost"
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              {cancelLabel}
            </Button>
            <Button
              ref={verbRef}
              variant={tone === 'danger' ? 'danger' : 'solid'}
              disabled={busy}
              aria-busy={busy || undefined}
              onClick={onConfirm}
            >
              {busy ? <Spinner size="sm" label={null} /> : null}
              {verb}
            </Button>
          </>
        }
      >
        {rich ? <div className="text-sm text-ink-2">{rich}</div> : null}
      </DialogContent>
    </DialogRoot>
  );
}
