import { useMemo, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { useRestateContext } from '@restate/features/restate-context';
import {
  useListDeployments,
  useSummaryInvocations,
} from '@restate/data-access/admin-api-hooks';
import { getServiceIssues } from '@restate/features/system-health';
import type { Service } from '@restate/data-access/admin-api-spec';
import {
  issueAlertIconStyles,
  issuePingStyles,
} from '@restate/ui/issue-banner';
import { HoverTooltip } from '@restate/ui/tooltip';
import { Icon, IconName } from '@restate/ui/icons';
import { formatNumber, formatApproxPercentage } from '@restate/util/intl';
import {
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
  FAILED_SUBSTATES,
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

function buildServiceTabSearchParams(
  id: string,
  current: URLSearchParams,
): URLSearchParams {
  const next = new URLSearchParams(current);
  if (id === ALL_TAB_ID) {
    next.delete('filter_target_service_name');
  } else if (id !== MULTI_TAB_ID) {
    next.set(
      'filter_target_service_name',
      JSON.stringify({ operation: 'IN', value: [id] }),
    );
  }
  return next;
}

type SummaryData = NonNullable<
  ReturnType<typeof useSummaryInvocations>['data']
>;
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
  // Sort by total count (then name) so the tab order stays stable as the
  // status filter changes. The filtered/total chip still communicates the
  // filter's effect on each service without shifting their position.
  return services.sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name),
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
// always shows just "0" (per UX: no "0/0"). When sampled, switches to a
// percentage of the in-scope grand total (e.g., the service's share); only the
// grand-total ("All") badge collapses since it would always be 100%. Every
// other tab shows its share — a lone service holding everything reads ~100%.
function TabCountBadge({
  total,
  filtered,
  isLoading,
  isSampled,
  grandTotal,
  collapseAtFull,
}: {
  total: number;
  filtered: number;
  isLoading?: boolean;
  isSampled?: boolean;
  grandTotal?: number;
  collapseAtFull?: boolean;
}) {
  if (isLoading) {
    return (
      <span className="inline-block h-3 w-5 animate-pulse rounded bg-zinc-200" />
    );
  }
  const showFiltered = filtered !== total && total > 0;
  if (isSampled) {
    const denom = grandTotal ?? 0;
    if (denom <= 0) return null;
    const numerator = showFiltered ? filtered : total;
    if (collapseAtFull && numerator === denom) return null;
    return (
      <span className="rounded bg-zinc-100 px-1 py-px text-2xs font-medium text-zinc-500 tabular-nums">
        {formatApproxPercentage(numerator / denom)}
      </span>
    );
  }
  return (
    <span className="rounded bg-zinc-100 px-1 py-px text-2xs font-medium text-zinc-500 tabular-nums">
      {formatNumber(showFiltered ? filtered : total, true)}
      {showFiltered && (
        <span className="text-zinc-400"> / {formatNumber(total, true)}</span>
      )}
    </span>
  );
}

function buildSummaryTab(
  id: string,
  label: string,
  subset: ServiceRow[],
  baseUrl: string,
  // Params encoding this tab's scope (target_service_name shape, sorts, etc).
  // totalLink uses these as-is; getStatusLink layers a filter_status on top.
  // We don't use toInvocationsHref/toServiceStatusInvocationsHref here because
  // they strip all `filter_*` keys before setting their own — which would
  // drop the multi-IN / NOT_IN service filter we want to preserve.
  scopeParams: URLSearchParams,
  isStatusDimmed: (statusName: string) => boolean,
  isLoading: boolean,
  isSampled: boolean,
  grandTotal: number,
): { id: string; label: ReactNode } {
  const total = subset.reduce((sum, s) => sum + s.count, 0);
  const filtered = subset.reduce((sum, s) => sum + s.filteredCount, 0);
  const { statusEntries, issuesByStatus } = aggregateBreakdown(subset);
  const totalLink = `${baseUrl}/invocations?${scopeParams.toString()}`;
  const getStatusLink = (statusName: string) => {
    const out = new URLSearchParams(scopeParams);
    const value = statusName === 'failed' ? FAILED_SUBSTATES : [statusName];
    out.set('filter_status', JSON.stringify({ operation: 'IN', value }));
    return `${baseUrl}/invocations?${out.toString()}`;
  };
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
            getStatusLink={getStatusLink}
            issuesByStatus={issuesByStatus}
            isStatusDimmed={isStatusDimmed}
            isSampled={isSampled}
          />
        }
        size="lg"
      >
        <span className="flex items-center gap-1.5">
          <span className="max-w-[12ch] truncate">{label}</span>
          <TabCountBadge
            total={total}
            filtered={filtered}
            isLoading={isLoading}
            isSampled={isSampled}
            grandTotal={grandTotal}
            collapseAtFull={id === ALL_TAB_ID}
          />
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
  isLoading: boolean,
  isSampled: boolean,
): { id: string; label: ReactNode }[] {
  const grandTotal = services.reduce((sum, s) => sum + s.count, 0);
  // "All" scope drops target_service_name. Both totalLink and per-status
  // links inherit this, so clicking either navigates to the unfiltered view
  // (with the chosen status if a row was clicked).
  const allParams = new URLSearchParams(existingParams);
  allParams.delete('filter_target_service_name');
  const allTab = buildSummaryTab(
    ALL_TAB_ID,
    'All',
    services,
    baseUrl,
    allParams,
    isStatusDimmed,
    isLoading,
    isSampled,
    grandTotal,
  );

  // Multi tab inherits the current filter shape (multi-IN or NOT_IN service
  // filter stays put). Status-row clicks layer on a filter_status without
  // touching the service filter.
  const multiTabItem = multiTab
    ? buildSummaryTab(
        MULTI_TAB_ID,
        multiTab.label,
        multiTab.services,
        baseUrl,
        existingParams,
        isStatusDimmed,
        isLoading,
        isSampled,
        grandTotal,
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
              isSampled={isSampled}
            />
          }
          size="lg"
        >
          <span className="flex items-center gap-1.5">
            {/* Same JSX is reused as the More dropdown item label, so cap the
                width only when this span is rendered inside a tab. In the
                dropdown there's no ancestor [role=tab] and the name flows
                at its natural width (still wrapped in `truncate` for the
                pathological 50-char case). */}
            <span
              className="truncate [[role=tab]_&]:max-w-[12ch]"
              title={s.name}
            >
              {s.name}
            </span>
            <TabCountBadge
              total={s.count}
              filtered={s.filteredCount}
              isLoading={isLoading}
              isSampled={isSampled}
              grandTotal={grandTotal}
            />
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
  return multiTabItem ? [allTab, multiTabItem, ...items] : [allTab, ...items];
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
 * Selection writes back to `filter_target_service_name` — the All tab
 * deletes the key entirely, service tabs set IN [service].
 */
export function useServiceTabs(
  summaryData: SummaryData | undefined,
  deploymentsData: DeploymentsData | undefined,
  statusFilter: StatusFilter,
  isLoading = false,
  isSampled = false,
): { tabs: ContentPanelTabs; byStatus: StatusEntry[] } {
  const [searchParams] = useSearchParams();
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
        isLoading,
        isSampled,
      ),
    // isStatusDimmed depends only on statusFilter; including the function ref
    // itself would invalidate every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      services,
      multiTab,
      baseUrl,
      searchParams,
      statusFilter,
      isLoading,
      isSampled,
    ],
  );

  const itemsWithHref = useMemo(() => {
    const pathname = `${baseUrl}/invocations`;
    return items.map((item) => {
      if (item.id === MULTI_TAB_ID) return item;
      const queryString = buildServiceTabSearchParams(
        item.id,
        searchParams,
      ).toString();
      return {
        ...item,
        href: `${pathname}${queryString ? `?${queryString}` : ''}`,
      };
    });
  }, [items, searchParams, baseUrl]);

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
      items: itemsWithHref,
      maxVisible: MAX_VISIBLE_SERVICE_TABS,
      selectedId: activeTabId,
    },
  };
}
