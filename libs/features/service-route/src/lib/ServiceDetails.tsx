import { useListDeployments } from '@restate/data-access/admin-api-hooks';
import type { Handler, ServiceType } from '@restate/data-access/admin-api-spec';
import {
  ContentPanel,
  ContentPanelBody,
  ContentPanelSection,
  type ContentPanelTabs,
} from '@restate/ui/content-panel';
import { formatNumber } from '@restate/util/intl';
import { useMemo, type ReactNode } from 'react';
import { ServiceDeploymentsTable } from './ServiceDeploymentsTable';
import { ServiceHandlersTable } from './ServiceHandlersTable';
import { ServiceInvocations } from './ServiceInvocations';
import { ServicePlaygroundEmbed } from '@restate/features/service';
import { TAB_QUERY_PARAM, type ServiceTab } from './serviceTabs';

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
  const tabs = useMemo<ContentPanelTabs>(
    () => ({
      items: [
        { id: 'invocations', label: 'Invocations' },
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
    }),
    [deploymentsCount, handlers.length, isPending],
  );

  return (
    <ContentPanel className="-mt-14" tabs={tabs}>
      {tab === 'invocations' ? (
        <ServiceInvocations service={service} handler={selectedHandler} />
      ) : (
        <ContentPanelBody className={tab === 'playground' ? 'pb-0' : 'pb-32'}>
          <ContentPanelSection
            flush={tab !== 'playground'}
            fadeClassName={tab === 'playground' ? 'hidden' : undefined}
          >
            {tab === 'handlers' ? (
              <ServiceHandlersTable
                service={service}
                serviceType={serviceType}
                handlers={handlers}
                selectedHandler={selectedHandler}
                isPending={isPending}
                error={error}
              />
            ) : tab === 'deployments' ? (
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
