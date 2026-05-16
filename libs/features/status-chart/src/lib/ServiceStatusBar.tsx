import type { ReactNode } from 'react';
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
import type {
  ServiceIssue,
  IssueSeverity,
} from '@restate/features/system-health';
import {
  buildStatusEntries,
  InvocationsBreakdownTooltipContent,
  type StatusBarEntry,
} from './InvocationsBreakdownTooltipContent';
import { tv } from '@restate/util/styles';

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
    <InvocationsBreakdownTooltipContent
      title={title}
      total={total}
      totalLink={totalLink}
      statuses={statuses}
      getStatusLink={getStatusLink}
      issuesByStatus={issuesByStatus}
    />
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
