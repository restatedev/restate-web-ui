import { DropdownMenuSelection } from '@restate/ui/dropdown';
import { useMemo, useCallback } from 'react';
import type { Key } from 'react-aria';
import { useSearchParams } from 'react-router';

export const COLUMN_QUERY_PREFIX = 'column';

const COLUMNS_KEYS = [
  'id',
  'created_at',
  'modified_at',
  'target',
  'status',
  'journal_size',
  'invoked_by',
  'deployment',
  'retry_count',
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
  'next_retry_at',
] as const;
export type ColumnKey = (typeof COLUMNS_KEYS)[number];

export const COLUMN_NAMES: Record<ColumnKey, string> = {
  id: 'Id',
  created_at: 'Created at',
  modified_at: 'Modified at',
  scheduled_at: 'Scheduled at',
  running_at: 'Running since',
  next_retry_at: 'Next retry',
  target: 'Target',
  status: 'Status',
  journal_size: 'Journal',
  invoked_by: 'Invoked by',
  deployment: 'Deployment',
  retry_count: 'Attempt count',
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

export function setDefaultColumns(searchParams: URLSearchParams) {
  searchParams.delete(COLUMN_QUERY_PREFIX);
  ['id', 'created_at', 'modified_at', 'target', 'status'].forEach((col) => {
    searchParams.append(COLUMN_QUERY_PREFIX, col);
  });

  return searchParams;
}

export function isColumnValid(searchParams: URLSearchParams) {
  const columns = searchParams.getAll(COLUMN_QUERY_PREFIX) as ColumnKey[];
  return (
    columns.length > 0 && columns.every((col) => COLUMNS_KEYS.includes(col))
  );
}

export function useColumns() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedColumns = searchParams.getAll(
    COLUMN_QUERY_PREFIX,
  ) as ColumnKey[];

  const sortedColumnsList = useMemo(() => {
    return [...Array.from(selectedColumns).sort(sortColumns), 'actions'].map(
      (id, index) => ({
        name: COLUMN_NAMES[id as ColumnKey],
        id,
        isRowHeader: index === 0,
      }),
    ) as { id: ColumnKey; name: string; isRowHeader: boolean }[];
  }, [selectedColumns]);

  const setSelectedColumns = useCallback(
    (keys: DropdownMenuSelection) => {
      if (keys instanceof Set) {
        setSearchParams((old) => {
          old.delete(COLUMN_QUERY_PREFIX);
          keys.forEach((col) => {
            old.append(COLUMN_QUERY_PREFIX, String(col));
          });
          return old;
        });
      }
    },
    [setSearchParams],
  );

  return { selectedColumns, setSelectedColumns, sortedColumnsList };
}
