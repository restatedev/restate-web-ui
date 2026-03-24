import {
  useMemo,
  useState,
  useEffect,
  useRef,
  type PropsWithChildren,
  type ReactNode,
} from 'react';
import {
  SortDescriptor,
  GridList as AriaGridList,
  GridListItem as AriaGridListItem,
  SearchField,
  Input as AriaInput,
  Label,
} from 'react-aria-components';
import { useSearchParams } from 'react-router';
import {
  useListDeployments,
  useListServices,
  useSummaryInvocations,
} from '@restate/data-access/admin-api-hooks';
import type { Service } from '@restate/data-access/admin-api-spec';
import { getEndpoint } from '@restate/data-access/admin-api-spec';
import { GridList, GridListItem, GridListColumn } from '@restate/ui/grid-list';
import { Icon, IconName } from '@restate/ui/icons';
import { tv } from '@restate/util/styles';
import { focusRing } from '@restate/ui/focus';
import {
  ServiceType,
  Handler,
  SERVICE_QUERY_PARAM,
  HANDLER_QUERY_PARAM,
} from '@restate/features/service';
import {
  Deployment,
  DEPLOYMENT_QUERY_PARAM,
} from '@restate/features/deployment';
import { Link } from '@restate/ui/link';
import { RestateServer } from '@restate/ui/restate-server';
import type { FerrofluidStatus } from '@restate/ui/restate-server';
import {
  useRestateContext,
  useQueryHealthStatus,
} from '@restate/features/restate-context';
import {
  useIsFetching,
  useIsMutating,
  useQueryClient,
} from '@tanstack/react-query';
import {
  Dropdown,
  DropdownTrigger,
  DropdownPopover,
  DropdownMenu,
  DropdownItem,
  DropdownSection,
} from '@restate/ui/dropdown';
import { Button } from '@restate/ui/button';
import {
  ServiceDeploymentExplainer,
  ServiceExplainer,
} from '@restate/features/explainers';
import { TriggerRegisterDeploymentDialog } from '@restate/features/register-deployment';
import { useFocusShortcut, FocusShortcutKey } from '@restate/ui/keyboard';
import {
  getServiceIssues,
  getGlobalIssues,
  issuesSortScore,
  type ServiceIssue,
} from './serviceIssues';
import {
  issueQueue,
  useIssueQueue,
  type IssueContent,
  type IssueSeverity,
} from '@restate/ui/notification';
import { ErrorBanner } from '@restate/ui/error';
import { HoverTooltip } from '@restate/ui/tooltip';
import {
  formatNumber,
  formatPercentageWithoutFraction,
  formatPlurals,
} from '@restate/util/intl';
import { Chart, Pie, Slice, Tooltip } from '@restate/ui/charts';
import type { ChartHandle } from '@restate/ui/charts';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  usePopover,
} from '@restate/ui/popover';

const MERGED_STATUS: Record<string, string> = {
  cancelled: 'failed',
  killed: 'failed',
};

function mergeStatuses(
  entries: { name: string; count: number }[],
): { name: string; count: number }[] {
  const merged = new Map<string, number>();
  for (const e of entries) {
    const key = MERGED_STATUS[e.name] ?? e.name;
    merged.set(key, (merged.get(key) ?? 0) + e.count);
  }
  return Array.from(merged, ([name, count]) => ({ name, count }));
}

function mergeServiceStatuses(
  entries: { service: string; status: string; count: number }[],
): { service: string; status: string; count: number }[] {
  const merged = new Map<
    string,
    { service: string; status: string; count: number }
  >();
  for (const e of entries) {
    const status = MERGED_STATUS[e.status] ?? e.status;
    const key = `${e.service}::${status}`;
    const existing = merged.get(key);
    if (existing) {
      existing.count += e.count;
    } else {
      merged.set(key, { service: e.service, status, count: e.count });
    }
  }
  return Array.from(merged.values());
}

const DASHED = { borderType: [8, 4] as number[], borderCap: 'round' as const };

const STATUS_STYLE: Record<
  string,
  {
    fill: string;
    fillLight: string;
    fillDark: string;
    stroke: string;
    borderType?: 'dashed' | number[];
    borderCap?: 'round';
    color: string;
  }
> = {
  running: {
    fill: '#60a5fa',
    fillLight: '#93c5fd',
    fillDark: '#3b82f6',
    stroke: '#3b82f6',
    ...DASHED,
    color: '#3b82f6',
  },
  pending: {
    fill: '#fef3c7',
    fillLight: '#fef9c3',
    fillDark: '#fde68a',
    stroke: '#fbbf24',
    ...DASHED,
    color: '#f59e0b',
  },
  ready: {
    fill: '#d4d4d8',
    fillLight: '#dddde0',
    fillDark: '#d4d4d8',
    stroke: '#a1a1aa',
    color: '#a1a1aa',
  },
  scheduled: {
    fill: '#d4d4d8',
    fillLight: '#dddde0',
    fillDark: '#d4d4d8',
    stroke: '#a1a1aa',
    ...DASHED,
    color: '#a1a1aa',
  },
  suspended: {
    fill: '#a1a1aa',
    fillLight: '#d4d4d8',
    fillDark: '#71717a',
    stroke: '#71717a',
    color: '#71717a',
  },
  succeeded: {
    fill: '#4ade80',
    fillLight: '#86efac',
    fillDark: '#22c55e',
    stroke: '#22c55e',
    color: '#22c55e',
  },
  failed: {
    fill: '#f87171',
    fillLight: '#fca5a5',
    fillDark: '#ef4444',
    stroke: '#ef4444',
    color: '#ef4444',
  },
  'backing-off': {
    fill: '#fbbf24',
    fillLight: '#fcd34d',
    fillDark: '#f59e0b',
    stroke: '#f59e0b',
    ...DASHED,
    color: '#f97316',
  },
  paused: {
    fill: '#fbbf24',
    fillLight: '#fcd34d',
    fillDark: '#f59e0b',
    stroke: '#f59e0b',
    color: '#f59e0b',
  },
};

const DEFAULT_STYLE: (typeof STATUS_STYLE)[string] = {
  fill: '#a1a1aa',
  fillLight: '#d4d4d8',
  fillDark: '#71717a',
  stroke: '#52525b',
  color: '#a1a1aa',
};

const STATUS_LABELS: Record<string, string> = {
  running: 'Running',
  pending: 'Pending',
  ready: 'Ready',
  scheduled: 'Scheduled',
  suspended: 'Suspended',
  succeeded: 'Succeeded',
  failed: 'Failed, Cancelled or Killed',
  'backing-off': 'Backing off',
  paused: 'Paused',
};

const STATUS_ORDER = [
  'ready',
  'scheduled',
  'pending',
  'running',
  'backing-off',
  'suspended',
  'paused',
  'failed',
  'succeeded',
];

type StatusEntry = { name: string; count: number };

function useOrderedStatuses(byStatus: StatusEntry[]) {
  return useMemo(() => {
    const map = new Map(byStatus.map((s) => [s.name, s.count]));
    return STATUS_ORDER.filter((name) => (map.get(name) ?? 0) > 0).map(
      (name) => {
        const style = STATUS_STYLE[name] ?? DEFAULT_STYLE;
        return {
          name,
          count: map.get(name) ?? 0,
          ...style,
        };
      },
    );
  }, [byStatus]);
}

function useRestateServerStatus({
  isHealthy,
  isError,
  isActive,
  issueSeverity,
}: {
  isHealthy: boolean;
  isError: boolean;
  isActive: boolean;
  issueSeverity?: 'high' | 'low' | 'none';
}): FerrofluidStatus {
  const [debouncedIdle, setDebouncedIdle] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  const isIdle = isHealthy && !isError && !isActive && issueSeverity !== 'high' && issueSeverity !== 'low';

  useEffect(() => {
    if (isIdle) {
      timeoutRef.current = setTimeout(() => {
        setDebouncedIdle(true);
        timeoutRef.current = null;
      }, 2000);
    } else {
      setDebouncedIdle(false);
    }
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [isIdle]);

  if (!isHealthy || isError || issueSeverity === 'high') return 'danger';
  if (issueSeverity === 'low') return 'warning';
  if (isActive) return 'active';
  return debouncedIdle ? 'idle' : 'active';
}

function useLinkPieEmphasis(chartRef: React.RefObject<ChartHandle | null>) {
  useEffect(() => {
    const instance = chartRef.current?.getInstance();
    if (!instance) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onOver = (params: any) => {
      instance.dispatchAction({
        type: 'highlight',
        seriesIndex: 1,
        dataIndex: params.dataIndex,
      });
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onOut = (params: any) => {
      instance.dispatchAction({
        type: 'downplay',
        seriesIndex: 1,
        dataIndex: params.dataIndex,
      });
    };

    instance.on('mouseover', { seriesType: 'pie' }, onOver);
    instance.on('mouseout', { seriesType: 'pie' }, onOut);
    return () => {
      instance.off('mouseover', onOver);
      instance.off('mouseout', onOut);
    };
  }, [chartRef]);
}

function StatusArcEcharts({
  byStatus,
  isLoading,
}: {
  byStatus: StatusEntry[];
  isLoading?: boolean;
}) {
  const items = useOrderedStatuses(byStatus);
  const chartRef = useRef<ChartHandle>(null);

  useLinkPieEmphasis(chartRef);

  return (
    <>
      <div className={chartContainerStyles({ isLoading })}>
        <Chart ref={chartRef} width="100%" height="100%" theme="light">
          <Tooltip trigger="item" formatValue={(v) => formatNumber(v)} />
          <Pie
            radius={['85%', '96%']}
            center={['50%', '50%']}
            startAngle={210}
            endAngle={-30}
            padAngle={2.5}
            minAngle={5}
            showLabel={false}
            gradient={items.length > 0}
            silent={items.length === 0}
          >
            {items.length > 0 ? (
              items.map((s) => (
                <Slice
                  key={s.name}
                  name={STATUS_LABELS[s.name] ?? s.name}
                  value={s.count}
                  color={s.fillLight}
                  borderColor={s.stroke}
                  borderWidth={1.5}
                  borderType={s.borderType}
                  borderCap={s.borderCap}
                  borderRadius={6}
                  shadowBlur={4}
                  shadowColor="rgba(0,0,0,0.15)"
                  shadowOffsetY={1}
                />
              ))
            ) : (
              <Slice
                name="Loading"
                value={1}
                color="rgba(215,219,225,0.55)"
                borderColor="rgba(199,203,209,0.6)"
                borderWidth={1}
                borderRadius={6}
              />
            )}
          </Pie>
        </Chart>
      </div>
    </>
  );
}

const DEFAULT_INVOCATION_COLUMNS = [
  'id',
  'created_at',
  'modified_at',
  'duration',
  'target',
  'status',
];

function buildInvocationsHref(baseUrl: string, statusName: string) {
  const statuses =
    statusName === 'failed' ? ['failed', 'cancelled', 'killed'] : [statusName];
  const params = new URLSearchParams();
  params.set(
    'filter_status',
    JSON.stringify({ operation: 'IN', value: statuses }),
  );
  params.set('sort_field', 'modified_at');
  params.set('sort_order', 'DESC');
  for (const col of DEFAULT_INVOCATION_COLUMNS) {
    params.append('column', col);
  }
  return `${baseUrl}/invocations?${params.toString()}`;
}

function buildServiceInvocationsHref(baseUrl: string, serviceName: string) {
  const params = new URLSearchParams();
  params.set(
    'filter_target_service_name',
    JSON.stringify({ operation: 'IN', value: [serviceName] }),
  );
  params.set('sort_field', 'modified_at');
  params.set('sort_order', 'DESC');
  for (const col of DEFAULT_INVOCATION_COLUMNS) {
    params.append('column', col);
  }
  return `${baseUrl}/invocations?${params.toString()}`;
}

function buildServiceStatusInvocationsHref(
  baseUrl: string,
  serviceName: string,
  statusName: string,
) {
  const statuses =
    statusName === 'failed' ? ['failed', 'cancelled', 'killed'] : [statusName];
  const params = new URLSearchParams();
  params.set(
    'filter_target_service_name',
    JSON.stringify({ operation: 'IN', value: [serviceName] }),
  );
  params.set(
    'filter_status',
    JSON.stringify({ operation: 'IN', value: statuses }),
  );
  params.set('sort_field', 'modified_at');
  params.set('sort_order', 'DESC');
  for (const col of DEFAULT_INVOCATION_COLUMNS) {
    params.append('column', col);
  }
  return `${baseUrl}/invocations?${params.toString()}`;
}

function StatusLegend({
  byStatus,
  isLoading,
}: {
  byStatus: StatusEntry[];
  isLoading?: boolean;
}) {
  const items = useOrderedStatuses(byStatus);
  const { baseUrl } = useRestateContext();

  const allStatuses = useMemo(
    () =>
      STATUS_ORDER.map((name) => ({
        name,
        ...(STATUS_STYLE[name] ?? DEFAULT_STYLE),
      })),
    [],
  );

  const displayItems = items.length > 0 ? items : allStatuses;
  const hasData = items.length > 0;
  const mid = Math.ceil(displayItems.length / 2);

  return (
    <AriaGridList
      aria-label="Invocation statuses"
      className={legendStyles({ isLoading })}
      layout="grid"
    >
      {displayItems.map((s) => {
        const count = 'count' in s ? (s as { count: number }).count : 0;
        return hasData ? (
          <AriaGridListItem
            key={s.name}
            id={s.name}
            textValue={`${STATUS_LABELS[s.name] ?? s.name} ${count}`}
            href={buildInvocationsHref(baseUrl, s.name)}
            className="flex cursor-default items-center gap-1.5 rounded-md px-1.5 py-0.5 text-gray-700 no-underline outline-offset-2 outline-blue-600 hover:bg-black/5 focus-visible:outline-2"
          >
            <div
              className="h-3 w-3 shrink-0 rounded-full"
              style={{
                backgroundColor: s.fillLight,
                border: `1.5px ${s.borderType ? 'dashed' : 'solid'} ${s.stroke}`,
                boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.35)',
              }}
            />
            <span className="text-xs text-gray-500">
              {STATUS_LABELS[s.name] ?? s.name}
            </span>
            <span className="text-xs text-gray-400 tabular-nums">
              {formatNumber(count, true)}
            </span>
          </AriaGridListItem>
        ) : (
          <AriaGridListItem
            key={s.name}
            id={s.name}
            textValue={STATUS_LABELS[s.name] ?? s.name}
            className="flex cursor-default items-center gap-1.5 px-1.5 py-0.5 outline-none"
          >
            <div
              className="h-3 w-3 shrink-0 rounded-full opacity-40"
              style={{
                backgroundColor: s.fillLight,
                border: `1.5px ${s.borderType ? 'dashed' : 'solid'} ${s.stroke}`,
              }}
            />
            <span className="text-xs text-gray-400">
              {STATUS_LABELS[s.name] ?? s.name}
            </span>
            <span className="h-3 w-6 animate-pulse rounded bg-gray-200" />
          </AriaGridListItem>
        );
      })}
    </AriaGridList>
  );
}

function ServiceStatusBar({
  serviceName,
  byServiceAndStatus,
  serviceIssues = [],
  isSummaryError,
  isSummaryLoading,
}: {
  serviceName: string;
  byServiceAndStatus: {
    service: string;
    status: string;
    count: number;
  }[];
  serviceIssues?: ServiceIssue[];
  isSummaryError?: boolean;
  isSummaryLoading?: boolean;
}) {
  const { baseUrl } = useRestateContext();
  const statuses = useMemo(() => {
    const relevant = byServiceAndStatus.filter(
      (s) => s.service === serviceName && s.count > 0,
    );
    const map = new Map(relevant.map((s) => [s.status, s.count]));
    return STATUS_ORDER.filter((name) => (map.get(name) ?? 0) > 0).map(
      (name) => {
        const style = STATUS_STYLE[name] ?? DEFAULT_STYLE;
        return {
          name,
          count: map.get(name) ?? 0,
          ...style,
        };
      },
    );
  }, [serviceName, byServiceAndStatus]);

  const total = statuses.reduce((sum, s) => sum + s.count, 0);

  const issuesByStatus = useMemo(() => {
    const map = new Map<string, IssueSeverity>();
    for (const issue of serviceIssues) {
      if (issue.kind === 'sla' && issue.status) {
        const existing = map.get(issue.status);
        if (!existing || issue.severity === 'high') {
          map.set(issue.status, issue.severity);
        }
      }
    }
    return map;
  }, [serviceIssues]);

  if (total === 0) {
    if (isSummaryError || isSummaryLoading) return null;
    return (
      <div className="flex min-w-0 flex-col">
        <div className="text-0.5xs text-gray-400">No invocations</div>
        <div>
          <br />
        </div>
      </div>
    );
  }

  const tooltipContent = (
    <div className="flex flex-col">
      <div className="mb-4">
        <div className="!text-base leading-7 font-medium !text-gray-300">
          {serviceName}
        </div>
        <div>
          <span className="!text-xl !text-gray-50">
            {formatNumber(total, true)}{' '}
          </span>
          <span className="!text-sm !text-gray-400">
            {formatPlurals(total, { one: 'invocation', other: 'invocations' })}
          </span>
        </div>
      </div>
      <div className="-mx-4 border-t border-white/10" />
      <div className="mt-4 flex flex-col">
        {statuses.map((s) => {
          const severity = issuesByStatus.get(s.name);
          const href = buildServiceStatusInvocationsHref(
            baseUrl,
            serviceName,
            s.name,
          );
          return (
            <Link
              key={s.name}
              href={href}
              variant="secondary"
              className="-mx-2 flex items-center gap-2.5 rounded-lg border-none bg-transparent px-2 py-1.5 !text-inherit no-underline shadow-none hover:bg-white/10"
            >
              <div
                className="h-3.5 w-3.5 shrink-0 rounded-full"
                style={{
                  backgroundColor: s.fillLight,
                  border: `1.5px solid ${s.stroke}`,
                  boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.35)',
                }}
              />
              <span className="pr-2 !text-0.5xs !text-gray-300">
                {STATUS_LABELS[s.name] ?? s.name}
              </span>
              <span className="ml-auto flex items-center gap-1.5">
                {severity && (
                  <Icon
                    name={IconName.TriangleAlert}
                    className={issueAlertIconStyles({ severity })}
                  />
                )}
              </span>
              <span className="!text-0.5xs font-semibold !text-gray-100 tabular-nums">
                {formatNumber(s.count, true)}
              </span>
              <span className="!text-0.5xs font-medium !text-gray-300">
                ({formatPercentageWithoutFraction(s.count / total)})
              </span>
              <Icon
                name={IconName.ChevronRight}
                className="h-3 w-3 shrink-0 !text-zinc-500"
              />
            </Link>
          );
        })}
      </div>
    </div>
  );

  return (
    <HoverTooltip content={tooltipContent} size="lg">
      <div className="flex h-3 min-w-[60px] gap-1 overflow-hidden rounded-lg border border-gray-200 bg-gray-100 p-0.5">
        {statuses.map((s) => (
          <div
            key={s.name}
            className="h-full rounded-[1px] transition-all first:rounded-l-full last:rounded-r-full"
            style={{
              width: `${(s.count / total) * 100}%`,
              backgroundColor: `color-mix(in srgb, ${s.fillLight} 60%, white)`,
              outline: `1px ${s.borderType ? 'dashed' : 'solid'} ${s.stroke}`,
              minWidth: s.count > 0 ? 4 : 0,
            }}
          />
        ))}
      </div>
    </HoverTooltip>
  );
}

function DeploymentDropdown({
  serviceName,
  serviceDeploymentData,
}: {
  serviceName: string;
  serviceDeploymentData?: {
    deployments: Record<number, string[]>;
    sortedRevisions: number[];
  };
}) {
  const pairs = useMemo(() => {
    if (!serviceDeploymentData) return [];
    const { sortedRevisions, deployments } = serviceDeploymentData;
    return sortedRevisions.flatMap((rev) =>
      (deployments[rev] ?? []).map((id) => ({ id, revision: rev })),
    );
  }, [serviceDeploymentData]);

  if (pairs.length === 0) return null;

  const latest = pairs[0];
  if (!latest) return null;

  return (
    <Deployment
      deploymentId={latest.id}
      revision={latest.revision}
      highlightSelection={false}
    />
  );
}

function OlderRevisions({
  serviceName,
  serviceDeploymentData,
}: {
  serviceName: string;
  serviceDeploymentData?: {
    deployments: Record<number, string[]>;
    sortedRevisions: number[];
  };
}) {
  const pairs = useMemo(() => {
    if (!serviceDeploymentData) return [];
    const { sortedRevisions, deployments } = serviceDeploymentData;
    return sortedRevisions
      .flatMap((rev) =>
        (deployments[rev] ?? []).map((id) => ({ id, revision: rev })),
      )
      .slice(1);
  }, [serviceDeploymentData]);

  if (pairs.length === 0) return <div className="h-5" />;

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button
          variant="icon"
          className="relative z-10 h-auto w-auto gap-0.5 self-end rounded-lg px-1.5 py-0.5 text-0.5xs text-zinc-500 hover:bg-black/3 hover:text-zinc-700"
        >
          {pairs.length} older{' '}
          {formatPlurals(pairs.length, {
            one: 'revision',
            other: 'revisions',
          })}
          <Icon
            name={IconName.ChevronsUpDown}
            className="h-4 w-4 text-gray-400"
          />
        </Button>
      </DropdownTrigger>
      <DropdownPopover>
        <DropdownSection title="Older revisions">
          <DropdownMenu aria-label={`Older deployments for ${serviceName}`}>
            {pairs.map(({ id, revision }) => (
              <DropdownItem
                key={id}
                href={`?${DEPLOYMENT_QUERY_PARAM}=${id}`}
                value={id}
              >
                <Deployment
                  deploymentId={id}
                  revision={revision}
                  highlightSelection={false}
                  className="[&>*]:text-inherit"
                />
              </DropdownItem>
            ))}
          </DropdownMenu>
        </DropdownSection>
      </DropdownPopover>
    </Dropdown>
  );
}

function HandlerGridList({
  serviceName,
  handlers,
  serviceType,
}: {
  serviceName: string;
  handlers: Service['handlers'];
  serviceType: Service['ty'];
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { close } = usePopover();

  return (
    <AriaGridList
      aria-label={`All handlers for ${serviceName}`}
      autoFocus="first"
      className="flex flex-col gap-1 p-1 outline-none"
    >
      {handlers.map((handler) => (
        <AriaGridListItem
          key={handler.name}
          id={handler.name}
          textValue={handler.name}
          onHoverStart={(e) => {
            (e.target as HTMLElement).focus();
          }}
          onAction={() => {
            close?.();
            const params = new URLSearchParams(searchParams);
            params.set(SERVICE_QUERY_PARAM, serviceName);
            params.set(HANDLER_QUERY_PARAM, handler.name);
            setSearchParams(params);
          }}
          className="cursor-default rounded-md px-3 py-2 text-sm outline-none select-none data-[focused]:bg-blue-600 data-[focused]:text-white [&[data-focused]_*:not(svg)]:!text-inherit"
        >
          <Handler
            handler={handler}
            service={serviceName}
            serviceType={serviceType}
            showLink={false}
            showType={false}
            className="w-fit pr-0 pl-0"
          />
        </AriaGridListItem>
      ))}
    </AriaGridList>
  );
}

function NoDeploymentPlaceholder({ error }: { error?: Error | null }) {
  const { OnboardingGuide } = useRestateContext();

  if (error) {
    return (
      <div className="relative mt-6 flex w-full flex-col items-center gap-2">
        <ErrorBanner error={error} />
      </div>
    );
  }

  return (
    <div className="relative mt-6 flex w-full flex-col items-center gap-2 text-center">
      <h3 className="text-sm font-semibold text-gray-600">
        No{' '}
        <ServiceDeploymentExplainer>
          service deployments
        </ServiceDeploymentExplainer>
      </h3>
      <p className="max-w-md px-4 text-sm text-gray-500">
        Point Restate to your deployed services so Restate can register your{' '}
        <ServiceExplainer>services</ServiceExplainer> and handlers
      </p>
      <div className="mt-4 flex gap-2">
        <TriggerRegisterDeploymentDialog />
        {OnboardingGuide && (
          <OnboardingGuide stage="register-deployment-trigger" />
        )}
      </div>
    </div>
  );
}

const emptyServerStyles = tv({
  base: 'flex w-full flex-auto flex-col items-center justify-center overflow-hidden rounded-xl border bg-gray-200/50 pt-24 pb-8 shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)] @tall:pt-10 @tall:pb-40',
  variants: {
    isError: {
      true: '[&>svg:first-child>path]:fill-red-100',
      false: '',
    },
  },
});

const legendStyles = tv({
  base: 'flex max-w-2xl flex-wrap items-center justify-center gap-x-3 gap-y-1 outline-none',
  variants: {
    isLoading: {
      true: 'animate-pulse',
      false: '',
    },
  },
});

const chartContainerStyles = tv({
  base: 'absolute inset-0',
  variants: {
    isLoading: {
      true: 'animate-pulse',
      false: '',
    },
  },
});

const cellsContainerStyles = tv({
  extend: focusRing,
  base: '@container cursor-default overflow-hidden rounded-2xl border border-gray-200 bg-linear-to-b from-gray-50 to-gray-50/50 shadow-xs ring-1 ring-white transition ring-inset',
  variants: {
    issueSeverity: {
      none: '',
      low: 'before:pointer-events-none before:absolute before:inset-0 before:animate-stripeScroll before:rounded-2xl before:bg-[repeating-linear-gradient(135deg,transparent,transparent_8px,--theme(--color-white/90%)_8px,--theme(--color-white/90%)_16px)] before:[mask-image:linear-gradient(to_top_right,transparent_calc(100%-6rem),black_100%)] after:pointer-events-none after:absolute after:inset-0 after:rounded-2xl after:bg-[linear-gradient(to_top_right,transparent_40%,--theme(--color-orange-500/10%))] after:[mask-image:linear-gradient(to_top_right,transparent_calc(100%-6rem),black_100%)]',
      high: 'before:pointer-events-none before:absolute before:inset-0 before:animate-stripeScroll before:rounded-2xl before:bg-[repeating-linear-gradient(135deg,transparent,transparent_8px,--theme(--color-white/90%)_8px,--theme(--color-white/90%)_16px)] before:[mask-image:linear-gradient(to_top_right,transparent_calc(100%-6rem),black_100%)] after:pointer-events-none after:absolute after:inset-0 after:rounded-2xl after:bg-[linear-gradient(to_top_right,transparent_40%,--theme(--color-red-500/10%))] after:[mask-image:linear-gradient(to_top_right,transparent_calc(100%-6rem),black_100%)]',
    },
  },
  defaultVariants: {
    issueSeverity: 'none',
  },
});

const serviceCardStyles = tv({
  base: '@container rounded-2xl border bg-gray-200/50 shadow-[inset_0_-1px_2px_1px_rgba(0,0,0,0.015)] ring-1 ring-white/70',
});

const issueAlertIconStyles = tv({
  base: 'h-3 w-3 shrink-0',
  variants: {
    severity: {
      high: 'fill-red-400 stroke-red-100',
      low: 'fill-orange-400 stroke-orange-100',
    },
  },
});

const issueButtonStyles = tv({
  base: 'relative z-10 flex items-center gap-1 self-start rounded-md px-1 py-0 text-0.5xs',
  variants: {
    severity: {
      high: 'text-red-700',
      low: 'text-orange-700',
    },
  },
  defaultVariants: {
    severity: 'low',
  },
});

const issuePingStyles = tv({
  base: 'absolute inline-flex h-full w-full animate-ping rounded-full opacity-50',
  variants: {
    severity: {
      high: 'bg-red-200',
      low: 'bg-orange-200',
    },
  },
});

const issueDotStyles = tv({
  base: 'relative inline-flex h-2 w-2 rounded-full',
  variants: {
    severity: {
      high: 'bg-red-300',
      low: 'bg-orange-300',
    },
  },
});

const issueBannerStyles = tv({
  base: 'flex items-center gap-2 rounded-xl border border-zinc-900/80 bg-zinc-800/90 px-3 py-1 text-xs text-gray-200 shadow-[inset_0_1px_0_0_var(--color-gray-500)] drop-shadow-xl backdrop-blur-3xl',
  variants: {
    interactive: {
      true: 'hover:bg-zinc-700/90 pressed:bg-zinc-900',
      false: '',
    },
    elevated: {
      true: 'relative z-10',
      false: '',
    },
    full: {
      true: 'w-full',
      false: '',
    },
  },
  defaultVariants: {
    interactive: false,
    elevated: false,
    full: false,
  },
});

function IssueBannerPill({
  severity,
  children,
  details,
}: PropsWithChildren<{
  severity: IssueSeverity;
  details?: ReactNode | Error;
}>) {
  const content = (
    <div className={issueBannerStyles()}>
      <span className="relative flex h-2 w-2 shrink-0">
        <span className={issuePingStyles({ severity })} />
        <span className={issueDotStyles({ severity })} />
      </span>
      <span className="min-w-0 truncate">{children}</span>
      {details && (
        <Icon
          name={IconName.Info}
          className="h-3.5 w-3.5 shrink-0 text-zinc-400"
        />
      )}
    </div>
  );

  if (!details) return content;

  return (
    <Popover>
      <PopoverTrigger>
        <Button
          variant="icon"
          className={issueBannerStyles({ interactive: true })}
        >
          <span className="relative flex h-2 w-2 shrink-0">
            <span className={issuePingStyles({ severity })} />
            <span className={issueDotStyles({ severity })} />
          </span>
          <span className="min-w-0 truncate">{children}</span>
          <Icon
            name={IconName.Info}
            className="h-3.5 w-3.5 shrink-0 text-zinc-400"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="max-w-md">
        <div className="-m-px rounded-2xl border border-zinc-900/80 bg-zinc-800/90 p-3 shadow-[inset_0_1px_0_0_var(--color-gray-500)] drop-shadow-xl backdrop-blur-xl">
          {details instanceof Error ? (
            <ErrorBanner
              error={details}
              className="w-full rounded-md bg-white/5 [&_*]:text-orange-300! [&_code]:border-transparent [&_code]:bg-zinc-800/30 [&_code]:mix-blend-normal [&_svg]:h-3.5 [&_svg]:w-3.5"
            />
          ) : (
            <div className="text-xs text-zinc-300">{details}</div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function IssuesBannerStack() {
  const toasts = useIssueQueue();
  const issues = toasts.map((t: { content: IssueContent }) => t.content);
  const [expanded, setExpanded] = useState(false);

  if (issues.length === 0) return null;

  if (issues.length === 1) {
    const issue = issues[0]!;
    return (
      <IssueBannerPill severity={issue.severity} details={issue.details}>
        {issue.label}
      </IssueBannerPill>
    );
  }

  const maxStacked = 3;
  const stackCount = Math.min(issues.length, maxStacked);

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex flex-col-reverse items-center">
        <Button
          variant="icon"
          className={issueBannerStyles({ interactive: true, elevated: true })}
          onClick={() => setExpanded(!expanded)}
        >
          <span className="relative flex h-4 w-4 shrink-0">
            <Icon
              name={IconName.TriangleAlert}
              className="absolute h-4 w-4 animate-ping fill-amber-300 text-amber-800 opacity-60"
            />
            <Icon
              name={IconName.TriangleAlert}
              className="relative h-4 w-4 fill-amber-300 text-amber-800"
            />
          </span>
          <span>
            <span className="font-semibold text-white">Attention</span>
            <span className="mx-1.5 text-zinc-500">—</span>
            {issues.length}{' '}
            {formatPlurals(issues.length, { one: 'issue', other: 'issues' })}{' '}
            detected that may need your attention
          </span>
          <Icon
            name={IconName.ChevronsUpDown}
            className="h-3.5 w-3.5 shrink-0 text-zinc-300"
          />
        </Button>
        {Array.from({ length: stackCount - 1 }, (_, i) => {
          const depth = i + 1;
          return (
            <div
              key={i}
              className="w-full origin-[bottom_center] rounded-xl backdrop-blur-3xl transition-all duration-300 ease-out"
              style={{
                marginBottom: expanded ? 0 : -10,
                transform: expanded ? 'scale(1)' : `scale(${1 - depth * 0.15})`,
                opacity: expanded ? 0 : 1 - depth * 0.25,
                maxHeight: expanded ? 0 : 40,
              }}
              aria-hidden
            >
              <div className={issueBannerStyles({ full: true })}>
                <span className="h-2 w-2 shrink-0" />
              </div>
            </div>
          );
        })}
      </div>
      <div
        className="flex flex-col items-center gap-1.5 overflow-hidden p-1 transition-all duration-300 ease-out"
        style={{
          maxHeight: expanded ? issues.length * 60 : 0,
          marginTop: expanded ? 8 : 0,
          opacity: expanded ? 1 : 0,
        }}
      >
        {issues.map((issue, i) => (
          <IssueBannerPill
            key={i}
            severity={issue.severity}
            details={issue.details}
          >
            {issue.label}
          </IssueBannerPill>
        ))}
      </div>
    </div>
  );
}

function sortServices(
  services: Service[],
  descriptor: SortDescriptor,
  invocationCounts?: Map<string, number>,
  serviceIssuesMap?: Map<string, ServiceIssue[]>,
): Service[] {
  const { column, direction } = descriptor;
  const modifier = direction === 'descending' ? -1 : 1;
  return [...services].sort((a, b) => {
    switch (column) {
      case 'name':
        return modifier * a.name.localeCompare(b.name);
      case 'ty':
        return modifier * a.ty.localeCompare(b.ty);
      case 'revision':
        return modifier * (a.revision - b.revision);
      case 'invocations':
        return (
          modifier *
          ((invocationCounts?.get(a.name) ?? 0) -
            (invocationCounts?.get(b.name) ?? 0))
        );
      case 'health':
        return (
          modifier *
          (issuesSortScore(serviceIssuesMap?.get(a.name) ?? []) -
            issuesSortScore(serviceIssuesMap?.get(b.name) ?? []))
        );
      default:
        return 0;
    }
  });
}

function Component() {
  const {
    data: {
      services: deploymentServices,
      sortedServiceNames,
      deployments: deploymentsMap,
    } = {},
    isFetched,
    isError,
    error,
  } = useListDeployments();

  const { data: servicesMap } = useListServices(sortedServiceNames);
  const {
    data: rawSummaryData,
    isFetching: isSummaryLoading,
    isError: isSummaryError,
  } = useSummaryInvocations([], { sampled: false });
  const summaryData = isSummaryError ? undefined : rawSummaryData;

  const { GettingStarted, status, isNew, baseUrl, isVersionGte } =
    useRestateContext();

  const adminQueryPredicate = {
    predicate(query: { meta?: Record<string, unknown> }) {
      return Boolean(query.meta?.isAdmin);
    },
  };
  const isAdminFetching = useIsFetching(adminQueryPredicate) > 0;
  const isAdminMutating = useIsMutating(adminQueryPredicate) > 0;
  const queryClient = useQueryClient();

  const { isError: isQueryHealthError } = useQueryHealthStatus();

  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: 'name',
    direction: 'ascending',
  });
  const [filter, setFilter] = useState('');
  const filterRef = useFocusShortcut<HTMLInputElement>();

  const byStatus = useMemo(
    () => mergeStatuses(summaryData?.byStatus ?? []),
    [summaryData?.byStatus],
  );
  const byServiceAndStatus = useMemo(
    () => mergeServiceStatuses(summaryData?.byServiceAndStatus ?? []),
    [summaryData?.byServiceAndStatus],
  );
  const totalCount = summaryData?.totalCount ?? 0;

  const invocationCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of byServiceAndStatus) {
      counts.set(entry.service, (counts.get(entry.service) ?? 0) + entry.count);
    }
    return counts;
  }, [byServiceAndStatus]);

  const serviceStatusCounts = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    for (const entry of byServiceAndStatus) {
      let statusMap = map.get(entry.service);
      if (!statusMap) {
        statusMap = new Map();
        map.set(entry.service, statusMap);
      }
      statusMap.set(
        entry.status,
        (statusMap.get(entry.status) ?? 0) + entry.count,
      );
    }
    return map;
  }, [byServiceAndStatus]);

  const serviceIssuesMap = useMemo(() => {
    const map = new Map<string, ServiceIssue[]>();
    for (const service of servicesMap?.values() ?? []) {
      const deployment = deploymentsMap?.get(service.deployment_id);
      const statusCounts = serviceStatusCounts.get(service.name) ?? new Map();
      const issues = getServiceIssues({
        service,
        deployment,
        isVersionGte,
        statusCounts,
      });
      if (issues.length > 0) {
        map.set(service.name, issues);
      }
    }
    return map;
  }, [servicesMap, deploymentsMap, serviceStatusCounts, isVersionGte]);

  const overallIssueSeverity = useMemo(() => {
    if (isQueryHealthError) return 'high' as const;
    for (const issues of serviceIssuesMap.values()) {
      if (issues.some((i) => i.severity === 'high')) return 'high' as const;
    }
    if (serviceIssuesMap.size > 0) return 'low' as const;
    return 'none' as const;
  }, [isQueryHealthError, serviceIssuesMap]);

  const ferrofluidStatus = useRestateServerStatus({
    isHealthy: status === 'HEALTHY',
    isError,
    isActive: isAdminFetching || isAdminMutating,
    issueSeverity: overallIssueSeverity,
  });

  const globalStatusCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of byStatus) {
      map.set(entry.name, (map.get(entry.name) ?? 0) + entry.count);
    }
    return map;
  }, [byStatus]);

  const globalIssues = useMemo(
    () => getGlobalIssues(globalStatusCounts),
    [globalStatusCounts],
  );

  const servicesWithSlaIssues = useMemo(() => {
    const names: string[] = [];
    for (const [name, issues] of serviceIssuesMap) {
      if (issues.some((i) => i.kind === 'sla')) {
        names.push(name);
      }
    }
    return names;
  }, [serviceIssuesMap]);

  useEffect(() => {
    const keys: string[] = [];

    if (globalIssues.length > 0) {
      for (const issue of globalIssues) {
        keys.push(
          issueQueue.add({ severity: issue.severity, label: issue.label }),
        );
      }
    } else if (servicesWithSlaIssues.length > 0) {
      const count = servicesWithSlaIssues.length;
      const listed = servicesWithSlaIssues.slice(0, 3).join(', ');
      const remaining = count > 3 ? ` and ${count - 3} more` : '';
      keys.push(
        issueQueue.add({
          severity: 'low',
          label: `${count} ${formatPlurals(count, { one: 'service is', other: 'services are' })} experiencing issues`,
          details: `Affected: ${listed}${remaining}`,
        }),
      );
    }

    return () => {
      for (const key of keys) {
        issueQueue.close(key);
      }
    };
  }, [globalIssues, servicesWithSlaIssues]);

  const services = useMemo(() => {
    const all = Array.from(servicesMap?.values() ?? []);
    const lc = filter.toLowerCase();
    const filtered = filter
      ? all.filter((s) => {
          if (s.name.toLowerCase().includes(lc)) return true;
          if (s.ty.toLowerCase().includes(lc)) return true;
          if (s.handlers.some((h) => h.name.toLowerCase().includes(lc)))
            return true;
          const endpoint = getEndpoint(deploymentsMap?.get(s.deployment_id));
          if (endpoint?.toLowerCase().includes(lc)) return true;
          return false;
        })
      : all;
    return sortServices(
      filtered,
      sortDescriptor,
      invocationCounts,
      serviceIssuesMap,
    );
  }, [
    servicesMap,
    deploymentsMap,
    filter,
    sortDescriptor,
    invocationCounts,
    serviceIssuesMap,
  ]);

  const isEmpty =
    (isFetched || isNew) && (!deploymentsMap || deploymentsMap.size === 0);

  const columns: GridListColumn<Service>[] = useMemo(
    () => [
      {
        id: 'name',
        title: 'Service',
        width: 'calc(33% - 0.5rem)',
        allowsSorting: true,
        render: (s: Service) => (
          <div className="flex flex-col px-1">
            <div className="-mx-1 flex w-fit items-center gap-2 rounded-lg px-1 py-0.5 hover:bg-black/3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border bg-white shadow-xs">
                <Icon
                  name={IconName.Box}
                  className="h-full w-full fill-blue-50 p-1 text-blue-400 drop-shadow-md"
                />
              </div>
              <span className="min-w-0 truncate text-base font-medium text-zinc-700">
                {s.name}
              </span>
              <div className="ml-1 shrink-0">
                <ServiceType type={s.ty} />
              </div>
              <Icon
                name={IconName.ChevronRight}
                className="h-4 w-4 shrink-0 text-gray-400"
              />
            </div>
            <div>
              <br />
            </div>
          </div>
        ),
      },
      {
        id: 'revision',
        title: 'Deployment',
        width: 'calc(33% - 0.5rem)',
        allowsSorting: true,
        render: (s: Service) => {
          const depData = deploymentServices?.get(s.name) as
            | {
                deployments: Record<number, string[]>;
                sortedRevisions: number[];
              }
            | undefined;
          return (
            <div className="flex w-fit min-w-0 flex-col p-1">
              <DeploymentDropdown
                serviceName={s.name}
                serviceDeploymentData={depData}
              />
              <div className="pl-8">
                <OlderRevisions
                  serviceName={s.name}
                  serviceDeploymentData={depData}
                />
              </div>
            </div>
          );
        },
      },
      {
        id: 'invocations',
        title: 'Invocations',
        width: 'calc(100% - 66% - 10rem - 0.5rem)',
        allowsSorting: true,
        render: (s: Service) => {
          const serviceStatuses = byServiceAndStatus.filter(
            (st) => st.service === s.name && st.count > 0,
          );
          const serviceTotal = serviceStatuses.reduce(
            (sum, st) => sum + st.count,
            0,
          );
          return (
            <div className="flex flex-col pr-3">
              <div className="flex min-h-7 items-center">
                <div className="w-full">
                  <ServiceStatusBar
                    serviceName={s.name}
                    byServiceAndStatus={byServiceAndStatus}
                    serviceIssues={serviceIssuesMap.get(s.name)}
                    isSummaryError={isSummaryError}
                    isSummaryLoading={isSummaryLoading}
                  />
                </div>
              </div>
              <div>
                {serviceTotal > 0 ? (
                  <Link
                    href={buildServiceInvocationsHref(baseUrl, s.name)}
                    variant="secondary"
                    className="relative z-10 inline-flex w-auto items-center gap-0.5 rounded-lg border-none bg-transparent px-1.5 py-0.5 text-0.5xs text-zinc-500 no-underline shadow-none hover:bg-black/3 hover:text-zinc-700"
                  >
                    {formatNumber(serviceTotal, true)}{' '}
                    {formatPlurals(serviceTotal, {
                      one: 'invocation',
                      other: 'invocations',
                    })}
                    <Icon name={IconName.ChevronRight} className="h-4 w-4" />
                  </Link>
                ) : null}
              </div>
            </div>
          );
        },
      },
      {
        id: 'health',
        title: 'Issues',
        width: '10rem',
        allowsSorting: true,
        render: (s: Service) => {
          const issues = serviceIssuesMap.get(s.name) ?? [];
          const hasHigh = issues.some((i) => i.severity === 'high');

          if (issues.length === 0) {
            return null;
          }

          return (
            <div className="flex min-w-0 flex-col">
              <Popover>
                <PopoverTrigger>
                  <Button
                    variant="secondary"
                    className={issueButtonStyles({
                      severity: hasHigh ? 'high' : 'low',
                    })}
                  >
                    <div className="relative mx-0.5 flex h-2 w-2 shrink-0">
                      <span
                        className={issuePingStyles({
                          severity: hasHigh ? 'high' : 'low',
                        })}
                      />
                      <span
                        className={issueDotStyles({
                          severity: hasHigh ? 'high' : 'low',
                        })}
                      />
                    </div>
                    <span className="font-semibold">
                      {issues.length}{' '}
                      <span className="font-normal">
                        {formatPlurals(issues.length, {
                          one: 'issue',
                          other: 'issues',
                        })}
                      </span>
                    </span>
                    <Icon
                      name={IconName.ChevronsUpDown}
                      className="shrink- h-3.5 w-3.5 opacity-50"
                    />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="max-w-lg">
                  <div className="-m-px flex flex-col gap-1 rounded-2xl border border-zinc-900/80 bg-zinc-800/90 p-3 pb-1.5 shadow-[inset_0_1px_0_0_var(--color-gray-500)] drop-shadow-xl backdrop-blur-xl">
                    <div className="text-0.5xs font-medium text-zinc-400">
                      {issues.length}{' '}
                      {formatPlurals(issues.length, {
                        one: 'issue',
                        other: 'issues',
                      })}
                    </div>
                    <div className="flex flex-col pt-1">
                      {issues.map((issue, i) => {
                        const href =
                          issue.kind === 'sla' && issue.status
                            ? buildServiceStatusInvocationsHref(
                                baseUrl,
                                s.name,
                                issue.status,
                              )
                            : undefined;
                        const content = (
                          <>
                            <span
                              className={issueDotStyles({
                                severity: issue.severity,
                                className: 'shrink-0',
                              })}
                            />
                            <span>{issue.label}</span>
                            {href && (
                              <Icon
                                name={IconName.ChevronRight}
                                className="ml-auto h-3.5 w-3.5 shrink-0 text-zinc-300"
                              />
                            )}
                          </>
                        );
                        return href ? (
                          <Link
                            key={i}
                            href={href}
                            variant="secondary"
                            className="-mx-2 flex items-center gap-2 rounded-lg border-none bg-transparent px-2 py-1 text-0.5xs text-zinc-300 no-underline shadow-none hover:bg-white/10 pressed:bg-white/15"
                          >
                            {content}
                          </Link>
                        ) : (
                          <div
                            key={i}
                            className="flex items-center gap-2 py-1 text-0.5xs text-zinc-300"
                          >
                            {content}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <div>
                <br />
              </div>
            </div>
          );
        },
      },
    ],
    [deploymentServices, byServiceAndStatus, baseUrl, serviceIssuesMap],
  );

  const [waveKey, setWaveKey] = useState(0);
  const serverRef = useRef<HTMLDivElement>(null);
  const pieRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (waveKey === 0) return;

    const serverEl = serverRef.current;
    if (!serverEl) return;

    const serverRect = serverEl.getBoundingClientRect();
    const serverCenterY = serverRect.top + serverRect.height / 2;

    requestAnimationFrame(() => {
      const pieEl = pieRef.current;
      if (pieEl) {
        pieEl.animate(
          [
            { transform: 'scale(1)' },
            { transform: 'scale(1.03)' },
            { transform: 'scale(1)' },
          ],
          { duration: 500, easing: 'ease-in-out' },
        );
      }

      const sEl = serverRef.current;
      if (sEl) {
        for (let i = 0; i < 2; i++) {
          const ring = document.createElement('div');
          ring.style.cssText =
            'position:absolute;inset:0;border-radius:50%;pointer-events:none;border:3px solid rgba(255,255,255,0.6);z-index:-1;';
          sEl.appendChild(ring);

          ring.animate(
            [
              { transform: 'scale(0.5)', opacity: '0.6' },
              { transform: 'scale(4)', opacity: '0' },
            ],
            {
              duration: 1800,
              delay: i * 300,
              easing: 'ease-out',
              fill: 'forwards',
            },
          ).onfinish = () => ring.remove();
        }
      }

      const cards = document.querySelectorAll<HTMLElement>('[data-wave-card]');
      cards.forEach((card) => {
        const cardRect = card.getBoundingClientRect();
        const distance = cardRect.top - serverCenterY;
        const delay = Math.max(0, distance / 1500);

        const overlay = document.createElement('div');
        overlay.style.cssText =
          'position:absolute;inset:0;z-index:50;overflow:hidden;border-radius:inherit;pointer-events:none;';
        card.appendChild(overlay);

        const sweep = document.createElement('div');
        sweep.style.cssText =
          'position:absolute;left:-20%;right:-20%;height:120%;background:linear-gradient(180deg,transparent 0%,rgba(255,255,255,0.08) 20%,rgba(255,255,255,0.25) 45%,rgba(255,255,255,0.4) 50%,rgba(255,255,255,0.25) 55%,rgba(255,255,255,0.08) 80%,transparent 100%);';
        overlay.appendChild(sweep);

        const anim = sweep.animate(
          [
            { transform: 'translateY(-120%)' },
            { transform: 'translateY(120%)' },
          ],
          {
            duration: 700,
            delay: delay * 1000,
            easing: 'ease-in-out',
            fill: 'both',
          },
        );
        anim.onfinish = () => overlay.remove();
      });
    });
  }, [waveKey]);

  const onRefresh = () => {
    setWaveKey((k) => k + 1);
    queryClient.refetchQueries(adminQueryPredicate, {
      cancelRefetch: true,
    });
  };

  if (isEmpty) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center p-6">
        <RestateServer
          className={emptyServerStyles({ isError })}
          status={ferrofluidStatus}
          isEmpty
          onPress={onRefresh}
        >
          <NoDeploymentPlaceholder error={error} />
          {GettingStarted && <GettingStarted className="hidden @tall:block" />}
        </RestateServer>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full w-full flex-col items-center gap-8 px-6 pt-8 pb-6">
      <div className="relative flex flex-col items-center gap-3">
        <div ref={pieRef} className="relative -mb-12 h-[280px] w-[280px]">
          <StatusArcEcharts byStatus={byStatus} isLoading={isSummaryLoading} />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div ref={serverRef} className="pointer-events-auto scale-90 filter-[drop-shadow(0_4px_12px_rgba(0,0,0,0.08))_drop-shadow(0_1px_3px_rgba(0,0,0,0.06))]">
              <RestateServer status={ferrofluidStatus} onPress={onRefresh} />
            </div>
          </div>
        </div>
        <div className="flex min-h-8 items-baseline justify-center gap-1.5">
          {totalCount > 0 && (
            <>
              <span className="text-2xl font-bold text-gray-700 tabular-nums">
                {formatNumber(totalCount, true)}
              </span>
              <span className="text-sm text-gray-400">invocations</span>
            </>
          )}
        </div>
        <StatusLegend byStatus={byStatus} isLoading={isSummaryLoading} />
      </div>
      <IssuesBannerStack />

      <div className="mt-8 flex min-h-0 w-full flex-1 flex-col">
        <div className="mb-2 flex flex-col gap-2 px-5 md:flex-row md:items-center md:justify-between">
          <SearchField
            aria-label="Filter"
            value={filter}
            onChange={setFilter}
            className="w-full outline-none md:max-w-[30ch]"
          >
            <Label className="sr-only">Filter services…</Label>
            <div className="relative min-h-8.5">
              <AriaInput
                ref={filterRef}
                placeholder="Filter services…"
                className="mt-0 w-full min-w-0 rounded-xl border border-gray-200 bg-gray-50 px-2 py-1.5 pr-8 pl-8 text-sm text-gray-900 shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)] placeholder:text-gray-500/70 focus:border-gray-200 focus:shadow-none focus:[box-shadow:inset_0_1px_0px_0px_rgba(0,0,0,0.03)] focus:outline-2 focus:outline-blue-600"
              />
              <Icon
                name={IconName.Search}
                className="pointer-events-none absolute top-1/2 left-2 h-4 w-4 -translate-y-1/2 text-gray-400"
              />
              <FocusShortcutKey
                variant="light"
                className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2"
              />
            </div>
          </SearchField>
          <TriggerRegisterDeploymentDialog className="justify-center py-1.5 md:ml-auto md:justify-normal" />
        </div>
        <GridList
          aria-label="Services"
          columns={columns}
          items={services}
          dependencies={[serviceIssuesMap, columns, waveKey]}
          sortDescriptor={sortDescriptor}
          onSortChange={setSortDescriptor}
          estimatedRowHeight={100}
          headerClassName="px-[calc(0.5rem+1px+0.75rem)]"
        >
          {(service) => (
            <GridListItem
              id={service.name}
              item={service}
              textValue={service.name}
              href={`?${SERVICE_QUERY_PARAM}=${service.name}&${HANDLER_QUERY_PARAM}`}
            >
              {({ cells, isFocusVisible }) => {
                const issues = serviceIssuesMap.get(service.name) ?? [];
                const issueSeverity = issues.some((i) => i.severity === 'high')
                  ? ('high' as const)
                  : issues.length > 0
                    ? ('low' as const)
                    : ('none' as const);
                const cardIndex = services.indexOf(service);
                return (
                  <div
                    className="mb-4 animate-cardBounce px-2 pt-1"
                    style={{
                      animationDelay: `${0.3 + cardIndex * 0.1}s`,
                      animationFillMode: 'both',
                    }}
                    key={`${service.name}-wave-${waveKey}`}
                  >
                    <div
                      data-wave-card
                      className={cellsContainerStyles({
                        isFocusVisible,
                        issueSeverity,
                        className: 'relative hover:from-gray-100',
                      })}
                    >
                      <div className="px-1 py-2.5">{cells}</div>
                      {service.handlers.length > 0 && (
                        <div className="flex flex-col gap-1 border-gray-200/90 pt-3 pb-2.5">
                          <div className="-mt-5 flex items-center gap-2 text-2xs font-semibold tracking-wide text-gray-400 uppercase">
                            <div className="grow-0 basis-1.5 border-t border-gray-200/90" />
                            Handlers
                            <div className="flex-auto border-t border-gray-200/90" />
                          </div>
                          <div className="flex flex-col gap-1 px-1 opacity-95 @5xl:grid @5xl:grid-cols-[calc(33%-0.5rem)_calc(33%-0.5rem)_1fr] @5xl:gap-x-2">
                            {service.handlers.slice(0, 9).map((handler) => (
                              <Handler
                                key={handler.name}
                                handler={handler}
                                className="ml-1.5 w-fit pr-0 pl-0"
                                service={service.name}
                                withPlayground
                                serviceType={service.ty}
                                showLink
                                showType={false}
                              />
                            ))}
                            {service.handlers.length > 9 && (
                              <div className="ml-8 w-fit">
                                <Dropdown>
                                  <DropdownTrigger>
                                    <Button
                                      variant="icon"
                                      className="h-auto w-auto gap-0.5 rounded-lg px-1.5 py-0.5 text-0.5xs text-zinc-500 hover:bg-black/3 hover:text-zinc-700"
                                    >
                                      +{service.handlers.length - 9}{' '}
                                      {formatPlurals(
                                        service.handlers.length - 9,
                                        {
                                          one: 'handler',
                                          other: 'handlers',
                                        },
                                      )}
                                      <Icon
                                        name={IconName.ChevronsUpDown}
                                        className="h-4 w-4 text-gray-400"
                                      />
                                    </Button>
                                  </DropdownTrigger>
                                  <DropdownPopover placement="bottom start">
                                    <DropdownSection title="Handlers">
                                      <HandlerGridList
                                        serviceName={service.name}
                                        handlers={service.handlers}
                                        serviceType={service.ty}
                                      />
                                    </DropdownSection>
                                  </DropdownPopover>
                                </Dropdown>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }}
            </GridListItem>
          )}
        </GridList>
      </div>
    </div>
  );
}

export const overview2 = { Component };
