import { useListDeployments } from '@restate/data-access/admin-api-hooks';
import type { Service } from '@restate/data-access/admin-api-spec';
import { Revision } from '@restate/features/deployment';
import { useRestateContext } from '@restate/features/restate-context';
import { ServiceType } from '@restate/features/service';
import { ServiceTarget } from '@restate/features/service-target';
import { Badge } from '@restate/ui/badge';
import { EmptyState } from '@restate/ui/empty-state';
import { IconName } from '@restate/ui/icons';
import { Cell, PanelTable, type PanelTableColumn } from '@restate/ui/table';
import { formatNumber, formatPlurals } from '@restate/util/intl';
import { serviceHref } from '@restate/util/panel';
import { useMemo } from 'react';
import { useNavigate } from 'react-router';

type ColumnId = 'service' | 'revision' | 'handlers';
interface ServiceRow {
  id: string;
  service: Service;
  revision?: number;
  latestRevision?: number;
}

const COLUMNS = [
  { id: 'service', name: 'Service', isRowHeader: true, minWidth: 320 },
  { id: 'revision', name: 'Revision', width: 220 },
  { id: 'handlers', name: 'Handlers', width: 120 },
] satisfies PanelTableColumn<ColumnId>[];

export function DeploymentServicesTable({
  deploymentId,
  services,
  isPending,
  error,
}: {
  deploymentId: string;
  services: Service[];
  isPending: boolean;
  error: Error | null;
}) {
  const { baseUrl } = useRestateContext();
  const navigate = useNavigate();
  const { data: deploymentsData } = useListDeployments();
  const rows = useMemo<ServiceRow[]>(() => {
    const served = deploymentsData?.deployments.get(deploymentId)?.services;
    return services.map((service) => ({
      id: service.name,
      service,
      revision: served?.find(({ name }) => name === service.name)?.revision,
      latestRevision: deploymentsData?.services.get(service.name)
        ?.sortedRevisions[0],
    }));
  }, [deploymentId, deploymentsData, services]);

  return (
    <PanelTable
      aria-label={`Services of deployment ${deploymentId}`}
      columns={COLUMNS}
      items={rows}
      isLoading={isPending}
      error={error}
      numOfRows={4}
      bodyDependencies={[rows, baseUrl]}
      onRowAction={(rowId) =>
        navigate(serviceHref(baseUrl, { service: String(rowId) }))
      }
      rowClassName="cursor-pointer [content-visibility:auto]"
      emptyPlaceholder={
        <EmptyState
          icon={IconName.Box}
          title="No services"
          description="This deployment does not expose any service."
        />
      }
      renderCell={(row, column) => {
        if (column.id === 'service') {
          return (
            <Cell className="[&&&]:overflow-visible">
              <div className="flex min-w-0 items-center gap-2">
                <ServiceTarget
                  service={row.service.name}
                  serviceType={row.service.ty}
                  links={{
                    service: {
                      href: serviceHref(baseUrl, { service: row.service.name }),
                      ariaLabel: `Open service ${row.service.name}`,
                    },
                  }}
                  density="default"
                  className="min-w-0 flex-[0_1_auto]"
                />
                {row.service.ty && <ServiceType type={row.service.ty} />}
              </div>
            </Cell>
          );
        }
        if (column.id === 'revision') {
          const isLatest =
            row.revision !== undefined && row.revision === row.latestRevision;
          return (
            <Cell>
              <div className="flex min-w-0 items-center gap-1.5">
                {row.revision !== undefined && (
                  <Revision revision={row.revision} />
                )}
                {isLatest ? (
                  <Badge size="xs" variant="info">
                    Latest
                  </Badge>
                ) : row.latestRevision !== undefined ? (
                  <span className="truncate text-2xs text-zinc-500">
                    superseded by rev. {row.latestRevision}
                  </span>
                ) : null}
              </div>
            </Cell>
          );
        }
        if (column.id === 'handlers') {
          const count = row.service.handlers.length;
          return (
            <Cell>
              <span className="text-xs text-zinc-600 tabular-nums">
                {formatNumber(count)}{' '}
                {formatPlurals(count, { one: 'handler', other: 'handlers' })}
              </span>
            </Cell>
          );
        }
        return <Cell />;
      }}
    />
  );
}
