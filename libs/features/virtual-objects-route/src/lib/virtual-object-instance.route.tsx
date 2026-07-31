import {
  useGetVirtualObjectInbox,
  useServiceDetails,
} from '@restate/data-access/admin-api-hooks';
import { InvocationStatusHeader } from '@restate/features/invocation-ui';
import {
  virtualObjectScopeFromSearch,
  VirtualObjectInstanceTarget,
  type VirtualObjectInstanceIdentity,
} from '@restate/features/virtual-object-instance';
import { Breadcrumbs } from '@restate/ui/breadcrumbs';
import { EmptyState } from '@restate/ui/empty-state';
import { ErrorBanner } from '@restate/ui/error';
import { IconName } from '@restate/ui/icons';
import { RestateError } from '@restate/util/errors';
import { panelHref } from '@restate/util/panel';
import { SnapshotTimeProvider } from '@restate/util/snapshot-time';
import { useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { CardGrid } from '@restate/ui/card';
import {
  virtualObjectInboxModeForTab,
  virtualObjectInstanceTabFromSearch,
  VirtualObjectDetails,
} from './VirtualObjectDetails';
import { VirtualObjectLockHero } from './VirtualObjectLockHero';

function Component() {
  const { service = '', key = '' } = useParams<{
    service: string;
    key: string;
  }>();
  const [searchParams] = useSearchParams();
  const scope = virtualObjectScopeFromSearch(searchParams);
  const tab = virtualObjectInstanceTabFromSearch(searchParams);
  const inboxMode = virtualObjectInboxModeForTab(tab);
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
  } = useGetVirtualObjectInbox(service, key, inboxMode, scope, {
    enabled: Boolean(service) && Boolean(key),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    retry: (failureCount, retryError) =>
      failureCount < 1 &&
      retryError instanceof RestateError &&
      retryError.status === 409 &&
      retryError.restateCode === 'snapshot_changed',
    staleTime: 0,
  });
  return (
    <SnapshotTimeProvider lastSnapshot={inboxDataUpdatedAt}>
      <div className="flex min-h-0 flex-1 flex-col pt-4 [--cp-toolbar-top:5rem] [--cp-toolbar-tuck:5rem]">
        <Breadcrumbs className="mt-8 px-5 md:mt-0" />
        <InvocationStatusHeader className="min-w-0">
          <VirtualObjectInstanceTarget
            identity={identity}
            serviceHref={panelHref({ service })}
            variant="header"
          />
        </InvocationStatusHeader>
        {inboxData?.lock?.lockHolder && (
          <CardGrid className="relative z-40 mx-5 mt-3">
            <VirtualObjectLockHero lockHolder={inboxData.lock.lockHolder} />
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
            isInboxPending={isInboxPending}
          />
        )}
      </div>
    </SnapshotTimeProvider>
  );
}

export const virtualObjectInstance = { Component };
