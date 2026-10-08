import type { components } from '@restate/data-access/admin-api-spec';
import {
  ContentPanelBody,
  ContentPanelSection,
} from '@restate/ui/content-panel';
import { SnapshotTimeProvider } from '@restate/util/snapshot-time';
import { useMemo } from 'react';
import { InvocationsStatusSummary } from './InvocationsStatusSummary';
import {
  InvocationsPanelTable,
  SERVICE_INVOCATION_COLUMNS,
} from './InvocationsPanelTable';
import { useInvocationsTab } from './useInvocationsTab';
import { InvocationsTabToolbar } from './InvocationsTabToolbar';

type FilterItem = components['schemas']['InvocationV2FilterItem'];

export function useServiceInvocationsTab(
  service: string,
  handler: string | undefined,
  isActive: boolean,
) {
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
  return useInvocationsTab(baseFilters, {
    enabled: Boolean(service),
    isActive,
  });
}

export function ServiceInvocations({
  service,
  handler,
  invocationsTab,
}: {
  service: string;
  handler?: string;
  invocationsTab: ReturnType<typeof useInvocationsTab>;
}) {
  const { data, error, isPending, dataUpdatedAt } = invocationsTab.list;

  return (
    <>
      <InvocationsTabToolbar invocationsTab={invocationsTab} />
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
              selectedKeys={invocationsTab.selectedInvocationIds}
              onSelectionChange={invocationsTab.setSelectedIds}
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
