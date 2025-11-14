import { createContext, PropsWithChildren, useCallback, useState } from 'react';
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
  description: (count?: number, isLowerBound?: boolean) => string;
  warning: string;
  progressTitle: string;
}

const OPERATION_CONFIG: Record<OperationType, OperationConfig> = {
  cancel: {
    title: 'Cancel invocations',
    icon: IconName.Cancel,
    iconClassName: 'text-orange-400',
    submitVariant: 'destructive',
    description: (count, isLowerBound) =>
      count !== undefined
        ? `Are you sure you want to cancel ${isLowerBound ? 'at least ' : ''}${count} invocation${count !== 1 ? 's' : ''}?`
        : 'Are you sure you want to cancel these invocations?',
    warning:
      'This will terminate the execution of matching invocations. They will not be retried.',
    progressTitle: 'Cancelling invocations',
  },
  pause: {
    title: 'Pause invocations',
    icon: IconName.Pause,
    iconClassName: 'text-blue-400',
    submitVariant: 'primary',
    description: (count, isLowerBound) =>
      count !== undefined
        ? `Are you sure you want to pause ${isLowerBound ? 'at least ' : ''}${count} invocation${count !== 1 ? 's' : ''}?`
        : 'Are you sure you want to pause these invocations?',
    warning:
      'Paused invocations will stop executing until manually resumed or unpaused.',
    progressTitle: 'Pausing invocations',
  },
  resume: {
    title: 'Resume invocations',
    icon: IconName.Resume,
    iconClassName: 'text-green-400',
    submitVariant: 'primary',
    description: (count, isLowerBound) =>
      count !== undefined
        ? `Are you sure you want to resume ${isLowerBound ? 'at least ' : ''}${count} invocation${count !== 1 ? 's' : ''}?`
        : 'Are you sure you want to resume these invocations?',
    warning:
      'Resumed invocations will continue execution from where they were paused.',
    progressTitle: 'Resuming invocations',
  },
  kill: {
    title: 'Kill invocations',
    icon: IconName.Kill,
    iconClassName: 'text-red-400',
    submitVariant: 'destructive',
    description: (count, isLowerBound) =>
      count !== undefined
        ? `Are you sure you want to kill ${isLowerBound ? 'at least ' : ''}${count} invocation${count !== 1 ? 's' : ''}?`
        : 'Are you sure you want to kill these invocations?',
    warning:
      'This will forcefully terminate matching invocations. This action cannot be undone.',
    progressTitle: 'Killing invocations',
  },
  purge: {
    title: 'Purge invocations',
    icon: IconName.Trash,
    iconClassName: 'text-red-400',
    submitVariant: 'destructive',
    description: (count, isLowerBound) =>
      count !== undefined
        ? `Are you sure you want to purge ${isLowerBound ? 'at least ' : ''}${count} invocation${count !== 1 ? 's' : ''}?`
        : 'Are you sure you want to purge these invocations?',
    warning:
      'This will permanently delete matching invocations and their state. This action cannot be undone.',
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
) {
  const cancelMutation = useBatchCancelInvocations(batchSize, {
    onProgress,
  });

  const pauseMutation = useBatchPauseInvocations(batchSize, {
    onProgress,
  });

  const resumeMutation = useBatchResumeInvocations(batchSize, {
    onProgress,
  });

  const killMutation = useBatchKillInvocations(batchSize, {
    onProgress,
  });

  const purgeMutation = useBatchPurgeInvocations(batchSize, {
    onProgress,
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
  const mutation = useBatchMutation(state.type, batchSize, onProgress);

  const countInvocations = useCountInvocations(
    state.params && 'filters' in state.params ? state.params.filters : [],
    {
      enabled: state.params && 'filters' in state.params,
    },
  );

  return (
    <ConfirmationDialog
      open={state.isDialogOpen}
      onOpenChange={onOpenChange}
      title=""
      submitText=""
      description=""
      onSubmit={(e) => {
        e.preventDefault();
        return mutation.mutate({
          body: state.params,
        });
      }}
    />
  );
}
