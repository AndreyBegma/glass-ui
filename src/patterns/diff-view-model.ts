import { diffLines, diffWordsWithSpace, parsePatch } from 'diff';

/**
 * #176 — DiffView's model: text or a unified patch in, rows out. Pure and
 * framework-free, and the one module that touches the optional peer `diff`.
 *
 * Both inputs become the same thing — a list of line operations, with a
 * marker where a patch skipped lines it does not carry — and then go through
 * one collapse, so a patch renders the same rows as the `oldText` / `newText`
 * it was made from with the same `context`. The only difference is what a
 * patch cannot know: the content of the lines between its hunks (a gap there
 * has a count and no lines, and does not expand) and how many lines follow
 * its last hunk (no trailing gap at all).
 *
 * A patch with several files renders its first.
 */
export type DiffLineKind = 'context' | 'add' | 'del';

/** A piece of a modified line; `changed` is the part diffWordsWithSpace marks. */
export type DiffWord = { text: string; changed: boolean };

export type DiffLine = {
  kind: DiffLineKind;
  text: string;
  /** Absent on an added line. */
  oldNo?: number;
  /** Absent on a removed line. */
  newNo?: number;
  /** Set when the line is one half of a modified pair. */
  words?: DiffWord[];
};

export type DiffGap = {
  type: 'gap';
  id: string;
  count: number;
  /** `null` when the lines are not known (between the hunks of a patch). */
  lines: DiffLine[] | null;
};

export type DiffRow = { type: 'line'; line: DiffLine } | DiffGap;

/** One row of the split view; `null` is the filler opposite an insertion or deletion. */
export type SplitRow =
  | { type: 'pair'; left: DiffLine | null; right: DiffLine | null }
  | DiffGap;

export type DiffModel = {
  rows: DiffRow[];
  additions: number;
  deletions: number;
  /** No line was added or removed. */
  empty: boolean;
};

export type DiffInput =
  | { patch: string; oldText?: string; newText?: string }
  | { patch?: undefined; oldText: string; newText: string };

/** Lines skipped by a patch, with no content. */
type Unknown = { unknown: number };
type Op = DiffLine | Unknown;

const isUnknown = (op: Op): op is Unknown => 'unknown' in op;

function linesOf(value: string): string[] {
  const parts = value.split('\n');
  if (parts[parts.length - 1] === '') parts.pop();
  return parts.map((part) => part.replace(/\r$/, ''));
}

function opsFromText(oldText: string, newText: string): Op[] {
  const ops: Op[] = [];
  let oldNo = 1;
  let newNo = 1;
  for (const change of diffLines(oldText, newText)) {
    for (const text of linesOf(change.value)) {
      if (change.added) ops.push({ kind: 'add', text, newNo: newNo++ });
      else if (change.removed) ops.push({ kind: 'del', text, oldNo: oldNo++ });
      else ops.push({ kind: 'context', text, oldNo: oldNo++, newNo: newNo++ });
    }
  }
  return ops;
}

function opsFromPatch(patch: string): Op[] {
  const [file] = parsePatch(patch);
  const ops: Op[] = [];
  let oldEnd = 1;
  for (const hunk of file?.hunks ?? []) {
    // An empty side is numbered from the line before it (`-0,0`).
    const oldStart = hunk.oldLines === 0 ? hunk.oldStart + 1 : hunk.oldStart;
    const skipped = oldStart - oldEnd;
    if (skipped > 0) ops.push({ unknown: skipped });
    let oldNo = oldStart;
    let newNo = hunk.newLines === 0 ? hunk.newStart + 1 : hunk.newStart;
    for (const raw of hunk.lines) {
      const sign = raw[0];
      const text = raw.slice(1).replace(/\r$/, '');
      if (sign === '+') ops.push({ kind: 'add', text, newNo: newNo++ });
      else if (sign === '-') ops.push({ kind: 'del', text, oldNo: oldNo++ });
      else if (sign === ' ')
        ops.push({ kind: 'context', text, oldNo: oldNo++, newNo: newNo++ });
      // `\ No newline at end of file` is about the line above, not a line.
    }
    oldEnd = oldNo;
  }
  return ops;
}

/**
 * A run of removed lines followed by a run of added ones is a modification:
 * the i-th removed line pairs with the i-th added one, and each gets the words
 * that differ. A pair with nothing but whitespace in common is a replacement,
 * not an edit, and is left unemphasised.
 */
function pairWords(ops: Op[]) {
  let i = 0;
  while (i < ops.length) {
    const dels: DiffLine[] = [];
    while (i < ops.length && !isUnknown(ops[i]) && (ops[i] as DiffLine).kind === 'del')
      dels.push(ops[i++] as DiffLine);
    const adds: DiffLine[] = [];
    while (i < ops.length && !isUnknown(ops[i]) && (ops[i] as DiffLine).kind === 'add')
      adds.push(ops[i++] as DiffLine);
    for (let k = 0; k < Math.min(dels.length, adds.length); k++) {
      const parts = diffWordsWithSpace(dels[k].text, adds[k].text);
      const common = parts.some((p) => !p.added && !p.removed && p.value.trim());
      if (!common) continue;
      dels[k].words = parts
        .filter((p) => !p.added)
        .map((p) => ({ text: p.value, changed: p.removed }));
      adds[k].words = parts
        .filter((p) => !p.removed)
        .map((p) => ({ text: p.value, changed: p.added }));
    }
    if (dels.length === 0 && adds.length === 0) i++;
  }
}

/**
 * Keeps `context` unchanged lines on each side of a change and folds the rest
 * of a run into a gap. A run at an edge — the start or end of the file, or a
 * patch's skipped lines — keeps context only on the side that faces a change.
 */
function collapse(ops: Op[], context: number): DiffRow[] {
  const rows: DiffRow[] = [];
  let gaps = 0;
  let i = 0;
  while (i < ops.length) {
    const op = ops[i];
    if (isUnknown(op)) {
      rows.push({ type: 'gap', id: `g${gaps++}`, count: op.unknown, lines: null });
      i++;
      continue;
    }
    if (op.kind !== 'context') {
      rows.push({ type: 'line', line: op });
      i++;
      continue;
    }
    const start = i;
    while (i < ops.length && !isUnknown(ops[i]) && (ops[i] as DiffLine).kind === 'context')
      i++;
    const run = ops.slice(start, i) as DiffLine[];
    const atStart = start === 0 || isUnknown(ops[start - 1]);
    const atEnd = i === ops.length || isUnknown(ops[i]);
    const before = atStart ? 0 : context;
    const after = atEnd ? 0 : context;
    const hidden = run.length - before - after;
    if (hidden <= 0) {
      for (const line of run) rows.push({ type: 'line', line });
      continue;
    }
    for (const line of run.slice(0, before)) rows.push({ type: 'line', line });
    rows.push({
      type: 'gap',
      id: `g${gaps++}`,
      count: hidden,
      lines: run.slice(before, before + hidden),
    });
    for (const line of run.slice(before + hidden)) rows.push({ type: 'line', line });
  }
  return rows;
}

export function buildDiff(input: DiffInput, context = 3): DiffModel {
  const ops =
    input.patch !== undefined
      ? opsFromPatch(input.patch)
      : opsFromText(input.oldText, input.newText);
  let additions = 0;
  let deletions = 0;
  for (const op of ops) {
    if (isUnknown(op)) continue;
    if (op.kind === 'add') additions++;
    else if (op.kind === 'del') deletions++;
  }
  const empty = additions === 0 && deletions === 0;
  if (!empty) pairWords(ops);
  return {
    rows: empty ? [] : collapse(ops, Math.max(0, context)),
    additions,
    deletions,
    empty,
  };
}

/** Replaces each expanded gap that has its lines with those lines. */
export function expandRows(rows: DiffRow[], expanded: ReadonlySet<string>): DiffRow[] {
  return rows.flatMap((row): DiffRow[] =>
    row.type === 'gap' && row.lines && expanded.has(row.id)
      ? row.lines.map((line) => ({ type: 'line', line }))
      : [row],
  );
}

/**
 * Aligns rows into two columns: an unchanged line sits on both sides; a change
 * block puts its removed lines on the left and its added lines on the right,
 * row by row, with a filler (`null`) opposite whichever side is shorter.
 */
export function splitRows(rows: DiffRow[]): SplitRow[] {
  const out: SplitRow[] = [];
  let i = 0;
  while (i < rows.length) {
    const row = rows[i];
    if (row.type === 'gap') {
      out.push(row);
      i++;
      continue;
    }
    if (row.line.kind === 'context') {
      out.push({ type: 'pair', left: row.line, right: row.line });
      i++;
      continue;
    }
    const left: DiffLine[] = [];
    const right: DiffLine[] = [];
    while (i < rows.length) {
      const next = rows[i];
      if (next.type !== 'line' || next.line.kind === 'context') break;
      // A removal after an addition starts the next block.
      if (next.line.kind === 'del' && right.length) break;
      (next.line.kind === 'del' ? left : right).push(next.line);
      i++;
    }
    for (let k = 0; k < Math.max(left.length, right.length); k++)
      out.push({ type: 'pair', left: left[k] ?? null, right: right[k] ?? null });
  }
  return out;
}
