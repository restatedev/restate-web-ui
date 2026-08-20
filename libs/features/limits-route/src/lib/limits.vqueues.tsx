import { useFeatures } from '@restate/data-access/admin-api';
import { useListVqueues } from '@restate/data-access/admin-api-hooks';
import type { components } from '@restate/data-access/admin-api-spec';
import { useRestateContext } from '@restate/features/restate-context';
import { Button } from '@restate/ui/button';
import {
  ContentPanel,
  ContentPanelBody,
  ContentPanelSection,
  ContentPanelToolbar,
} from '@restate/ui/content-panel';
import { EmptyState } from '@restate/ui/empty-state';
import {
  AddFilterTrigger,
  FilterBuilder,
  FilterChip,
  FilteredResultsCaption,
  QueryClause,
  QueryClauseType,
  readFilterClauses,
  useFilterBuilder,
  writeFilterClauses,
} from '@restate/ui/filter-builder';
import { Icon, IconName } from '@restate/ui/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@restate/ui/tooltip';
import { tv } from '@restate/util/styles';
import { useCallback, useMemo, useRef, useState } from 'react';
import { type SortDescriptor } from 'react-aria-components';
import { Form, useSearchParams } from 'react-router';
import { FlowControlHero, flowControlTabs } from './FlowControlPage';
import { VQUEUE_LIST_QUERY_SIZE } from './limits.constants';
import {
  LimitListPagination,
  useLimitListPagination,
} from './LimitListPagination';
import { VQueueTable } from './VQueueTable';
import {
  createVQueueIdFilter,
  getVQueueIdFilterValue,
  toVQueueFilters,
  VQUEUE_FILTER_SCHEMA,
} from './limits.vqueueFilters';

type ListVQueuesRequestBody = components['schemas']['ListVQueuesRequestBody'];
type VQueueSortField = components['schemas']['VQueueSort']['field'];

const SORT_FIELDS = {
  vqueue: 'id',
  serviceLock: 'service',
  scope: 'scope',
  stages: 'unfinished',
  lastActivity: 'lastActivity',
} as const satisfies Record<string, VQueueSortField>;

const refreshIconStyles = tv({
  base: 'h-3.5 w-3.5',
  variants: { isFetching: { true: 'animate-spin' } },
});

function VQueuesComponent() {
  const { baseUrl } = useRestateContext();
  const hasVqueues = useFeatures().has('vqueues');
  const [searchParams, setSearchParams] = useSearchParams();
  const searchString = searchParams.toString();
  const committedFilters = useMemo(
    () =>
      readFilterClauses(
        new URLSearchParams(searchString),
        VQUEUE_FILTER_SCHEMA,
      ),
    [searchString],
  );
  const query = useFilterBuilder(committedFilters);
  const formRef = useRef<HTMLFormElement | null>(null);
  const submitTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  // Removing a filter updates the list before this callback runs, but the
  // current render still exposes the old items. Defer submission until React
  // commits the removal so the URL is written from the updated list.
  // TODO: Have FilterBuilder provide the next items and remove this timer.
  const scheduleSubmit = useCallback(() => {
    clearTimeout(submitTimerRef.current);
    submitTimerRef.current = setTimeout(
      () => formRef.current?.requestSubmit(),
      0,
    );
  }, []);
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>();
  const filters = useMemo(
    () => toVQueueFilters(committedFilters),
    [committedFilters],
  );
  const request = useMemo<ListVQueuesRequestBody>(
    () => ({
      ...(filters.length > 0 && {
        filters,
      }),
      ...(sortDescriptor && {
        sort: {
          field:
            SORT_FIELDS[sortDescriptor.column as keyof typeof SORT_FIELDS] ??
            'lastActivity',
          order: sortDescriptor.direction === 'ascending' ? 'ASC' : 'DESC',
        },
      }),
      limit: VQUEUE_LIST_QUERY_SIZE,
    }),
    [filters, sortDescriptor],
  );
  const vqueues = useListVqueues(request, { enabled: hasVqueues });
  const allVqueues = vqueues.data?.vqueues ?? [];
  const pagination = useLimitListPagination(allVqueues, request);
  const hasFilters = filters.length > 0;
  const emptyTitle = hasFilters ? 'No matching VQueues' : 'No VQueues';
  const emptyDescription = hasFilters
    ? 'Try adjusting the active filters.'
    : 'VQueues appear as invocations enter service queues.';

  const applyVQueueId = useCallback(
    (input: string) => {
      const value = getVQueueIdFilterValue(input);
      if (!value) {
        return false;
      }
      const clause = createVQueueIdFilter(value);
      if (query.getItem(clause.id)) {
        query.update(clause.id, clause);
      } else {
        query.append(clause);
      }
      scheduleSubmit();
      return true;
    },
    [query, scheduleSubmit],
  );

  const renderFilterOption = useCallback(
    (item: QueryClause<QueryClauseType>) => (
      <div className="flex items-baseline gap-2">
        <span>{item.label}</span>
        <span className="font-mono text-xs opacity-60">
          {item.operations.map((operation) => operation.label).join(' / ')}
        </span>
      </div>
    ),
    [],
  );
  const pageToolbar = (
    <>
      <Form
        ref={formRef}
        className="hidden min-w-0 flex-auto sm:block"
        onSubmit={(event) => {
          event.preventDefault();
          setSearchParams(writeFilterClauses(searchParams, query.items), {
            preventScrollReset: true,
          });
        }}
      >
        <FilterBuilder query={query} schema={VQUEUE_FILTER_SCHEMA} multiple>
          <AddFilterTrigger
            placeholder="Filter VQueues…"
            title="VQueue filters"
            disabled={!hasVqueues}
            onInputSubmit={applyVQueueId}
            onItemRemove={scheduleSubmit}
            renderOption={renderFilterOption}
            inputPrefix={
              <Icon
                name={IconName.Search}
                className="h-4 w-4 shrink-0 text-gray-400"
              />
            }
            tagsPlacement="outside"
            maxVisibleChips="auto"
            chipOverflowStrategy="all"
            tagGroupClassName="min-w-0 flex-nowrap"
            showSectionTitle={false}
            popoverPlacement="bottom start"
            popoverClassName="w-80 min-w-80 max-w-[calc(100vw-2rem)] bg-white/95 p-1"
            optionClassName="gap-2 px-2.5 py-1.5 data-[focused]:bg-blue-50 data-[focused]:text-blue-900 hover:bg-blue-50 hover:text-blue-900"
            className="min-h-6.5 w-full justify-end text-gray-800"
            inputClassName="min-h-6.5 max-w-[38ch] flex-[0_1_38ch] bg-white/70 shadow-xs hover:bg-white [&_input]:h-6 [&_input]:min-h-6 [&_input]:py-0.5 [&_input]:placeholder:text-gray-500/75"
          >
            {(props) => (
              <FilterChip
                {...props}
                appearance="light"
                showRemove
                popoverPlacement="bottom"
              />
            )}
          </AddFilterTrigger>
        </FilterBuilder>
      </Form>
      <Tooltip>
        <TooltipTrigger>
          <Button
            type="button"
            variant="icon"
            aria-label={
              vqueues.isFetching ? 'Refreshing VQueues' : 'Refresh VQueues'
            }
            className="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-lg p-0"
            onClick={() => void vqueues.refetch()}
            disabled={!hasVqueues || vqueues.isFetching}
          >
            <Icon
              name={IconName.Retry}
              className={refreshIconStyles({
                isFetching: vqueues.isFetching,
              })}
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent size="sm">Refresh VQueues</TooltipContent>
      </Tooltip>
    </>
  );
  const filteredResultsCaption = hasFilters ? (
    <FilteredResultsCaption
      noun="VQueues"
      onClear={() =>
        setSearchParams(writeFilterClauses(searchParams, []), {
          preventScrollReset: true,
        })
      }
    />
  ) : undefined;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <FlowControlHero />
      <ContentPanel tabs={flowControlTabs(baseUrl, 'vqueues')}>
        <ContentPanelToolbar className="justify-end gap-2 px-1 pb-1">
          {pageToolbar}
        </ContentPanelToolbar>
        <ContentPanelBody className="pb-32">
          <ContentPanelSection flush>
            {!hasVqueues ? (
              <EmptyState
                icon={IconName.Layers}
                title="VQueues are not enabled"
                description="Enable VQueues on the Restate server to inspect queue metadata."
              />
            ) : (
              <VQueueTable
                baseUrl={baseUrl}
                vqueues={pagination.pageItems}
                isLoading={vqueues.isFetching}
                error={vqueues.error as Error | null}
                caption={filteredResultsCaption}
                dependencies={[searchString, vqueues.isFetching]}
                sortDescriptor={sortDescriptor}
                onSortChange={setSortDescriptor}
                emptyPlaceholder={
                  <EmptyState
                    icon={hasFilters ? IconName.Search : IconName.Layers}
                    title={emptyTitle}
                    description={emptyDescription}
                  />
                }
              />
            )}
            {!vqueues.isFetching && (
              <LimitListPagination
                hasMore={Boolean(vqueues.data?.hasMore)}
                totalItems={allVqueues.length}
                pageIndex={pagination.pageIndex}
                pageCount={pagination.pageCount}
                onPageChange={pagination.setPageIndex}
                label="VQueues"
              />
            )}
          </ContentPanelSection>
        </ContentPanelBody>
      </ContentPanel>
    </div>
  );
}

export const vqueues = { Component: VQueuesComponent };
