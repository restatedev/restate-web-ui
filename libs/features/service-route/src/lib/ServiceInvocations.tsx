import type { components } from '@restate/data-access/admin-api-spec';
import {
  ContentPanelBody,
  ContentPanelSection,
  ContentPanelToolbar,
} from '@restate/ui/content-panel';
import { SnapshotTimeProvider } from '@restate/util/snapshot-time';
import { useMemo } from 'react';
import { InvocationsStatusSummary } from './InvocationsStatusSummary';
import {
  InvocationsPanelTable,
  SERVICE_INVOCATION_COLUMNS,
} from './InvocationsPanelTable';
import { RefreshButton } from './RefreshButton';
import { useInvocationsTab } from './useInvocationsTab';
import { ViewInInvocationsLink } from './ViewInInvocationsLink';

type FilterItem = components['schemas']['InvocationV2FilterItem'];

export function ServiceInvocations({
  service,
  handler,
}: {
  service: string;
  handler?: string;
}) {
  const baseFilters = useMemo<FilterItem[]>(
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
  const invocationsTab = useInvocationsTab(baseFilters, Boolean(service));
  const { data, error, isPending, isFetching, refetch, dataUpdatedAt } =
    invocationsTab.list;

  return (
    <>
      <ContentPanelToolbar className="justify-end gap-1 px-1 pb-1">
        <ViewInInvocationsLink href={invocationsTab.invocationsPageHref} />
        <RefreshButton
          isFetching={isFetching || invocationsTab.summary.isFetching}
          label="Refresh invocations"
          onClick={() => void refetch()}
        />
      </ContentPanelToolbar>
      <SnapshotTimeProvider lastSnapshot={dataUpdatedAt}>
        <ContentPanelBody className="pb-32">
          <InvocationsStatusSummary invocationsTab={invocationsTab} />
          <ContentPanelSection
            flush
            className="-mt-[calc(var(--cp-toolbar-tuck,0px)-0.75rem)]"
          >
            <InvocationsPanelTable
              ariaLabel={`Invocations of ${service}`}
              columns={SERVICE_INVOCATION_COLUMNS}
              data={data}
              isPending={isPending}
              error={error}
              emptyTitle="No invocations"
              emptyDescription={
                invocationsTab.statusFilter
                  ? 'No invocations match the selected status.'
                  : handler
                    ? `Invocations of ${handler}() will appear here.`
                    : 'Invocations of this service will appear here.'
              }
            />
          </ContentPanelSection>
        </ContentPanelBody>
      </SnapshotTimeProvider>
    </>
  );
}
