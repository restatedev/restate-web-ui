import type { components } from '@restate/data-access/admin-api-spec';
import {
  DEPLOYMENT_INVOCATION_COLUMNS,
  InvocationsPanelTable,
  InvocationsStatusSummary,
  InvocationsTabToolbar,
  useInvocationsTab,
} from '@restate/features/service-route';
import {
  ContentPanelBody,
  ContentPanelSection,
} from '@restate/ui/content-panel';
import { SnapshotTimeProvider } from '@restate/util/snapshot-time';
import { useMemo } from 'react';

type FilterItem = components['schemas']['InvocationV2FilterItem'];

export function useDeploymentInvocationsTab(
  deploymentId: string,
  isActive: boolean,
) {
  const baseFilters = useMemo<FilterItem[]>(
    () => [
      {
        field: 'deployment',
        type: 'STRING_LIST',
        operation: 'IN',
        value: [deploymentId],
      },
    ],
    [deploymentId],
  );
  return useInvocationsTab(baseFilters, {
    enabled: Boolean(deploymentId),
    isActive,
  });
}

export function DeploymentInvocations({
  deploymentId,
  invocationsTab,
}: {
  deploymentId: string;
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
              ariaLabel={`Invocations pinned to deployment ${deploymentId}`}
              columns={DEPLOYMENT_INVOCATION_COLUMNS}
              data={data}
              isPending={isPending}
              error={error}
              selectedKeys={invocationsTab.selectedInvocationIds}
              onSelectionChange={invocationsTab.setSelectedIds}
              sort={invocationsTab.sort}
              notice={invocationsTab.resultsNotice}
              countsDisagree={invocationsTab.countsDisagree}
              emptyTitle="No pinned invocations"
              emptyDescription={
                invocationsTab.statusFilter
                  ? 'No pinned invocations match the selected status.'
                  : 'Invocations pinned to this deployment will appear here.'
              }
            />
          </ContentPanelSection>
        </ContentPanelBody>
      </SnapshotTimeProvider>
    </>
  );
}
