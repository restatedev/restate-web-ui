import { DropdownMenuSelection } from '@restate/ui/dropdown';
import { useState, useMemo } from 'react';
import type { Key } from 'react-aria';

const COLUMNS_KEYS = [
  'id',
  'target',
  'status',
  'type',
  'invoked_by',
  'created_at',
  'modified_at',
  'scheduled_at',
] as const;
export type ColumnKey = (typeof COLUMNS_KEYS)[number];

export const COLUMN_NAMES: Record<ColumnKey, string> = {
  id: 'Id',
  target: 'Service/Handler',
  status: 'Status',
  created_at: 'Created at',
  invoked_by: 'Invoked by',
  modified_at: 'Modified at',
  scheduled_at: 'Scheduled at',
  type: 'Type',
};

const SORT_ORDER: Record<ColumnKey, number> = Object.entries(
  COLUMNS_KEYS
).reduce(
  (p, [sort, col]) => ({ ...p, [col]: Number(sort) }),
  {} as Record<ColumnKey, number>
);

function sortColumns(a: Key, b: Key) {
  return SORT_ORDER[a as ColumnKey] - SORT_ORDER[b as ColumnKey];
}

export function useColumns() {
  const [selectedColumns, setSelectedColumns] = useState<DropdownMenuSelection>(
    new Set(['id', 'target', 'status', 'type'])
  );
  const sortedColumnsList = useMemo(
    () => Array.from(selectedColumns).sort(sortColumns) as ColumnKey[],
    [selectedColumns]
  );

  return { selectedColumns, setSelectedColumns, sortedColumnsList };
}
