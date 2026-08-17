import { useFeatures } from '@restate/data-access/admin-api';
import { useGetVqueueEntries } from '@restate/data-access/admin-api-hooks';
import type {
  FilterItem,
  VqueueEntryStage,
  VqueueSnapshot,
} from '@restate/data-access/admin-api-spec';
import { useBatchOperations } from '@restate/features/batch-operations';
import { InvocationStatusBadge } from '@restate/features/invocation-ui';
import { ServiceTarget } from '@restate/features/service-target';
import { BlockedStatus, LimitKey, Scope } from '@restate/features/vqueue-ui';
import { Breadcrumbs } from '@restate/ui/breadcrumbs';
import { Button } from '@restate/ui/button';
import { CardGrid } from '@restate/ui/card';
import { ChipGroup } from '@restate/ui/chip';
import {
  ContentPanel,
  ContentPanelBody,
  ContentPanelSection,
  ContentPanelToolbar,
  type ContentPanelTabs,
} from '@restate/ui/content-panel';
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownPopover,
  DropdownSection,
  DropdownTrigger,
} from '@restate/ui/dropdown';
import { EmptyState } from '@restate/ui/empty-state';
import { ErrorBanner } from '@restate/ui/error';
import { Header } from '@restate/ui/header';
import { Icon, IconName } from '@restate/ui/icons';
import { Spinner } from '@restate/ui/loading';
import type {
  QueryClauseSchema,
  QueryClauseType,
} from '@restate/ui/query-builder';
import { Tooltip, TooltipContent, TooltipTrigger } from '@restate/ui/tooltip';
import { formatNumber } from '@restate/util/intl';
import { panelHref } from '@restate/util/panel';
import { SnapshotTimeProvider } from '@restate/util/snapshot-time';
import { tv } from '@restate/util/styles';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { VQueueActivityCard, VQueueDurationsCard } from './VQueueCards';
import {
  hasBlockedVqueueHeadInRows,
  VQueueEntriesTable,
} from './VQueueEntriesTable';

const STAGES = [
  { id: 'inbox', label: 'Inbox' },
  { id: 'running', label: 'Running' },
  { id: 'suspended', label: 'Suspended' },
  { id: 'paused', label: 'Paused' },
  { id: 'finished', label: 'Finished' },
] as const satisfies readonly { id: VqueueEntryStage; label: string }[];

const STAGE_QUERY_PARAM = 'stage';

type VqueueBatchAction =
  | 'cancel'
  | 'pause'
  | 'resume'
  | 'retry-now'
  | 'restart-as-new'
  | 'kill'
  | 'purge';

const VQUEUE_BATCH_ACTIONS = {
  inbox: ['cancel', 'pause', 'retry-now', 'kill'],
  running: ['cancel', 'pause', 'kill'],
  suspended: ['cancel', 'pause', 'kill'],
  paused: ['resume', 'cancel', 'kill'],
  finished: ['restart-as-new', 'purge'],
} as const satisfies Record<VqueueEntryStage, readonly VqueueBatchAction[]>;

const VQUEUE_BATCH_ACTION_CONFIG = {
  cancel: { label: 'Cancel…', icon: IconName.Cancel, destructive: true },
  pause: { label: 'Pause…', icon: IconName.Pause, destructive: true },
  resume: { label: 'Resume…', icon: IconName.Play, destructive: false },
  'retry-now': {
    label: 'Retry now…',
    icon: IconName.RetryNow,
    destructive: false,
  },
  'restart-as-new': {
    label: 'Restart as new…',
    icon: IconName.Restart,
    destructive: false,
  },
  kill: { label: 'Kill…', icon: IconName.Kill, destructive: true },
  purge: { label: 'Purge…', icon: IconName.Trash, destructive: true },
} as const satisfies Record<
  VqueueBatchAction,
  { label: string; icon: IconName; destructive: boolean }
>;

const VQUEUE_BATCH_FILTER_SCHEMA: QueryClauseSchema<QueryClauseType>[] = [
  {
    id: 'vqueue_id',
    label: 'VQueue',
    operations: [{ value: 'EQUALS', label: 'is' }],
    type: 'STRING',
  },
  {
    id: 'stage',
    label: 'Stage',
    operations: [{ value: 'EQUALS', label: 'is' }],
    type: 'STRING',
    options: STAGES.map(({ id, label }) => ({ value: id, label })),
  },
  {
    id: 'status',
    label: 'Status',
    operations: [{ value: 'EQUALS', label: 'is' }],
    type: 'STRING',
    options: [{ value: 'backing-off', label: 'Backing off' }],
  },
];

const refreshIconStyles = tv({
  base: 'h-3.5 w-3.5',
  variants: { isFetching: { true: 'animate-spin' } },
});

function isVqueueStage(value: string | null): value is VqueueEntryStage {
  return STAGES.some(({ id }) => id === value);
}

export function vqueueStageFromSearch(
  searchParams: URLSearchParams,
): VqueueEntryStage {
  const stage = searchParams.get(STAGE_QUERY_PARAM);
  return isVqueueStage(stage) ? stage : 'inbox';
}

export function vqueueBatchFilters(
  vqueueId: string,
  stage: VqueueEntryStage,
  action?: VqueueBatchAction,
): FilterItem[] {
  return [
    {
      field: 'vqueue_id',
      type: 'STRING',
      operation: 'EQUALS',
      value: vqueueId,
    },
    {
      field: 'stage',
      type: 'STRING',
      operation: 'EQUALS',
      value: stage,
    },
    ...(stage === 'inbox' && action === 'pause'
      ? ([
          {
            field: 'status',
            type: 'STRING',
            operation: 'EQUALS',
            value: 'backing-off',
          },
        ] satisfies FilterItem[])
      : []),
  ];
}

function VQueueBatchActions({
  vqueueId,
  stage,
  count,
}: {
  vqueueId: string;
  stage: VqueueEntryStage;
  count: number;
}) {
  const {
    batchCancel,
    batchPause,
    batchResume,
    batchRetryNow,
    batchRestartAsNew,
    batchKill,
    batchPurge,
  } = useBatchOperations();
  const actions = VQUEUE_BATCH_ACTIONS[stage];
  const stageLabel = STAGES.find(({ id }) => id === stage)?.label ?? stage;

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button
          variant="secondary"
          disabled={count === 0}
          className="flex items-center gap-1.5 self-end rounded-lg p-0.5 px-2 text-0.5xs"
        >
          Actions
          <Icon
            name={IconName.ChevronsUpDown}
            className="h-3.5 w-3.5 opacity-80"
          />
        </Button>
      </DropdownTrigger>
      <DropdownPopover>
        <DropdownSection title={`Actions on all ${stageLabel} invocations`}>
          <DropdownMenu
            onSelect={(action) => {
              const params = {
                filters: vqueueBatchFilters(
                  vqueueId,
                  stage,
                  action as VqueueBatchAction,
                ),
              };
              switch (action) {
                case 'cancel':
                  return batchCancel(params, VQUEUE_BATCH_FILTER_SCHEMA);
                case 'pause':
                  return batchPause(params, VQUEUE_BATCH_FILTER_SCHEMA);
                case 'resume':
                  return batchResume(params, VQUEUE_BATCH_FILTER_SCHEMA);
                case 'retry-now':
                  return batchRetryNow(params, VQUEUE_BATCH_FILTER_SCHEMA);
                case 'restart-as-new':
                  return batchRestartAsNew(params, VQUEUE_BATCH_FILTER_SCHEMA);
                case 'kill':
                  return batchKill(params, VQUEUE_BATCH_FILTER_SCHEMA);
                case 'purge':
                  return batchPurge(params, VQUEUE_BATCH_FILTER_SCHEMA);
              }
            }}
          >
            {actions.map((action) => {
              const config = VQUEUE_BATCH_ACTION_CONFIG[action];
              return (
                <DropdownItem
                  key={action}
                  value={action}
                  destructive={config.destructive}
                >
                  <Icon
                    name={config.icon}
                    className="h-3.5 w-3.5 shrink-0 opacity-80"
                  />
                  {config.label}
                </DropdownItem>
              );
            })}
          </DropdownMenu>
        </DropdownSection>
      </DropdownPopover>
    </Dropdown>
  );
}

function StageTabLabel({
  label,
  count,
  isPending,
  schedulerData,
}: {
  label: string;
  count?: number;
  isPending: boolean;
  schedulerData?: VqueueSnapshot;
}) {
  return (
    <span className="flex items-center gap-1.5">
      {label}
      {count !== undefined ? (
        <span
          title={`${formatNumber(count)} ${label.toLowerCase()} entries`}
          className="rounded bg-zinc-100 px-1 py-px text-2xs font-medium text-zinc-500 tabular-nums"
        >
          {formatNumber(count, true)}
        </span>
      ) : isPending ? (
        <span className="inline-block h-3 w-5 animate-pulse rounded bg-zinc-200" />
      ) : null}
      {schedulerData && <InboxSchedulingStatus data={schedulerData} />}
    </span>
  );
}

function InboxSchedulingStatus({ data }: { data: VqueueSnapshot }) {
  const scheduling = data.status.scheduling;
  if (data.identity.isPaused) return null;
  if (data.status.blocked || scheduling === 'blocked') {
    return <BlockedStatus showReason={false} />;
  }
  return null;
}

function VQueueHeader({ data }: { data?: VqueueSnapshot }) {
  const identity = data?.identity;

  return (
    <Header
      icon={IconName.Layers}
      iconLabel="VQueue"
      iconClassName="rotate-[87deg]"
      variant={identity?.isPaused ? 'warning' : 'default'}
      className="min-w-0"
    >
      <div className="flex min-w-0 flex-1 items-center overflow-hidden whitespace-nowrap">
        {identity?.service ? (
          <ServiceTarget
            service={identity.service}
            serviceKey={identity.objectKey}
            showHandler={false}
            links={{
              service: {
                href: panelHref({ service: identity.service }),
                ariaLabel: `Open service ${identity.service}`,
              },
            }}
            variant="header"
            className="min-w-0 flex-[0_1_auto]"
          />
        ) : null}
        {identity?.service && (identity.scope || identity.limitKey) && (
          <span
            aria-hidden="true"
            className="mx-2 h-px w-4 shrink-0 bg-zinc-300/80"
          />
        )}
        {(identity?.scope || identity?.limitKey) && (
          <ChipGroup variant="header" className="min-w-0 flex-[0_1_auto]">
            <Scope
              value={identity.scope}
              relationship={identity.limitKey ? 'target' : undefined}
              labelVariant="compact"
            />
            <LimitKey
              value={identity.limitKey}
              relationship={identity.scope ? 'scope' : undefined}
            />
          </ChipGroup>
        )}
      </div>
      {identity?.isPaused && (
        <div className="shrink-0 pr-2 *:origin-[center_left] *:scale-[1.15]">
          <InvocationStatusBadge status="paused" mini="md" />
        </div>
      )}
    </Header>
  );
}

function Component() {
  const { vqueueId = '' } = useParams<{ vqueueId: string }>();
  const [searchParams] = useSearchParams();
  const stage = vqueueStageFromSearch(searchParams);
  const hasVqueues = useFeatures().has('vqueues');
  const details = useGetVqueueEntries(vqueueId, stage, {
    enabled: hasVqueues && Boolean(vqueueId),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    staleTime: 0,
  });
  const currentSnapshot = details.data?.snapshot;
  const [retainedSnapshot, setRetainedSnapshot] = useState<{
    vqueueId: string;
    data: VqueueSnapshot;
    dataUpdatedAt: number;
  }>();
  useEffect(() => {
    if (currentSnapshot) {
      setRetainedSnapshot({
        vqueueId,
        data: currentSnapshot,
        dataUpdatedAt: details.dataUpdatedAt,
      });
    }
  }, [currentSnapshot, details.dataUpdatedAt, vqueueId]);
  const retainedData =
    details.isPending && retainedSnapshot?.vqueueId === vqueueId
      ? retainedSnapshot
      : undefined;
  const data = currentSnapshot ?? retainedData?.data;
  const inboxSchedulingData =
    stage !== 'inbox' ||
    hasBlockedVqueueHeadInRows(details.data?.rows ?? [], currentSnapshot)
      ? data
      : undefined;
  const tabs = useMemo<ContentPanelTabs>(
    () => ({
      items: STAGES.map(({ id, label }) => ({
        id,
        label: (
          <StageTabLabel
            label={label}
            count={data?.counts[id]}
            isPending={details.isPending}
            schedulerData={id === 'inbox' ? inboxSchedulingData : undefined}
          />
        ),
      })),
      defaultId: 'inbox',
      queryParam: STAGE_QUERY_PARAM,
    }),
    [data, details.isPending, inboxSchedulingData],
  );
  const isFetching = details.isFetching;
  const lastSnapshot = currentSnapshot
    ? details.dataUpdatedAt
    : retainedData?.dataUpdatedAt;

  return (
    <SnapshotTimeProvider lastSnapshot={lastSnapshot}>
      <div className="flex min-h-0 flex-1 flex-col pt-4 [--cp-toolbar-top:5rem] [--cp-toolbar-tuck:5rem]">
        <Breadcrumbs className="mt-8 px-5 md:mt-0" />
        <VQueueHeader data={data} />
        {data && (
          <CardGrid
            columns={2}
            className="relative z-40 mx-5 mt-3 xl:max-w-[68rem] xl:grid-cols-[minmax(0,9fr)_minmax(0,8fr)]"
          >
            <VQueueDurationsCard data={data} />
            <VQueueActivityCard data={data} />
          </CardGrid>
        )}
        {!hasVqueues ? (
          <div className="px-5 py-20">
            <EmptyState
              icon={IconName.Layers}
              iconClassName="rotate-90"
              title="VQueues are not enabled"
              description="Enable VQueues on the Restate server to inspect this queue."
            />
          </div>
        ) : details.error ? (
          <div className="px-5 py-20">
            <EmptyState
              icon={IconName.TriangleAlert}
              intent="danger"
              title="Couldn’t load this VQueue"
            >
              <ErrorBanner
                error={details.error}
                className="w-full rounded-xl text-left"
              />
            </EmptyState>
          </div>
        ) : details.isPending && !data ? (
          <div
            role="status"
            className="flex items-center justify-center gap-2 px-5 py-20 text-sm text-zinc-500"
          >
            <Spinner className="h-4 w-4" />
            Loading VQueue…
          </div>
        ) : !data ? (
          <div className="px-5 py-20">
            <EmptyState
              icon={IconName.Layers}
              iconClassName="rotate-90"
              title="VQueue not found"
              description="The queue may have become empty and been removed."
            />
          </div>
        ) : (
          <ContentPanel className="-mt-14" tabs={tabs}>
            <ContentPanelToolbar className="justify-end px-1 pb-1">
              <VQueueBatchActions
                vqueueId={vqueueId}
                stage={stage}
                count={data.counts[stage]}
              />
              <Tooltip>
                <TooltipTrigger>
                  <Button
                    type="button"
                    variant="icon"
                    aria-label={
                      isFetching ? 'Refreshing VQueue' : 'Refresh VQueue'
                    }
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg p-0"
                    onClick={() => {
                      void details.refetch();
                    }}
                    disabled={isFetching}
                  >
                    <Icon
                      name={IconName.Retry}
                      className={refreshIconStyles({ isFetching })}
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent size="sm">Refresh VQueue</TooltipContent>
              </Tooltip>
            </ContentPanelToolbar>
            <ContentPanelBody className="pb-32">
              <ContentPanelSection flush>
                <VQueueEntriesTable
                  stage={stage}
                  data={details.data}
                  error={details.error}
                  isPending={details.isPending}
                />
              </ContentPanelSection>
            </ContentPanelBody>
          </ContentPanel>
        )}
      </div>
    </SnapshotTimeProvider>
  );
}

export const vqueue = { Component };
