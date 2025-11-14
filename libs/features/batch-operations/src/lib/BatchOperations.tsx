import {
  createContext,
  PropsWithChildren,
  useCallback,
  useState,
  use,
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
import { formatNumber } from '@restate/util/intl';
import { ErrorBanner } from '@restate/ui/error';
import { FormFieldSelect, Option } from '@restate/ui/form-field';

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
        | { invocationIds: string[]; deployment?: 'latest' | 'keep' }
        | { filters: FilterItem[]; deployment?: 'latest' | 'keep' };
    }
);

interface OperationConfig {
  title: string;
  icon: IconName;
  iconClassName: string;
  submitVariant: 'primary' | 'destructive';
  description: (count?: number) => string;
  warning: string;
  progressTitle: string;
}

const OPERATION_CONFIG: Record<OperationType, OperationConfig> = {
  cancel: {
    title: 'Cancel Invocations',
    icon: IconName.Cancel,
    iconClassName: 'text-red-400',
    submitVariant: 'destructive',
    description: (count) =>
      count !== undefined
        ? `Are you sure you want to cancel ${formatNumber(count)}+ invocations?`
        : 'Are you sure you want to cancel these invocations?',
    warning:
      'Cancellation frees held resources, cooperates with your handler code to roll back changes, and allows proper cleanup. It is non-blocking, so the call may return before cleanup finishes. In rare cases, cancellation may not take effect, retry the operation if needed.',
    progressTitle: 'Cancelling invocations',
  },
  pause: {
    title: 'Pause Invocations',
    icon: IconName.Pause,
    iconClassName: 'text-red-400',
    submitVariant: 'destructive',
    description: (count) =>
      count !== undefined
        ? `Are you sure you want to pause ${formatNumber(count)}+ invocations? The pause may not take effect right away.`
        : 'Are you sure you want to pause these invocations? The pause may not take effect right away.',
    warning:
      'Paused invocations will stop executing until manually resumed or unpaused.',
    progressTitle: 'Pausing invocations',
  },
  resume: {
    title: 'Resume Invocations',
    icon: IconName.Resume,
    iconClassName: 'text-green-400',
    submitVariant: 'primary',
    description: (count) =>
      count !== undefined
        ? `Select the deployment you'd like to run ${formatNumber(count)}+ invocations on, then resume execution.`
        : `Select the deployment you'd like to run these invocations on, then resume execution.`,
    warning:
      'Resumed invocations will continue execution from where they were paused.',
    progressTitle: 'Resuming invocations',
  },
  kill: {
    title: 'Kill Invocations',
    icon: IconName.Kill,
    iconClassName: 'text-red-400',
    submitVariant: 'destructive',
    description: (count) =>
      count !== undefined
        ? `Are you sure you want to kill ${formatNumber(count)}+ invocations?`
        : 'Are you sure you want to kill these invocations?',
    warning:
      'Killing immediately stops all calls in the invocation tree without executing compensation logic. This may leave your service in an inconsistent state. Only use as a last resort after trying other fixes.',
    progressTitle: 'Killing invocations',
  },
  purge: {
    title: 'Purge Invocations',
    icon: IconName.Trash,
    iconClassName: 'text-red-400',
    submitVariant: 'destructive',
    description: (count) =>
      count !== undefined
        ? `Are you sure you want to purge ${formatNumber(count)}+ invocations?`
        : 'Are you sure you want to purge these invocations?',
    warning:
      'After an invocation completes, it will be retained by Restate for some time, in order to introspect it and, in case of idempotent requests, to perform deduplication.',
    progressTitle: 'Purging invocations',
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
          params,
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
          params,
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
          params,
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
          params,
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
          params,
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
  const count =
    'invocationIds' in state.params
      ? state.params.invocationIds.length
      : countInvocations.data?.count;

  return (
    <ConfirmationDialog
      open={state.isDialogOpen}
      onOpenChange={onOpenChange}
      title={config.title}
      icon={config.icon}
      iconClassName={config.iconClassName}
      description={
        countInvocations.isPending
          ? 'Calculating affected invocations...'
          : config.description(count)
      }
      alertType="warning"
      alertContent={config.warning}
      submitText={config.title}
      submitVariant={config.submitVariant}
      isPending={countInvocations.isPending || count === undefined}
      error={countInvocations.error ?? mutation.error}
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const selectedDeployment = formData.get('deployment') as
          | 'keep'
          | 'latest'
          | undefined;

        const params =
          state.type === 'resume'
            ? { ...state.params, deployment: selectedDeployment }
            : state.params;

        mutation.mutate({
          body: params,
        });
      }}
      footer={
        (mutation.isPending || mutation.isSuccess || mutation.isError) && (
          <div className="flex flex-col gap-3">
            {mutation.isPending && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Icon name={IconName.Retry} className="h-4 w-4 animate-spin" />
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
                Operation completed with {state.failed} failure
                {state.failed !== 1 ? 's' : ''}
              </div>
            )}
            <ErrorBanner error={mutation.error || countInvocations.error} />
          </div>
        )
      }
    >
      {state.type === 'resume' &&
        !mutation.isPending &&
        !mutation.isSuccess && (
          <div className="mt-4">
            <FormFieldSelect
              label="Deployment"
              placeholder="Select deployment"
              name="deployment"
              defaultValue={'keep'}
              required
            >
              <Option value="keep">Current deployment</Option>
              <Option value="latest">Latest deployment</Option>
            </FormFieldSelect>
          </div>
        )}
    </ConfirmationDialog>
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
