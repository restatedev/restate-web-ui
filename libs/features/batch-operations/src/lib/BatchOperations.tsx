import {
  createContext,
  PropsWithChildren,
  useCallback,
  useState,
  use,
  ReactNode,
} from 'react';
import {
  useBatchCancelInvocations,
  useBatchPauseInvocations,
  useBatchPurgeInvocations,
  useBatchKillInvocations,
  useBatchResumeInvocations,
  useCountInvocations,
} from '@restate/data-access/admin-api-hooks';
import type {
  BatchInvocationsRequestBody,
  BatchResumeInvocationsRequestBody,
  BatchInvocationsResponse,
  FilterItem,
} from '@restate/data-access/admin-api/spec';
import { ConfirmationDialog } from '@restate/ui/dialog';
import { Icon, IconName } from '@restate/ui/icons';
import { showSuccessNotification } from '@restate/ui/notification';
import {
  formatDurations,
  formatNumber,
  formatPlurals,
} from '@restate/util/intl';
import { ErrorBanner } from '@restate/ui/error';
import { FormFieldSelect, Option } from '@restate/ui/form-field';
import { InlineTooltip } from '@restate/ui/tooltip';
import {
  SnapshotTimeProvider,
  useDurationSinceLastSnapshot,
} from '@restate/util/snapshot-time';

type OperationType = 'cancel' | 'pause' | 'resume' | 'kill' | 'purge';

type BatchState = {
  id: string;
  isDialogOpen: boolean;
  successful: number;
  failed: number;
  failedInvocationIds: string[];
} & (
  | {
      type: Exclude<OperationType, 'resume'>;
      params: { invocationIds: string[] } | { filters: FilterItem[] };
    }
  | {
      type: 'resume';
      params:
        | { invocationIds: string[]; deployment?: 'Latest' | 'Keep' }
        | { filters: FilterItem[]; deployment?: 'Latest' | 'Keep' };
    }
);

interface OperationConfig {
  title: string;
  icon: IconName;
  iconClassName: string;
  submitVariant: 'primary' | 'destructive';
  description: (
    count: number,
    isLowerBound: boolean,
    duration: string,
  ) => ReactNode;
  alertType?: 'warning' | 'info';
  alertContent?: string;
  submitText: string;
  progressTitle: string;
  emptyMessage: string;
}

const OPERATION_CONFIG: Record<OperationType, OperationConfig> = {
  cancel: {
    title: 'Cancel Invocations',
    submitText: 'Cancel',
    icon: IconName.Cancel,
    iconClassName: 'text-red-400',
    submitVariant: 'destructive',
    description: (count, isLowerBound, duration) => (
      <p>
        Are you sure you want to cancel{' '}
        <InlineTooltip
          description={
            isLowerBound
              ? `This is a lower bound estimate calculated ${duration}. The actual count may be higher and may have changed.`
              : `This count was calculated ${duration} and may have changed.`
          }
          variant="inline-help"
          className="[&_button]:invisible"
        >
          <span className="font-medium text-gray-700">
            {formatNumber(count, true)}
            {isLowerBound ? '+' : ''}{' '}
            {formatPlurals(count, { one: 'invocation', other: 'invocations' })}
          </span>
        </InlineTooltip>
        ?
      </p>
    ),
    alertType: 'info',
    alertContent:
      'Cancellation frees held resources, cooperates with your handler code to roll back changes, and allows proper cleanup. It is non-blocking, so the call may return before cleanup finishes. In rare cases, cancellation may not take effect, retry the operation if needed.',
    progressTitle: 'Cancelling invocations',
    emptyMessage:
      'No invocations match your criteria. Only non-completed invocations can be cancelled.',
  },
  pause: {
    title: 'Pause Invocations',
    submitText: 'Pause',
    icon: IconName.Pause,
    iconClassName: 'text-red-400',
    submitVariant: 'destructive',
    description: (count, isLowerBound, duration) => (
      <p>
        Are you sure you want to pause{' '}
        <InlineTooltip
          description={
            isLowerBound
              ? `This is a lower bound estimate calculated ${duration}. The actual count may be higher and may have changed.`
              : `This count was calculated ${duration} and may have changed.`
          }
          variant="inline-help"
          className="[&_button]:invisible"
        >
          <span className="font-medium text-gray-700">
            {formatNumber(count, true)}
            {isLowerBound ? '+' : ''}{' '}
            {formatPlurals(count, { one: 'invocation', other: 'invocations' })}
          </span>
        </InlineTooltip>
        ? The pause may not take effect right away.
      </p>
    ),
    alertType: 'info',
    alertContent:
      'Paused invocations will stop executing until manually resumed or unpaused.',
    progressTitle: 'Pausing invocations',
    emptyMessage:
      'No invocations match your criteria. Only running invocations can be paused.',
  },
  resume: {
    title: 'Resume Invocations',
    submitText: 'Resume',
    icon: IconName.Resume,
    submitVariant: 'primary',
    iconClassName: '',
    description: (count, isLowerBound, duration) => (
      <p>
        Select the deployment you'd like to run{' '}
        <InlineTooltip
          description={
            isLowerBound
              ? `This is a lower bound estimate calculated ${duration}. The actual count may be higher and may have changed.`
              : `This count was calculated ${duration} and may have changed.`
          }
          variant="inline-help"
          className="[&_button]:invisible"
        >
          <span className="font-medium text-gray-700">
            {formatNumber(count, true)}
            {isLowerBound ? '+' : ''}{' '}
            {formatPlurals(count, { one: 'invocation', other: 'invocations' })}
          </span>
        </InlineTooltip>{' '}
        on, then resume execution.
      </p>
    ),
    alertType: 'info',
    alertContent:
      'Resumed invocations will continue execution from where they were paused.',
    progressTitle: 'Resuming invocations',
    emptyMessage:
      'No invocations match your criteria. Only paused invocations can be resumed.',
  },
  kill: {
    title: 'Kill Invocations',
    submitText: 'Kill',
    icon: IconName.Kill,
    iconClassName: 'text-red-400',
    submitVariant: 'destructive',
    description: (count, isLowerBound, duration) => (
      <p>
        Are you sure you want to kill{' '}
        <InlineTooltip
          description={
            isLowerBound
              ? `This is a lower bound estimate calculated ${duration}. The actual count may be higher and may have changed.`
              : `This count was calculated ${duration} and may have changed.`
          }
          variant="inline-help"
          className="[&_button]:invisible"
        >
          <span className="font-medium text-gray-700">
            {formatNumber(count, true)}
            {isLowerBound ? '+' : ''}{' '}
            {formatPlurals(count, { one: 'invocation', other: 'invocations' })}
          </span>
        </InlineTooltip>
        ?
      </p>
    ),
    alertType: 'warning',
    alertContent:
      'Killing immediately stops all calls in the invocation tree without executing compensation logic. This may leave your service in an inconsistent state. Only use as a last resort after trying other fixes.',
    progressTitle: 'Killing invocations',
    emptyMessage:
      'No invocations match your criteria. Only non-completed invocations can be killed.',
  },
  purge: {
    title: 'Purge Invocations',
    icon: IconName.Trash,
    iconClassName: 'text-red-400',
    submitText: 'Purge',
    submitVariant: 'destructive',
    description: (count, isLowerBound, duration) => (
      <p>
        Are you sure you want to purge{' '}
        <InlineTooltip
          description={
            isLowerBound
              ? `This is a lower bound estimate calculated ${duration}. The actual count may be higher and may have changed.`
              : `This count was calculated ${duration} and may have changed.`
          }
          variant="inline-help"
          className="[&_button]:invisible"
        >
          <span className="font-medium text-gray-700">
            {formatNumber(count, true)}
            {isLowerBound ? '+' : ''}{' '}
            {formatPlurals(count, { one: 'invocation', other: 'invocations' })}
          </span>
        </InlineTooltip>
        ?
      </p>
    ),
    alertType: 'info',
    alertContent:
      'After an invocation completes, it will be retained by Restate for some time, in order to introspect it and, in case of idempotent requests, to perform deduplication.',
    progressTitle: 'Purging invocations',
    emptyMessage:
      'No invocations match your criteria. Only completed invocations can be purged.',
  },
};

interface BatchOperationsContextValue {
  batchCancel: (params: BatchInvocationsRequestBody) => void;
  batchPause: (params: BatchInvocationsRequestBody) => void;
  batchResume: (params: BatchResumeInvocationsRequestBody) => void;
  batchKill: (params: BatchInvocationsRequestBody) => void;
  batchPurge: (params: BatchInvocationsRequestBody) => void;
}

const BatchOperationsContext =
  createContext<BatchOperationsContextValue | null>(null);

export function BatchOperationsProvider({
  children,
  batchSize = 40,
}: PropsWithChildren<{ batchSize?: number }>) {
  const [batchOpes, setBatchOpes] = useState([] as BatchState[]);

  const onProgress = useCallback(
    (id: string, response: BatchInvocationsResponse) => {
      setBatchOpes((old) => {
        return old.map((batch) => {
          if (batch.id === id) {
            if (
              response.failedInvocationIds &&
              response.failedInvocationIds?.length > 0
            ) {
              batch.failedInvocationIds.push(...response.failedInvocationIds);
            }
            return {
              ...batch,
              successful: batch.successful + response.successful,
              failed: batch.failed + response.failed,
            };
          } else {
            return batch;
          }
        });
      });
    },
    [],
  );

  const onOpenChange = useCallback((id: string, isOpen: boolean) => {
    setBatchOpes((old) => {
      if (!isOpen) {
        return old.filter((batch) => batch.id !== id);
      }
      return old.map((batch) => {
        if (batch.id === id) {
          return {
            ...batch,
            isDialogOpen: isOpen,
          };
        } else {
          return batch;
        }
      });
    });
  }, []);

  const batchCancel = useCallback(
    (params: { invocationIds: string[] } | { filters: FilterItem[] }) => {
      const id = crypto.randomUUID();
      setBatchOpes((old) => [
        ...old,
        {
          id,
          type: 'cancel',
          params:
            'invocationIds' in params
              ? { invocationIds: params.invocationIds }
              : {
                  filters: [
                    ...params.filters,
                    {
                      field: 'status',
                      type: 'STRING_LIST',
                      operation: 'NOT_IN',
                      value: ['completed'],
                    },
                  ],
                },
          failed: 0,
          failedInvocationIds: [],
          successful: 0,
          isDialogOpen: true,
        },
      ]);
    },
    [],
  );
  const batchPause = useCallback(
    (params: { invocationIds: string[] } | { filters: FilterItem[] }) => {
      const id = crypto.randomUUID();
      setBatchOpes((old) => [
        ...old,
        {
          id,
          type: 'pause',
          params:
            'invocationIds' in params
              ? { invocationIds: params.invocationIds }
              : {
                  filters: [
                    ...params.filters,
                    {
                      field: 'status',
                      type: 'STRING_LIST',
                      operation: 'NOT_IN',
                      value: [
                        'paused',
                        'ready',
                        'pending',
                        'suspended',
                        'scheduled',
                      ],
                    },
                  ],
                },
          failed: 0,
          failedInvocationIds: [],
          successful: 0,
          isDialogOpen: true,
        },
      ]);
    },
    [],
  );
  const batchKill = useCallback(
    (params: { invocationIds: string[] } | { filters: FilterItem[] }) => {
      const id = crypto.randomUUID();
      setBatchOpes((old) => [
        ...old,
        {
          id,
          type: 'kill',
          params:
            'invocationIds' in params
              ? { invocationIds: params.invocationIds }
              : {
                  filters: [
                    ...params.filters,
                    {
                      field: 'status',
                      type: 'STRING_LIST',
                      operation: 'NOT_IN',
                      value: ['completed'],
                    },
                  ],
                },
          failed: 0,
          failedInvocationIds: [],
          successful: 0,
          isDialogOpen: true,
        },
      ]);
    },
    [],
  );
  const batchPurge = useCallback(
    (params: { invocationIds: string[] } | { filters: FilterItem[] }) => {
      const id = crypto.randomUUID();
      setBatchOpes((old) => [
        ...old,
        {
          id,
          type: 'purge',
          params:
            'invocationIds' in params
              ? { invocationIds: params.invocationIds }
              : {
                  filters: [
                    ...params.filters,
                    {
                      field: 'status',
                      type: 'STRING',
                      operation: 'EQUALS',
                      value: 'completed',
                    },
                  ],
                },
          failed: 0,
          failedInvocationIds: [],
          successful: 0,
          isDialogOpen: true,
        },
      ]);
    },
    [],
  );
  const batchResume = useCallback(
    (
      params:
        | { invocationIds: string[]; deployment?: 'keep' | 'latest' }
        | { filters: FilterItem[]; deployment?: 'keep' | 'latest' },
    ) => {
      const id = crypto.randomUUID();
      setBatchOpes((old) => [
        ...old,
        {
          id,
          type: 'resume',
          params:
            'invocationIds' in params
              ? { invocationIds: params.invocationIds }
              : {
                  filters: [
                    ...params.filters,
                    {
                      field: 'status',
                      type: 'STRING',
                      operation: 'EQUALS',
                      value: 'paused',
                    },
                  ],
                },
          failed: 0,
          failedInvocationIds: [],
          successful: 0,
          isDialogOpen: true,
        },
      ]);
    },
    [],
  );

  return (
    <BatchOperationsContext.Provider
      value={{
        batchCancel,
        batchKill,
        batchPause,
        batchPurge,
        batchResume,
      }}
    >
      {children}
      {batchOpes.map((batch) => (
        <BatchConfirmation
          key={batch.id}
          onProgress={onProgress.bind(null, batch.id)}
          onOpenChange={onOpenChange.bind(null, batch.id)}
          state={batch}
          batchSize={batchSize}
        />
      ))}
    </BatchOperationsContext.Provider>
  );
}

function useBatchMutation(
  type: OperationType,
  batchSize: number,
  onProgress: (response: BatchInvocationsResponse) => void,
  onOpenChange: (isOpen: boolean) => void,
) {
  const cancelMutation = useBatchCancelInvocations(batchSize, {
    onProgress,
    onSuccess(data, variables, onMutateResult, context) {
      if (data?.failed === 0) {
        showSuccessNotification(
          `Successfully cancelled ${formatNumber(data.successful)} invocation${data.successful !== 1 ? 's' : ''}`,
        );
        onOpenChange(false);
      }
    },
  });

  const pauseMutation = useBatchPauseInvocations(batchSize, {
    onProgress,
    onSuccess(data, variables, onMutateResult, context) {
      if (data?.failed === 0) {
        showSuccessNotification(
          `Successfully paused ${formatNumber(data.successful)} invocation${data.successful !== 1 ? 's' : ''}`,
        );
        onOpenChange(false);
      }
    },
  });

  const resumeMutation = useBatchResumeInvocations(batchSize, {
    onProgress,
    onSuccess(data, variables, onMutateResult, context) {
      if (data?.failed === 0) {
        showSuccessNotification(
          `Successfully resumed ${formatNumber(data.successful)} invocation${data.successful !== 1 ? 's' : ''}`,
        );
        onOpenChange(false);
      }
    },
  });

  const killMutation = useBatchKillInvocations(batchSize, {
    onProgress,
    onSuccess(data, variables, onMutateResult, context) {
      if (data?.failed === 0) {
        showSuccessNotification(
          `Successfully killed ${formatNumber(data.successful)} invocation${data.successful !== 1 ? 's' : ''}`,
        );
        onOpenChange(false);
      }
    },
  });

  const purgeMutation = useBatchPurgeInvocations(batchSize, {
    onProgress,
    onSuccess(data, variables, onMutateResult, context) {
      if (data?.failed === 0) {
        showSuccessNotification(
          `Successfully purged ${formatNumber(data.successful)} invocation${data.successful !== 1 ? 's' : ''}`,
        );
        onOpenChange(false);
      }
    },
  });

  switch (type) {
    case 'resume':
      return resumeMutation;
    case 'cancel':
      return cancelMutation;
    case 'kill':
      return killMutation;
    case 'pause':
      return pauseMutation;
    case 'purge':
      return purgeMutation;

    default:
      throw Error('not supported');
  }
}

function BatchOperationContent({
  count,
  isLowerBound,
  isCountLoading,
  config,
}: {
  count: number | undefined;
  isLowerBound: boolean | undefined;
  isCountLoading: boolean;
  config: OperationConfig;
}) {
  const [now, setNow] = useState(() => Date.now());

  const durationSinceLastSnapshot = useDurationSinceLastSnapshot();
  const { isPast, ...parts } = durationSinceLastSnapshot(now);
  const duration = formatDurations(parts);

  if (isCountLoading || count === undefined) {
    return (
      <div className="space-y-2">
        <div className="h-4 w-3/4 animate-pulse rounded bg-gray-300" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-gray-300" />
      </div>
    );
  }

  if (count === 0) {
    return (
      <div className="mt-2 flex gap-2 rounded-xl bg-blue-50 p-3 text-0.5xs text-blue-600">
        <Icon
          className="h-5 w-5 shrink-0 fill-blue-600 text-blue-100"
          name={IconName.Info}
        />
        <div className="flex flex-col gap-1">
          <span className="block font-semibold">No invocations found</span>
          <span className="block">{config.emptyMessage}</span>
        </div>
      </div>
    );
  }

  return (
    <div onMouseEnter={() => setNow(Date.now())}>
      {config.description(count, isLowerBound ?? false, `${duration} ago`)}
    </div>
  );
}

function BatchConfirmation({
  state,
  onOpenChange,
  batchSize,
  onProgress,
}: {
  state: BatchState;
  onOpenChange: (isOpen: boolean) => void;
  batchSize: number;
  onProgress: (response: BatchInvocationsResponse) => void;
}) {
  const mutation = useBatchMutation(
    state.type,
    batchSize,
    onProgress,
    onOpenChange,
  );

  const countInvocations = useCountInvocations(
    state.params && 'filters' in state.params ? state.params.filters : [],
    {
      enabled: state.params && 'filters' in state.params,
    },
  );

  const config = OPERATION_CONFIG[state.type];
  const { count, isLowerBound } =
    'invocationIds' in state.params
      ? { count: state.params.invocationIds.length, isLowerBound: false }
      : {
          count: countInvocations.data?.count,
          isLowerBound: countInvocations.data?.isLowerBound,
        };

  return (
    <SnapshotTimeProvider lastSnapshot={countInvocations.dataUpdatedAt}>
      <ConfirmationDialog
        open={state.isDialogOpen}
        onOpenChange={onOpenChange}
        title={config.title}
        icon={config.icon}
        iconClassName={config.iconClassName}
        description={
          <BatchOperationContent
            count={count}
            isLowerBound={isLowerBound}
            isCountLoading={countInvocations.isPending}
            config={config}
          />
        }
        alertType={count && count > 0 ? config.alertType : undefined}
        alertContent={count && count > 0 ? config.alertContent : undefined}
        submitText={config.submitText}
        submitVariant={config.submitVariant}
        isPending={countInvocations.isPending || count === undefined}
        error={countInvocations.error ?? mutation.error}
        isSubmitDisabled={count === 0}
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const selectedDeployment = formData.get('deployment') as
            | 'Keep'
            | 'Latest'
            | undefined;

          const params =
            state.type === 'resume'
              ? { ...state.params, deployment: selectedDeployment }
              : state.params;

          mutation.mutate({
            body: params as BatchInvocationsRequestBody,
          });
        }}
        footer={
          (mutation.isPending || mutation.isSuccess || mutation.isError) && (
            <div className="flex flex-col gap-3">
              {mutation.isPending && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Icon
                    name={IconName.Retry}
                    className="h-4 w-4 animate-spin"
                  />
                  Processing invocations...
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4">
                <div className="flex flex-col">
                  <span className="text-sm text-gray-500">Successful</span>
                  <span className="text-2xl font-semibold text-green-600">
                    {state.successful}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-gray-500">Failed</span>
                  <span className="text-2xl font-semibold text-red-600">
                    {state.failed}
                  </span>
                </div>
              </div>

              {mutation.isSuccess && state.failed > 0 && (
                <div className="flex items-center gap-2 text-sm text-amber-600">
                  <Icon name={IconName.TriangleAlert} className="h-4 w-4" />
                  Operation completed with {state.failed}{' '}
                  {formatPlurals(state.failed, {
                    one: 'failure',
                    other: 'failures',
                  })}
                </div>
              )}
              <ErrorBanner error={mutation.error || countInvocations.error} />
            </div>
          )
        }
      >
        {state.type === 'resume' && count && count > 0 && (
          <div className="mt-4">
            <FormFieldSelect
              label="Deployment"
              placeholder="Select deployment"
              name="deployment"
              defaultValue="Keep"
              required
              disabled={mutation.isPending}
            >
              <Option value="Keep">Current deployment</Option>
              <Option value="Latest">Latest deployment</Option>
            </FormFieldSelect>
          </div>
        )}
      </ConfirmationDialog>
    </SnapshotTimeProvider>
  );
}

export function useBatchOperations() {
  const context = use(BatchOperationsContext);

  if (!context) {
    throw new Error(
      'useBatchOperations must be used within a BatchOperationsProvider',
    );
  }

  return context;
}
