import { useListDeployments } from '@restate/data-access/admin-api-hooks';
import type { Handler, ServiceType } from '@restate/data-access/admin-api-spec';
import {
  ContentPanel,
  ContentPanelBody,
  ContentPanelSection,
  type ContentPanelTabs,
  isTabStateParam,
} from '@restate/ui/content-panel';
import { formatNumber } from '@restate/util/intl';
import { useMemo, type ReactNode } from 'react';
import { ServiceDeploymentsTable } from './ServiceDeploymentsTable';
import { ServiceHandlersTable } from './ServiceHandlersTable';
import { InvocationsTabLabel } from './InvocationsTabLabel';
import {
  ServiceInvocations,
  useServiceInvocationsTab,
} from './ServiceInvocations';
import { ServicePlaygroundEmbed } from '@restate/features/service';
import { VirtualObjectInstances } from '@restate/features/virtual-objects-route';
import { WorkflowRuns } from '@restate/features/workflows-route';
import { tv } from '@restate/util/styles';
import {
  keyedServiceTab,
  TAB_QUERY_PARAM,
  type KeyedServiceTab,
  type ServiceTab,
} from './serviceTabs';

const panelStyles = tv({
  base: '-mt-14',
  variants: {
    hasFilterToolbar: {
      true: 'sm:[&_[data-cp-slot=toolbar]]:min-w-[min(28rem,40vw)]',
    },
  },
});

const KEYED_TAB_LABELS: Record<KeyedServiceTab, string> = {
  runs: 'Workflow runs',
  instances: 'Virtual Object instances',
};

export {
  serviceTabFromSearch,
  serviceTabHref,
  type ServiceTab,
} from './serviceTabs';

function TabLabel({
  children,
  count,
  isPending,
}: {
  children: ReactNode;
  count?: number;
  isPending: boolean;
}) {
  return (
    <span className="flex items-center gap-1.5">
      {children}
      {count !== undefined ? (
        <span className="rounded bg-zinc-100 px-1 py-px text-2xs font-medium text-zinc-500 tabular-nums">
          {formatNumber(count, true)}
        </span>
      ) : isPending ? (
        <span className="inline-block h-3 w-5 animate-pulse rounded bg-zinc-200" />
      ) : null}
    </span>
  );
}

export function ServiceDetails({
  service,
  serviceType,
  handlers,
  selectedHandler,
  tab,
  isPending,
  error,
}: {
  service: string;
  serviceType?: ServiceType;
  handlers: Handler[];
  selectedHandler?: string;
  tab: ServiceTab;
  isPending: boolean;
  error: Error | null;
}) {
  const { data: deploymentsData } = useListDeployments();
  const deploymentsCount = useMemo(() => {
    const serviceDeployments = deploymentsData?.services.get(service);
    if (!deploymentsData) {
      return undefined;
    }
    if (!serviceDeployments) {
      return 0;
    }
    return serviceDeployments.sortedRevisions.reduce(
      (total, revision) =>
        total + (serviceDeployments.deployments[revision]?.length ?? 0),
      0,
    );
  }, [deploymentsData, service]);
  const keyedTab =
    keyedServiceTab(serviceType) ??
    (!serviceType && (tab === 'runs' || tab === 'instances') ? tab : undefined);
  const activeTab =
    (tab === 'runs' || tab === 'instances') && tab !== keyedTab
      ? 'invocations'
      : tab;
  const invocationsTab = useServiceInvocationsTab(
    service,
    selectedHandler,
    activeTab === 'invocations',
  );
  const { tabBadge, isTabBadgeLoading } = invocationsTab;
  const tabs = useMemo<ContentPanelTabs>(
    () => ({
      items: [
        {
          id: 'invocations',
          label: (
            <InvocationsTabLabel
              badge={tabBadge}
              isLoading={isTabBadgeLoading}
            />
          ),
        },
        ...(keyedTab
          ? [{ id: keyedTab, label: KEYED_TAB_LABELS[keyedTab] }]
          : []),
        {
          id: 'handlers',
          label: (
            <TabLabel
              count={isPending ? undefined : handlers.length}
              isPending={isPending}
            >
              Handlers
            </TabLabel>
          ),
        },
        {
          id: 'deployments',
          label: (
            <TabLabel
              count={deploymentsCount}
              isPending={deploymentsCount === undefined}
            >
              Deployments
            </TabLabel>
          ),
        },
        { id: 'playground', label: 'Playground' },
      ],
      defaultId: 'invocations',
      queryParam: TAB_QUERY_PARAM,
      stateParams: isTabStateParam,
    }),
    [
      deploymentsCount,
      handlers.length,
      isPending,
      keyedTab,
      tabBadge,
      isTabBadgeLoading,
    ],
  );

  return (
    <ContentPanel
      className={panelStyles({ hasFilterToolbar: Boolean(keyedTab) })}
      tabs={tabs}
    >
      {activeTab === 'invocations' ? (
        <ServiceInvocations
          service={service}
          handler={selectedHandler}
          invocationsTab={invocationsTab}
        />
      ) : activeTab === 'runs' ? (
        <WorkflowRuns service={service} />
      ) : activeTab === 'instances' ? (
        <VirtualObjectInstances service={service} />
      ) : (
        <ContentPanelBody
          className={activeTab === 'playground' ? 'pb-0' : 'pb-32'}
        >
          <ContentPanelSection
            flush={activeTab !== 'playground'}
            fadeClassName={activeTab === 'playground' ? 'hidden' : undefined}
          >
            {activeTab === 'handlers' ? (
              <ServiceHandlersTable
                service={service}
                serviceType={serviceType}
                handlers={handlers}
                selectedHandler={selectedHandler}
                isPending={isPending}
                error={error}
              />
            ) : activeTab === 'deployments' ? (
              <ServiceDeploymentsTable service={service} />
            ) : (
              <ServicePlaygroundEmbed
                service={service}
                handler={selectedHandler}
              />
            )}
          </ContentPanelSection>
        </ContentPanelBody>
      )}
    </ContentPanel>
  );
}
