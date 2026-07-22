import type { Service } from '@restate/data-access/admin-api-spec';
import { GridList, GridListItem } from '@restate/ui/grid-list';
import {
  HANDLER_QUERY_PARAM,
  SERVICE_QUERY_PARAM,
  usePanel,
} from '@restate/util/panel';
import { useOverviewContext } from './OverviewContext';
import { HandlerCard } from './HandlerCard';
import { type OverviewHandler, sortHandlers } from './sortHandlers';

export function HandlersGridList() {
  const {
    filter,
    servicesMap,
    isSummaryLoading,
    baseUrl,
    linkParams,
    resolvedHandlerSortDescriptor,
    setHandlerSortDescriptor,
  } = useOverviewContext();

  const allHandlers = flattenHandlers(servicesMap);
  const filteredHandlers = filterHandlers(
    allHandlers,
    filter.trim().toLowerCase(),
  );
  const handlers = sortHandlers(
    filteredHandlers,
    resolvedHandlerSortDescriptor,
  );

  const { open } = usePanel();
  const itemsById = handlers.map((h) => ({
    id: `${h.service.name}.${h.handler.name}`,
    ...h,
  }));

  return (
    <GridList
      aria-label="Handlers"
      columns={[]}
      items={itemsById}
      dependencies={[isSummaryLoading]}
      sortDescriptor={resolvedHandlerSortDescriptor}
      onSortChange={setHandlerSortDescriptor}
      onAction={(key) => {
        const item = itemsById.find((h) => h.id === key);
        if (!item) return;
        open(SERVICE_QUERY_PARAM, item.service.name, {
          [HANDLER_QUERY_PARAM]: item.handler.name,
        });
      }}
      estimatedRowHeight={50}
      virtualized
      className="[--grid-list-template-columns:1fr]"
      headerClassName="hidden"
    >
      {(item) => {
        const { service, handler } = item;
        const id = `${service.name}.${handler.name}`;
        return (
          <GridListItem id={id} item={item} textValue={id}>
            {({ isFocusVisible, isHovered, isPressed }) => (
              <HandlerCard
                service={service}
                handler={handler}
                baseUrl={baseUrl}
                linkParams={linkParams}
                isFocusVisible={isFocusVisible}
                isHovered={isHovered}
                isPressed={isPressed}
              />
            )}
          </GridListItem>
        );
      }}
    </GridList>
  );
}

function flattenHandlers(
  servicesMap?: Map<string, Service>,
): OverviewHandler[] {
  const out: OverviewHandler[] = [];
  for (const service of servicesMap?.values() ?? []) {
    for (const handler of service.handlers) {
      out.push({ service, handler });
    }
  }
  return out;
}

function filterHandlers(handlers: OverviewHandler[], filter: string) {
  if (filter.length === 0) return handlers;
  return handlers.filter(
    ({ service, handler }) =>
      handler.name.toLowerCase().includes(filter) ||
      service.name.toLowerCase().includes(filter) ||
      (handler.ty?.toLowerCase().includes(filter) ?? false) ||
      service.ty.toLowerCase().includes(filter),
  );
}
