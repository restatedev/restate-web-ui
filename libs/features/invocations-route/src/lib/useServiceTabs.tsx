import { useMemo, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { useRestateContext } from '@restate/features/restate-context';
import {
  useListDeployments,
  useSummaryInvocations,
} from '@restate/data-access/admin-api-hooks';
import { getServiceIssues } from '@restate/features/system-health';
import type { Service } from '@restate/data-access/admin-api-spec';
import { issueAlertIconStyles } from '@restate/ui/issue-banner';
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
} from '@restate/features/status-chart';
import type { ContentPanelTabs } from '@restate/ui/content-panel';

const ALL_TAB_ID = '__all__';
const MAX_VISIBLE_SERVICE_TABS = 5;

type SummaryData = NonNullable<ReturnType<typeof useSummaryInvocations>['data']>;
type DeploymentsData = NonNullable<
  ReturnType<typeof useListDeployments>['data']
>;

type ServiceRow = {
  id: string;
  name: string;
  count: number;
  statusCounts: Map<string, number>;
  issues: ReturnType<typeof getServiceIssues>;
};

function aggregateServices(
  summaryData: SummaryData | undefined,
  deploymentsData: DeploymentsData | undefined,
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
  return services.sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name),
  );
}

function deriveFirstTab(
  filterTargetServiceName: string | null,
  services: ServiceRow[],
): {
  activeTabId: string;
  firstTabLabel: string;
  // Services the first tab represents. Drives both the count badge and the
  // hover tooltip's aggregated status breakdown.
  firstTabServices: ServiceRow[];
} {
  const fallback = {
    activeTabId: ALL_TAB_ID,
    firstTabLabel: 'All',
    firstTabServices: services,
  };
  if (!filterTargetServiceName) return fallback;
  try {
    const parsed = JSON.parse(filterTargetServiceName);
    if (parsed.operation === 'IN' && Array.isArray(parsed.value)) {
      const value = parsed.value as string[];
      if (value.length === 0) return fallback;
      if (value.length === 1 && typeof value[0] === 'string') {
        // Single service IN: that service id is the active tab; "All" still
        // labels the first tab and represents the unfiltered set — clicking
        // it clears the filter. ContentPanel promotes the selected service
        // into the visible set when past maxVisible, so this id is always
        // reachable.
        return {
          activeTabId: value[0],
          firstTabLabel: 'All',
          firstTabServices: services,
        };
      }
      // Multi-IN: first tab summarizes the current selection — count and
      // breakdown reflect the selected services, not the unfiltered set.
      const set = new Set(value);
      return {
        activeTabId: ALL_TAB_ID,
        firstTabLabel: `${value.length} services`,
        firstTabServices: services.filter((s) => set.has(s.name)),
      };
    }
    if (parsed.operation === 'NOT_IN' && Array.isArray(parsed.value)) {
      // NOT_IN: shown invocations are everything except the excluded set.
      const excluded = new Set(parsed.value as string[]);
      return {
        activeTabId: ALL_TAB_ID,
        firstTabLabel: `All except ${parsed.value.length}`,
        firstTabServices: services.filter((s) => !excluded.has(s.name)),
      };
    }
  } catch {
    /* fall through */
  }
  return fallback;
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

function buildServiceTabItems(
  services: ServiceRow[],
  firstTab: {
    label: string;
    count: number;
    statusEntries: ReturnType<typeof buildStatusEntries>;
    issuesByStatus: Map<string, 'low' | 'high'>;
  },
  baseUrl: string,
  existingParams: URLSearchParams,
): { id: string; label: ReactNode }[] {
  const allTabHref = `${baseUrl}/invocations?${existingParams.toString()}`;
  const allTab = {
    id: ALL_TAB_ID,
    label: (
      <HoverTooltip
        content={
          <InvocationsBreakdownTooltipContent
            title={
              <div className="text-base! leading-7 font-medium text-gray-300!">
                {firstTab.label}
              </div>
            }
            total={firstTab.count}
            totalLink={allTabHref}
            statuses={firstTab.statusEntries}
            getStatusLink={(statusName) =>
              toInvocationsHref(baseUrl, statusName, { existingParams })
            }
            issuesByStatus={firstTab.issuesByStatus}
          />
        }
        size="lg"
      >
        <span className="flex items-center gap-1.5">
          <span className="max-w-[12ch] truncate">{firstTab.label}</span>
          {firstTab.count > 0 && (
            <span className="rounded bg-zinc-100 px-1 py-px text-2xs font-medium text-zinc-500 tabular-nums">
              {formatNumber(firstTab.count, true)}
            </span>
          )}
        </span>
      </HoverTooltip>
    ),
  };
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
            />
          }
          size="lg"
        >
          <span className="flex items-center gap-1.5">
            <span className="max-w-[12ch] truncate" title={s.name}>
              {s.name}
            </span>
            <span className="rounded bg-zinc-100 px-1 py-px text-2xs font-medium text-zinc-500 tabular-nums">
              {formatNumber(s.count, true)}
            </span>
            {topSeverity && (
              <Icon
                name={IconName.TriangleAlert}
                className={issueAlertIconStyles({ severity: topSeverity })}
              />
            )}
          </span>
        </HoverTooltip>
      ),
    };
  });
  return [allTab, ...items];
}

/**
 * Returns the full ContentPanelTabs config for the invocations service tabs:
 *   * Aggregates services from summary + deployments (zero-count services
 *     included so they're still selectable).
 *   * Derives the active tab + label from `filter_target_service_name`.
 *   * Wires selection back to that URL param (empty value clears, keeping
 *     the key — see invocationsLastQuery.ts for the clientLoader race).
 */
export function useServiceTabs(
  summaryData: SummaryData | undefined,
  deploymentsData: DeploymentsData | undefined,
): ContentPanelTabs {
  const [searchParams, setSearchParams] = useSearchParams();
  const { baseUrl } = useRestateContext();
  const filterTargetServiceName = searchParams.get(
    'filter_target_service_name',
  );

  const services = useMemo(
    () => aggregateServices(summaryData, deploymentsData),
    [summaryData, deploymentsData],
  );
  const { activeTabId, firstTabLabel, firstTabServices } = deriveFirstTab(
    filterTargetServiceName,
    services,
  );
  // Sum the relevant services' counts (each is `byService[s].total` —
  // ignores the HIGHLIGHT_FIELDS filter on target_service_name) so the
  // first-tab count matches what its label describes.
  const firstTabCount = firstTabServices.reduce((sum, s) => sum + s.count, 0);
  const items = useMemo(() => {
    const breakdown = aggregateBreakdown(firstTabServices);
    return buildServiceTabItems(
      services,
      {
        label: firstTabLabel,
        count: firstTabCount,
        statusEntries: breakdown.statusEntries,
        issuesByStatus: breakdown.issuesByStatus,
      },
      baseUrl,
      searchParams,
    );
  }, [
    services,
    firstTabLabel,
    firstTabCount,
    firstTabServices,
    baseUrl,
    searchParams,
  ]);

  return {
    items,
    maxVisible: MAX_VISIBLE_SERVICE_TABS,
    selectedId: activeTabId,
    onSelect: (id) => {
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
  };
}
