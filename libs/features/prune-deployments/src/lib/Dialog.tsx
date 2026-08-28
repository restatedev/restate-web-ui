import {
  useListDeployments,
  useListDrainedDeployments,
} from '@restate/data-access/admin-api-hooks';
import { Deployment, Warning } from '@restate/features/deployment';
import { Button, SubmitButton } from '@restate/ui/button';
import {
  DialogClose,
  DialogContent,
  DialogFooter,
  QueryDialog,
} from '@restate/ui/dialog';
import { ErrorBanner } from '@restate/ui/error';
import { Link } from '@restate/ui/link';
import { showSuccessNotification } from '@restate/ui/notification';
import { formatNumber, formatPlurals } from '@restate/util/intl';
import { tv } from '@restate/util/styles';
import { useQueryClient } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { Form, useSearchParams } from 'react-router';
import {
  DELETE_SELECTED_DEPLOYMENTS_QUERY,
  PRUNE_DRAINED_DEPLOYMENTS_QUERY,
} from './constants';
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

function removeDeleteSelectedDeploymentsQueryParam(prev: URLSearchParams) {
  prev.delete(DELETE_SELECTED_DEPLOYMENTS_QUERY);
  return prev;
}

function DeploymentListSkeleton() {
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

function DeploymentList({
  deploymentIds,
  visibleCount,
  onShowMore,
  listLabel,
}: {
  deploymentIds: string[];
  visibleCount: number;
  onShowMore: VoidFunction;
  listLabel: string;
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
            {formatNumber(deploymentIds.length)} {listLabel}{' '}
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
      {isOpen && (
        <DeleteDeploymentsDialogContent
          mode="drained"
          onSuccessClose={removeDialogQueryParam}
        />
      )}
    </QueryDialog>
  );
}

export function DeleteSelectedDeploymentsDialog({
  deploymentIds,
  onDeleted,
}: {
  deploymentIds: string[];
  onDeleted: VoidFunction;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const isOpen = searchParams.has(DELETE_SELECTED_DEPLOYMENTS_QUERY);

  const handleSuccess = () => {
    onDeleted();
    setSearchParams(removeDeleteSelectedDeploymentsQueryParam, {
      preventScrollReset: true,
    });
  };

  return (
    <QueryDialog query={DELETE_SELECTED_DEPLOYMENTS_QUERY}>
      {isOpen && (
        <DeleteDeploymentsDialogContent
          mode="selected"
          selectedDeploymentIds={deploymentIds}
          onSuccessClose={handleSuccess}
        />
      )}
    </QueryDialog>
  );
}

function DeleteDeploymentsDialogContent({
  mode,
  selectedDeploymentIds = [],
  onSuccessClose,
}: {
  mode: 'drained' | 'selected';
  selectedDeploymentIds?: string[];
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

  const isSelectedMode = mode === 'selected';
  const availableDeploymentIds = isSelectedMode
    ? selectedDeploymentIds
    : Array.from(drainedDeploymentIds);
  const isLoading = isDrainedPending || isDeploymentsPending;
  const loadError = drainedDeploymentsError ?? deploymentsError;
  const activeDeploymentIds = isSelectedMode
    ? availableDeploymentIds.filter(
        (deploymentId) => !drainedDeploymentIds.has(deploymentId),
      )
    : [];
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
        `Successfully deleted ${formatNumber(deletedCount)} ${isSelectedMode ? 'selected' : 'drained'} ${formatPlurals(
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
            {isSelectedMode
              ? 'Delete selected deployments'
              : 'Prune drained deployments'}
          </h3>
          {isLoading ? (
            <DeploymentListSkeleton />
          ) : loadError ? (
            <ErrorBanner error={loadError} />
          ) : !run ? (
            availableDeploymentIds.length === 0 ? (
              <p className="text-sm text-gray-500">
                {isSelectedMode
                  ? 'There are no selected deployments to delete.'
                  : 'There are no drained deployments to delete right now.'}
              </p>
            ) : (
              <>
                <p className="text-sm text-gray-500">
                  {isSelectedMode ? (
                    <>
                      Review the {formatNumber(availableDeploymentIds.length)}{' '}
                      selected{' '}
                      {formatPlurals(availableDeploymentIds.length, {
                        one: 'deployment',
                        other: 'deployments',
                      })}{' '}
                      below and confirm if you want to delete them.
                    </>
                  ) : (
                    <>
                      These {formatNumber(availableDeploymentIds.length)}{' '}
                      drained{' '}
                      {formatPlurals(availableDeploymentIds.length, {
                        one: 'deployment',
                        other: 'deployments',
                      })}{' '}
                      are no longer serving traffic. Review the list below and
                      confirm if you want to proceed.
                    </>
                  )}
                </p>
                {activeDeploymentIds.length > 0 && (
                  <Warning title="Active deployments selected">
                    {formatNumber(activeDeploymentIds.length)} selected{' '}
                    {formatPlurals(activeDeploymentIds.length, {
                      one: 'deployment is',
                      other: 'deployments are',
                    })}{' '}
                    active and may still be serving traffic. Deleting{' '}
                    {activeDeploymentIds.length === 1 ? 'it' : 'them'} might
                    break in-flight invocations. Use caution.{' '}
                    <Link
                      rel="noopener noreferrer"
                      target="_blank"
                      href="https://docs.restate.dev/services/versioning#removing-a-service"
                      className="text-orange-700 decoration-orange-700"
                    >
                      Learn more…
                    </Link>
                  </Warning>
                )}
                <DeploymentList
                  deploymentIds={availableDeploymentIds}
                  visibleCount={visibleCount}
                  listLabel={isSelectedMode ? 'selected' : 'drained'}
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
                  {isSelectedMode ? 'Delete deployments' : 'Prune deployments'}
                </SubmitButton>
              </div>
            </div>
          </Form>
        </DialogFooter>
      </div>
    </DialogContent>
  );
}
