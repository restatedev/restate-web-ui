import type { components } from '@restate/data-access/admin-api-spec';
import {
  DEPLOYMENT_INVOCATION_COLUMNS,
  InvocationsPanelTable,
  InvocationsStatusSummary,
  RefreshButton,
  useInvocationsTab,
  ViewInInvocationsLink,
} from '@restate/features/service-route';
import {
  ContentPanelBody,
  ContentPanelSection,
  ContentPanelToolbar,
} from '@restate/ui/content-panel';
import { SnapshotTimeProvider } from '@restate/util/snapshot-time';
import { useMemo } from 'react';

type FilterItem = components['schemas']['InvocationV2FilterItem'];

export function DeploymentInvocations({
  deploymentId,
}: {
  deploymentId: string;
}) {
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
  const invocationsTab = useInvocationsTab(baseFilters, Boolean(deploymentId));
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
              ariaLabel={`Invocations pinned to deployment ${deploymentId}`}
              columns={DEPLOYMENT_INVOCATION_COLUMNS}
              data={data}
              isPending={isPending}
              error={error}
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
