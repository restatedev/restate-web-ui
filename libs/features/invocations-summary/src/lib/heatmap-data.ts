import { STATUS_COLUMNS } from './constants';
import type {
  InvocationsSummaryData,
  StatusColumn,
  ServiceRow,
  CellData,
} from './types';

// Rate thresholds for "problem" statuses. When a status's share of total
// invocations exceeds its reference rate, the heatmap row ceiling is boosted
// so cells become visually prominent even with uniform distribution.
const ATTENTION_REF: Record<string, number> = {
  ready: 0.05,
  pending: 0.2,
  paused: 0.01,
  'backing-off': 0.05,
  failed: 0.025,
};

// Minimum cell opacity multiplier per status before deviation signal kicks in.
// Higher values make cells visible even when invocations are evenly spread.
const BASE_LEVEL: Record<string, number> = {
  succeeded: 0.16,
  running: 0.1,
  pending: 0.13,
  'backing-off': 0.13,
  paused: 0.13,
  failed: 0.21,
  ready: 0.1,
  scheduled: 0.16,
  suspended: 0.16,
};

export interface HeatmapData {
  statusRows: StatusColumn[];
  ranked: ServiceRow[];
  serviceColumns: ServiceRow[];
  cellMap: Map<string, CellData>;
  maxStatusCount: number;
  cellOpacities: Map<string, number | undefined>;
}

function buildStatusRows(data: InvocationsSummaryData): StatusColumn[] {
  return STATUS_COLUMNS.map((col) => {
    let count = 0;
    let allExcluded = true;
    for (const s of col.statuses) {
      const entry = data.byStatus.find((b) => b.name === s);
      if (entry) {
        count += entry.count;
        if (entry.isIncluded) allExcluded = false;
      }
    }
    if (col.statuses.every((s) => !data.byStatus.find((b) => b.name === s))) {
      allExcluded = false;
    }
    return {
      key: col.key,
      label: col.label,
      statuses: [...col.statuses],
      count,
      isIncluded: !allExcluded,
    };
  });
}

function buildRankedServices(data: InvocationsSummaryData): ServiceRow[] {
  const included = data.byService.filter((s) => s.isIncluded);
  const notIncluded = data.byService.filter((s) => !s.isIncluded);
  const pinnedNames = new Set(included.map((s) => s.name));
  const pinned: ServiceRow[] = included
    .sort((a, b) => b.count - a.count)
    .map((s) => ({ name: s.name, count: s.count, isIncluded: s.isIncluded }));
  const remaining = notIncluded
    .filter((s) => !pinnedNames.has(s.name))
    .sort((a, b) => b.count - a.count)
    .map((s) => ({ name: s.name, count: s.count, isIncluded: s.isIncluded }));
  return [...pinned, ...remaining];
}

function buildServiceColumns(
  data: InvocationsSummaryData,
  ranked: ServiceRow[],
  count: number,
): ServiceRow[] {
  const visible = ranked.slice(0, count);
  const shownNames = new Set(visible.map((r) => r.name));
  const others = data.byService.filter((s) => !shownNames.has(s.name));
  const columns = [...visible];
  if (others.length > 0) {
    const othersCount = others.reduce((sum, s) => sum + s.count, 0);
    columns.push({
      name: 'Others',
      count: othersCount,
      isIncluded: true,
      isOthers: true,
    });
  }
  return columns;
}

function buildCellMap(
  data: InvocationsSummaryData,
  statusRows: StatusColumn[],
  serviceColumns: ServiceRow[],
): Map<string, CellData> {
  const cellMap = new Map<string, CellData>();
  const shownNames = new Set(
    serviceColumns.filter((s) => !s.isOthers).map((s) => s.name),
  );
  const serviceTotals = new Map<string, number>();
  for (const s of data.byService) {
    serviceTotals.set(s.name, s.count);
  }
  for (const row of statusRows) {
    for (const svc of serviceColumns) {
      const key = `${svc.name}::${row.key}`;
      if (svc.isOthers) {
        let count = 0;
        for (const entry of data.byServiceAndStatus) {
          if (
            row.statuses.includes(entry.status) &&
            !shownNames.has(entry.service)
          ) {
            count += entry.count;
          }
        }
        cellMap.set(key, {
          service: svc.name,
          columnKey: row.key,
          count,
          serviceTotal: svc.count,
          columnTotal: row.count,
        });
      } else {
        let count = 0;
        for (const entry of data.byServiceAndStatus) {
          if (
            entry.service === svc.name &&
            row.statuses.includes(entry.status)
          ) {
            count += entry.count;
          }
        }
        cellMap.set(key, {
          service: svc.name,
          columnKey: row.key,
          count,
          serviceTotal: serviceTotals.get(svc.name) ?? 0,
          columnTotal: row.count,
        });
      }
    }
  }
  return cellMap;
}

function computeCellOpacity(
  cell: CellData,
  rowMax: number,
  rowTotal: number,
  rowCeiling: number,
  baseline: number,
): number | undefined {
  if (cell.count === 0) return undefined;
  const ownership = rowMax === 0 ? 0 : Math.pow(cell.count / rowMax, 0.7);
  const rowShare = rowTotal > 0 ? cell.count / rowTotal : 0;
  const deviation = Math.max(rowShare - baseline, 0);
  const deviationSignal = Math.min(Math.max((deviation - 0.02) / 0.08, 0), 1);
  const baseLevel = BASE_LEVEL[cell.columnKey] ?? 0.05;
  const cellStrength =
    ownership * (baseLevel + (1 - baseLevel) * deviationSignal);
  return Math.min(rowCeiling * cellStrength, 0.8);
}

export function buildHeatmapData(
  data: InvocationsSummaryData,
  visibleCount: number,
): HeatmapData {
  const statusRows = buildStatusRows(data);
  const ranked = buildRankedServices(data);
  const serviceColumns = buildServiceColumns(data, ranked, visibleCount);
  const cellMap = buildCellMap(data, statusRows, serviceColumns);
  const maxStatusCount = Math.max(...statusRows.map((r) => r.count), 1);

  const globalServiceTotal =
    serviceColumns.reduce((sum, s) => sum + s.count, 0) || 1;
  const maxRowTotal = Math.max(...statusRows.map((r) => r.count), 1);
  const globalStatusTotal =
    statusRows.reduce((sum, r) => sum + r.count, 0) || 1;

  const baselines = new Map<string, number>();
  for (const svc of serviceColumns) {
    baselines.set(svc.name, svc.count / globalServiceTotal);
  }

  const rowMaxes = new Map<string, number>();
  for (const [key, cell] of cellMap) {
    const statusKey = key.split('::')[1] ?? '';
    rowMaxes.set(statusKey, Math.max(rowMaxes.get(statusKey) ?? 0, cell.count));
  }

  const rowCeilings = new Map<string, number>();
  for (const row of statusRows) {
    const rowRate = row.count / globalStatusTotal;
    const rowVolume = Math.sqrt(row.count / maxRowTotal);
    const volumeCeiling = 0.08 + rowVolume * (0.55 - 0.08);
    const ref = ATTENTION_REF[row.key];
    if (ref !== undefined) {
      const attention = Math.min(Math.max(rowRate / ref, 0), 1);
      const badFloor = 0.18 + attention * (0.7 - 0.18);
      rowCeilings.set(row.key, Math.max(volumeCeiling, badFloor));
    } else {
      rowCeilings.set(row.key, volumeCeiling);
    }
  }

  const cellOpacities = new Map<string, number | undefined>();
  for (const [key, cell] of cellMap) {
    const statusKey = key.split('::')[1] ?? '';
    cellOpacities.set(
      key,
      computeCellOpacity(
        cell,
        rowMaxes.get(statusKey) ?? 0,
        statusRows.find((r) => r.key === statusKey)?.count ?? 0,
        rowCeilings.get(statusKey) ?? 0.08,
        baselines.get(cell.service) ?? 0,
      ),
    );
  }

  return {
    statusRows,
    ranked,
    serviceColumns,
    cellMap,
    maxStatusCount,
    cellOpacities,
  };
}
