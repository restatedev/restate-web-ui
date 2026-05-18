import type { Service } from '@restate/data-access/admin-api-spec';
import { GridList, GridListItem } from '@restate/ui/grid-list';
import { panelHref } from '@restate/util/panel';
import { useNavigate } from 'react-router';
import { useOverviewContext } from './OverviewContext';
import { HandlerCard } from './HandlerCard';
import {
  type OverviewHandler,
  handlerIssuesKey,
  sortHandlers,
} from './sortHandlers';

export function HandlersGridList() {
  const {
    filter,
    servicesMap,
    summaryData,
    handlerInvocationCounts,
    handlerIssuesMap,
    isSummaryError,
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
    handlerInvocationCounts,
    handlerIssuesMap,
  );

  const navigate = useNavigate();
  const itemsById = handlers.map((h) => ({
    id: `${h.service.name}.${h.handler.name}`,
    ...h,
  }));

  return (
    <GridList
      aria-label="Handlers"
      columns={[]}
      items={itemsById}
      dependencies={[handlerIssuesMap, summaryData, isSummaryLoading]}
      sortDescriptor={resolvedHandlerSortDescriptor}
      onSortChange={setHandlerSortDescriptor}
      onAction={(key) => {
        const item = itemsById.find((h) => h.id === key);
        if (!item) return;
        navigate(
          panelHref({
            service: item.service.name,
            handler: item.handler.name,
          }),
        );
      }}
      estimatedRowHeight={100}
      className="[--grid-list-template-columns:1fr]"
      headerClassName="hidden"
    >
      {(item) => {
        const { service, handler } = item;
        const id = `${service.name}.${handler.name}`;
        const issues =
          handlerIssuesMap.get(handlerIssuesKey(service.name, handler.name)) ??
          [];
        const issueSeverity = issues.some((issue) => issue.severity === 'high')
          ? ('high' as const)
          : issues.length > 0
            ? ('low' as const)
            : ('none' as const);
        const handlerCount =
          handlerInvocationCounts.get(service.name)?.get(handler.name) ?? 0;

        return (
          <GridListItem id={id} item={item} textValue={id}>
            {({ isFocusVisible }) => (
              <HandlerCard
                service={service}
                handler={handler}
                baseUrl={baseUrl}
                handlerIssues={issues}
                summaryData={summaryData}
                isSummaryError={isSummaryError}
                isSummaryLoading={isSummaryLoading}
                handlerCount={handlerCount}
                linkParams={linkParams}
                isFocusVisible={isFocusVisible}
                issueSeverity={issueSeverity}
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
