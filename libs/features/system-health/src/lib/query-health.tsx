import { useEffect, useRef } from 'react';
import { useSqlQuery } from '@restate/data-access/admin-api-hooks';
import { issueQueue } from './issue-queue';
import { RestateError } from '@restate/util/errors';
import { useRestateContext } from '@restate/features/restate-context';

function useQueryHealthQuery() {
  const { status } = useRestateContext();
  return useSqlQuery('SELECT 1 FROM sys_invocation LIMIT 1', {
    enabled: status === 'HEALTHY',
    refetchInterval: 60_000,
    retry: false,
  });
}

export function useQueryHealthStatus() {
  const { isError, isFetching } = useQueryHealthQuery();
  return { isError, isFetching };
}

export function QueryHealthCheck() {
  const { error, isError, isSuccess } = useQueryHealthQuery();
  const keyRef = useRef<string | null>(null);

  useEffect(() => {
    if (isError && error && !keyRef.current) {
      const restateError =
        error instanceof RestateError
          ? error
          : new RestateError(
              error instanceof Error ? error.message : String(error),
              undefined,
              true,
              error instanceof Error ? error.stack : undefined,
            );
      keyRef.current = issueQueue.add({
        severity: 'high',
        label:
          'Cannot retrieve invocation data — some dashboard features may not work as expected',
        details: restateError,
      });
    } else if (isSuccess && keyRef.current) {
      issueQueue.close(keyRef.current);
      keyRef.current = null;
    }
  }, [isError, isSuccess, error]);

  useEffect(() => {
    return () => {
      if (keyRef.current) {
        issueQueue.close(keyRef.current);
        keyRef.current = null;
      }
    };
  }, []);

  return null;
}
