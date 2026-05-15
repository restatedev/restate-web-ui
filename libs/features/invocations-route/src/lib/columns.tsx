import { DropdownMenuSelection } from '@restate/ui/dropdown';
import { useEffect, useMemo, useCallback, useState } from 'react';
import type { Key } from 'react-aria';
import { useLocation, useSearchParams } from 'react-router';
import { getFeatures } from '@restate/util/api-config';
import { addUserCol, removeUserCol } from './userPreferences';

export const COLUMN_QUERY_PREFIX = 'column';

export const COLUMNS_KEYS = [
  'id',
  'created_at',
  'modified_at',
  'duration',
  'scheduled_at',
  'scheduled_start_at',
  'running_at',
  'next_retry_at',
  'completed_at',
  'target',
  'status',
  'journal_size',
  'invoked_by',
  'deployment',
  'retry_count',
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
  'scope',
] as const;
export type ColumnKey = (typeof COLUMNS_KEYS)[number];

export const COLUMN_NAMES: Record<ColumnKey, string> = {
  id: 'Id',
  created_at: 'Created at',
  modified_at: 'Modified at',
  duration: 'Duration',
  scheduled_at: 'Scheduled at',
  scheduled_start_at: 'Scheduled to start at',
  running_at: 'Running since',
  next_retry_at: 'Next retry',
  completed_at: 'Completed at',
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
  scope: 'Scope',
};

const FEATURE_GATED_COLUMNS: Partial<Record<ColumnKey, string>> = {
  scope: 'vqueues',
};

function isColumnAvailable(
  col: ColumnKey,
  features: Set<string> | undefined,
): boolean {
  const required = FEATURE_GATED_COLUMNS[col];
  return !required || (features?.has(required) ?? false);
}

const SORT_ORDER: Record<ColumnKey, number> = Object.entries(
  COLUMNS_KEYS,
).reduce(
  (p, [sort, col]) => ({ ...p, [col]: Number(sort) }),
  {} as Record<ColumnKey, number>,
);

function sortColumns(a: Key, b: Key) {
  return SORT_ORDER[a as ColumnKey] - SORT_ORDER[b as ColumnKey];
}

export function setColumns(
  searchParams: URLSearchParams,
  columns: ColumnKey[],
) {
  searchParams.delete(COLUMN_QUERY_PREFIX);
  columns.forEach((col) => {
    searchParams.append(COLUMN_QUERY_PREFIX, col);
  });

  return searchParams;
}

export function setDefaultColumns(searchParams: URLSearchParams) {
  searchParams.delete(COLUMN_QUERY_PREFIX);
  return setColumns(searchParams, [
    'id',
    'created_at',
    'modified_at',
    'duration',
    'target',
    'status',
  ]);
}

export function isColumnValid(searchParams: URLSearchParams) {
  const columns = searchParams.getAll(COLUMN_QUERY_PREFIX) as ColumnKey[];
  return (
    columns.length > 0 && columns.every((col) => COLUMNS_KEYS.includes(col))
  );
}

export function useColumns() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const [selectedColumns, _setSelectedColumns] = useState<ColumnKey[]>(
    () => searchParams.getAll(COLUMN_QUERY_PREFIX) as ColumnKey[],
  );
  useEffect(() => {
    const fromUrl = new URLSearchParams(location.search).getAll(
      COLUMN_QUERY_PREFIX,
    ) as ColumnKey[];
    _setSelectedColumns((prev) =>
      prev.length === fromUrl.length && prev.every((c, i) => c === fromUrl[i])
        ? prev
        : fromUrl,
    );
  }, [location.key, location.search]);
  const features = getFeatures();

  const availableColumnNames = useMemo<
    Partial<Record<ColumnKey, string>>
  >(() => {
    return Object.fromEntries(
      (Object.entries(COLUMN_NAMES) as [ColumnKey, string][]).filter(([key]) =>
        isColumnAvailable(key, features),
      ),
    ) as Partial<Record<ColumnKey, string>>;
  }, [features]);

  const sortedColumnsList = useMemo(() => {
    const visible = selectedColumns.filter((col) =>
      isColumnAvailable(col, features),
    );
    return [...Array.from(visible).sort(sortColumns), 'actions'].map(
      (id, index) => ({
        name: COLUMN_NAMES[id as ColumnKey],
        id,
        isRowHeader: index === 0,
      }),
    ) as { id: ColumnKey; name: string; isRowHeader: boolean }[];
  }, [selectedColumns, features]);

  const setSelectedColumns = useCallback(
    (keys: DropdownMenuSelection, updateUrl = true) => {
      if (keys instanceof Set) {
        if (updateUrl) {
          const next = new Set(
            Array.from(keys).map((k) => String(k) as ColumnKey),
          );
          const prev = new Set(selectedColumns);
          next.forEach((col) => {
            if (!prev.has(col)) addUserCol(col);
          });
          prev.forEach((col) => {
            if (!next.has(col)) removeUserCol(col);
          });
        }
        _setSelectedColumns(Array.from(keys) as ColumnKey[]);
        if (updateUrl) {
          setSearchParams((old) => {
            old.delete(COLUMN_QUERY_PREFIX);
            keys.forEach((col) => {
              old.append(COLUMN_QUERY_PREFIX, String(col));
            });
            return old;
          });
        }
      }
    },
    [setSearchParams, selectedColumns],
  );

  return {
    selectedColumns,
    setSelectedColumns,
    sortedColumnsList,
    availableColumnNames,
  };
}
