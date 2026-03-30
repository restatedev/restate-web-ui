import { useEffect, useRef } from 'react';
import { useSqlQuery } from '@restate/data-access/admin-api-hooks';
import { RestateError } from '@restate/util/errors';
import { issueQueue } from './issue-queue';
function useQueryHealthQuery(status: string) {
  return useSqlQuery('SELECT 1 FROM sys_invocation LIMIT 1', {
    enabled: status === 'HEALTHY',
    refetchInterval: 60_000,
    retry: false,
  });
}

export function useQueryHealthStatus(status: string) {
  const { isError, isFetching } = useQueryHealthQuery(status);
  return { isError, isFetching };
}

export function QueryHealthCheck({ status }: { status: string }) {
  const { error, isError, isSuccess } = useQueryHealthQuery(status);
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
