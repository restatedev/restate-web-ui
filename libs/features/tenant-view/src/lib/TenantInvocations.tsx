import { TenantServiceTarget } from './TenantServiceTarget';
import { ServiceTargetProvider } from '@restate/features/service-target';
import {
  useListInvocationsV2,
  useSummaryInvocationsV2,
} from '@restate/data-access/admin-api-hooks';
import {
  type components,
  getInvocationStatusLabel,
  INVOCATION_STATUSES,
  TERMINAL_INVOCATION_STATUSES,
} from '@restate/data-access/admin-api-spec';
import { useRestateContext } from '@restate/features/restate-context';
import {
  InvocationDuration,
  InvocationTableCell,
} from '@restate/features/invocation-ui';
import { Button } from '@restate/ui/button';
import {
  ContentPanel,
  ContentPanelBody,
  ContentPanelSection,
  ContentPanelToolbar,
} from '@restate/ui/content-panel';
import { EmptyState } from '@restate/ui/empty-state';
import { ErrorBanner } from '@restate/ui/error';
import {
  FilterChip,
  QueryClause,
  type QueryClauseSchema,
} from '@restate/ui/filter-builder';
import { Icon, IconName } from '@restate/ui/icons';
import { ListPageHeader } from '@restate/ui/layout';
import { HoverTooltip } from '@restate/ui/tooltip';
import {
  VQueueStageSummaryBar,
  VQueueStageLegend,
  type VQueueSummaryFocus,
} from '@restate/features/status-chart';
import { Cell, PanelTable, type PanelTableColumn } from '@restate/ui/table';
import { SnapshotTimeProvider } from '@restate/util/snapshot-time';
import { useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

type Column = 'id' | 'target' | 'status' | 'created_at' | 'duration';
const columns: PanelTableColumn<Column>[] = [
  { id: 'id', name: 'Invocation', isRowHeader: true, defaultWidth: 190 },
  { id: 'created_at', name: 'Created at', defaultWidth: 120 },
  { id: 'duration', name: 'Duration', defaultWidth: 110 },
  { id: 'target', name: 'Target', minWidth: 240 },
  { id: 'status', name: 'Status', minWidth: 320 },
];

const snapshotOptions = {
  staleTime: Infinity,
  refetchInterval: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  retry: false,
} as const;
const serviceSchema: QueryClauseSchema<'STRING'> = {
  id: 'service',
  label: 'Service',
  type: 'STRING',
  operations: [{ value: 'EQUALS', label: 'is' }],
};
const statusSchema: QueryClauseSchema<'STRING_LIST'> = {
  id: 'status',
  label: 'Status',
  type: 'STRING_LIST',
  operations: [{ value: 'IN', label: 'is' }],
  options: INVOCATION_STATUSES.map((value) => ({
    value,
    label: getInvocationStatusLabel(value) ?? value,
  })),
};

export interface TenantInvocationsProps {
  scope: string;
}

export function TenantInvocations({ scope }: TenantInvocationsProps) {
  return (
    <ServiceTargetProvider component={TenantServiceTarget}>
      <TenantInvocationsContent key={scope} scope={scope} />
    </ServiceTargetProvider>
  );
}

function TenantInvocationsContent({ scope }: { scope: string }) {
  const { baseUrl } = useRestateContext();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const service = searchParams.get('service')?.trim() ?? '';
  const status: string[] = INVOCATION_STATUSES.filter((value) =>
    searchParams.get('status')?.split(',').includes(value),
  );
  const completedStatuses = new Set<string>(TERMINAL_INVOCATION_STATUSES);
  const focus: VQueueSummaryFocus =
    status.length === 0
      ? 'all'
      : status.every((value) => completedStatuses.has(value))
        ? 'completed'
        : status.every((value) => !completedStatuses.has(value))
          ? 'not-completed'
          : 'all';
  const filters: components['schemas']['InvocationV2FilterItem'][] = [
    { field: 'scope', type: 'STRING', operation: 'EQUALS', value: scope },
  ];
  if (service) {
    filters.push({
      field: 'target_service_name',
      type: 'STRING',
      operation: 'EQUALS',
      value: service,
    });
  }
  if (status.length > 0) {
    filters.push({
      field: 'status',
      type: 'STRING_LIST',
      operation: 'IN',
      value: status,
    });
  }
  const { data, isPending, isFetching, error, refetch, dataUpdatedAt } =
    useListInvocationsV2(
      {
        filters,
        sort: { field: 'created_at', order: 'DESC' },
        mode: { type: 'exact' },
      },
      snapshotOptions,
    );
  const summary = useSummaryInvocationsV2(
    {
      filters: filters.filter((filter) => filter.field !== 'status'),
      mode: { type: 'exact' },
      view: 'all',
    },
    snapshotOptions,
  );
  const byStage =
    summary.data?.stageBuckets.map((bucket) => ({
      ...bucket,
      name: bucket.key,
    })) ?? [];
  const byStatus =
    summary.data?.statusBuckets.map((bucket) => ({
      ...bucket,
      name: bucket.key,
    })) ?? [];
  const chartProps = {
    byStage,
    byStatus,
    focus,
    isBreakdownSampled: false,
    areStageCountsPartial: summary.data?.stageCountsArePartial,
    isLoading: summary.isPending,
    isDimmed: (_name: string, represented: string[] = []) =>
      status.length > 0 && !represented.some((value) => status.includes(value)),
    getHref: (_name: string, represented: string[] = []) => {
      const next = new URLSearchParams(listSearch);
      const selected =
        represented.length === status.length &&
        represented.every((value) => status.includes(value));
      if (selected || represented.length === 0) next.delete('status');
      else next.set('status', represented.join(','));
      return `${baseUrl}/invocations?${next}`;
    },
  };
  const rows = data?.rows ?? [];
  const listSearch = new URLSearchParams();
  if (service) listSearch.set('service', service);
  if (status.length > 0) listSearch.set('status', status.join(','));

  return (
    <SnapshotTimeProvider lastSnapshot={dataUpdatedAt}>
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        <ListPageHeader icon={IconName.Invocation} title="Invocations">
          Browse invocations and their journals in{' '}
          <span className="font-mono">{scope}</span>.
        </ListPageHeader>
        <ContentPanel>
          <ContentPanelToolbar className="items-center gap-2 px-3 pb-1">
            <TenantFilters
              key={`${service}:${status.join(',')}`}
              service={service}
              status={status}
              onApply={(selectedService, selectedStatus) => {
                const next = new URLSearchParams();
                if (selectedService.trim())
                  next.set('service', selectedService.trim());
                if (selectedStatus.length > 0)
                  next.set('status', selectedStatus.join(','));
                setSearchParams(next, { preventScrollReset: true });
              }}
            />
            <HoverTooltip content="Refresh invocations">
              <Button
                variant="icon"
                aria-label="Refresh invocations"
                className="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-lg p-0"
                disabled={isFetching || summary.isFetching}
                onClick={() => {
                  void refetch();
                  void summary.refetch();
                }}
              >
                <Icon name={IconName.Retry} className="h-4 w-4" />
              </Button>
            </HoverTooltip>
          </ContentPanelToolbar>
          <ContentPanelBody className="pb-8">
            {(error || summary.error) && (
              <ErrorBanner
                error={error ?? summary.error}
                className="mx-4 mt-4 rounded-xl"
              />
            )}
            <div className="border-b border-gray-200/80 px-5 pt-8 pb-4">
              <div className="flex w-full flex-col gap-3">
                <VQueueStageSummaryBar
                  {...chartProps}
                  onFocusChange={(nextFocus) => {
                    const next = new URLSearchParams(listSearch);
                    if (nextFocus === 'all') next.delete('status');
                    else
                      next.set(
                        'status',
                        INVOCATION_STATUSES.filter(
                          (value) =>
                            completedStatuses.has(value) ===
                            (nextFocus === 'completed'),
                        ).join(','),
                      );
                    setSearchParams(next, { preventScrollReset: true });
                  }}
                  breakdownMode="exact"
                  canSampleBreakdown={false}
                  onBreakdownModeChange={() => undefined}
                  isFetching={summary.isFetching}
                />
                <VQueueStageLegend {...chartProps} isError={summary.isError} />
              </div>
            </div>
            <ContentPanelSection flush>
              <PanelTable
                aria-label="Tenant invocations"
                columns={columns}
                items={rows}
                selectionMode="none"
                isLoading={isPending}
                numOfRows={8}
                onRowAction={(id) =>
                  navigate({
                    pathname: `${baseUrl}/invocations/${encodeURIComponent(String(id))}`,
                    search: listSearch.toString(),
                  })
                }
                emptyPlaceholder={
                  <EmptyState
                    icon={IconName.Invocation}
                    title={
                      error
                        ? 'Could not load invocations'
                        : 'No invocations found'
                    }
                    description={
                      error
                        ? undefined
                        : 'Invocations matching this tenant and your filters will appear here.'
                    }
                  />
                }
                renderCell={(row, column) =>
                  column.id === 'duration' ? (
                    <Cell>
                      <InvocationDuration invocation={row} />
                    </Cell>
                  ) : (
                    <InvocationTableCell
                      column={column.id}
                      row={row}
                      invocation={row}
                    />
                  )
                }
              />
            </ContentPanelSection>
            {data && (
              <p role="status" className="px-4 pt-3 text-xs text-zinc-500">
                {data.isPartial || rows.length >= data.limit
                  ? `Showing ${rows.length} invocations. Narrow your filters to find older results.`
                  : `${rows.length} invocations`}
              </p>
            )}
          </ContentPanelBody>
        </ContentPanel>
      </div>
    </SnapshotTimeProvider>
  );
}

interface TenantFiltersProps {
  service: string;
  status: string[];
  onApply: (service: string, status: string[]) => void;
}

function TenantFilters({ service, status, onApply }: TenantFiltersProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [serviceClause, setServiceClause] = useState(
    () =>
      new QueryClause(serviceSchema, { operation: 'EQUALS', value: service }),
  );
  const [statusClause, setStatusClause] = useState(
    () => new QueryClause(statusSchema, { operation: 'IN', value: status }),
  );
  return (
    <form
      ref={formRef}
      className="mr-auto flex min-w-0 flex-wrap items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        onApply(
          String(serviceClause.value.value ?? ''),
          statusClause.value.value ?? [],
        );
      }}
    >
      <FilterChip
        item={serviceClause}
        appearance="light"
        emptyValueLabel="Any"
        valueClassName="max-w-52"
        popoverPlacement="bottom"
        formRef={formRef}
        onUpdate={(clause) =>
          setServiceClause(
            new QueryClause(serviceSchema, {
              operation: 'EQUALS',
              value: String(clause.value.value ?? ''),
            }),
          )
        }
        showRemove={Boolean(service)}
        onRemove={() => onApply('', status)}
      />
      <FilterChip
        item={statusClause}
        appearance="light"
        popoverPlacement="bottom"
        formRef={formRef}
        onUpdate={(clause) =>
          setStatusClause(
            new QueryClause(statusSchema, {
              operation: 'IN',
              value: Array.isArray(clause.value.value)
                ? clause.value.value
                : [],
            }),
          )
        }
        showRemove={status.length > 0}
        onRemove={() => onApply(service, [])}
      />
    </form>
  );
}
