import { afterEach, beforeEach, describe, expect, setSystemTime, test } from 'bun:test';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import {
  CronInput,
  type CronInputChange,
  CronPeersMissingError,
  explainCronError,
  loadCronPeers,
  missingPeersMessage,
} from './cron-input';

function Harness({
  initial,
  onChange,
  ...rest
}: {
  initial: string;
  onChange?: (v: CronInputChange) => void;
  timezone?: string;
  presets?: false;
  nextRuns?: number;
}) {
  const [value, setValue] = useState(initial);
  return (
    <CronInput
      label="Schedule"
      value={value}
      onChange={(v) => {
        setValue(v.expression);
        onChange?.(v);
      }}
      {...rest}
    />
  );
}

/** The peers load on a microtask after mount; wait for the preview or an error. */
async function loaded() {
  await waitFor(() => {
    if (!document.querySelector('[data-cron-preview], [role="alert"]')) throw new Error('not yet');
  });
}

const expressionField = () => screen.getByLabelText('Schedule') as HTMLInputElement;
const presetSelect = () => screen.getByLabelText('Schedule preset') as HTMLSelectElement;
const runs = () => [...document.querySelectorAll('[data-cron-runs] time')];

beforeEach(() => {
  setSystemTime(new Date('2026-03-27T12:00:00Z'));
});
afterEach(() => {
  setSystemTime();
  cleanup();
});

describe('CronInput', () => {
  test('0 9 * * 1-5 shows "At 09:00 AM, Monday through Friday" (asserted loosely)', async () => {
    render(<Harness initial="0 9 * * 1-5" />);
    await loaded();
    const text = document.querySelector('[data-cron-description]')?.textContent ?? '';
    expect(text).toMatch(/09:00/);
    expect(text).toMatch(/Monday through Friday/);
  });

  test('lists the next 5 runs in Europe/Berlin across a DST change correctly (frozen clock)', async () => {
    // Berlin springs forward on 29 March 2026: 02:00 becomes 03:00, so 02:30
    // does not exist that night. Runs are 28th, 29th (shifted to 03:30), 30th...
    render(<Harness initial="30 2 * * *" timezone="Europe/Berlin" />);
    await loaded();
    const times = runs().map((t) => t.getAttribute('datetime'));
    expect(times).toEqual([
      '2026-03-28T01:30:00.000Z', // 02:30 CET
      '2026-03-29T01:30:00.000Z', // 03:30 CEST — the skipped hour
      '2026-03-30T00:30:00.000Z', // 02:30 CEST
      '2026-03-31T00:30:00.000Z',
      '2026-04-01T00:30:00.000Z',
    ]);
    expect(document.querySelector('[data-cron-zone]')?.textContent).toBe('Europe/Berlin');
    // Shown in the zone, not in UTC or the machine's: 02:30 local, not 01:30.
    expect(runs()[0].textContent).toMatch(/02:30/);
    expect(runs()[1].textContent).toMatch(/03:30/);
  });

  test('nextRuns changes how many are listed', async () => {
    render(<Harness initial="0 * * * *" nextRuns={3} timezone="UTC" />);
    await loaded();
    expect(runs().length).toBe(3);
  });

  test('61 * * * * shows an error and calls onChange with valid: false', async () => {
    const seen: CronInputChange[] = [];
    render(<Harness initial="0 * * * *" onChange={(v) => seen.push(v)} />);
    await loaded();
    fireEvent.change(expressionField(), { target: { value: '61 * * * *' } });
    expect(seen.at(-1)).toEqual({ expression: '61 * * * *', valid: false });
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/minute must be 0–59/);
    expect(expressionField().getAttribute('aria-invalid')).toBe('true');
  });

  test('a valid edit calls onChange with valid: true', async () => {
    const seen: CronInputChange[] = [];
    render(<Harness initial="0 * * * *" onChange={(v) => seen.push(v)} />);
    await loaded();
    fireEvent.change(expressionField(), { target: { value: '15 4 * * *' } });
    expect(seen.at(-1)).toEqual({ expression: '15 4 * * *', valid: true });
  });

  test('a wrong field count is an error', async () => {
    render(<Harness initial="* * * *" />);
    await screen.findByRole('alert');
    expect(screen.getByRole('alert').textContent).toMatch(/expected 5 fields.*got 4/);
  });

  test('next runs are shown only when the expression is valid', async () => {
    render(<Harness initial="0 * * * *" />);
    await loaded();
    expect(document.querySelector('[data-cron-preview]')).not.toBeNull();
    fireEvent.change(expressionField(), { target: { value: '61 * * * *' } });
    await screen.findByRole('alert');
    expect(document.querySelector('[data-cron-preview]')).toBeNull();
    expect(runs().length).toBe(0);
  });

  test('presets set the expression', async () => {
    const seen: CronInputChange[] = [];
    render(<Harness initial="15 4 * * *" onChange={(v) => seen.push(v)} />);
    await loaded();
    expect(presetSelect().value).toBe('custom');
    fireEvent.change(presetSelect(), { target: { value: '2' } });
    expect(seen.at(-1)).toEqual({ expression: '0 9 * * 1-5', valid: true });
    expect(expressionField().value).toBe('0 9 * * 1-5');
    expect(presetSelect().value).toBe('2');
  });

  test('presets={false} hides the select', async () => {
    render(<Harness initial="0 * * * *" presets={false} />);
    await loaded();
    expect(screen.queryByLabelText('Schedule preset')).toBeNull();
  });

  test('choosing Custom focuses the field', async () => {
    render(<Harness initial="0 3 * * *" />);
    await loaded();
    expect(presetSelect().value).toBe('1');
    fireEvent.change(presetSelect(), { target: { value: 'custom' } });
    expect(document.activeElement).toBe(expressionField());
    expect(presetSelect().value).toBe('custom');
  });

  test('importing without the peers installed fails with a message naming them (mocked import failure)', async () => {
    const boom = () => Promise.reject(new Error('Cannot find module'));
    const ok = () => Promise.resolve({});
    const both = loadCronPeers({ parser: boom, cronstrue: boom });
    await expect(both).rejects.toBeInstanceOf(CronPeersMissingError);
    await expect(both).rejects.toThrow(/"cron-parser" and "cronstrue"/);
    await expect(loadCronPeers({ parser: ok, cronstrue: boom })).rejects.toThrow(/"cronstrue"/);
    await expect(loadCronPeers({ parser: boom, cronstrue: ok })).rejects.toThrow(/npm install cron-parser/);
    expect(missingPeersMessage(['cron-parser', 'cronstrue'])).toContain('npm install cron-parser cronstrue');
  });

  test('the real peers load', async () => {
    const peers = await loadCronPeers();
    expect(typeof peers.parser.parse).toBe('function');
    expect(peers.cronstrue.toString('0 * * * *')).toMatch(/hour/i);
  });

  test('explainCronError rephrases the parser for people', () => {
    expect(explainCronError('Constraint error, got value 25 expected range 0-23')).toBe('hour must be 0–23');
    expect(explainCronError('Constraint error, got value 32 expected range 1-31')).toBe('day of month must be 1–31');
    expect(explainCronError('Constraint error, got value 8 expected range 0-7')).toBe('day of week must be 0–7');
    expect(explainCronError('Invalid range: 5-1, min(5) > max(1)')).toBe('range 5-1 runs backwards');
  });

  test('the preset select is at least 44px on a coarse pointer', async () => {
    render(<Harness initial="0 * * * *" />);
    await loaded();
    expect(presetSelect().className.split(' ')).toContain('pointer-coarse:min-h-(--size-tap)');
  });

  test('renders in light and dark and data-material flat', async () => {
    for (const attr of [
      ['data-theme', 'light'],
      ['data-theme', 'dark'],
      ['data-material', 'flat'],
    ] as const) {
      document.documentElement.setAttribute(attr[0], attr[1]);
      const { container, unmount } = render(<Harness initial="0 * * * *" />);
      await loaded();
      expect(container.innerHTML).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(/i);
      // Solid surface, never glass (D12).
      expect(document.querySelector('[data-cron-preview]')?.className).toContain('bg-surface');
      unmount();
      document.documentElement.removeAttribute(attr[0]);
    }
  });
});
