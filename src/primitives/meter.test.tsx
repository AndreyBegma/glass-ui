import { describe, expect, test } from 'bun:test';
import { render } from '@testing-library/react';
import { Meter, meterTone } from './meter';

const tone = (props: Partial<Parameters<typeof Meter>[0]>) => {
  const { getByRole, unmount } = render(
    <Meter value={0} label="Disk" {...props} />,
  );
  const result = getByRole('meter').getAttribute('data-tone');
  unmount();
  return result;
};

describe('Meter', () => {
  test('renders role meter with aria attributes and a label', () => {
    const { getByRole } = render(
      <Meter value={40} min={10} max={90} label="Disk" valueText="40 GB" />,
    );
    const el = getByRole('meter', { name: 'Disk' });
    expect(el.getAttribute('aria-valuenow')).toBe('40');
    expect(el.getAttribute('aria-valuemin')).toBe('10');
    expect(el.getAttribute('aria-valuemax')).toBe('90');
    expect(el.getAttribute('aria-valuetext')).toBe('40 GB · OK');
  });

  test('without thresholds the tone is ok', () => {
    expect(tone({ value: 5 })).toBe('ok');
    expect(tone({ value: 95 })).toBe('ok');
  });

  test('optimum in the low region: low is ok, middle warns, high is danger', () => {
    const t = { low: 30, high: 70, optimum: 10 };
    expect(meterTone(10, 0, 100, t.low, t.high, t.optimum)).toBe('ok');
    expect(meterTone(50, 0, 100, t.low, t.high, t.optimum)).toBe('warn');
    expect(meterTone(90, 0, 100, t.low, t.high, t.optimum)).toBe('danger');
  });

  test('optimum in the high region: high is ok, middle warns, low is danger', () => {
    const t = { low: 30, high: 70, optimum: 90 };
    expect(meterTone(90, 0, 100, t.low, t.high, t.optimum)).toBe('ok');
    expect(meterTone(50, 0, 100, t.low, t.high, t.optimum)).toBe('warn');
    expect(meterTone(10, 0, 100, t.low, t.high, t.optimum)).toBe('danger');
  });

  test('optimum in the middle region: the extremes warn', () => {
    const t = { low: 30, high: 70, optimum: 50 };
    expect(meterTone(50, 0, 100, t.low, t.high, t.optimum)).toBe('ok');
    expect(meterTone(10, 0, 100, t.low, t.high, t.optimum)).toBe('warn');
    expect(meterTone(90, 0, 100, t.low, t.high, t.optimum)).toBe('warn');
  });

  test('tone shows as text and in the component', () => {
    const { getByText, getByRole } = render(
      <Meter
        value={95}
        low={30}
        high={70}
        optimum={10}
        label="Quota"
        labels={{ danger: 'Over' }}
      />,
    );
    expect(getByText('Over')).toBeTruthy();
    expect(getByRole('meter').getAttribute('aria-valuetext')).toBe('95 · Over');
  });

  test('out-of-range values are clamped', () => {
    const { getByRole, container, rerender } = render(
      <Meter value={150} label="Disk" />,
    );
    expect(getByRole('meter').getAttribute('aria-valuenow')).toBe('100');
    expect(
      (container.querySelector('[style]') as HTMLElement).style.width,
    ).toBe('100%');
    rerender(<Meter value={-20} label="Disk" />);
    expect(getByRole('meter').getAttribute('aria-valuenow')).toBe('0');
  });

  test('bar draws ticks for low and high', () => {
    const { container } = render(
      <Meter value={50} low={30} high={70} label="Disk" />,
    );
    expect(container.querySelectorAll('[data-meter-tick]').length).toBe(2);
  });

  test('gauge variant draws an svg arc and the value', () => {
    const { container, getByRole } = render(
      <Meter value={40} variant="gauge" label="Disk" valueText="40%" />,
    );
    expect(container.querySelector('svg')).toBeTruthy();
    expect(getByRole('meter').textContent).toContain('40%');
  });

  test('motion is gated behind motion-safe', () => {
    const { container } = render(<Meter value={40} label="Disk" />);
    const bar = container.querySelector('[style]') as HTMLElement;
    expect(bar.className).toContain('motion-safe:transition-');
    expect(bar.className).not.toMatch(/(^|\s)transition-/);
  });
});
