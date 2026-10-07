/**
 * #74 — the chart's scales, hand-rolled (D3): a linear map, "nice" linear
 * ticks, and a band scale for a category x-axis. Pure, so the tests need no DOM.
 */

export type LinearScale = {
  (value: number): number;
  domain: [number, number];
  range: [number, number];
  invert: (pixel: number) => number;
};

/** Maps `domain` onto `range`. A zero-width domain maps to the range's middle. */
export function linearScale(
  domain: [number, number],
  range: [number, number],
): LinearScale {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0;
  const scale = ((v: number) =>
    span === 0 ? (r0 + r1) / 2 : r0 + ((v - d0) / span) * (r1 - r0)) as LinearScale;
  scale.domain = domain;
  scale.range = range;
  scale.invert = (p: number) =>
    r1 === r0 ? d0 : d0 + ((p - r0) / (r1 - r0)) * span;
  return scale;
}

/** The 1, 2, 5 × 10ⁿ step nearest to `span / count`. */
export function niceStep(span: number, count: number): number {
  if (!(span > 0) || !(count > 0)) return 1;
  const raw = span / count;
  const power = 10 ** Math.floor(Math.log10(raw));
  const unit = raw / power;
  const nice = unit >= 7.5 ? 10 : unit >= 3.5 ? 5 : unit >= 1.5 ? 2 : 1;
  return nice * power;
}

/**
 * Widens `[min, max]` outwards to whole steps and lists the ticks on it.
 * Floating error is rounded away at the step's own precision, so a tick reads
 * `0.3`, never `0.30000000000000004`.
 */
export function niceLinearTicks(
  min: number,
  max: number,
  count = 5,
): { domain: [number, number]; ticks: number[] } {
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return { domain: [0, 1], ticks: [0, 1] };
  }
  let lo = min;
  let hi = max;
  if (lo === hi) {
    // A constant series still needs a span to sit in.
    const pad = lo === 0 ? 1 : Math.abs(lo) / 2;
    lo -= pad;
    hi += pad;
    if (min >= 0 && lo < 0) lo = 0;
  }
  const step = niceStep(hi - lo, count);
  const decimals = Math.max(0, -Math.floor(Math.log10(step)));
  const fix = (n: number) => Number(n.toFixed(decimals));
  const start = fix(Math.floor(lo / step) * step);
  const end = fix(Math.ceil(hi / step) * step);
  const ticks: number[] = [];
  for (let i = 0; ; i++) {
    const t = fix(start + i * step);
    if (t > end + step / 2) break;
    ticks.push(t);
  }
  return { domain: [start, end], ticks };
}

export type BandScale = {
  /** The left edge of band `index`. */
  (index: number): number;
  /** The centre of band `index`. */
  center: (index: number) => number;
  bandwidth: number;
  count: number;
  /** The band under `pixel`, clamped to the bands that exist. */
  indexAt: (pixel: number) => number;
};

/** `count` equal bands across `range`, with no padding between them. */
export function bandScale(count: number, range: [number, number]): BandScale {
  const [r0, r1] = range;
  const bandwidth = count > 0 ? (r1 - r0) / count : 0;
  const scale = ((i: number) => r0 + i * bandwidth) as BandScale;
  scale.center = (i: number) => r0 + (i + 0.5) * bandwidth;
  scale.bandwidth = bandwidth;
  scale.count = count;
  scale.indexAt = (p: number) =>
    count === 0
      ? -1
      : Math.min(count - 1, Math.max(0, Math.floor((p - r0) / (bandwidth || 1))));
  return scale;
}
