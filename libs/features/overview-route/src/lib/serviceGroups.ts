import { getVisibleMetadataEntries } from '@restate/features-options';
import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import type { OverviewService } from './sortServices';

export const SERVICE_GROUP_PARAM = 'group';
const STORAGE_KEY = 'restate-overview-services-group';
const METADATA_PREFIX = 'meta.';

export type ServiceGroupBy =
  | 'none'
  | 'deployment'
  | `${typeof METADATA_PREFIX}${string}`;

export interface ServiceGroup<T> {
  id: string;
  value: string | null;
  services: T[];
}

export function parseServiceGroupBy(
  value: string | null | undefined,
): ServiceGroupBy {
  if (value === 'deployment') return value;
  if (
    value?.startsWith(METADATA_PREFIX) &&
    value.length > METADATA_PREFIX.length
  ) {
    return value as ServiceGroupBy;
  }
  return 'none';
}

export function metadataGroupBy(key: string): ServiceGroupBy {
  return `${METADATA_PREFIX}${key}`;
}

export function getMetadataGroupKey(groupBy: ServiceGroupBy) {
  return groupBy.startsWith(METADATA_PREFIX)
    ? groupBy.slice(METADATA_PREFIX.length)
    : undefined;
}

function readStoredGroupBy() {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeGroupBy(groupBy: ServiceGroupBy) {
  try {
    if (groupBy === 'none') {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, groupBy);
    }
  } catch {
    return;
  }
}

export function useServiceGroupBy() {
  const [searchParams, setSearchParams] = useSearchParams();
  const groupBy = parseServiceGroupBy(
    searchParams.get(SERVICE_GROUP_PARAM) ?? readStoredGroupBy(),
  );
  const setGroupBy = useCallback(
    (next: ServiceGroupBy) => {
      storeGroupBy(next);
      setSearchParams(
        (previous) => {
          const params = new URLSearchParams(previous);
          if (next === 'none') {
            params.delete(SERVICE_GROUP_PARAM);
          } else {
            params.set(SERVICE_GROUP_PARAM, next);
          }
          return params;
        },
        { replace: true, preventScrollReset: true },
      );
    },
    [setSearchParams],
  );
  return [groupBy, setGroupBy] as const;
}

export function getMetadataKeys(services: Iterable<OverviewService>) {
  const counts = new Map<string, number>();
  for (const service of services) {
    for (const [key] of getVisibleMetadataEntries(service.metadata)) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return Array.from(counts, ([key, count]) => ({ key, count })).sort(
    (a, b) => b.count - a.count || a.key.localeCompare(b.key),
  );
}

function getGroupValue(service: OverviewService, groupBy: ServiceGroupBy) {
  if (groupBy === 'deployment') return service.deployment_id;
  const key = getMetadataGroupKey(groupBy);
  const value = key ? service.metadata?.[key]?.trim() : undefined;
  return value || null;
}

export function groupServices<T extends OverviewService>(
  services: T[],
  groupBy: ServiceGroupBy,
  getDeploymentLabel?: (deploymentId: string) => string,
): ServiceGroup<T>[] {
  const groups = new Map<string | null, T[]>();
  for (const service of services) {
    const value = getGroupValue(service, groupBy);
    groups.set(value, [...(groups.get(value) ?? []), service]);
  }
  const label = (value: string) =>
    groupBy === 'deployment' ? (getDeploymentLabel?.(value) ?? value) : value;
  return Array.from(groups, ([value, groupServices]) => ({
    id: `group\x00${value ?? ''}`,
    value,
    services: groupServices,
  })).sort((a, b) => {
    if (a.value === null) return 1;
    if (b.value === null) return -1;
    return label(a.value).localeCompare(label(b.value));
  });
}
