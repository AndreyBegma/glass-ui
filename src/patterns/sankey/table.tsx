import { cn } from '../../lib/cn';
import { Table, TableCell, TableHead, TableRow } from '../../primitives/table';
import type { SankeyModel } from './normalize';
import type { SankeyLabels } from './types';

/**
 * #94 — the same flow as a table, as `Chart` has one: one row per link, with
 * its two ends named by node and column. It is built from the model *before*
 * "+N more" folding, so every node a column hides from the picture is still
 * here. It is always in the document, so a screen reader can reach it, and it
 * is visually hidden unless "Show table" is on.
 */
export function SankeyTable({
  id,
  label,
  model,
  labels,
  visible,
  valueFormat,
}: {
  id: string;
  label: string;
  model: SankeyModel;
  labels: Pick<SankeyLabels, 'source' | 'target' | 'value' | 'ignored'>;
  visible: boolean;
  valueFormat: (value: number) => string;
}) {
  const byId = new Map(model.nodes.map((n) => [n.id, n]));
  const name = (nodeId: string) => {
    const n = byId.get(nodeId);
    return n ? `${n.label} (${model.columns[n.column]?.label ?? ''})` : nodeId;
  };
  const { links: ignoredLinks, nodes: ignoredNodes } = model.ignored;
  return (
    <div
      id={id}
      data-sankey-table
      className={visible ? 'mt-3 max-h-80 overflow-y-auto' : 'sr-only'}
    >
      <Table scroll={visible}>
        <caption className={cn('text-left text-xs text-ink-3', visible ? 'pb-2' : undefined)}>
          {label}
          {ignoredLinks + ignoredNodes > 0
            ? ` — ${labels.ignored(ignoredLinks, ignoredNodes)}`
            : null}
        </caption>
        <TableHead>
          <tr>
            <TableCell head scope="col">
              {labels.source}
            </TableCell>
            <TableCell head scope="col">
              {labels.target}
            </TableCell>
            <TableCell head scope="col" className="text-right">
              {labels.value}
            </TableCell>
          </tr>
        </TableHead>
        <tbody>
          {model.links.map((l) => (
            <TableRow key={`${l.source}\u0000${l.target}`}>
              <TableCell head scope="row" className="text-left font-normal text-ink-2">
                {name(l.source)}
              </TableCell>
              <TableCell className="text-ink-2">{name(l.target)}</TableCell>
              <TableCell className="text-right tabular-nums">{valueFormat(l.value)}</TableCell>
            </TableRow>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
