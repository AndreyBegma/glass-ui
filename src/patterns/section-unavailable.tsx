import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

/**
 * "This section is not answering."
 *
 * FEAT-20260831-003 — the other half of `EmptyState`, and the reason it could
 * not be left behind. Denitsa's rule for the pair, which is worth adopting
 * wholesale: **an empty state and a broken state must never look alike.** If an
 * unreachable section looks like an empty one, the person concludes their data
 * is gone — wrong in the most alarming possible direction.
 *
 * So this is deliberately unlike `EmptyState` in every dimension a person
 * actually perceives:
 *
 * | | `EmptyState` | `SectionUnavailable` |
 * |---|---|---|
 * | alignment | centred | left, in a bordered panel |
 * | colour | neutral ink | warn, with a tinted border |
 * | tone | invitation | statement of fact |
 * | second line | what goes here | **what still works** |
 *
 * Not `danger`. An unreachable section is not data loss, and painting it red
 * says something untrue about the person's data. `warn` exists for this.
 *
 * `stillWorks` is not decoration: "no data was lost" is the only line most
 * people read, and somebody whose downloads are down needs to know their
 * library is fine.
 *
 * **The wording is the caller's, and that is a deliberate split.** Denitsa's
 * version composed the sentence itself — `{section} is not answering` — which
 * made a design system carry one product's phrasing. What this package can
 * enforce is the part the rule is actually about: that the two states do not
 * look alike. What it cannot enforce is that a caller passes a sentence in the
 * right voice, and pretending otherwise by hiding the verb would only move the
 * problem somewhere a review cannot see it.
 */
export function SectionUnavailable({
  title,
  stillWorks,
  detail,
  action,
}: {
  /** A statement of fact, in the caller's voice: "Downloads is not answering". */
  title: string;
  /** What is unaffected. Omit only if genuinely nothing is. */
  stillWorks?: string;
  /** Optional technical line — a request id, a time. Never a stack trace. */
  detail?: string;
  /** Usually "Try again". Never "Refresh the page". */
  action?: ReactNode;
}) {
  return (
    <div
      role="status"
      className={cn(
        'flex flex-col gap-2 rounded-surface',
        'border border-warn/30 bg-warn/8 px-4 py-3 text-left',
      )}
    >
      <p className="text-warn text-sm font-medium">{title}</p>
      {stillWorks && <p className="text-ink-2 text-sm">{stillWorks}</p>}
      {detail && <p className="text-ink-3 text-xs">{detail}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
