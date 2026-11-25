import { getVisibleMetadataEntries } from '@restate/features-options';
import type { OverviewService } from './sortServices';

export const SERVICE_GROUP_PARAM = 'group';
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

export function resolveServiceGroupBy(
  groupBy: ServiceGroupBy,
  metadataKeys: readonly string[],
): ServiceGroupBy {
  const key = getMetadataGroupKey(groupBy);
  return key === undefined || metadataKeys.includes(key) ? groupBy : 'none';
}

export function getMetadataKeys(services: Iterable<OverviewService>) {
  const counts = new Map<string, number>();
  for (const service of services) {
    for (const [key] of getVisibleMetadataEntries(service.metadata)) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return Array.from(counts)
    .sort(([a, aCount], [b, bCount]) => bCount - aCount || a.localeCompare(b))
    .map(([key]) => key);
}

export function getNextCollapsedGroups(
  collapsed: ReadonlySet<string>,
  visibleGroupIds: readonly string[],
  expandedKeys: { has(key: string): boolean },
): ReadonlySet<string> | undefined {
  const changed = visibleGroupIds.filter(
    (id) => collapsed.has(id) === expandedKeys.has(id),
  );
  if (changed.length === 0) return undefined;
  const next = new Set(collapsed);
  for (const id of changed) {
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
  }
  return next;
}

function getGroupValue(service: OverviewService, groupBy: ServiceGroupBy) {
  if (groupBy === 'deployment') return service.deployment_id;
  const key = getMetadataGroupKey(groupBy);
  const metadata = service.metadata;
  const value =
    key !== undefined && metadata && Object.hasOwn(metadata, key)
      ? metadata[key]
      : undefined;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function groupServices<T extends OverviewService>(
  services: T[],
  groupBy: ServiceGroupBy,
  getDeploymentLabel?: (deploymentId: string) => string,
): ServiceGroup<T>[] {
  const groups = new Map<string | null, T[]>();
  for (const service of services) {
    const value = getGroupValue(service, groupBy);
    const group = groups.get(value);
    if (group) {
      group.push(service);
    } else {
      groups.set(value, [service]);
    }
  }
  const label = (value: string) =>
    groupBy === 'deployment' ? (getDeploymentLabel?.(value) ?? value) : value;
  return Array.from(groups, ([value, groupServices]) => ({
    id: `\x00group:${value ?? ''}`,
    value,
    services: groupServices,
  })).sort((a, b) => {
    if (a.value === null) return 1;
    if (b.value === null) return -1;
    return label(a.value).localeCompare(label(b.value));
  });
}
