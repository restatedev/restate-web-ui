import {
  useGetVirtualObjectInbox,
  useGetVirtualObjectInvocations,
  useGetVirtualObjectLock,
  useGetVirtualObjectStats,
  useServiceDetails,
} from '@restate/data-access/admin-api-hooks';
import {
  virtualObjectScopeFromSearch,
  type VirtualObjectInstanceIdentity,
} from '@restate/features/virtual-object-instance';
import { ServiceTarget } from '@restate/features/service-target';
import { vqueuesForVirtualObjectInstanceHref } from '@restate/features/limits-route';
import { useRestateContext } from '@restate/features/restate-context';
import { StateStatsCard } from '@restate/features/state-object-route';
import { Breadcrumbs } from '@restate/ui/breadcrumbs';
import { EmptyState } from '@restate/ui/empty-state';
import { ErrorBanner } from '@restate/ui/error';
import { Header } from '@restate/ui/header';
import { IconName } from '@restate/ui/icons';
import { RestateError } from '@restate/util/errors';
import { SnapshotTimeProvider } from '@restate/util/snapshot-time';
import { useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { CardGrid } from '@restate/ui/card';
import {
  virtualObjectInstanceTabFromSearch,
  VirtualObjectDetails,
} from './VirtualObjectDetails';
import { VirtualObjectLockHero } from './VirtualObjectLockHero';
import { VirtualObjectStatsCard } from './VirtualObjectStatsCard';

function retrySnapshotChanged(failureCount: number, error: unknown) {
  return (
    failureCount < 1 &&
    error instanceof RestateError &&
    error.status === 409 &&
    error.restateCode === 'snapshot_changed'
  );
}

function Component() {
  const { service = '', key = '' } = useParams<{
    service: string;
    key: string;
  }>();
  const [searchParams] = useSearchParams();
  const { baseUrl } = useRestateContext();
  const scope = virtualObjectScopeFromSearch(searchParams);
  const tab = virtualObjectInstanceTabFromSearch(searchParams);
  const identity = useMemo<VirtualObjectInstanceIdentity>(
    () => ({
      service,
      key,
      ...(scope !== undefined ? { scope } : {}),
    }),
    [key, scope, service],
  );

  const {
    data: serviceMetadata,
    error,
    isPending,
  } = useServiceDetails(service, {
    enabled: Boolean(service),
    refetchOnMount: true,
    staleTime: 0,
  });
  const isVirtualObject = serviceMetadata?.ty === 'VirtualObject';
  const isUnavailable = !isPending && (!serviceMetadata || !isVirtualObject);
  const {
    data: inboxData,
    dataUpdatedAt: inboxDataUpdatedAt,
    error: inboxError,
    isPending: isInboxPending,
  } = useGetVirtualObjectInbox(service, key, scope, {
    enabled: Boolean(service) && Boolean(key) && tab === 'exclusive',
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    retry: retrySnapshotChanged,
    staleTime: 0,
  });
  const {
    data: invocationsData,
    dataUpdatedAt: invocationsDataUpdatedAt,
    error: invocationsError,
    isPending: areInvocationsPending,
  } = useGetVirtualObjectInvocations(service, key, scope, {
    enabled: Boolean(service) && Boolean(key) && tab === 'recent',
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    staleTime: 0,
  });
  const { data: lockData, dataUpdatedAt: lockDataUpdatedAt } =
    useGetVirtualObjectLock(service, key, scope, {
      enabled: Boolean(service) && Boolean(key),
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      retry: retrySnapshotChanged,
      staleTime: 0,
    });
  const { data: statsData } = useGetVirtualObjectStats(service, key, scope, {
    enabled: Boolean(service) && Boolean(key),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    staleTime: 0,
  });
  return (
    <SnapshotTimeProvider lastSnapshot={lockDataUpdatedAt}>
      <div className="flex min-h-0 flex-1 flex-col pt-4 [--cp-toolbar-top:5rem] [--cp-toolbar-tuck:5rem]">
        <Header
          icon={IconName.VirtualObject}
          iconLabel="Virtual Object"
          className="min-w-0"
          trail={<Breadcrumbs variant="flat" />}
        >
          <ServiceTarget
            scope={scope}
            service={service}
            serviceKey={key}
            serviceType="VirtualObject"
            showHandler={false}
            variant="header"
            className="min-w-0"
          />
        </Header>
        {(lockData?.lockHolder || statsData?.supported) && (
          <CardGrid
            distribution={
              lockData?.lockHolder && statsData?.supported && statsData.state
                ? '5-4-2'
                : 'equal'
            }
            className="relative z-40 mx-5 mt-3"
          >
            <VirtualObjectLockHero lockHolder={lockData?.lockHolder} />
            {statsData?.supported && (
              <>
                <VirtualObjectStatsCard
                  stats={statsData}
                  vqueuesHref={vqueuesForVirtualObjectInstanceHref(
                    baseUrl,
                    identity,
                  )}
                />
                {statsData.state && (
                  <StateStatsCard
                    numKeys={statsData.state.numKeys}
                    totalSize={statsData.state.totalSize}
                  />
                )}
              </>
            )}
          </CardGrid>
        )}

        {error ? (
          <div className="px-5 py-20">
            <EmptyState
              icon={IconName.TriangleAlert}
              intent="danger"
              title="Couldn’t load this Virtual Object"
            >
              <ErrorBanner
                error={error}
                className="w-full rounded-xl text-left"
              />
            </EmptyState>
          </div>
        ) : isUnavailable ? (
          <div className="px-5 py-20">
            <EmptyState
              icon={IconName.VirtualObject}
              title="Virtual Object service not found"
              description="The service may have been removed or may no longer be a Virtual Object."
            />
          </div>
        ) : (
          <VirtualObjectDetails
            identity={identity}
            tab={tab}
            deploymentId={serviceMetadata?.deployment_id}
            inboxData={inboxData}
            inboxDataUpdatedAt={inboxDataUpdatedAt}
            inboxError={inboxError}
            isInboxPending={tab === 'exclusive' && isInboxPending}
            invocationsData={invocationsData}
            invocationsDataUpdatedAt={invocationsDataUpdatedAt}
            invocationsError={invocationsError}
            areInvocationsPending={areInvocationsPending}
          />
        )}
      </div>
    </SnapshotTimeProvider>
  );
}

export const virtualObjectInstance = { Component };
