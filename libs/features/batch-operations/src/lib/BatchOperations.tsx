import { createContext, PropsWithChildren, use } from 'react';
import {
  useBatchCancelInvocations,
  useBatchPauseInvocations,
  useBatchPurgeInvocations,
  useBatchKillInvocations,
  useBatchResumeInvocations,
} from '@restate/data-access/admin-api-hooks';

const BatchOperationsContext = createContext<{
  batchCancel?: ReturnType<typeof useBatchCancelInvocations>['mutate'];
  batchPause?: ReturnType<typeof useBatchPauseInvocations>['mutate'];
  batchPurge?: ReturnType<typeof useBatchPurgeInvocations>['mutate'];
  batchKill?: ReturnType<typeof useBatchKillInvocations>['mutate'];
  batchResume?: ReturnType<typeof useBatchResumeInvocations>['mutate'];
}>({});

export function BatchOperationsProvider({
  children,
  batchSize = 40,
}: PropsWithChildren<{ batchSize?: number }>) {
  const batchCancel = useBatchCancelInvocations(batchSize);
  const batchPause = useBatchPauseInvocations(batchSize);
  const batchPurge = useBatchPurgeInvocations(batchSize);
  const batchKill = useBatchKillInvocations(batchSize);
  const batchResume = useBatchResumeInvocations(batchSize);

  return (
    <BatchOperationsContext.Provider
      value={{
        batchCancel: batchCancel.mutate,
        batchKill: batchKill.mutate,
        batchPause: batchPause.mutate,
        batchPurge: batchPurge.mutate,
        batchResume: batchResume.mutate,
      }}
    >
      {children}
    </BatchOperationsContext.Provider>
  );
}

export function useBatchOperations() {
  return use(BatchOperationsContext);
}
