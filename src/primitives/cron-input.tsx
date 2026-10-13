'use client';

import { type ReactNode, useEffect, useId, useMemo, useRef, useState } from 'react';
import { cn } from '../lib/cn';
import { Field, Input, Select } from './field';

/**
 * #74 — CronInput: a 5-field cron expression with presets, a plain-language
 * description, the next runs in a time zone, and validation.
 *
 * Exported only from `glass-ui/cron-input`, never the barrel: this file is the
 * only one that touches the optional peers `cron-parser` and `cronstrue` (D8).
 * They are loaded with a dynamic `import()` on mount rather than at the top of
 * the module, because a static import of a missing package is a bundler error
 * that cannot be reworded; a dynamic one can be caught, and the field then says
 * which packages to install instead of throwing at import time.
 */
export type CronPreset = {
  label: string;
  /** The 5-field expression the preset sets. */
  expression: string;
};

export type CronInputChange = {
  expression: string;
  /** An invalid expression still fires `onChange`; the consumer decides (D9). */
  valid: boolean;
};

export type CronInputProps = {
  value: string;
  onChange: (v: CronInputChange) => void;
  /** An IANA zone. Defaults to the browser's. */
  timezone?: string;
  /** `false` hides the preset select. */
  presets?: CronPreset[] | false;
  /** How many upcoming runs to list. Default 5. */
  nextRuns?: number;
  label: string;
  description?: ReactNode;
  disabled?: boolean;
  className?: string;
};

export const DEFAULT_CRON_PRESETS: CronPreset[] = [
  { label: 'Every hour', expression: '0 * * * *' },
  { label: 'Every day at 03:00', expression: '0 3 * * *' },
  { label: 'Weekdays at 09:00', expression: '0 9 * * 1-5' },
  { label: 'Every Monday at 09:00', expression: '0 9 * * 1' },
  { label: 'First of the month at 00:00', expression: '0 0 1 * *' },
];

const CUSTOM = 'custom';

// ---------------------------------------------------------------------------
// The optional peers
// ---------------------------------------------------------------------------

type CronParserModule = typeof import('cron-parser');
type Cronstrue = { toString: (expression: string, options?: { use24HourTimeFormat?: boolean }) => string };

export type CronPeers = { parser: CronParserModule['CronExpressionParser']; cronstrue: Cronstrue };

/** What `loadCronPeers` imports. Injected by the tests; the component never passes it. */
export type CronPeerImports = {
  parser: () => Promise<unknown>;
  cronstrue: () => Promise<unknown>;
};

const PEER_IMPORTS: CronPeerImports = {
  parser: () => import('cron-parser'),
  cronstrue: () => import('cronstrue'),
};

export function missingPeersMessage(missing: string[]): string {
  const all = ['cron-parser', 'cronstrue'];
  return `CronInput needs the optional peer ${
    missing.length === 1 ? 'dependency' : 'dependencies'
  } ${missing.map((m) => `"${m}"`).join(' and ')}, which could not be loaded. Install ${
    missing.length === all.length ? 'them' : 'it'
  } with: npm install ${missing.join(' ')}`;
}

export class CronPeersMissingError extends Error {
  readonly missing: string[];
  constructor(missing: string[]) {
    super(missingPeersMessage(missing));
    this.name = 'CronPeersMissingError';
    this.missing = missing;
  }
}

/** Loads both peers, or throws a `CronPeersMissingError` naming the ones that failed. */
export async function loadCronPeers(imports: CronPeerImports = PEER_IMPORTS): Promise<CronPeers> {
  const [parser, strue] = await Promise.allSettled([imports.parser(), imports.cronstrue()]);
  const missing: string[] = [];
  if (parser.status === 'rejected') missing.push('cron-parser');
  if (strue.status === 'rejected') missing.push('cronstrue');
  if (parser.status === 'rejected' || strue.status === 'rejected') {
    throw new CronPeersMissingError(missing);
  }
  const p = parser.value as Partial<CronParserModule>;
  const c = strue.value as { default?: Cronstrue } & Partial<Cronstrue>;
  const cronstrue = c.default ?? (c as Cronstrue);
  if (!p.CronExpressionParser || typeof cronstrue?.toString !== 'function') {
    throw new CronPeersMissingError(
      [!p.CronExpressionParser && 'cron-parser', typeof cronstrue?.toString !== 'function' && 'cronstrue'].filter(
        (m): m is string => typeof m === 'string',
      ),
    );
  }
  return { parser: p.CronExpressionParser, cronstrue };
}

let peersPromise: Promise<CronPeers> | undefined;
let peersLoaded: CronPeers | undefined;

function usePeers(): { peers: CronPeers | undefined; error: string | undefined } {
  const [state, setState] = useState<{ peers?: CronPeers; error?: string }>({ peers: peersLoaded });
  useEffect(() => {
    if (peersLoaded) return;
    let live = true;
    peersPromise ??= loadCronPeers();
    peersPromise.then(
      (peers) => {
        peersLoaded = peers;
        if (live) setState({ peers });
      },
      (err: unknown) => {
        peersPromise = undefined; // let a later mount retry
        if (live) setState({ error: err instanceof Error ? err.message : String(err) });
      },
    );
    return () => {
      live = false;
    };
  }, []);
  return { peers: state.peers, error: state.error };
}

// ---------------------------------------------------------------------------
// Validation, rephrased for people (D9)
// ---------------------------------------------------------------------------

const FIELDS_BY_RANGE: Record<string, string> = {
  '0-59': 'minute',
  '0-23': 'hour',
  '1-31': 'day of month',
  '1-12': 'month',
  '0-7': 'day of week',
};

/** The parser's message, as a sentence a person can act on. */
export function explainCronError(raw: string): string {
  const range = raw.match(/got value (\S+) expected range (\d+-\d+)/);
  if (range) {
    const name = FIELDS_BY_RANGE[range[2]] ?? 'value';
    return `${name} must be ${range[2].replace('-', '–')}`;
  }
  if (/cannot repeat at every 0/i.test(raw)) return 'a step cannot be 0';
  const inverted = raw.match(/Invalid range: (\S+), min/);
  if (inverted) return `range ${inverted[1]} runs backwards`;
  const chars = raw.match(/Invalid characters, got value: (.+)$/);
  if (chars) return `"${chars[1]}" is not a number, name or * `.trimEnd();
  return raw.replace(/^Constraint error, /i, '').replace(/^\w/, (c) => c.toLowerCase());
}

type Evaluation =
  | { valid: true; description: string; runs: Date[]; zoneError?: undefined }
  | { valid: false; error: string };

function evaluate(
  peers: CronPeers,
  expression: string,
  timezone: string,
  count: number,
  now: Date,
): Evaluation {
  const trimmed = expression.trim();
  if (!trimmed) return { valid: false, error: 'enter a cron expression' };
  const parts = trimmed.split(/\s+/);
  if (parts.length !== 5) {
    return {
      valid: false,
      error: `expected 5 fields (minute hour day-of-month month day-of-week), got ${parts.length}`,
    };
  }
  if (parts.some((p) => p.startsWith('@'))) return { valid: false, error: 'macros are not supported' };
  let parsed: ReturnType<CronPeers['parser']['parse']>;
  try {
    parsed = peers.parser.parse(parts.join(' '), { tz: timezone, currentDate: now });
  } catch (err) {
    return { valid: false, error: explainCronError(err instanceof Error ? err.message : String(err)) };
  }
  let runs: Date[];
  try {
    runs = parsed.take(count).map((d) => d.toDate());
  } catch (err) {
    // `take` throws past the end of the iteration range, and for an unknown zone.
    if (/time ?zone/i.test(String(err))) return { valid: false, error: `unknown time zone "${timezone}"` };
    runs = [];
  }
  let description = '';
  try {
    description = peers.cronstrue.toString(parts.join(' '));
  } catch {
    description = '';
  }
  return { valid: true, description, runs };
}

function browserZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function formatRun(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: timezone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}

// ---------------------------------------------------------------------------
// The component
// ---------------------------------------------------------------------------

export function CronInput({
  value,
  onChange,
  timezone,
  presets = DEFAULT_CRON_PRESETS,
  nextRuns = 5,
  label,
  description,
  disabled,
  className,
}: CronInputProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const { peers, error: peersError } = usePeers();
  const zone = timezone ?? browserZone();
  // A preset the person picked while its expression still reads "custom"
  // would snap back to the preset; remembering the choice keeps "Custom" selected.
  const [forcedCustom, setForcedCustom] = useState(false);

  const result = useMemo(
    () => (peers ? evaluate(peers, value, zone, nextRuns, new Date()) : undefined),
    [peers, value, zone, nextRuns],
  );

  const presetList = presets === false ? [] : presets;
  const presetIndex = presetList.findIndex((p) => p.expression === value.trim());
  const selected = forcedCustom || presetIndex < 0 ? CUSTOM : String(presetIndex);

  const emit = (expression: string) => {
    const valid = peers
      ? evaluate(peers, expression, zone, 1, new Date()).valid
      : false; // nothing can be validated until the peers have loaded
    onChange({ expression, valid });
  };

  const error = result && !result.valid ? result.error : undefined;

  return (
    <div data-cron-input className={cn('flex flex-col gap-3', className)}>
      <Field label={label} htmlFor={`${id}-expr`} error={error ? `${label}: ${error}` : undefined}>
        <div className="flex flex-wrap gap-2">
          {presetList.length > 0 && (
            <Select
              aria-label={`${label} preset`}
              disabled={disabled}
              value={selected}
              onChange={(e) => {
                const next = e.target.value;
                if (next === CUSTOM) {
                  setForcedCustom(true);
                  inputRef.current?.focus();
                  return;
                }
                setForcedCustom(false);
                emit(presetList[Number(next)].expression);
              }}
              className="w-auto min-w-48 pointer-coarse:min-h-(--size-tap)"
            >
              {presetList.map((p, i) => (
                <option key={`${p.label}-${p.expression}`} value={String(i)}>
                  {p.label}
                </option>
              ))}
              <option value={CUSTOM}>Custom</option>
            </Select>
          )}
          <Input
            ref={inputRef}
            id={`${id}-expr`}
            value={value}
            disabled={disabled}
            spellCheck={false}
            autoComplete="off"
            aria-invalid={error ? true : undefined}
            aria-describedby={description ? `${id}-desc` : undefined}
            placeholder="* * * * *"
            onChange={(e) => {
              setForcedCustom(false);
              emit(e.target.value);
            }}
            className="min-w-40 flex-1 font-mono tabular-nums"
          />
        </div>
      </Field>

      {description ? (
        <div id={`${id}-desc`} className="text-xs text-ink-3">
          {description}
        </div>
      ) : null}

      {peersError ? (
        <p role="alert" data-cron-peers-error className="text-xs text-danger">
          {peersError}
        </p>
      ) : null}

      {result?.valid ? (
        <div data-cron-preview className="flex flex-col gap-2 rounded-control border border-line bg-surface p-3">
          {result.description ? (
            <p data-cron-description className="text-sm text-ink">
              {result.description}
            </p>
          ) : null}
          <div className="text-xs text-ink-3">
            Next {result.runs.length === 1 ? 'run' : `${result.runs.length} runs`} ·{' '}
            <span data-cron-zone>{zone}</span>
          </div>
          <ol data-cron-runs className="flex flex-col gap-0.5 text-sm tabular-nums text-ink-2">
            {result.runs.map((run) => (
              <li key={run.getTime()}>
                <time dateTime={run.toISOString()}>{formatRun(run, zone)}</time>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}
