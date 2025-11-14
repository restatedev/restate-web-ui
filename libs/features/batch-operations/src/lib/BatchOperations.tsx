import { createContext, PropsWithChildren, use } from 'react';
import {
  useBatchCancelInvocations,
  useBatchPauseInvocations,
  useBatchPurgeInvocations,
  useBatchKillInvocations,
  useBatchResumeInvocations,
} from '@restate/data-access/admin-api-hooks';

const BatchOperationsContext = createContext<{
  batchCancel?: ReturnType<typeof useBatchCancelInvocations>;
  batchPause?: ReturnType<typeof useBatchPauseInvocations>;
  batchPurge?: ReturnType<typeof useBatchPurgeInvocations>;
  batchKill?: ReturnType<typeof useBatchKillInvocations>;
  batchResume?: ReturnType<typeof useBatchResumeInvocations>;
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
        batchCancel,
        batchKill,
        batchPause,
        batchPurge,
        batchResume,
      }}
    >
      {children}
    </BatchOperationsContext.Provider>
  );
}

export function useBatchOperations() {
  return use(BatchOperationsContext);
}
