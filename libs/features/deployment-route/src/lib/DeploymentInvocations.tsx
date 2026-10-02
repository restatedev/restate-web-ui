import { useListInvocationsV2 } from '@restate/data-access/admin-api-hooks';
import { useRestateContext } from '@restate/features/restate-context';
import {
  DEPLOYMENT_INVOCATION_COLUMNS,
  InvocationsPanelTable,
  RefreshButton,
} from '@restate/features/service-route';
import { ContentPanelToolbar } from '@restate/ui/content-panel';
import { Icon, IconName } from '@restate/ui/icons';
import { Link } from '@restate/ui/link';
import { toDeploymentInvocationsHref } from '@restate/util/invocation-links';
import { SnapshotTimeProvider } from '@restate/util/snapshot-time';

export function DeploymentInvocations({
  deploymentId,
}: {
  deploymentId: string;
}) {
  const { baseUrl } = useRestateContext();
  const { data, error, isPending, isFetching, refetch, dataUpdatedAt } =
    useListInvocationsV2(
      {
        filters: [
          {
            field: 'deployment',
            type: 'STRING_LIST',
            operation: 'IN',
            value: [deploymentId],
          },
        ],
        sort: { field: 'created_at', order: 'DESC' },
      },
      {
        enabled: Boolean(deploymentId),
        refetchOnMount: true,
        refetchOnWindowFocus: false,
        staleTime: 0,
      },
    );

  return (
    <>
      <ContentPanelToolbar className="justify-end gap-1 px-1 pb-1">
        <Link
          href={toDeploymentInvocationsHref(baseUrl, deploymentId)}
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
          ariaLabel={`Invocations pinned to deployment ${deploymentId}`}
          columns={DEPLOYMENT_INVOCATION_COLUMNS}
          data={data}
          isPending={isPending}
          error={error}
          emptyTitle="No pinned invocations"
          emptyDescription="Invocations pinned to this deployment will appear here."
        />
      </SnapshotTimeProvider>
    </>
  );
}
