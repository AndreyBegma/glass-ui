import { useState } from 'react';

/**
 * FEAT-20261013-006 (W242) — what `DateField` and `TimeField` share: text a
 * person is typing, that becomes the value only when it is committed.
 *
 * `draft` is `null` while the field shows the value. Typing makes it the text;
 * `commit` (blur, Enter) parses it. Text that parses calls `onValueChange` and
 * the draft goes; text that does not **stays**, marked `invalid`, and nothing
 * is called — a person who typed `31.02` sees `31.02` with the error, not the
 * old date back as if they had typed nothing. A new `value` from outside
 * replaces whatever was being typed.
 */
export function useDraftText(
  value: string,
  parse: (text: string) => string | null,
  onValueChange: (value: string) => void,
) {
  const [draft, setDraft] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [seen, setSeen] = useState(value);

  if (seen !== value) {
    setSeen(value);
    setDraft(null);
    setInvalid(false);
  }

  function reset() {
    setDraft(null);
    setInvalid(false);
  }

  function commit() {
    if (draft === null) return;
    const parsed = parse(draft);
    if (parsed === null) {
      setInvalid(true);
      return;
    }
    reset();
    if (parsed !== value) onValueChange(parsed);
  }

  return { draft, invalid, edit: setDraft, commit, reset };
}
