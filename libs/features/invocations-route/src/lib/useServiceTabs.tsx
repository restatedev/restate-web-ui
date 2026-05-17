import { useMemo, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { useRestateContext } from '@restate/features/restate-context';
import {
  useListDeployments,
  useSummaryInvocations,
} from '@restate/data-access/admin-api-hooks';
import { getServiceIssues } from '@restate/features/system-health';
import type { Service } from '@restate/data-access/admin-api-spec';
import { issueAlertIconStyles, issuePingStyles } from '@restate/ui/issue-banner';
import { HoverTooltip } from '@restate/ui/tooltip';
import { Icon, IconName } from '@restate/ui/icons';
import { formatNumber } from '@restate/util/intl';
import {
  toInvocationsHref,
  toServiceInvocationsHref,
  toServiceStatusInvocationsHref,
} from '@restate/util/invocation-links';
import {
  buildStatusEntries,
  InvocationsBreakdownTooltipContent,
  type StatusEntry,
} from '@restate/features/status-chart';
import type { ContentPanelTabs } from '@restate/ui/content-panel';
import {
  hasStatusFilter,
  isStatusInFilter,
  type StatusFilter,
} from './statusFilter';

const ALL_TAB_ID = '__all__';
// Synthetic tab shown when the filter is multi-IN or NOT_IN and can't be
// represented by a single service tab. Clicking it is a no-op — it just
// reflects the current selection. "All" remains a separate tab that always
// represents the full unfiltered set.
const MULTI_TAB_ID = '__multi__';
const MAX_VISIBLE_SERVICE_TABS = 5;

type SummaryData = NonNullable<ReturnType<typeof useSummaryInvocations>['data']>;
type DeploymentsData = NonNullable<
  ReturnType<typeof useListDeployments>['data']
>;

type ServiceRow = {
  id: string;
  name: string;
  // Service total — ignores status filter (sums all statuses).
  count: number;
  // Count matching the current status filter. Equals `count` when no status
  // filter is active. Drives the "filtered/total" tab badges.
  filteredCount: number;
  statusCounts: Map<string, number>;
  issues: ReturnType<typeof getServiceIssues>;
};

function sumFilteredStatus(
  statusCounts: Map<string, number>,
  statusFilter: StatusFilter,
): number {
  if (!hasStatusFilter(statusFilter)) {
    let total = 0;
    for (const c of statusCounts.values()) total += c;
    return total;
  }
  let total = 0;
  for (const [status, c] of statusCounts) {
    if (isStatusInFilter(statusFilter, status)) total += c;
  }
  return total;
}

function aggregateServices(
  summaryData: SummaryData | undefined,
  deploymentsData: DeploymentsData | undefined,
  statusFilter: StatusFilter,
): ServiceRow[] {
  const byService = summaryData?.byService ?? [];
  const byServiceAndStatus = summaryData?.byServiceAndStatus ?? [];

  const statusCountsByService = new Map<string, Map<string, number>>();
  for (const entry of byServiceAndStatus) {
    let map = statusCountsByService.get(entry.service);
    if (!map) {
      map = new Map();
      statusCountsByService.set(entry.service, map);
    }
    map.set(entry.status, (map.get(entry.status) ?? 0) + entry.count);
  }

  const build = (name: string, count: number): ServiceRow => {
    const statusCounts =
      statusCountsByService.get(name) ?? new Map<string, number>();
    return {
      id: name,
      name,
      count,
      filteredCount: sumFilteredStatus(statusCounts, statusFilter),
      statusCounts,
      issues: getServiceIssues({
        service: { name } as Service,
        statusCounts,
      }),
    };
  };

  // Summary services first (also covers deleted services with historical
  // invocations), then registered services not in the summary as zero-count.
  const services = byService.map((s) => build(s.name, s.count));
  const seen = new Set(services.map((s) => s.name));
  for (const name of deploymentsData?.sortedServiceNames ?? []) {
    if (!seen.has(name)) services.push(build(name, 0));
  }
  // Sort by filteredCount first so the most-relevant services float up when
  // a status filter is active. Falls back to total + name for stable order.
  return services.sort(
    (a, b) =>
      b.filteredCount - a.filteredCount ||
      b.count - a.count ||
      a.name.localeCompare(b.name),
  );
}

function deriveTabsState(
  filterTargetServiceName: string | null,
  services: ServiceRow[],
): {
  activeTabId: string;
  // Synthetic 2nd tab present only when the filter is multi-IN or NOT_IN —
  // shapes that can't be represented by an individual service tab. Carries
  // its own services subset for the count badge and breakdown tooltip.
  multiTab?: { label: string; services: ServiceRow[] };
} {
  if (!filterTargetServiceName) return { activeTabId: ALL_TAB_ID };
  try {
    const parsed = JSON.parse(filterTargetServiceName);
    if (parsed.operation === 'IN' && Array.isArray(parsed.value)) {
      const value = parsed.value as string[];
      if (value.length === 0) return { activeTabId: ALL_TAB_ID };
      if (value.length === 1 && typeof value[0] === 'string') {
        // Single service IN: the service id is the active tab. ContentPanel
        // promotes it into the visible set when past maxVisible.
        return { activeTabId: value[0] };
      }
      const set = new Set(value);
      return {
        activeTabId: MULTI_TAB_ID,
        multiTab: {
          label: `${value.length} services`,
          services: services.filter((s) => set.has(s.name)),
        },
      };
    }
    if (parsed.operation === 'NOT_IN' && Array.isArray(parsed.value)) {
      const excluded = new Set(parsed.value as string[]);
      return {
        activeTabId: MULTI_TAB_ID,
        multiTab: {
          label: `All except ${parsed.value.length}`,
          services: services.filter((s) => !excluded.has(s.name)),
        },
      };
    }
  } catch {
    /* fall through */
  }
  return { activeTabId: ALL_TAB_ID };
}

// Aggregate per-service status counts + sla issue severities across an
// arbitrary subset, for the All tab's breakdown tooltip.
function aggregateBreakdown(services: ServiceRow[]) {
  const statusMap = new Map<string, number>();
  const issuesByStatus = new Map<string, 'low' | 'high'>();
  for (const s of services) {
    for (const [status, count] of s.statusCounts) {
      statusMap.set(status, (statusMap.get(status) ?? 0) + count);
    }
    for (const issue of s.issues) {
      if (issue.kind === 'sla' && issue.status) {
        const prev = issuesByStatus.get(issue.status);
        if (!prev || issue.severity === 'high')
          issuesByStatus.set(issue.status, issue.severity);
      }
    }
  }
  return {
    statusEntries: buildStatusEntries(
      Array.from(statusMap, ([status, count]) => ({ status, count })),
    ),
    issuesByStatus,
  };
}

// Renders a tab count badge. Shows "filtered/total" when a status filter is
// active and shrinks the visible count; "total" otherwise. When total is 0,
// always shows just "0" (per UX: no "0/0").
function TabCountBadge({
  total,
  filtered,
}: {
  total: number;
  filtered: number;
}) {
  const showFiltered = filtered !== total && total > 0;
  return (
    <span className="rounded bg-zinc-100 px-1 py-px text-2xs font-medium text-zinc-500 tabular-nums">
      {formatNumber(showFiltered ? filtered : total, true)}
      {showFiltered && (
        <span className="text-zinc-400">
          /{formatNumber(total, true)}
        </span>
      )}
    </span>
  );
}

function buildSummaryTab(
  id: string,
  label: string,
  subset: ServiceRow[],
  baseUrl: string,
  existingParams: URLSearchParams,
  totalLink: string,
  isStatusDimmed: (statusName: string) => boolean,
): { id: string; label: ReactNode } {
  const total = subset.reduce((sum, s) => sum + s.count, 0);
  const filtered = subset.reduce((sum, s) => sum + s.filteredCount, 0);
  const { statusEntries, issuesByStatus } = aggregateBreakdown(subset);
  return {
    id,
    label: (
      <HoverTooltip
        content={
          <InvocationsBreakdownTooltipContent
            title={
              <div className="text-base! leading-7 font-medium text-gray-300!">
                {label}
              </div>
            }
            total={total}
            filteredTotal={filtered}
            totalLink={totalLink}
            statuses={statusEntries}
            getStatusLink={(statusName) =>
              toInvocationsHref(baseUrl, statusName, { existingParams })
            }
            issuesByStatus={issuesByStatus}
            isStatusDimmed={isStatusDimmed}
          />
        }
        size="lg"
      >
        <span className="flex items-center gap-1.5">
          <span className="max-w-[12ch] truncate">{label}</span>
          <TabCountBadge total={total} filtered={filtered} />
        </span>
      </HoverTooltip>
    ),
  };
}

function buildServiceTabItems(
  services: ServiceRow[],
  multiTab: { label: string; services: ServiceRow[] } | undefined,
  baseUrl: string,
  existingParams: URLSearchParams,
  isStatusDimmed: (statusName: string) => boolean,
): { id: string; label: ReactNode }[] {
  // "All" totalLink points at the unfiltered view (target_service_name cleared
  // to an empty value — same shape we write when the user clicks the tab; the
  // empty key prevents the clientLoader from restoring a stale lastQuery).
  const allParams = new URLSearchParams(existingParams);
  allParams.set(
    'filter_target_service_name',
    JSON.stringify({ operation: 'IN', value: [] }),
  );
  const allTab = buildSummaryTab(
    ALL_TAB_ID,
    'All',
    services,
    baseUrl,
    existingParams,
    `${baseUrl}/invocations?${allParams.toString()}`,
    isStatusDimmed,
  );

  // Multi tab keeps the current filter shape — totalLink is just the current
  // URL so its breakdown stays consistent with the route's actual filter.
  const multiTabItem = multiTab
    ? buildSummaryTab(
        MULTI_TAB_ID,
        multiTab.label,
        multiTab.services,
        baseUrl,
        existingParams,
        `${baseUrl}/invocations?${existingParams.toString()}`,
        isStatusDimmed,
      )
    : undefined;
  const items = services.map((s) => {
    const statusEntries = buildStatusEntries(
      Array.from(s.statusCounts.entries()).map(([status, count]) => ({
        status,
        count,
      })),
    );
    const issuesByStatus = new Map<string, 'low' | 'high'>();
    for (const issue of s.issues) {
      if (issue.kind === 'sla' && issue.status) {
        const prev = issuesByStatus.get(issue.status);
        if (!prev || issue.severity === 'high')
          issuesByStatus.set(issue.status, issue.severity);
      }
    }
    const topSeverity: 'high' | 'low' | undefined = s.issues.some(
      (i) => i.severity === 'high',
    )
      ? 'high'
      : s.issues.length > 0
        ? 'low'
        : undefined;
    return {
      id: s.id,
      label: (
        <HoverTooltip
          content={
            <InvocationsBreakdownTooltipContent
              title={
                <div className="text-base! leading-7 font-medium text-gray-300!">
                  {s.name}
                </div>
              }
              total={s.count}
              filteredTotal={s.filteredCount}
              totalLink={toServiceInvocationsHref(baseUrl, s.id, {
                existingParams,
              })}
              statuses={statusEntries}
              getStatusLink={(statusName) =>
                toServiceStatusInvocationsHref(baseUrl, s.id, statusName, {
                  existingParams,
                })
              }
              issuesByStatus={issuesByStatus}
              isStatusDimmed={isStatusDimmed}
            />
          }
          size="lg"
        >
          <span className="flex items-center gap-1.5">
            <span className="max-w-[12ch] truncate" title={s.name}>
              {s.name}
            </span>
            <TabCountBadge total={s.count} filtered={s.filteredCount} />
            {topSeverity && (
              <span className="relative flex h-3 w-3 shrink-0">
                <Icon
                  name={IconName.TriangleAlert}
                  className={issuePingStyles({ severity: topSeverity })}
                />
                <Icon
                  name={IconName.TriangleAlert}
                  className={issueAlertIconStyles({ severity: topSeverity })}
                />
              </span>
            )}
          </span>
        </HoverTooltip>
      ),
    };
  });
  return multiTabItem
    ? [allTab, multiTabItem, ...items]
    : [allTab, ...items];
}

/**
 * Returns the service tabs config AND a status breakdown scoped to the
 * currently active tab (for the StatusSummaryBar/legend at the top of the
 * page). Single source of truth for "which services are in scope right now".
 *
 *   * `tabs`: ContentPanelTabs (All + optional multi-tab + per-service tabs).
 *     Includes zero-count services so they're still selectable.
 *   * `byStatus`: status counts aggregated across only the in-scope services,
 *     so the bar matches the table when a service is selected.
 *
 * Selection writes back to `filter_target_service_name` (empty value clears,
 * keeping the key so the clientLoader doesn't restore a stale lastQuery; see
 * invocationsLastQuery.ts).
 */
export function useServiceTabs(
  summaryData: SummaryData | undefined,
  deploymentsData: DeploymentsData | undefined,
  statusFilter: StatusFilter,
): { tabs: ContentPanelTabs; byStatus: StatusEntry[] } {
  const [searchParams, setSearchParams] = useSearchParams();
  const { baseUrl } = useRestateContext();
  const filterTargetServiceName = searchParams.get(
    'filter_target_service_name',
  );

  const services = useMemo(
    () => aggregateServices(summaryData, deploymentsData, statusFilter),
    [summaryData, deploymentsData, statusFilter],
  );
  const { activeTabId, multiTab } = deriveTabsState(
    filterTargetServiceName,
    services,
  );
  // Mirror StatusSummaryBar's dimming: with a status filter active, rows
  // for statuses outside the filter fade in the breakdown tooltip.
  const isStatusDimmed = (statusName: string) =>
    hasStatusFilter(statusFilter) &&
    !isStatusInFilter(statusFilter, statusName);
  const items = useMemo(
    () =>
      buildServiceTabItems(
        services,
        multiTab,
        baseUrl,
        searchParams,
        isStatusDimmed,
      ),
    // isStatusDimmed depends only on statusFilter; including the function ref
    // itself would invalidate every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [services, multiTab, baseUrl, searchParams, statusFilter],
  );

  // Services represented by the active tab. The bar's status breakdown is
  // aggregated from this subset so the bar matches the table.
  const scopedServices =
    activeTabId === ALL_TAB_ID
      ? services
      : activeTabId === MULTI_TAB_ID
        ? (multiTab?.services ?? services)
        : services.filter((s) => s.id === activeTabId);

  const byStatus = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of scopedServices) {
      for (const [status, count] of s.statusCounts) {
        map.set(status, (map.get(status) ?? 0) + count);
      }
    }
    return Array.from(map, ([name, count]) => ({ name, count }));
  }, [scopedServices]);

  return {
    byStatus,
    tabs: {
      items,
      maxVisible: MAX_VISIBLE_SERVICE_TABS,
      selectedId: activeTabId,
      onSelect: (id) => {
        // The synthetic multi tab represents the existing filter — clicking
        // it shouldn't rewrite the URL (no-op). Any other id maps to a target
        // service IN filter, with [] used as the "clear" form (key preserved
        // so the clientLoader doesn't restore a stale lastQuery).
        if (id === MULTI_TAB_ID) return;
        setSearchParams(
          (p) => {
            const next = new URLSearchParams(p);
            const value = id === ALL_TAB_ID ? [] : [id];
            next.set(
              'filter_target_service_name',
              JSON.stringify({ operation: 'IN', value }),
            );
            return next;
          },
          { preventScrollReset: true },
        );
      },
    },
  };
}
