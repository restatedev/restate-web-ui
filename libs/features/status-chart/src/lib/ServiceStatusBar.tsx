import {
  formatNumber,
  formatPlurals,
  formatPercentageWithoutFraction,
} from '@restate/util/intl';
import {
  toServiceInvocationsHref,
  toServiceStatusInvocationsHref,
} from '@restate/util/invocation-links';
import { useRestateContext } from '@restate/features/restate-context';
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

function getServiceStatuses(
  serviceName: string,
  byServiceAndStatus: { service: string; status: string; count: number }[],
) {
  const relevant = byServiceAndStatus.filter(
    (s) => s.service === serviceName && s.count > 0,
  );
  const map = new Map(relevant.map((s) => [s.status, s.count]));
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

export function ServiceStatusBar({
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
  const statuses = getServiceStatuses(serviceName, byServiceAndStatus);
  const total = statuses.reduce((sum, s) => sum + s.count, 0);
  const issuesByStatus = getIssuesByStatus(serviceIssues);

  if (total === 0) {
    if (isSummaryError || isSummaryLoading) return null;
    return (
      <div className="flex min-w-0 flex-col">
        <div className="pl-1.5 text-0.5xs text-gray-400">No invocations</div>
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
        <Link
          href={toServiceInvocationsHref(baseUrl, serviceName)}
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
      <div className="-mx-4 border-t border-white/10" />
      <div className="mt-4 flex flex-col">
        {statuses.map((s) => {
          const severity = issuesByStatus.get(s.name);
          const href = toServiceStatusInvocationsHref(
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
