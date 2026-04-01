import type { Service } from '@restate/data-access/admin-api-spec';
import type { GridListColumn } from '@restate/ui/grid-list';
import type { ServiceIssue } from '@restate/features/system-health';
import { Icon, IconName } from '@restate/ui/icons';
import { Link } from '@restate/ui/link';
import { formatNumber, formatPlurals } from '@restate/util/intl';
import { toServiceInvocationsHref } from '@restate/util/invocation-links';
import {
  ServiceType,
  SERVICE_PLAYGROUND_QUERY_PARAM,
} from '@restate/features/service';
import {
  LatestRevisionDeployment,
  OlderRevisions,
} from '@restate/features/deployment';
import { ServiceStatusBar } from '@restate/features/status-chart';
import { IssueBadge } from '@restate/ui/issue-banner';
import { HoverTooltip } from '@restate/ui/tooltip';

export function useServiceColumns({
  byServiceAndStatus,
  baseUrl,
  serviceIssuesMap,
  isSummaryError,
  isSummaryLoading,
  linkParams,
}: {
  byServiceAndStatus: { service: string; status: string; count: number }[];
  baseUrl: string;
  serviceIssuesMap: Map<string, ServiceIssue[]>;
  isSummaryError: boolean;
  isSummaryLoading: boolean;
  linkParams?: URLSearchParams;
}): GridListColumn<Service>[] {
  return [
    {
      id: 'name',
      title: 'Service',
      allowsSorting: true,
      render: (s: Service) => (
        <div className="max-w-fit min-w-0 truncate">
          <div className="flex flex-col px-1">
            <div className="-mx-1 flex min-w-0 items-center gap-2 rounded-lg px-1 py-0.5 hover:bg-black/3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border bg-white shadow-xs">
                <Icon
                  name={IconName.Box}
                  className="h-full w-full fill-blue-50 p-1 text-blue-400 drop-shadow-md"
                />
              </div>
              <span className="min-w-0 truncate text-base font-medium text-zinc-700">
                {s.name}
              </span>

              <HoverTooltip content="Playground">
                <Link
                  href={`?${SERVICE_PLAYGROUND_QUERY_PARAM}=${s.name}`}
                  variant="secondary-button"
                  className="mt-1.5 mr-0.5 ml-0 shrink-0 px-1 py-1"
                >
                  <Icon
                    name={IconName.Play}
                    className="ml-px h-3 w-3 text-blue-700"
                  />
                </Link>
              </HoverTooltip>
            </div>
            <div>
              <div className="invisible -mt-2 mb-2 ml-7.5 shrink-0 xl:visible">
                <ServiceType
                  type={s.ty}
                  className="border-transparent bg-transparent font-normal text-gray-500"
                />
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'revision',
      title: 'Deployment',
      allowsSorting: true,
      render: (s: Service) => (
        <div className="hidden max-w-fit min-w-0 truncate md:block">
          <div className="flex min-w-0 flex-col p-1">
            <LatestRevisionDeployment serviceName={s.name} />
            <div className="pl-8">
              <OlderRevisions serviceName={s.name} />
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'invocations',
      title: 'Invocations',
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
          <div className="hidden min-w-0 flex-col pr-3 md:flex">
            <div className="flex min-h-7 items-center">
              <div className="w-full">
                <ServiceStatusBar
                  serviceName={s.name}
                  byServiceAndStatus={byServiceAndStatus}
                  serviceIssues={serviceIssuesMap.get(s.name)}
                  isSummaryError={isSummaryError}
                  isSummaryLoading={isSummaryLoading}
                  linkParams={linkParams}
                />
              </div>
            </div>
            <div className="min-w-0 truncate">
              {serviceTotal > 0 ? (
                <Link
                  href={toServiceInvocationsHref(baseUrl, s.name, {
                    existingParams: linkParams,
                  })}
                  variant="secondary"
                  className="relative z-10 inline-flex w-auto min-w-0 items-center gap-0.5 truncate rounded-lg border-none bg-transparent px-1.5 py-0.5 text-0.5xs text-zinc-500 no-underline shadow-none hover:bg-black/3 hover:text-zinc-700"
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
      allowsSorting: true,
      render: (s: Service) => {
        const issues = serviceIssuesMap.get(s.name) ?? [];
        if (issues.length === 0) return null;
        return (
          <IssueBadge issues={issues} serviceName={s.name} baseUrl={baseUrl} />
        );
      },
    },
  ];
}
