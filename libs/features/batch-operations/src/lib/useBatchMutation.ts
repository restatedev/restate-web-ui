import {
  useBatchCancelInvocations,
  useBatchPauseInvocations,
  useBatchPurgeInvocations,
  useBatchKillInvocations,
  useBatchResumeInvocations,
  useBatchRestateAsNewInvocations,
} from '@restate/data-access/admin-api-hooks';
import type { BatchInvocationsResponse } from '@restate/data-access/admin-api-spec';
import { showSuccessNotification } from '@restate/ui/notification';
import { formatNumber } from '@restate/util/intl';
import { OperationType } from './types';

export function useBatchMutation(
  type: OperationType,
  batchSize: number,
  onProgress: (response: BatchInvocationsResponse) => void,
  onOpenChange: (isOpen: boolean, canClose: boolean) => void,
  onError: VoidFunction,
) {
  const cancelMutation = useBatchCancelInvocations(batchSize, {
    onProgress,
    onSuccess(data, variables, onMutateResult, context) {
      if (data?.failed === 0) {
        showSuccessNotification(
          `Successfully cancelled ${formatNumber(data.successful)} invocation${data.successful !== 1 ? 's' : ''}`,
        );
        onOpenChange(false, true);
      }
    },
    onError(error, variables, onMutateResult, context) {
      onError?.();
    },
  });

  const pauseMutation = useBatchPauseInvocations(batchSize, {
    onProgress,
    onSuccess(data, variables, onMutateResult, context) {
      if (data?.failed === 0) {
        showSuccessNotification(
          `Successfully paused ${formatNumber(data.successful)} invocation${data.successful !== 1 ? 's' : ''}`,
        );
        onOpenChange(false, true);
      }
    },
    onError(error, variables, onMutateResult, context) {
      onError?.();
    },
  });

  const resumeMutation = useBatchResumeInvocations(batchSize, {
    onProgress,
    onSuccess(data, variables, onMutateResult, context) {
      if (data?.failed === 0) {
        showSuccessNotification(
          `Successfully resumed ${formatNumber(data.successful)} invocation${data.successful !== 1 ? 's' : ''}`,
        );
        onOpenChange(false, true);
      }
    },
    onError(error, variables, onMutateResult, context) {
      onError?.();
    },
  });

  const killMutation = useBatchKillInvocations(batchSize, {
    onProgress,
    onSuccess(data, variables, onMutateResult, context) {
      if (data?.failed === 0) {
        showSuccessNotification(
          `Successfully killed ${formatNumber(data.successful)} invocation${data.successful !== 1 ? 's' : ''}`,
        );
        onOpenChange(false, true);
      }
    },
    onError(error, variables, onMutateResult, context) {
      onError?.();
    },
  });
  const restartAsNewMutation = useBatchRestateAsNewInvocations(batchSize, {
    onProgress,
    onSuccess(data, variables, onMutateResult, context) {
      if (data?.failed === 0) {
        showSuccessNotification(
          `Successfully restarted ${formatNumber(data.successful)} invocation${data.successful !== 1 ? 's' : ''}`,
        );
        onOpenChange(false, true);
      }
    },
    onError(error, variables, onMutateResult, context) {
      onError?.();
    },
  });

  const purgeMutation = useBatchPurgeInvocations(batchSize, {
    onProgress,
    onSuccess(data, variables, onMutateResult, context) {
      if (data?.failed === 0) {
        showSuccessNotification(
          `Successfully purged ${formatNumber(data.successful)} invocation${data.successful !== 1 ? 's' : ''}`,
        );
        onOpenChange(false, true);
      }
    },
    onError(error, variables, onMutateResult, context) {
      onError?.();
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
    case 'restart-as-new':
      return restartAsNewMutation;

    default:
      throw Error('not supported');
  }
}
