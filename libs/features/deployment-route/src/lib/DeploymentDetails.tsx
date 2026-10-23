import type { Service } from '@restate/data-access-admin-api-spec';
import {
  ContentPanel,
  ContentPanelBody,
  ContentPanelSection,
  type ContentPanelTabs,
  isTabStateParam,
} from '@restate/ui-content-panel';
import { formatNumber } from '@restate/util-intl';
import { useMemo } from 'react';
import { InvocationsTabLabel } from '@restate/features-service-route';
import {
  DeploymentInvocations,
  useDeploymentInvocationsTab,
} from './DeploymentInvocations';
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
  const invocationsTab = useDeploymentInvocationsTab(
    deploymentId,
    tab === 'invocations',
  );
  const { tabBadge, isTabBadgeLoading } = invocationsTab;
  const tabs = useMemo<ContentPanelTabs>(
    () => ({
      items: [
        {
          id: 'services',
          label: (
            <span className="flex items-center gap-1.5">
              Services
              {isPending ? (
                <span className="inline-block h-3 w-5 animate-pulse rounded bg-emphasis" />
              ) : (
                <span className="rounded bg-muted px-1 py-px text-2xs font-medium text-muted tabular-nums">
                  {formatNumber(services.length, true)}
                </span>
              )}
            </span>
          ),
        },
        {
          id: 'invocations',
          label: (
            <InvocationsTabLabel
              badge={tabBadge}
              isLoading={isTabBadgeLoading}
            />
          ),
        },
      ],
      defaultId: 'services',
      queryParam: TAB_QUERY_PARAM,
      stateParams: isTabStateParam,
    }),
    [isPending, services.length, tabBadge, isTabBadgeLoading],
  );

  return (
    <ContentPanel
      className="-mt-[calc(var(--cp-toolbar-tuck,0px)-1.5rem)]"
      tabs={tabs}
    >
      {tab === 'services' ? (
        <ContentPanelBody className="pb-32">
          <ContentPanelSection flush>
            <DeploymentServicesTable
              deploymentId={deploymentId}
              services={services}
              isPending={isPending}
              error={error}
            />
          </ContentPanelSection>
        </ContentPanelBody>
      ) : (
        <DeploymentInvocations
          deploymentId={deploymentId}
          invocationsTab={invocationsTab}
        />
      )}
    </ContentPanel>
  );
}
