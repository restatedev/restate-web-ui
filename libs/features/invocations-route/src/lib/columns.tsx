import { DropdownMenuSelection } from '@restate/ui/dropdown';
import { useState, useMemo } from 'react';
import type { Key } from 'react-aria';

const COLUMNS_KEYS = [
  'id',
  'created_at',
  'target',
  'status',
  'type',
  'invoked_by',
  'modified_at',
  'scheduled_at',
  'running_at',
  'idempotency_key',
  'journal_size',
  'retry_count',
  'last_attempt_deployment_id',
] as const;
export type ColumnKey = (typeof COLUMNS_KEYS)[number];

export const COLUMN_NAMES: Record<ColumnKey, string> = {
  id: 'Id',
  target: 'Target',
  status: 'Status',
  created_at: 'Created at',
  invoked_by: 'Invoked by',
  modified_at: 'Modified at',
  scheduled_at: 'Scheduled at',
  running_at: 'Running since',
  type: 'Type',
  idempotency_key: 'Idempotency key',
  journal_size: 'Journal',
  retry_count: 'Attempt count',
  last_attempt_deployment_id: 'Deployment',
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
    new Set(['id', 'created_at', 'target', 'status', 'invoked_by'])
  );
  const sortedColumnsList = useMemo(
    () => Array.from(selectedColumns).sort(sortColumns) as ColumnKey[],
    [selectedColumns]
  );

  return { selectedColumns, setSelectedColumns, sortedColumnsList };
}
