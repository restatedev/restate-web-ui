import type { Handler, ServiceType } from '@restate/data-access/admin-api-spec';
import {
  PlaygroundIconLink,
  Handler as ServiceHandler,
} from '@restate/features/service';
import { EmptyState } from '@restate/ui/empty-state';
import { Icon, IconName } from '@restate/ui/icons';
import { Link } from '@restate/ui/link';
import { Cell, PanelTable, type PanelTableColumn } from '@restate/ui/table';
import { HANDLER_QUERY_PARAM } from '@restate/util/panel';
import { serviceTabHref } from './serviceTabs';
import { tv } from '@restate/util/styles';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router';

type ColumnId = 'handler' | 'invocations';
interface HandlerRow {
  id: string;
  handler: Handler;
}

const COLUMNS = [
  { id: 'handler', name: 'Handler', isRowHeader: true, minWidth: 360 },
  { id: 'invocations', name: 'Invocations', width: 170 },
] satisfies PanelTableColumn<ColumnId>[];

const invocationsLinkStyles = tv({
  base: 'relative z-10 inline-flex items-center gap-0.5 rounded-lg border-none bg-transparent px-1.5 py-0.5 text-0.5xs text-zinc-500 no-underline shadow-none hover:bg-black/3 hover:text-zinc-700',
});

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
  const [searchParams, setSearchParams] = useSearchParams();
  const handlerTabHref = (
    handlerName: string,
    tab: 'playground' | 'invocations',
  ) => {
    const params = new URLSearchParams(searchParams);
    params.set(HANDLER_QUERY_PARAM, handlerName);
    return serviceTabHref(params, tab);
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
      bodyDependencies={[rows, selectedHandler, serviceType, searchParams]}
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
              <div className="flex min-w-0 items-center gap-1.5">
                <ServiceHandler
                  handler={row.handler}
                  service={service}
                  serviceType={serviceType}
                  showLink={false}
                  showType
                  className="max-w-fit min-w-0 pr-0"
                />
                <PlaygroundIconLink
                  aria-label={`Open ${service}/${row.handler.name} in Playground`}
                  href={handlerTabHref(row.handler.name, 'playground')}
                  preserveQueryParams={false}
                />
              </div>
            </Cell>
          );
        }
        if (column.id === 'invocations') {
          return (
            <Cell>
              <Link
                href={handlerTabHref(row.handler.name, 'invocations')}
                preserveQueryParams={false}
                variant="secondary"
                aria-label={`View invocations of ${service}/${row.handler.name}`}
                className={invocationsLinkStyles()}
              >
                View invocations
                <Icon name={IconName.ChevronRight} className="h-4 w-4" />
              </Link>
            </Cell>
          );
        }
        return <Cell />;
      }}
    />
  );
}
