import { Table, TableCell, TableHead, TableRow } from '../primitives/table';
import type { HeatmapDay } from './activity-heatmap-model';

/**
 * #186 — the same data as a table, as `Chart` has one: a row per day that has
 * activity. Always in the document so a screen reader can reach it, and
 * visually hidden — a visible 365-row table is not a feature. Days without
 * activity are the gaps; with none at all, the caption says so.
 */
export function ActivityHeatmapTable({
  id,
  label,
  days,
  headers,
  empty,
  formatDate,
  formatValue,
}: {
  id: string;
  label: string;
  days: HeatmapDay[];
  headers: { date: string; value: string };
  empty: string;
  formatDate: (day: HeatmapDay) => string;
  formatValue: (value: number) => string;
}) {
  const rows = days.filter((d) => d.value > 0);
  return (
    <div id={id} data-activity-heatmap-table className="sr-only">
      <Table>
        <caption>{rows.length === 0 ? `${label} — ${empty}` : label}</caption>
        <TableHead>
          <tr>
            <TableCell head scope="col">
              {headers.date}
            </TableCell>
            <TableCell head scope="col" className="text-right">
              {headers.value}
            </TableCell>
          </tr>
        </TableHead>
        <tbody>
          {rows.map((d) => (
            <TableRow key={d.date}>
              <TableCell head scope="row" className="text-left font-normal">
                {formatDate(d)}
              </TableCell>
              <TableCell className="text-right tabular-nums">{formatValue(d.value)}</TableCell>
            </TableRow>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
