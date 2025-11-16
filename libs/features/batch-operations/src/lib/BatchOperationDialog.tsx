import { useState, useEffect } from 'react';
import { useCountInvocations } from '@restate/data-access/admin-api-hooks';
import type {
  BatchInvocationsRequestBody,
  BatchInvocationsResponse,
} from '@restate/data-access/admin-api/spec';
import { ConfirmationDialog } from '@restate/ui/dialog';
import { Icon, IconName } from '@restate/ui/icons';
import { FormFieldSelect, Option } from '@restate/ui/form-field';
import {
  useDurationSinceLastSnapshot,
  SnapshotTimeProvider,
} from '@restate/util/snapshot-time';
import { formatDurations } from '@restate/util/intl';
import { BatchProgressBar } from './BatchProgressBar';
import { Button } from '@restate/ui/button';
import { BatchState } from './types';
import { useBatchMutation } from './useBatchMutation';
import { useProgress } from './useProgress';
import { OPERATION_CONFIG, OperationConfig } from './config';

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

export function BatchOperationDialog({
  state,
  onOpenChange,
  batchSize,
  onProgress,
}: {
  state: BatchState;
  onOpenChange: (isOpen: boolean, isCompleted: boolean) => void;
  batchSize: number;
  onProgress: (response: BatchInvocationsResponse) => void;
}) {
  const { reset, ...mutation } = useBatchMutation(
    state.type,
    batchSize,
    onProgress,
    onOpenChange,
    () => state.progressStore.update({ isError: true }),
  );
  const progress = useProgress(state.progressStore);

  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  const countInvocations = useCountInvocations(
    state.params && 'filters' in state.params ? state.params.filters : [],
    {
      enabled: state.params && 'filters' in state.params,
    },
  );

  useEffect(() => {
    if (countInvocations.data?.count) {
      state.progressStore.update({ total: countInvocations.data?.count });
    }
  }, [countInvocations.data?.count, state.progressStore]);

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
        onOpenChange={(isOpen) => onOpenChange(isOpen, !mutation.isPending)}
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
        closeText={mutation.isPending ? 'Minimize' : 'Close'}
        alertType={count && count > 0 ? config.alertType : undefined}
        alertContent={count && count > 0 ? config.alertContent : undefined}
        submitText={config.submitText}
        submitVariant={config.submitVariant}
        formMethod={config.formMethod}
        formAction={config.formAction}
        error={countInvocations.error ?? mutation.error}
        isSubmitDisabled={count === 0 || progress?.isFinished}
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
            id: state.id,
          });
        }}
        footer={
          (mutation.isPending || mutation.isSuccess || mutation.isError) && (
            <div className="flex flex-col gap-3">
              <div className="-translate-y-4 px-2">
                <BatchProgressBar
                  successful={progress?.successful || 0}
                  failed={progress?.failed || 0}
                  total={Math.max(
                    count || 0,
                    (progress?.successful || 0) + (progress?.failed || 0),
                  )}
                  isPending={mutation.isPending && !mutation.isPaused(state.id)}
                  failedInvocations={progress?.failedInvocationIds}
                  isCompleted={mutation.isSuccess}
                >
                  {mutation.isPending && (
                    <Button
                      className="rounded-md p-1"
                      variant="secondary"
                      onClick={() =>
                        mutation.isPaused(state.id)
                          ? mutation.resume(state.id)
                          : mutation.pause(state.id)
                      }
                    >
                      <Icon
                        name={
                          mutation.isPaused(state.id)
                            ? IconName.Resume
                            : IconName.Pause
                        }
                        className="h-4 w-4"
                      />
                    </Button>
                  )}
                </BatchProgressBar>
              </div>
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
