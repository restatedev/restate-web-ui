import {
  createContext,
  PropsWithChildren,
  useCallback,
  useState,
  use,
} from 'react';
import type {
  BatchInvocationsRequestBody,
  BatchResumeInvocationsRequestBody,
  BatchInvocationsResponse,
  FilterItem,
} from '@restate/data-access/admin-api/spec';
import { showProgressNotification } from '@restate/ui/notification';
import {
  formatNumber,
  formatPercentageWithoutFraction,
  formatPlurals,
} from '@restate/util/intl';
import { useBeforeUnload } from 'react-router';
import { Ellipsis } from '@restate/ui/loading';
import { BatchState } from './types';
import { ProgressStore } from './ProgressStore';
import { NotificationProgressTracker } from './NotificationProgressTracker';
import { BatchOperationDialog } from './BatchOperationDialog';
import { OPERATION_CONFIG } from './config';
import { MAX_FAILED_INVOCATIONS } from './BatchProgressBar';
import { QueryClauseSchema, QueryClauseType } from '@restate/ui/query-builder';

interface BatchOperationsContextValue {
  batchCancel: (
    params: BatchInvocationsRequestBody,
    schema?: QueryClauseSchema<QueryClauseType>[],
  ) => void;
  batchPause: (
    params: BatchInvocationsRequestBody,
    schema?: QueryClauseSchema<QueryClauseType>[],
  ) => void;
  batchResume: (
    params: BatchResumeInvocationsRequestBody,
    schema?: QueryClauseSchema<QueryClauseType>[],
  ) => void;
  batchKill: (
    params: BatchInvocationsRequestBody,
    schema?: QueryClauseSchema<QueryClauseType>[],
  ) => void;
  batchPurge: (
    params: BatchInvocationsRequestBody,
    schema?: QueryClauseSchema<QueryClauseType>[],
  ) => void;
  batchRestartAsNew: (
    params: BatchInvocationsRequestBody,
    schema?: QueryClauseSchema<QueryClauseType>[],
  ) => void;
}

const BatchOperationsContext =
  createContext<BatchOperationsContextValue | null>(null);

export function BatchOperationsProvider({
  children,
  batchSize = 1000,
}: PropsWithChildren<{ batchSize?: number }>) {
  const [batchOpes, setBatchOpes] = useState([] as BatchState[]);
  const hasPendingOps = batchOpes.some(
    (batch) => !batch.progressStore.getSnapshot()?.isFinished,
  );

  useBeforeUnload(
    useCallback(
      (event) => {
        if (hasPendingOps) {
          event.preventDefault();
        }
      },
      [hasPendingOps],
    ),
  );

  const onProgress = useCallback(
    (id: string, response: BatchInvocationsResponse) => {
      const batch = batchOpes.find((batch) => batch.id === id);
      if (batch) {
        let updatedFailedInvocationIds =
          batch.progressStore.getSnapshot()?.failedInvocationIds ?? [];

        if (
          response.failedInvocationIds &&
          response.failedInvocationIds?.length > 0
        ) {
          updatedFailedInvocationIds = [
            ...updatedFailedInvocationIds,
            ...response.failedInvocationIds,
          ];

          if (updatedFailedInvocationIds.length > MAX_FAILED_INVOCATIONS) {
            updatedFailedInvocationIds = updatedFailedInvocationIds.slice(
              -MAX_FAILED_INVOCATIONS,
            );
          }
        }

        batch.progressStore.update({
          successful:
            (batch.progressStore.getSnapshot()?.successful || 0) +
            response.successful,
          failed:
            (batch.progressStore.getSnapshot()?.failed || 0) + response.failed,
          failedInvocationIds: updatedFailedInvocationIds,
          isFinished: response.hasMore !== true,
          isError: false,
        });
      }
    },
    [batchOpes],
  );

  const onOpenChange = useCallback(
    (id: string, isOpen: boolean, isCompleted: boolean) => {
      setBatchOpes((old) => {
        if (!isOpen && isCompleted) {
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
      if (!isCompleted && !isOpen) {
        const batch = batchOpes.find((b) => b.id === id);
        if (batch) {
          const config = OPERATION_CONFIG[batch.type];
          const { hide } = showProgressNotification(
            <div className="flex items-center gap-2">
              <NotificationProgressTracker
                batch={batch}
                onClose={() => hide()}
                onExpand={() => {
                  setBatchOpes((old) => {
                    return old.map((batch) => {
                      if (batch.id === id) {
                        return {
                          ...batch,
                          isDialogOpen: true,
                        };
                      } else {
                        return batch;
                      }
                    });
                  });
                }}
                inProgressContent={({
                  successful = 0,
                  failed = 0,
                  total = 1,
                }) => (
                  <span className="">
                    <Ellipsis>{config.progressTitle}</Ellipsis>
                    <span className="ml-2 inline-block font-medium">
                      {formatPercentageWithoutFraction(
                        (successful + failed) /
                          (Math.max(successful + failed, total, 1) *
                            (!isCompleted ? 1.01 : 1)),
                      )}
                    </span>{' '}
                    (
                    <span className="">
                      {formatNumber(successful)}{' '}
                      <span className="text-xs font-normal opacity-80">
                        succeeded
                      </span>
                    </span>
                    {failed > 0 && (
                      <>
                        <span className="mx-1 inline-block h-4 w-px translate-y-1 bg-sky-800/40" />
                        <span className="">
                          {formatNumber(failed)}{' '}
                          <span className="text-xs font-normal opacity-80">
                            failed
                          </span>
                        </span>
                      </>
                    )}
                    )
                  </span>
                )}
                finishedContent={({ successful, failed }) => (
                  <span>
                    {config.completedText}{' '}
                    <span className="font-medium">{successful}</span>{' '}
                    {formatPlurals(successful, {
                      one: 'invocation',
                      other: 'invocations',
                    })}{' '}
                    successfully
                    {failed > 0 ? (
                      <>
                        , while <span className="font-medium">{failed}</span>{' '}
                        {formatPlurals(failed, {
                          one: 'has',
                          other: 'have',
                        })}{' '}
                        failed.
                      </>
                    ) : (
                      '.'
                    )}
                  </span>
                )}
              />
            </div>,
          );
        }
      }
    },
    [batchOpes],
  );

  const batchCancel = useCallback(
    (
      params: { invocationIds: string[] } | { filters: FilterItem[] },
      schema?: QueryClauseSchema<QueryClauseType>[],
    ) => {
      const id = crypto.randomUUID();
      const progressStore = new ProgressStore({
        failed: 0,
        failedInvocationIds: [],
        successful: 0,
        isFinished: false,
        total: 0,
        isError: false,
      });
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
                      isActionImplicitFilter: true,
                    },
                  ],
                  schema,
                },
          progressStore,
          isDialogOpen: true,
        },
      ]);
    },
    [],
  );
  const batchRestartAsNew = useCallback(
    (
      params: { invocationIds: string[] } | { filters: FilterItem[] },
      schema?: QueryClauseSchema<QueryClauseType>[],
    ) => {
      const id = crypto.randomUUID();
      const progressStore = new ProgressStore({
        failed: 0,
        failedInvocationIds: [],
        successful: 0,
        isFinished: false,
        total: 0,
        isError: false,
      });
      setBatchOpes((old) => [
        ...old,
        {
          id,
          type: 'restart-as-new',
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
                      isActionImplicitFilter: true,
                    },
                  ],
                  schema,
                },
          progressStore,
          isDialogOpen: true,
        },
      ]);
    },
    [],
  );
  const batchPause = useCallback(
    (
      params: { invocationIds: string[] } | { filters: FilterItem[] },
      schema?: QueryClauseSchema<QueryClauseType>[],
    ) => {
      const id = crypto.randomUUID();
      const progressStore = new ProgressStore({
        failed: 0,
        failedInvocationIds: [],
        successful: 0,
        isFinished: false,
        total: 0,
        isError: false,
      });
      setBatchOpes((old) => [
        ...old,
        {
          id,
          type: 'pause',
          params:
            'invocationIds' in params
              ? { invocationIds: params.invocationIds }
              : {
                  schema,
                  filters: [
                    ...params.filters,
                    {
                      field: 'status',
                      type: 'STRING_LIST',
                      operation: 'NOT_IN',
                      isActionImplicitFilter: true,
                      value: [
                        'paused',
                        'ready',
                        'pending',
                        'suspended',
                        'scheduled',
                        'completed',
                      ],
                    },
                  ],
                },
          progressStore,
          isDialogOpen: true,
        },
      ]);
    },
    [],
  );
  const batchKill = useCallback(
    (
      params: { invocationIds: string[] } | { filters: FilterItem[] },
      schema?: QueryClauseSchema<QueryClauseType>[],
    ) => {
      const id = crypto.randomUUID();
      const progressStore = new ProgressStore({
        failed: 0,
        failedInvocationIds: [],
        successful: 0,
        isFinished: false,
        total: 0,
        isError: false,
      });
      setBatchOpes((old) => [
        ...old,
        {
          id,
          type: 'kill',
          params:
            'invocationIds' in params
              ? { invocationIds: params.invocationIds }
              : {
                  schema,
                  filters: [
                    ...params.filters,
                    {
                      field: 'status',
                      type: 'STRING_LIST',
                      operation: 'NOT_IN',
                      value: ['completed'],
                      isActionImplicitFilter: true,
                    },
                  ],
                },
          progressStore,
          isDialogOpen: true,
        },
      ]);
    },
    [],
  );
  const batchPurge = useCallback(
    (
      params: { invocationIds: string[] } | { filters: FilterItem[] },
      schema?: QueryClauseSchema<QueryClauseType>[],
    ) => {
      const id = crypto.randomUUID();
      const progressStore = new ProgressStore({
        failed: 0,
        failedInvocationIds: [],
        successful: 0,
        isFinished: false,
        total: 0,
        isError: false,
      });
      setBatchOpes((old) => [
        ...old,
        {
          id,
          type: 'purge',
          params:
            'invocationIds' in params
              ? { invocationIds: params.invocationIds }
              : {
                  schema,
                  filters: [
                    ...params.filters,
                    {
                      field: 'status',
                      type: 'STRING',
                      operation: 'EQUALS',
                      value: 'completed',
                      isActionImplicitFilter: true,
                    },
                  ],
                },
          progressStore,
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
      schema?: QueryClauseSchema<QueryClauseType>[],
    ) => {
      const id = crypto.randomUUID();
      const progressStore = new ProgressStore({
        failed: 0,
        failedInvocationIds: [],
        successful: 0,
        isFinished: false,
        total: 0,
        isError: false,
      });
      setBatchOpes((old) => [
        ...old,
        {
          id,
          type: 'resume',
          params:
            'invocationIds' in params
              ? { invocationIds: params.invocationIds }
              : {
                  schema,
                  filters: [
                    ...params.filters,
                    {
                      field: 'status',
                      type: 'STRING',
                      operation: 'EQUALS',
                      value: 'paused',
                      isActionImplicitFilter: true,
                    },
                  ],
                },
          progressStore,
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
        batchRestartAsNew,
      }}
    >
      {children}
      {batchOpes.map((batch) => (
        <BatchOperationDialog
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

export function useBatchOperations() {
  const context = use(BatchOperationsContext);

  if (!context) {
    throw new Error(
      'useBatchOperations must be used within a BatchOperationsProvider',
    );
  }

  return context;
}
