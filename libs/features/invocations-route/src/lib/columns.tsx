import { DropdownMenuSelection } from '@restate/ui/dropdown';
import { useState, useMemo } from 'react';
import type { Key } from 'react-aria';

const COLUMNS_KEYS = [
  'id',
  'created_at',
  'target',
  'status',
  'journal_size',
  'invoked_by',
  'deployment',
  'retry_count',
  'modified_at',
  'scheduled_at',
  'running_at',
  'idempotency_key',
  'target_service_ty',
  'target_service_name',
  'target_service_key',
  'target_handler_name',
  'pinned_service_protocol_version',
  'completion_retention',
  'journal_retention',
  'actions',
  'restarted_from',
] as const;
export type ColumnKey = (typeof COLUMNS_KEYS)[number];

export const COLUMN_NAMES: Record<ColumnKey, string> = {
  id: 'Id',
  created_at: 'Created at',
  target: 'Target',
  status: 'Status',
  journal_size: 'Journal',
  invoked_by: 'Invoked by',
  deployment: 'Deployment',
  retry_count: 'Attempt count',
  modified_at: 'Modified at',
  scheduled_at: 'Scheduled at',
  running_at: 'Running since',
  idempotency_key: 'Idempotency key',
  target_service_ty: 'Service type',
  target_service_name: 'Service name',
  target_service_key: 'Service key',
  target_handler_name: 'Handler',
  pinned_service_protocol_version: 'Service Protocol Version',
  actions: 'Actions',
  completion_retention: 'Completion retention',
  journal_retention: 'Journal retention',
  restarted_from: 'Restarted from',
};

const SORT_ORDER: Record<ColumnKey, number> = Object.entries(
  COLUMNS_KEYS,
).reduce(
  (p, [sort, col]) => ({ ...p, [col]: Number(sort) }),
  {} as Record<ColumnKey, number>,
);

function sortColumns(a: Key, b: Key) {
  return SORT_ORDER[a as ColumnKey] - SORT_ORDER[b as ColumnKey];
}

export function useColumns() {
  const [selectedColumns, setSelectedColumns] = useState<DropdownMenuSelection>(
    new Set(['id', 'created_at', 'target', 'status', 'journal_size']),
  );
  const sortedColumnsList = useMemo(() => {
    return [...Array.from(selectedColumns).sort(sortColumns), 'actions'].map(
      (id, index) => ({
        name: COLUMN_NAMES[id as ColumnKey],
        id,
        isRowHeader: index === 0,
      }),
    ) as { id: ColumnKey; name: string; isRowHeader: boolean }[];
  }, [selectedColumns]);

  return { selectedColumns, setSelectedColumns, sortedColumnsList };
}
