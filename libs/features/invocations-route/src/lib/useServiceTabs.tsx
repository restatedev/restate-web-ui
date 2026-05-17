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

function parseTargetServiceFilter(filterTargetServiceName: string | null): {
  activeTabId: string;
  firstTabLabel: string;
} {
  const fallback = { activeTabId: ALL_TAB_ID, firstTabLabel: 'All' };
  if (!filterTargetServiceName) return fallback;
  try {
    const parsed = JSON.parse(filterTargetServiceName);
    if (parsed.operation === 'IN' && Array.isArray(parsed.value)) {
      const value = parsed.value as string[];
      if (value.length === 0) return fallback;
      if (value.length === 1 && typeof value[0] === 'string') {
        // ContentPanel promotes the selected service into the visible set
        // when past maxVisible, so this id is always reachable.
        return { activeTabId: value[0], firstTabLabel: 'All' };
      }
      return {
        activeTabId: ALL_TAB_ID,
        firstTabLabel: `${value.length} services`,
      };
    }
    if (parsed.operation === 'NOT_IN' && Array.isArray(parsed.value)) {
      return {
        activeTabId: ALL_TAB_ID,
        firstTabLabel: `All except ${parsed.value.length}`,
      };
    }
  } catch {
    /* fall through */
  }
  return fallback;
}

function buildServiceTabItems(
  services: ServiceRow[],
  firstTabLabel: string,
  totalCount: number,
  baseUrl: string,
  existingParams: URLSearchParams,
): { id: string; label: ReactNode }[] {
  const allTab = {
    id: ALL_TAB_ID,
    label: (
      <span className="flex items-center gap-1.5">
        <span className="max-w-[12ch] truncate">{firstTabLabel}</span>
        {totalCount > 0 && (
          <span className="rounded bg-zinc-100 px-1 py-px text-2xs font-medium text-zinc-500 tabular-nums">
            {formatNumber(totalCount, true)}
          </span>
        )}
      </span>
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
  const totalCount = summaryData?.totalCount ?? 0;

  const services = useMemo(
    () => aggregateServices(summaryData, deploymentsData),
    [summaryData, deploymentsData],
  );
  const { activeTabId, firstTabLabel } = parseTargetServiceFilter(
    filterTargetServiceName,
  );
  const items = useMemo(
    () =>
      buildServiceTabItems(
        services,
        firstTabLabel,
        totalCount,
        baseUrl,
        searchParams,
      ),
    [services, firstTabLabel, totalCount, baseUrl, searchParams],
  );

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
