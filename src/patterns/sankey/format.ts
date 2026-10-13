import type { SankeyLabels } from './types';

/**
 * #94 — the defaults when `valueFormat` and `labels` are not passed.
 * Formatting is the consumer's; a value reads "1.2K" by default, the way the
 * reference shows it, and a unit is never assumed.
 */

/** Every rendered string can be overridden through `labels`, as in `Chart`. */
export const DEFAULT_LABELS: SankeyLabels = {
  showTable: 'Show table',
  hideTable: 'Hide table',
  source: 'From',
  target: 'To',
  value: 'Value',
  empty: 'No data',
  ignored: (links, nodes) =>
    [
      links > 0 ? `${links} ${links === 1 ? 'link' : 'links'}` : null,
      nodes > 0 ? `${nodes} ${nodes === 1 ? 'node' : 'nodes'}` : null,
    ]
      .filter(Boolean)
      .join(' and ') + ' could not be drawn',
  more: (count) => `+${count} more`,
  summary: (columns, nodes, links) =>
    `${columns} ${columns === 1 ? 'column' : 'columns'}, ${nodes} ${nodes === 1 ? 'node' : 'nodes'}, ${links} ${links === 1 ? 'link' : 'links'}`,
  link: (source, target, value) => `${source} to ${target}, ${value}`,
  node: (label, column, value) => `${label}, ${column}, ${value}`,
};

const COMPACT = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });

export const defaultValueFormat = (value: number) => COMPACT.format(value);
