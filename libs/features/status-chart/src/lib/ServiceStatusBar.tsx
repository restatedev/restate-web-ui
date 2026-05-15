import type { ReactNode } from 'react';
import {
  formatNumber,
  formatPlurals,
  formatPercentageWithoutFraction,
} from '@restate/util/intl';
import {
  toServiceInvocationsHref,
  toServiceStatusInvocationsHref,
  toServiceAndHandlerInvocationsHref,
  toServiceAndHandlerStatusInvocationsHref,
} from '@restate/util/invocation-links';
import {
  getRangeLabel,
  useRestateContext,
} from '@restate/features/restate-context';
import type { components } from '@restate/data-access/admin-api-spec';
import { HoverTooltip } from '@restate/ui/tooltip';
import { Link } from '@restate/ui/link';
import { Icon, IconName } from '@restate/ui/icons';
import type {
  ServiceIssue,
  IssueSeverity,
} from '@restate/features/system-health';
import { issueAlertIconStyles } from '@restate/ui/issue-banner';
import {
  STATUS_ORDER,
  STATUS_STYLE,
  STATUS_LABELS,
  DEFAULT_STYLE,
} from './constants';
import { tv } from '@restate/util/styles';

type StatusBarEntry = {
  name: string;
  count: number;
} & (typeof STATUS_STYLE)[string];

function buildStatusEntries(
  rows: { status: string; count: number }[],
): StatusBarEntry[] {
  const map = new Map<string, number>();
  for (const row of rows) {
    if (row.count <= 0) continue;
    map.set(row.status, (map.get(row.status) ?? 0) + row.count);
  }
  return STATUS_ORDER.filter((name) => (map.get(name) ?? 0) > 0).map(
    (name) => ({
      name,
      count: map.get(name) ?? 0,
      ...(STATUS_STYLE[name] ?? DEFAULT_STYLE),
    }),
  );
}

function getIssuesByStatus(serviceIssues: ServiceIssue[]) {
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
}

const styles = tv({
  base: 'flex h-3 gap-1 overflow-hidden rounded-lg border border-gray-200 bg-gray-100 p-0.5 [&:not(:has(*))]:h-2.5',
  variants: {
    isLoading: {
      true: 'animate-pulse',
      false: '',
    },
  },
});

function StatusBar({
  title,
  total,
  totalLink,
  statuses,
  getStatusLink,
  issuesByStatus,
  isLoading,
}: {
  title: ReactNode;
  total: number;
  totalLink: string;
  statuses: StatusBarEntry[];
  getStatusLink: (statusName: string) => string;
  issuesByStatus?: Map<string, IssueSeverity>;
  isLoading?: boolean;
}) {
  if (!total) return <div className="h-3" />;

  const tooltipContent = (
    <div className="flex flex-col">
      <div className="mb-2">
        <div className="">{title}</div>
        <Link
          href={totalLink}
          variant="secondary"
          className="-mx-2 flex items-baseline gap-1 rounded-lg border-none bg-transparent px-2 py-1 !text-inherit no-underline shadow-none hover:bg-white/10"
        >
          <span className="!text-xl !text-gray-50">
            {formatNumber(total, true)}
          </span>
          <span className="!text-sm !text-gray-400">
            {formatPlurals(total, { one: 'invocation', other: 'invocations' })}
          </span>
          <Icon
            name={IconName.ChevronRight}
            className="ml-auto h-3.5 w-3.5 shrink-0 !text-zinc-500"
          />
        </Link>
      </div>
      <div className="-mx-3 border-t border-white/10" />
      <div className="mt-2 flex flex-col">
        {statuses.map((s) => {
          const severity = issuesByStatus?.get(s.name);
          return (
            <Link
              key={s.name}
              href={getStatusLink(s.name)}
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
      <div className={styles({ isLoading })}>
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

export function ServiceStatusBar({
  serviceName,
  handlerName,
  data,
  serviceIssues = [],
  linkParams,
  isLoading,
}: {
  serviceName: string;
  handlerName?: string;
  data?: components['schemas']['InvocationsSummaryResponse'];
  serviceIssues?: ServiceIssue[];
  linkParams?: URLSearchParams;
  isLoading?: boolean;
}) {
  const { baseUrl } = useRestateContext();
  const range = data?.range;

  const rows = handlerName
    ? (data?.byServiceAndHandlerAndStatus ?? []).filter(
        (s) => s.service === serviceName && s.handler === handlerName,
      )
    : (data?.byServiceAndStatus ?? []).filter((s) => s.service === serviceName);
  const statuses = buildStatusEntries(rows);
  const total = statuses.reduce((sum, s) => sum + s.count, 0);
  const issuesByStatus = handlerName
    ? undefined
    : getIssuesByStatus(serviceIssues);

  const title = (
    <>
      <div className="text-base! leading-7 font-medium text-gray-300!">
        <span className="text-base! leading-7 font-medium text-gray-300!">
          {serviceName}
        </span>
        {handlerName && (
          <>
            <span className="text-base! leading-7 font-medium text-gray-300! opacity-60">
              {' '}
              /{' '}
            </span>
            <span className="text-base! leading-7 font-medium text-gray-300! italic">
              {handlerName}()
            </span>
          </>
        )}
      </div>
      <div className="text-0.5xs! font-normal text-gray-400!">
        {getRangeLabel(range)}
      </div>
    </>
  );

  const totalLink = handlerName
    ? toServiceAndHandlerInvocationsHref(baseUrl, serviceName, handlerName, {
        existingParams: linkParams,
      })
    : toServiceInvocationsHref(baseUrl, serviceName, {
        existingParams: linkParams,
      });

  const getStatusLink = (statusName: string) =>
    handlerName
      ? toServiceAndHandlerStatusInvocationsHref(
          baseUrl,
          serviceName,
          handlerName,
          statusName,
          { existingParams: linkParams },
        )
      : toServiceStatusInvocationsHref(baseUrl, serviceName, statusName, {
          existingParams: linkParams,
        });

  return (
    <StatusBar
      title={title}
      total={total}
      totalLink={totalLink}
      statuses={statuses}
      getStatusLink={getStatusLink}
      issuesByStatus={issuesByStatus}
      isLoading={isLoading}
    />
  );
}
