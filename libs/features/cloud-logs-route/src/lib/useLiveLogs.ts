import {
  useLoaderData,
  useNavigation,
  useSearchParams,
} from '@remix-run/react';
import {
  LogLine,
  getEnvironmentLogs,
} from '@restate/data-access/cloud/api-client';
import {
  useAccountParam,
  useEnvironmentParam,
} from '@restate/features/cloud/routes-utils';
import { useEffect, useState } from 'react';
import invariant from 'tiny-invariant';
import { clientLoader } from './loader';
import {
  LOGS_GRANULARITY_QUERY_PARAM_NAME,
  LogsGranularity,
} from './LogsGranularity';

const MIN_INTERVAL_MS = 5000;

async function wait(ms: number) {
  if (ms <= 0) {
    return Promise.resolve(true);
  }
  return new Promise((res) =>
    setTimeout(() => {
      res(true);
    }, ms)
  );
}

export function useLiveLogs() {
  const accountId = useAccountParam();
  const environmentId = useEnvironmentParam();
  invariant(accountId, 'Missing accountId param');
  invariant(environmentId, 'Missing environmentId param');
  const { state } = useNavigation();
  const [searchParams] = useSearchParams();
  const isIdle = state === 'idle';
  const isLiveLogsEnabled =
    searchParams.get(LOGS_GRANULARITY_QUERY_PARAM_NAME) ===
    LogsGranularity.Live;
  const shouldStartPullingLogs = isIdle && isLiveLogsEnabled;
  const { end } = useLoaderData<typeof clientLoader>();
  const [results, setResults] = useState<LogLine[]>([]);

  useEffect(() => {
    let ignore = false;
    let abortController = new AbortController();
    const pullLogs = (from: number) => {
      if (!ignore) {
        wait(MIN_INTERVAL_MS - Date.now() + from).then(() => {
          if (!ignore) {
            const end = Date.now();
            abortController = new AbortController();
            getEnvironmentLogs(
              {
                accountId,
                environmentId,
                start: from / 1000,
                end: end / 1000,
              },
              { signal: abortController.signal }
            ).then((result) => {
              if (!ignore && result.data) {
                setResults((lines) => [...lines, ...result.data.lines]);
                pullLogs(end);
              }
            });
          }
        });
      }
    };

    if (shouldStartPullingLogs) {
      pullLogs(end);
    }

    return () => {
      ignore = true;
      abortController.abort();
      setResults([]);
    };
  }, [accountId, environmentId, shouldStartPullingLogs, end]);

  return results;
}
