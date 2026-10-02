import type { Service } from '@restate/data-access/admin-api-spec';
import {
  ContentPanel,
  ContentPanelBody,
  ContentPanelSection,
  type ContentPanelTabs,
} from '@restate/ui/content-panel';
import { formatNumber } from '@restate/util/intl';
import { useMemo } from 'react';
import { DeploymentInvocations } from './DeploymentInvocations';
import { DeploymentServicesTable } from './DeploymentServicesTable';

export type DeploymentTab = 'services' | 'invocations';

const TAB_QUERY_PARAM = 'tab';

export function deploymentTabFromSearch(
  searchParams: URLSearchParams,
): DeploymentTab {
  return searchParams.get(TAB_QUERY_PARAM) === 'invocations'
    ? 'invocations'
    : 'services';
}

export function deploymentTabHref(
  searchParams: URLSearchParams,
  tab: DeploymentTab,
): string {
  const params = new URLSearchParams(searchParams);
  if (tab === 'services') {
    params.delete(TAB_QUERY_PARAM);
  } else {
    params.set(TAB_QUERY_PARAM, tab);
  }
  return `?${params.toString()}`;
}

export function DeploymentDetails({
  deploymentId,
  services,
  tab,
  isPending,
  error,
}: {
  deploymentId: string;
  services: Service[];
  tab: DeploymentTab;
  isPending: boolean;
  error: Error | null;
}) {
  const tabs = useMemo<ContentPanelTabs>(
    () => ({
      items: [
        {
          id: 'services',
          label: (
            <span className="flex items-center gap-1.5">
              Services
              {isPending ? (
                <span className="inline-block h-3 w-5 animate-pulse rounded bg-zinc-200" />
              ) : (
                <span className="rounded bg-zinc-100 px-1 py-px text-2xs font-medium text-zinc-500 tabular-nums">
                  {formatNumber(services.length, true)}
                </span>
              )}
            </span>
          ),
        },
        { id: 'invocations', label: 'Invocations' },
      ],
      defaultId: 'services',
      queryParam: TAB_QUERY_PARAM,
    }),
    [isPending, services.length],
  );

  return (
    <ContentPanel className="-mt-14" tabs={tabs}>
      <ContentPanelBody className="pb-32">
        <ContentPanelSection flush>
          {tab === 'services' ? (
            <DeploymentServicesTable
              deploymentId={deploymentId}
              services={services}
              isPending={isPending}
              error={error}
            />
          ) : (
            <DeploymentInvocations deploymentId={deploymentId} />
          )}
        </ContentPanelSection>
      </ContentPanelBody>
    </ContentPanel>
  );
}
