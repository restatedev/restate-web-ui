import { useListInvocationsV2 } from '@restate/data-access/admin-api-hooks';
import type { components } from '@restate/data-access/admin-api-spec';
import { useRestateContext } from '@restate/features/restate-context';
import { ContentPanelToolbar } from '@restate/ui/content-panel';
import { Icon, IconName } from '@restate/ui/icons';
import { Link } from '@restate/ui/link';
import {
  toServiceAndHandlerInvocationsHref,
  toServiceInvocationsHref,
} from '@restate/util/invocation-links';
import { SnapshotTimeProvider } from '@restate/util/snapshot-time';
import { useMemo } from 'react';
import {
  InvocationsPanelTable,
  SERVICE_INVOCATION_COLUMNS,
} from './InvocationsPanelTable';
import { RefreshButton } from './RefreshButton';

type FilterItem = components['schemas']['InvocationV2FilterItem'];

export function ServiceInvocations({
  service,
  handler,
}: {
  service: string;
  handler?: string;
}) {
  const { baseUrl } = useRestateContext();
  const filters = useMemo<FilterItem[]>(
    () => [
      {
        field: 'target_service_name',
        type: 'STRING_LIST',
        operation: 'IN',
        value: [service],
      },
      ...(handler
        ? [
            {
              field: 'target_handler_name',
              type: 'STRING_LIST',
              operation: 'IN',
              value: [handler],
            } satisfies FilterItem,
          ]
        : []),
    ],
    [service, handler],
  );
  const { data, error, isPending, isFetching, refetch, dataUpdatedAt } =
    useListInvocationsV2(
      { filters, sort: { field: 'created_at', order: 'DESC' } },
      {
        enabled: Boolean(service),
        refetchOnMount: true,
        refetchOnWindowFocus: false,
        staleTime: 0,
      },
    );
  const invocationsHref = handler
    ? toServiceAndHandlerInvocationsHref(baseUrl, service, handler)
    : toServiceInvocationsHref(baseUrl, service);

  return (
    <>
      <ContentPanelToolbar className="justify-end gap-1 px-1 pb-1">
        <Link
          href={invocationsHref}
          variant="secondary-button"
          className="flex h-6.5 items-center gap-1 rounded-lg px-2 py-0 text-xs"
        >
          Open in Invocations
          <Icon name={IconName.ArrowUpRight} className="h-3 w-3" />
        </Link>
        <RefreshButton
          isFetching={isFetching}
          label="Refresh invocations"
          onClick={() => void refetch()}
        />
      </ContentPanelToolbar>
      <SnapshotTimeProvider lastSnapshot={dataUpdatedAt}>
        <InvocationsPanelTable
          ariaLabel={`Invocations of ${service}`}
          columns={SERVICE_INVOCATION_COLUMNS}
          data={data}
          isPending={isPending}
          error={error}
          emptyTitle="No invocations"
          emptyDescription={
            handler
              ? `Invocations of ${handler}() will appear here.`
              : 'Invocations of this service will appear here.'
          }
        />
      </SnapshotTimeProvider>
    </>
  );
}
