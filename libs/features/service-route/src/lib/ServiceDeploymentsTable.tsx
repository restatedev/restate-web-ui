import {
  useListDeployments,
  useListDrainedDeployments,
} from '@restate/data-access/admin-api-hooks';
import {
  Deployment,
  DeploymentStatusBadge,
  Revision,
} from '@restate/features/deployment';
import { useRestateContext } from '@restate/features/restate-context';
import { Badge } from '@restate/ui/badge';
import { EmptyState } from '@restate/ui/empty-state';
import { IconName } from '@restate/ui/icons';
import { Cell, PanelTable, type PanelTableColumn } from '@restate/ui/table';
import { RelativeDate } from '@restate/ui/tooltip';
import { deploymentHref } from '@restate/util/panel';
import { useMemo } from 'react';
import { useNavigate } from 'react-router';

type ColumnId = 'deployment' | 'revision' | 'status' | 'registered';
interface DeploymentRow {
  id: string;
  deploymentId: string;
  revision: number;
  isLatest: boolean;
}

const COLUMNS = [
  { id: 'deployment', name: 'Deployment', isRowHeader: true, minWidth: 320 },
  { id: 'revision', name: 'Revision', width: 160 },
  { id: 'status', name: 'Status', width: 120 },
  { id: 'registered', name: 'Registered', width: 150 },
] satisfies PanelTableColumn<ColumnId>[];

export function ServiceDeploymentsTable({ service }: { service: string }) {
  const { baseUrl } = useRestateContext();
  const navigate = useNavigate();
  const { data, isPending, error } = useListDeployments();
  const {
    data: drainedDeploymentIds,
    isError: isStatusError,
    isPending: isStatusPending,
    fetchStatus: statusFetchStatus,
  } = useListDrainedDeployments();
  const isStatusUnavailable =
    isStatusError || (isStatusPending && statusFetchStatus === 'idle');
  const columns = useMemo(
    () =>
      isStatusUnavailable
        ? COLUMNS.filter((column) => column.id !== 'status')
        : COLUMNS,
    [isStatusUnavailable],
  );
  const rows = useMemo<DeploymentRow[]>(() => {
    const serviceDeployments = data?.services.get(service);
    if (!serviceDeployments) {
      return [];
    }
    return serviceDeployments.sortedRevisions.flatMap((revision, index) =>
      (serviceDeployments.deployments[revision] ?? []).map((deploymentId) => ({
        id: `${revision}:${deploymentId}`,
        deploymentId,
        revision,
        isLatest: index === 0,
      })),
    );
  }, [data, service]);

  return (
    <PanelTable
      aria-label={`Deployments of ${service}`}
      columns={columns}
      items={rows}
      isLoading={isPending}
      error={error}
      numOfRows={4}
      bodyDependencies={[rows, drainedDeploymentIds, isStatusPending]}
      rowDependencies={[drainedDeploymentIds, isStatusPending, data]}
      onRowAction={(rowId) => {
        const row = rows.find(({ id }) => id === rowId);
        if (row) {
          navigate(deploymentHref(baseUrl, { deployment: row.deploymentId }));
        }
      }}
      rowClassName="group cursor-pointer [content-visibility:auto]"
      emptyPlaceholder={
        <EmptyState
          icon={IconName.Http}
          title="No deployments"
          description="No deployment serves this service."
        />
      }
      renderCell={(row, column) => {
        if (column.id === 'deployment') {
          return (
            <Cell className="min-w-0 overflow-hidden">
              <Deployment
                deploymentId={row.deploymentId}
                showLink={false}
                highlightSelection={false}
                showEndpointCopyButton
                className="w-max max-w-full min-w-0 text-[0.8125rem] font-medium text-zinc-600"
              />
            </Cell>
          );
        }
        if (column.id === 'revision') {
          return (
            <Cell>
              <div className="flex items-center gap-1.5">
                <Revision revision={row.revision} />
                {row.isLatest && (
                  <Badge size="xs" variant="info">
                    Latest
                  </Badge>
                )}
              </div>
            </Cell>
          );
        }
        if (column.id === 'status') {
          return (
            <Cell>
              {drainedDeploymentIds ? (
                <DeploymentStatusBadge
                  status={
                    drainedDeploymentIds.has(row.deploymentId)
                      ? 'drained'
                      : 'active'
                  }
                />
              ) : isStatusPending ? (
                <span className="block h-5 w-16 animate-pulse rounded-full bg-gray-200/70" />
              ) : null}
            </Cell>
          );
        }
        if (column.id === 'registered') {
          const createdAt = data?.deployments.get(row.deploymentId)?.created_at;
          return (
            <Cell>
              {createdAt ? (
                <RelativeDate date={createdAt} title="Registered at" />
              ) : null}
            </Cell>
          );
        }
        return <Cell />;
      }}
    />
  );
}
