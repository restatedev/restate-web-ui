import {
  useListDeployments,
  useServiceDetails,
} from '@restate/data-access/admin-api-hooks';
import { useRestateContext } from '@restate/features/restate-context';
import { ServiceType } from '@restate/features/service';
import { ServiceTarget } from '@restate/features/service-target';
import { Badge } from '@restate/ui/badge';
import { Breadcrumbs } from '@restate/ui/breadcrumbs';
import { CardGrid } from '@restate/ui/card';
import { EmptyState } from '@restate/ui/empty-state';
import { ErrorBanner } from '@restate/ui/error';
import { Header } from '@restate/ui/header';
import { Icon, IconName } from '@restate/ui/icons';
import { HANDLER_QUERY_PARAM } from '@restate/util/panel';
import { SnapshotTimeProvider } from '@restate/util/snapshot-time';
import { useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { HandlerSelector } from './HandlerSelector';
import { ConfigurationCard, DeploymentCard } from './ServiceCards';
import { WarningChip } from './WarningChip';
import { formatPlurals } from '@restate/util/intl';
import { ServiceDetails, serviceTabFromSearch } from './ServiceDetails';
import { resolveServiceConfig } from './serviceConfig';

function Component() {
  const { service = '' } = useParams<{ service: string }>();
  const [searchParams] = useSearchParams();
  const tab = serviceTabFromSearch(searchParams);
  const requestedHandler = searchParams.get(HANDLER_QUERY_PARAM);
  const { isVersionGte } = useRestateContext();
  const { data, error, isPending, dataUpdatedAt } = useServiceDetails(service, {
    enabled: Boolean(service),
    refetchOnMount: true,
    staleTime: 0,
  });
  const { dataUpdatedAt: deploymentsUpdatedAt } = useListDeployments();
  const handlers = data?.handlers ?? [];
  const handler = useMemo(
    () => handlers.find(({ name }) => name === requestedHandler),
    [handlers, requestedHandler],
  );
  const config = resolveServiceConfig(data, handler);
  const isHandlerMode = Boolean(handler);
  const isPrivate = !isPending && config.public.value === false;
  const isKeyed = data?.ty === 'VirtualObject' || data?.ty === 'Workflow';
  const schemaWarnings = data?.info ?? [];
  const hasVersion = Boolean(isVersionGte);

  return (
    <SnapshotTimeProvider
      lastSnapshot={Math.max(dataUpdatedAt, deploymentsUpdatedAt)}
    >
      <div className="flex min-h-0 flex-1 flex-col pt-4 [--cp-toolbar-top:5rem] [--cp-toolbar-tuck:5rem]">
        <Header
          icon={IconName.Box}
          iconLabel="Service"
          className="min-w-0"
          trail={<Breadcrumbs variant="flat" />}
        >
          <ServiceTarget
            service={service}
            serviceType={data?.ty}
            showHandler={false}
            links={false}
            variant="header"
            className="min-w-0 flex-[0_1_auto]"
          >
            <HandlerSelector handlers={handlers} selected={handler?.name} />
          </ServiceTarget>
          {data?.ty && <ServiceType type={data.ty} className="shrink-0" />}
          {isPrivate && (
            <Badge variant="warning" size="sm" className="shrink-0 gap-1">
              <Icon name={IconName.EyeOff} className="h-3 w-3" />
              Private
            </Badge>
          )}
          {schemaWarnings.length > 0 && (
            <WarningChip
              label={`${schemaWarnings.length} ${formatPlurals(
                schemaWarnings.length,
                { one: 'warning', other: 'warnings' },
              )}`}
              title="Schema warnings"
              messages={schemaWarnings.map((warning) => warning.message)}
              className="h-6 shrink-0 text-xs"
            />
          )}
        </Header>
        {error && !data ? (
          <div className="px-5 py-20">
            <EmptyState
              icon={IconName.TriangleAlert}
              intent="danger"
              title="Couldn’t load this service"
            >
              <ErrorBanner
                error={error}
                className="w-full rounded-xl text-left"
              />
            </EmptyState>
          </div>
        ) : (
          <>
            <CardGrid columns={2} className="relative z-40 mx-5 mt-3">
              <DeploymentCard
                deploymentId={data?.deployment_id}
                revision={data?.revision}
              />
              <ConfigurationCard
                service={service}
                config={config}
                isWorkflow={data?.ty === 'Workflow'}
                isKeyed={isKeyed}
                handlers={handlers}
                revision={data?.revision}
                isPending={isPending || !hasVersion}
                isReadonly={isHandlerMode}
              />
            </CardGrid>
            <ServiceDetails
              service={service}
              serviceType={data?.ty}
              handlers={handlers}
              selectedHandler={handler?.name}
              tab={tab}
              isPending={isPending}
              error={error}
            />
          </>
        )}
      </div>
    </SnapshotTimeProvider>
  );
}

export const serviceRoute = { Component };
