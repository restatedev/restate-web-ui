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
import { Icon, IconName } from '@restate/ui/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@restate/ui/tooltip';
import { tv } from '@restate/util/styles';
import { useMemo, useState } from 'react';
import {
  Button as AriaButton,
  Input,
  Label,
  SearchField,
  type SortDescriptor,
} from 'react-aria-components';
import { FlowControlHero, flowControlTabs } from './FlowControlPage';
import { VQUEUE_LIST_QUERY_SIZE } from './limits.constants';
import {
  LimitListPagination,
  useLimitListPagination,
} from './LimitListPagination';
import { VQueueTable } from './VQueueTable';

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
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: 'lastActivity',
    direction: 'descending',
  });
  const request = useMemo<ListVQueuesRequestBody>(
    () => ({
      ...(submittedSearch
        ? {
            filters: [
              {
                field: 'id',
                type: 'STRING' as const,
                operation: 'CONTAINS' as const,
                value: submittedSearch,
              },
            ],
          }
        : {}),
      sort: {
        field:
          SORT_FIELDS[sortDescriptor.column as keyof typeof SORT_FIELDS] ??
          'lastActivity',
        order: sortDescriptor.direction === 'ascending' ? 'ASC' : 'DESC',
      },
      limit: VQUEUE_LIST_QUERY_SIZE,
    }),
    [sortDescriptor, submittedSearch],
  );
  const vqueues = useListVqueues(request, { enabled: hasVqueues });
  const allVqueues = vqueues.data?.vqueues ?? [];
  const pagination = useLimitListPagination(allVqueues, request);
  const emptyTitle = submittedSearch ? 'No matching VQueues' : 'No VQueues';
  const emptyDescription = submittedSearch
    ? 'Try a different VQueue ID.'
    : 'VQueues appear as invocations enter service queues.';

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <FlowControlHero />
      <ContentPanel tabs={flowControlTabs(baseUrl, 'vqueues')}>
        <ContentPanelToolbar className="justify-end gap-2 px-1 pb-1">
          <SearchField
            aria-label="Filter VQueues"
            onSubmit={(value) => setSubmittedSearch(value.trim())}
            onClear={() => setSubmittedSearch('')}
            isDisabled={!hasVqueues}
            className="group hidden min-w-0 flex-auto outline-none sm:block sm:max-w-[38ch]"
          >
            <Label className="sr-only">Filter VQueues</Label>
            <div className="relative min-h-7">
              <Input
                placeholder="Search VQueue ID…"
                className="mt-0 h-7 w-full min-w-0 rounded-lg border border-gray-200 bg-white/70 px-2 py-0.5 pr-8 pl-7 text-sm text-gray-800 shadow-xs outline-offset-2 placeholder:text-gray-500/75 hover:bg-white focus:border-blue-500/30 focus:bg-white focus:ring-0 focus:outline-2 focus:outline-blue-600 disabled:text-zinc-400 [&::-webkit-search-cancel-button]:hidden"
              />
              <Icon
                name={IconName.Search}
                className="pointer-events-none absolute top-0 bottom-0 left-1.5 aspect-square h-full p-1 text-gray-400"
              />
              <AriaButton
                aria-label="Clear filter"
                className="absolute top-1/2 right-1 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-gray-400 outline-offset-1 group-empty:hidden hover:bg-zinc-200/60 hover:text-zinc-700 focus-visible:outline-2 focus-visible:outline-blue-600"
              >
                <Icon name={IconName.X} className="h-3.5 w-3.5" />
              </AriaButton>
            </div>
          </SearchField>
          <Tooltip>
            <TooltipTrigger>
              <Button
                type="button"
                variant="icon"
                aria-label={
                  vqueues.isFetching ? 'Refreshing VQueues' : 'Refresh VQueues'
                }
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg p-0"
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
                dependencies={[submittedSearch, vqueues.isFetching]}
                sortDescriptor={sortDescriptor}
                onSortChange={setSortDescriptor}
                emptyPlaceholder={
                  <EmptyState
                    icon={submittedSearch ? IconName.Search : IconName.Layers}
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
