import type { ReactNode } from 'react';
import { useRestateContext } from '@restate/features/restate-context';
import {
  toServiceAndHandlerInvocationsHref,
  toServiceAndHandlerStatusInvocationsHref,
  toServiceInvocationsHref,
  toServiceStatusInvocationsHref,
} from '@restate/util/invocation-links';
import {
  InvocationsBreakdownTooltipContent,
  type StatusBarEntry,
} from '@restate/features/status-chart';
import type {
  IssueSeverity,
  ServiceIssue,
} from '@restate/features/system-health';

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

export function HandlerBreakdownTooltip({
  serviceName,
  handlerName,
  statuses,
  total,
  rangeLabel,
  linkParams,
}: {
  serviceName: string;
  handlerName: string;
  statuses: StatusBarEntry[];
  total: number;
  rangeLabel: ReactNode;
  linkParams?: URLSearchParams;
}) {
  const { baseUrl } = useRestateContext();
  const totalLink = toServiceAndHandlerInvocationsHref(
    baseUrl,
    serviceName,
    handlerName,
    { existingParams: linkParams },
  );
  return (
    <InvocationsBreakdownTooltipContent
      title={
        <>
          <div className="text-base! leading-7 font-medium text-gray-300!">
            <span className="text-base! leading-7 font-medium text-gray-300!">
              {serviceName}
            </span>
            <span className="text-base! leading-7 font-medium text-gray-300! opacity-60">
              {' '}
              /{' '}
            </span>
            <span className="text-base! leading-7 font-medium text-gray-300! italic">
              {handlerName}()
            </span>
          </div>
          <div className="text-0.5xs! font-normal text-gray-400!">
            {rangeLabel}
          </div>
        </>
      }
      total={total}
      totalLink={totalLink}
      statuses={statuses}
      getStatusLink={(statusName) =>
        toServiceAndHandlerStatusInvocationsHref(
          baseUrl,
          serviceName,
          handlerName,
          statusName,
          { existingParams: linkParams },
        )
      }
    />
  );
}

export function ServiceBreakdownTooltip({
  serviceName,
  statuses,
  total,
  rangeLabel,
  linkParams,
  serviceIssues,
}: {
  serviceName: string;
  statuses: StatusBarEntry[];
  total: number;
  rangeLabel: ReactNode;
  linkParams?: URLSearchParams;
  serviceIssues?: ServiceIssue[];
}) {
  const { baseUrl } = useRestateContext();
  const totalLink = toServiceInvocationsHref(baseUrl, serviceName, {
    existingParams: linkParams,
  });
  const issuesByStatus = serviceIssues
    ? getIssuesByStatus(serviceIssues)
    : undefined;
  return (
    <InvocationsBreakdownTooltipContent
      title={
        <>
          <div className="text-base! leading-7 font-medium text-gray-300!">
            {serviceName}
          </div>
          <div className="text-0.5xs! font-normal text-gray-400!">
            {rangeLabel}
          </div>
        </>
      }
      total={total}
      totalLink={totalLink}
      statuses={statuses}
      getStatusLink={(statusName) =>
        toServiceStatusInvocationsHref(baseUrl, serviceName, statusName, {
          existingParams: linkParams,
        })
      }
      issuesByStatus={issuesByStatus}
    />
  );
}
