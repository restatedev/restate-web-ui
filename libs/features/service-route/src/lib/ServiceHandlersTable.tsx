import type { Handler, ServiceType } from '@restate/data-access/admin-api-spec';
import { useRestateContext } from '@restate/features/restate-context';
import { Handler as ServiceHandler } from '@restate/features/service';
import { EmptyState } from '@restate/ui/empty-state';
import { Icon, IconName } from '@restate/ui/icons';
import { Link } from '@restate/ui/link';
import { Cell, PanelTable, type PanelTableColumn } from '@restate/ui/table';
import { HoverTooltip } from '@restate/ui/tooltip';
import { toServiceAndHandlerInvocationsHref } from '@restate/util/invocation-links';
import { HANDLER_QUERY_PARAM } from '@restate/util/panel';
import { serviceTabHref } from './serviceTabs';
import { tv } from '@restate/util/styles';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router';

type ColumnId = 'handler' | 'actions';
interface HandlerRow {
  id: string;
  handler: Handler;
}

const COLUMNS = [
  { id: 'handler', name: 'Handler', isRowHeader: true, minWidth: 360 },
  { id: 'actions', name: 'Actions', hideLabel: true, width: 150 },
] satisfies PanelTableColumn<ColumnId>[];

const rowStyles = tv({
  base: 'cursor-pointer [content-visibility:auto]',
  variants: {
    isSelected: {
      true: 'bg-blue-50/60',
      false: '',
    },
  },
});

export function ServiceHandlersTable({
  service,
  serviceType,
  handlers,
  selectedHandler,
  isPending,
  error,
}: {
  service: string;
  serviceType?: ServiceType;
  handlers: Handler[];
  selectedHandler?: string;
  isPending: boolean;
  error: Error | null;
}) {
  const { baseUrl } = useRestateContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const playgroundHref = (handlerName: string) => {
    const params = new URLSearchParams(searchParams);
    params.set(HANDLER_QUERY_PARAM, handlerName);
    return serviceTabHref(params, 'playground');
  };
  const rows = useMemo<HandlerRow[]>(
    () => handlers.map((handler) => ({ id: handler.name, handler })),
    [handlers],
  );

  return (
    <PanelTable
      aria-label={`Handlers of ${service}`}
      columns={COLUMNS}
      items={rows}
      isLoading={isPending}
      error={error}
      numOfRows={4}
      bodyDependencies={[rows, selectedHandler, baseUrl, serviceType]}
      onRowAction={(rowId) =>
        setSearchParams(
          (old) => {
            old.set(HANDLER_QUERY_PARAM, String(rowId));
            return old;
          },
          { preventScrollReset: true },
        )
      }
      rowClassName={(row) =>
        rowStyles({ isSelected: row.id === selectedHandler })
      }
      emptyPlaceholder={
        <EmptyState
          icon={IconName.Function}
          title="No handlers"
          description="This service does not expose any handler."
        />
      }
      renderCell={(row, column) => {
        if (column.id === 'handler') {
          return (
            <Cell className="[&&&]:overflow-visible">
              <ServiceHandler
                handler={row.handler}
                service={service}
                serviceType={serviceType}
                showLink={false}
                showType
                className="pr-0"
              />
            </Cell>
          );
        }
        if (column.id === 'actions') {
          return (
            <Cell className="[&&&]:overflow-visible">
              <div className="flex items-center justify-end gap-1">
                <Link
                  href={playgroundHref(row.handler.name)}
                  preserveQueryParams={false}
                  variant="secondary-button"
                  className="flex h-6 items-center gap-1 rounded-md px-1.5 py-0 text-2xs"
                >
                  Playground
                </Link>
                <HoverTooltip content="View not-completed invocations">
                  <Link
                    href={toServiceAndHandlerInvocationsHref(
                      baseUrl,
                      service,
                      row.handler.name,
                      { notCompletedOnly: true },
                    )}
                    variant="icon"
                    aria-label={`View not-completed invocations for ${service}/${row.handler.name}`}
                    className="h-6 w-6 rounded-md"
                  >
                    <Icon
                      name={IconName.Invocation}
                      className="h-3.5 w-3.5 text-zinc-500"
                    />
                  </Link>
                </HoverTooltip>
              </div>
            </Cell>
          );
        }
        return <Cell />;
      }}
    />
  );
}
