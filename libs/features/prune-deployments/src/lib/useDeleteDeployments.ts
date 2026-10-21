import { adminApi, useAdminBaseUrl } from '@restate/data-access-admin-api';
import {
  invalidateListServices,
  useBulkDeleteDeployments,
} from '@restate/data-access-admin-api-hooks';
import { useRestateContext } from '@restate/features-restate-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

export type FailedDeployment = { deploymentId: string; error: string };

export type DeleteDeploymentsProgress = {
  deploymentIds: string[];
  successfulDeploymentIds: string[];
  pendingDeploymentIds: string[];
  failedCount: number;
  failedDeployments: FailedDeployment[];
  error: Error | null;
};

const BULK_DELETE_MIN_VERSION = '1.8.1';
const BULK_DELETE_MAX_DEPLOYMENTS = 1000;

function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export function useDeleteDeployments() {
  const baseUrl = useAdminBaseUrl();
  const queryClient = useQueryClient();
  const { isVersionGte } = useRestateContext();
  const supportsBulkDelete = isVersionGte?.(BULK_DELETE_MIN_VERSION) ?? false;
  const deleteDeploymentOptions = adminApi(
    'mutate',
    '/deployments/{deployment}',
    'delete',
    {
      baseUrl,
    },
  );
  const [progress, setProgress] = useState<DeleteDeploymentsProgress | null>(
    null,
  );

  const settleDeployments = useCallback(
    (
      successfulDeploymentIds: string[],
      failedDeployments: FailedDeployment[],
    ) => {
      const settledDeploymentIds = new Set([
        ...successfulDeploymentIds,
        ...failedDeployments.map(({ deploymentId }) => deploymentId),
      ]);

      setProgress((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          pendingDeploymentIds: current.pendingDeploymentIds.filter(
            (id) => !settledDeploymentIds.has(id),
          ),
          successfulDeploymentIds: [
            ...current.successfulDeploymentIds,
            ...successfulDeploymentIds,
          ],
          failedCount: current.failedCount + failedDeployments.length,
          failedDeployments: [
            ...failedDeployments,
            ...current.failedDeployments,
          ],
        };
      });
    },
    [],
  );

  const deleteDeployment = useMutation({
    ...deleteDeploymentOptions,
    onSettled: (_data, error, variables) => {
      const deploymentId = variables.parameters?.path?.deployment;

      if (!deploymentId) {
        return;
      }

      if (error) {
        settleDeployments([], [{ deploymentId, error: toErrorMessage(error) }]);
      } else {
        settleDeployments([deploymentId], []);
      }
    },
  });

  const bulkDeleteDeployments = useBulkDeleteDeployments();

  const deleteOneByOne = async (deploymentIds: string[]) => {
    const results = await Promise.allSettled(
      deploymentIds.map(async (deploymentId) =>
        deleteDeployment.mutateAsync({
          parameters: {
            path: { deployment: deploymentId },
            query: { force: true },
          },
        }),
      ),
    );
    const failedCount = results.filter(
      (result) => result.status === 'rejected',
    ).length;

    if (failedCount < deploymentIds.length) {
      await invalidateListServices(queryClient, baseUrl);
    }

    return failedCount;
  };

  const deleteInBulk = async (deploymentIds: string[]) => {
    let failedCount = 0;

    for (
      let start = 0;
      start < deploymentIds.length;
      start += BULK_DELETE_MAX_DEPLOYMENTS
    ) {
      const batch = deploymentIds.slice(
        start,
        start + BULK_DELETE_MAX_DEPLOYMENTS,
      );

      try {
        const { succeeded = [], failed = [] } =
          (await bulkDeleteDeployments.mutateAsync({
            body: { deployment_ids: batch, force: true },
          })) ?? {};
        settleDeployments(
          succeeded,
          failed.map(({ deployment_id, error }) => ({
            deploymentId: deployment_id,
            error,
          })),
        );
        failedCount += failed.length;
      } catch (error) {
        settleDeployments(
          [],
          batch.map((deploymentId) => ({
            deploymentId,
            error: toErrorMessage(error),
          })),
        );
        failedCount += batch.length;
      }
    }

    return failedCount;
  };

  const mutation = useMutation({
    mutationKey: ['delete-deployments'],
    meta: deleteDeploymentOptions.meta,
    onMutate: (deploymentIds) => {
      setProgress({
        deploymentIds,
        successfulDeploymentIds: [],
        pendingDeploymentIds: [...deploymentIds],
        failedCount: 0,
        failedDeployments: [],
        error: null,
      });
    },
    mutationFn: async (deploymentIds: string[]) => ({
      failedCount: supportsBulkDelete
        ? await deleteInBulk(deploymentIds)
        : await deleteOneByOne(deploymentIds),
    }),
  });

  const reset = useCallback(() => {
    setProgress(null);
    mutation.reset();
  }, [mutation]);

  return {
    ...mutation,
    progress,
    reset,
  };
}
