import { TenantServiceTarget } from './TenantServiceTarget';
import type { TenantInvocationsProps } from './TenantInvocations';
import { useGetInvocationJournalWithInvocationV2 } from '@restate/data-access/admin-api-hooks';
import { useRestateContext } from '@restate/features/restate-context';
import {
  InvocationStatusHeader,
  Status,
} from '@restate/features/invocation-ui';
import {
  ServiceTarget,
  ServiceTargetProvider,
} from '@restate/features/service-target';
import { ContentPanel, ContentPanelBody } from '@restate/ui/content-panel';
import { ErrorBanner } from '@restate/ui/error';
import { CardGrid } from '@restate/ui/card';
import { IconName } from '@restate/ui/icons';
import {
  InvocationLifecycleCard,
  Actions,
  InvocationActions,
  JournalV2,
} from '@restate/features/invocation-route';
import {
  Breadcrumbs,
  BreadcrumbsProvider,
} from '@restate/features/breadcrumbs';
import { Spinner } from '@restate/ui/loading';
import { SnapshotTimeProvider } from '@restate/util/snapshot-time';

export interface TenantInvocationProps extends TenantInvocationsProps {
  invocationId: string;
}

export function TenantInvocation({
  scope,
  invocationId,
}: TenantInvocationProps) {
  const { baseUrl } = useRestateContext();
  return (
    <ServiceTargetProvider component={TenantServiceTarget}>
      <BreadcrumbsProvider patternPrefix={baseUrl.replace(/\/$/, '')}>
        <TenantInvocationContent
          key={`${scope}:${invocationId}`}
          invocationId={invocationId}
        />
      </BreadcrumbsProvider>
      <InvocationActions />
    </ServiceTargetProvider>
  );
}

function TenantInvocationContent({ invocationId }: { invocationId: string }) {
  const { data, isPending, error, dataUpdatedAt } =
    useGetInvocationJournalWithInvocationV2(invocationId, {
      enabled: Boolean(invocationId),
      retry: false,
      staleTime: 0,
      refetchInterval: (query) =>
        query.state.status === 'success' && !query.state.data?.completed_at
          ? 1000
          : false,
    });
  return (
    <SnapshotTimeProvider lastSnapshot={dataUpdatedAt}>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col pt-4 [--cp-toolbar-top:5rem] [--cp-toolbar-tuck:5rem]">
        <InvocationStatusHeader
          invocation={data}
          icon={IconName.Invocation}
          iconLabel="Invocation"
          trail={
            <Breadcrumbs
              variant="flat"
              preserveQueryParams={['service', 'status']}
            />
          }
        >
          {data && (
            <>
              <ServiceTarget
                scope={data.scope}
                service={data.target_service_name}
                serviceKey={data.target_service_key}
                handler={data.target_handler_name}
                serviceType={data.target_service_ty}
                variant="header"
                className="min-w-0 flex-[0_1_auto]"
              />
              <div className="shrink-0 pr-2 *:origin-[center_left] *:scale-[1.15]">
                <Status invocation={data} mini="md" timeline={false} />
              </div>
            </>
          )}
          <div className="ml-auto shrink-0">
            <Actions
              invocation={data}
              mini="md"
              className="rounded-l-lg text-[0.9375rem]"
              splitClassName="rounded-lg md:rounded-l-none"
            />
          </div>
        </InvocationStatusHeader>
        {error && <ErrorBanner error={error} className="rounded-xl" />}
        {isPending && (
          <div
            role="status"
            className="flex items-center gap-2 text-sm text-zinc-500"
          >
            <Spinner />
            Loading invocation…
          </div>
        )}
        {data && (
          <>
            <CardGrid
              columns={1}
              className="relative z-40 mx-5 mt-3 empty:hidden"
            >
              <InvocationLifecycleCard
                invocation={data}
                journalEntries={data.journal?.entries}
              />
            </CardGrid>
            <ContentPanel
              className="-mt-14"
              tabs={{
                items: [{ id: 'journal', label: 'Journal' }],
                defaultId: 'journal',
              }}
            >
              <ContentPanelBody>
                <JournalV2
                  invocationId={invocationId}
                  showIntrospection={false}
                />
              </ContentPanelBody>
            </ContentPanel>
          </>
        )}
      </div>
    </SnapshotTimeProvider>
  );
}
