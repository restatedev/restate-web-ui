import { useCallback, useMemo, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router';
import { useOverviewContext } from './OverviewContext';
import {
  parseServiceGroupBy,
  resolveServiceGroupBy,
  SERVICE_GROUP_PARAM,
  type ServiceGroupBy,
} from './serviceGroups';

const GROUP_BY_STORAGE_KEY = 'restate-overview-services-group';
const COLLAPSED_STORAGE_KEY = 'restate-overview-services-collapsed';
const NO_GROUP_IDS: ReadonlySet<string> = new Set();

function readStoredGroupBy() {
  try {
    return window.localStorage.getItem(GROUP_BY_STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeGroupBy(groupBy: ServiceGroupBy) {
  try {
    if (groupBy === 'none') {
      window.localStorage.removeItem(GROUP_BY_STORAGE_KEY);
    } else {
      window.localStorage.setItem(GROUP_BY_STORAGE_KEY, groupBy);
    }
  } catch {
    return;
  }
}

function readCollapsedByGrouping(): Record<string, unknown> {
  try {
    const stored: unknown = JSON.parse(
      window.localStorage.getItem(COLLAPSED_STORAGE_KEY) ?? '{}',
    );
    return stored && typeof stored === 'object' && !Array.isArray(stored)
      ? (stored as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function readCollapsedGroups(groupBy: ServiceGroupBy): ReadonlySet<string> {
  const stored = readCollapsedByGrouping();
  const ids = Object.hasOwn(stored, groupBy) ? stored[groupBy] : undefined;
  return Array.isArray(ids)
    ? new Set(ids.filter((id): id is string => typeof id === 'string'))
    : NO_GROUP_IDS;
}

function storeCollapsedGroups(
  groupBy: ServiceGroupBy,
  ids: ReadonlySet<string>,
) {
  const stored = readCollapsedByGrouping();
  if (ids.size > 0) {
    stored[groupBy] = Array.from(ids);
  } else {
    delete stored[groupBy];
  }
  try {
    window.localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify(stored));
  } catch {
    return;
  }
}

function useStoredGroupBy() {
  const { key } = useLocation();
  const [stored, setStored] = useState(() => ({
    key,
    value: readStoredGroupBy(),
  }));
  if (stored.key === key) return stored.value;
  const next = { key, value: readStoredGroupBy() };
  setStored(next);
  return next.value;
}

export function useServiceGroupBy() {
  const { metadataKeys, isServiceDetailsPending } = useOverviewContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const storedGroupBy = useStoredGroupBy();
  const requested = parseServiceGroupBy(
    searchParams.get(SERVICE_GROUP_PARAM) ?? storedGroupBy,
  );
  const groupBy = isServiceDetailsPending
    ? requested
    : resolveServiceGroupBy(requested, metadataKeys);
  const setGroupBy = useCallback(
    (next: ServiceGroupBy) => {
      storeGroupBy(next);
      setSearchParams(
        (previous) => {
          const params = new URLSearchParams(previous);
          params.set(SERVICE_GROUP_PARAM, next);
          return params;
        },
        { replace: true, preventScrollReset: true },
      );
    },
    [setSearchParams],
  );
  return [groupBy, setGroupBy] as const;
}

export function useCollapsedServiceGroups(
  groupBy: ServiceGroupBy,
  filter: string,
) {
  const query = filter.trim().toLowerCase();
  const storedIds = useMemo(() => readCollapsedGroups(groupBy), [groupBy]);
  const [saved, setSaved] = useState({ groupBy, ids: storedIds });
  const [searched, setSearched] = useState({
    groupBy,
    query,
    ids: NO_GROUP_IDS,
  });
  const savedIds = saved.groupBy === groupBy ? saved.ids : storedIds;
  const searchedIds =
    searched.groupBy === groupBy && searched.query === query
      ? searched.ids
      : NO_GROUP_IDS;
  const setCollapsedIds = useCallback(
    (ids: ReadonlySet<string>) => {
      if (query) {
        setSearched({ groupBy, query, ids });
        return;
      }
      storeCollapsedGroups(groupBy, ids);
      setSaved({ groupBy, ids });
    },
    [groupBy, query],
  );
  return [query ? searchedIds : savedIds, setCollapsedIds] as const;
}
