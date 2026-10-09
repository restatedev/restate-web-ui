import { InvocationBatchActions } from '@restate/features/batch-operations';
import { Sort } from '@restate/features/invocations-route';
import { ContentPanelToolbar } from '@restate/ui/content-panel';
import { RefreshButton } from './RefreshButton';
import type { useInvocationsTab } from './useInvocationsTab';
import { ViewInInvocationsLink } from './ViewInInvocationsLink';

export function InvocationsTabToolbar({
  invocationsTab,
}: {
  invocationsTab: ReturnType<typeof useInvocationsTab>;
}) {
  const { list, summary } = invocationsTab;
  return (
    <ContentPanelToolbar className="justify-end gap-1 px-1 pb-1">
      <ViewInInvocationsLink href={invocationsTab.invocationsPageHref} />
      <Sort
        variant="toolbar"
        sortParams={invocationsTab.sortParams}
        setSortParams={invocationsTab.setSortParams}
      />
      <InvocationBatchActions
        filters={invocationsTab.filters}
        invocationIds={Array.from(invocationsTab.selectedInvocationIds)}
        schema={invocationsTab.schema}
        totalCount={invocationsTab.total}
        totalCountLabel={invocationsTab.totalLabel}
      />
      <RefreshButton
        isFetching={list.isFetching || summary.isFetching}
        label="Refresh invocations"
        onClick={() => void list.refetch()}
      />
    </ContentPanelToolbar>
  );
}
