import {
  useListDeployments,
  useListDrainedDeployments,
} from '@restate/data-access/admin-api-hooks';
import { Deployment } from '@restate/features/deployment';
import { Button, SubmitButton } from '@restate/ui/button';
import {
  DialogClose,
  DialogContent,
  DialogFooter,
  QueryDialog,
} from '@restate/ui/dialog';
import { ErrorBanner } from '@restate/ui/error';
import { showSuccessNotification } from '@restate/ui/notification';
import { formatNumber, formatPlurals } from '@restate/util/intl';
import { tv } from '@restate/util/styles';
import { useQueryClient } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { Form, useSearchParams } from 'react-router';
import { PRUNE_DRAINED_DEPLOYMENTS_QUERY } from './constants';
import { PruneDeploymentsProgressBar } from './PruneDeploymentsProgressBar';
import { useDeleteDeployments } from './useDeleteDeployments';

const INITIAL_VISIBLE_DEPLOYMENTS = 25;
const VISIBLE_DEPLOYMENTS_STEP = 25;

const footerActionsStyles = tv({
  base: 'grid grid-cols-2 gap-2',
});

function removePruneDeploymentsQueryParam(prev: URLSearchParams) {
  prev.delete(PRUNE_DRAINED_DEPLOYMENTS_QUERY);
  return prev;
}

function DrainedDeploymentListSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <div className="h-4 w-5/6 animate-pulse rounded-md bg-gray-200" />
        <div className="h-4 w-3/5 animate-pulse rounded-md bg-gray-200" />
      </div>
      <div className="max-h-80 overflow-auto rounded-2xl border border-black/10 bg-gray-200/50 p-1 shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)]">
        <div className="flex flex-col gap-1">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className="flex items-center gap-3 rounded-xl border border-black/10 bg-white p-2"
            >
              <div className="h-6 w-6 animate-pulse rounded-lg bg-gray-200" />
              <div className="h-5 w-2/5 animate-pulse rounded-md bg-gray-200" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DrainedDeploymentList({
  deploymentIds,
  visibleCount,
  onShowMore,
}: {
  deploymentIds: string[];
  visibleCount: number;
  onShowMore: VoidFunction;
}) {
  const visibleDeploymentIds = deploymentIds.slice(0, visibleCount);
  const hiddenCount = deploymentIds.length - visibleDeploymentIds.length;
  const nextCount = Math.min(VISIBLE_DEPLOYMENTS_STEP, hiddenCount);

  return (
    <div className="flex flex-col gap-2">
      <div className="max-h-80 overflow-auto rounded-2xl border border-black/10 bg-gray-200/50 p-1 shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)]">
        <div className="flex flex-col gap-1">
          {visibleDeploymentIds.map((deploymentId) => (
            <div
              key={deploymentId}
              className="rounded-xl border border-black/10 bg-white p-2"
            >
              <Deployment
                deploymentId={deploymentId}
                showLink={false}
                highlightSelection={false}
              />
            </div>
          ))}
        </div>
      </div>
      {hiddenCount > 0 && (
        <div className="flex items-center justify-between gap-4 text-0.5xs text-gray-500">
          <span>
            Showing {formatNumber(visibleDeploymentIds.length)} of{' '}
            {formatNumber(deploymentIds.length)} drained{' '}
            {formatPlurals(deploymentIds.length, {
              one: 'deployment',
              other: 'deployments',
            })}
          </span>
          <Button
            variant="icon"
            className="px-3 py-1 text-0.5xs"
            onClick={onShowMore}
          >
            Show {formatNumber(nextCount)} more
          </Button>
        </div>
      )}
    </div>
  );
}

export function PruneDrainedDeploymentsDialog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const isOpen = searchParams.has(PRUNE_DRAINED_DEPLOYMENTS_QUERY);

  const removeDialogQueryParam = () => {
    setSearchParams(removePruneDeploymentsQueryParam, {
      preventScrollReset: true,
    });
  };

  return (
    <QueryDialog query={PRUNE_DRAINED_DEPLOYMENTS_QUERY}>
      <PruneDrainedDeploymentsDialogContent
        key={String(isOpen)}
        onSuccessClose={removeDialogQueryParam}
      />
    </QueryDialog>
  );
}

function PruneDrainedDeploymentsDialogContent({
  onSuccessClose,
}: {
  onSuccessClose: VoidFunction;
}) {
  const queryClient = useQueryClient();
  const {
    data: drainedDeploymentIds = new Set(),
    isPending: isDrainedPending,
    error: drainedDeploymentsError,
    queryKey: drainedQueryKey,
  } = useListDrainedDeployments({
    refetchOnMount: 'always',
  });
  const {
    isPending: isDeploymentsPending,
    error: deploymentsError,
    queryKey: deploymentsQueryKey,
  } = useListDeployments({
    refetchOnMount: 'always',
  });
  const deleteDeployments = useDeleteDeployments();
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_DEPLOYMENTS);

  const availableDeploymentIds = Array.from(drainedDeploymentIds);
  const isLoading = isDrainedPending || isDeploymentsPending;
  const loadError = drainedDeploymentsError ?? deploymentsError;
  const run = deleteDeployments.progress;
  const isRunning = deleteDeployments.isPending;
  const total = run ? run.deploymentIds.length : availableDeploymentIds.length;
  const canSubmit =
    !run && !isLoading && !loadError && availableDeploymentIds.length > 0;

  const submitHandler = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = await deleteDeployments.mutateAsync(availableDeploymentIds);

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: deploymentsQueryKey }),
      queryClient.invalidateQueries({ queryKey: drainedQueryKey }),
    ]);

    if (result.failedCount === 0) {
      const deletedCount = availableDeploymentIds.length;

      showSuccessNotification(
        `Successfully deleted ${formatNumber(deletedCount)} drained ${formatPlurals(
          deletedCount,
          {
            one: 'deployment',
            other: 'deployments',
          },
        )}`,
      );
      onSuccessClose();
    }
  };

  return (
    <DialogContent className="max-w-2xl" isDismissable={!isRunning}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Prune drained deployments
          </h3>
          {isLoading ? (
            <DrainedDeploymentListSkeleton />
          ) : loadError ? (
            <ErrorBanner error={loadError} />
          ) : !run ? (
            availableDeploymentIds.length === 0 ? (
              <p className="text-sm text-gray-500">
                There are no drained deployments to delete right now.
              </p>
            ) : (
              <>
                <p className="text-sm text-gray-500">
                  These {formatNumber(availableDeploymentIds.length)} drained{' '}
                  {formatPlurals(availableDeploymentIds.length, {
                    one: 'deployment',
                    other: 'deployments',
                  })}{' '}
                  are no longer serving traffic. Review the list below and
                  confirm if you want to proceed.
                </p>
                <DrainedDeploymentList
                  deploymentIds={availableDeploymentIds}
                  visibleCount={visibleCount}
                  onShowMore={() =>
                    setVisibleCount((count) => count + VISIBLE_DEPLOYMENTS_STEP)
                  }
                />
              </>
            )
          ) : (
            <PruneDeploymentsProgressBar
              successful={run.successfulDeploymentIds.length}
              failed={run.failedCount}
              total={total}
              isPending={isRunning}
              failedDeployments={run.failedDeployments}
            />
          )}
        </div>
        <DialogFooter>
          <Form onSubmit={submitHandler}>
            <div className="flex flex-col gap-2">
              {run?.error && <ErrorBanner error={run.error} />}
              <div className={footerActionsStyles()}>
                <DialogClose>
                  <Button variant="secondary" disabled={isRunning} autoFocus>
                    Close
                  </Button>
                </DialogClose>
                <SubmitButton
                  variant="destructive"
                  isPending={isRunning}
                  disabled={!canSubmit}
                >
                  Prune deployments
                </SubmitButton>
              </div>
            </div>
          </Form>
        </DialogFooter>
      </div>
    </DialogContent>
  );
}
