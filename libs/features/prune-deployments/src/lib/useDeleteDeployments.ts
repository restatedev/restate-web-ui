import { adminApi, useAdminBaseUrl } from '@restate/data-access/admin-api';
import { useMutation } from '@tanstack/react-query';
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

function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export function useDeleteDeployments() {
  const baseUrl = useAdminBaseUrl();
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

  const deleteDeployment = useMutation({
    ...deleteDeploymentOptions,
    onSettled: (_data, error, variables) => {
      const deploymentId = variables.parameters?.path?.deployment;

      if (!deploymentId) {
        return;
      }

      setProgress((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          pendingDeploymentIds: current.pendingDeploymentIds.filter(
            (id) => id !== deploymentId,
          ),
          ...(error
            ? {
                failedCount: current.failedCount + 1,
                failedDeployments: [
                  { deploymentId, error: toErrorMessage(error) },
                  ...current.failedDeployments,
                ],
              }
            : {
                successfulDeploymentIds: [
                  ...current.successfulDeploymentIds,
                  deploymentId,
                ],
              }),
        };
      });
    },
  });

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
    mutationFn: async (deploymentIds: string[]) => {
      const results = await Promise.allSettled(
        deploymentIds.map(async (deploymentId) => {
          await deleteDeployment.mutateAsync({
            parameters: {
              path: { deployment: deploymentId },
              query: { force: true },
            },
          });
        }),
      );

      return {
        failedCount: results.filter((result) => result.status === 'rejected')
          .length,
      };
    },
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
