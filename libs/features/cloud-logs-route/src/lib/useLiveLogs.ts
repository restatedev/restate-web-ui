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

class LiveLogs {
  private _lines: LogLine[] = [];
  private shouldPull = false;
  private listeners: VoidFunction[] = [];
  private abortControllers: AbortController[] = [new AbortController()];
  public isPending = true;

  constructor(public num: number) {}

  private append(newLines: LogLine[] = []) {
    this._lines = [...this._lines, ...newLines];
  }

  getLines() {
    return this._lines;
  }

  subscribe(cb: VoidFunction) {
    this.listeners.push(cb);
  }

  start(
    accountId: string,
    environmentId: string,
    from: number,
    minInterval = MIN_INTERVAL_MS
  ) {
    this.shouldPull = true;
    this.pull(accountId, environmentId, from, minInterval)
      .next()
      .then((response) => {
        if (this.shouldPull) {
          this.start(
            accountId,
            environmentId,
            response.value?.end ?? from,
            minInterval
          );
        }
      });
  }

  unsubscribe(cb: VoidFunction) {
    this.shouldPull = false;
    this.listeners = this.listeners.filter((l) => l !== cb);
    for (const controller of this.abortControllers) {
      controller.abort();
    }
  }

  async *pull(
    accountId: string,
    environmentId: string,
    from: number,
    minInterval = MIN_INTERVAL_MS
  ): AsyncGenerator<
    { lines: LogLine[]; end: number },
    null,
    { lines: LogLine[]; end: number }
  > {
    await wait(minInterval - Date.now() + from);
    if (!this.shouldPull) {
      return null;
    }
    const end = Date.now();
    const start = from;
    const abortController = new AbortController();
    this.abortControllers.push(abortController);

    yield getEnvironmentLogs(
      {
        environmentId,
        accountId,
        start: start / 1000,
        end: end / 1000,
      },
      { signal: abortController.signal }
    ).then((res) => {
      this.abortControllers = this.abortControllers.filter(
        (a) => a !== abortController
      );
      this.append(res.data?.lines ?? []);
      this.listeners.forEach((cb) => {
        cb();
      });
      return { lines: this._lines, end };
    }) ?? [];

    yield* this.pull(accountId, environmentId, end, minInterval);
    return null;
  }
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
    const liveLogs = new LiveLogs(Math.random());
    const cb = () => {
      if (!ignore) {
        setResults(liveLogs.getLines());
      }
    };
    if (shouldStartPullingLogs) {
      liveLogs.subscribe(cb);
      liveLogs.start(accountId, environmentId, end);
    }

    return () => {
      ignore = true;
      liveLogs.unsubscribe(cb);
      setResults([]);
    };
  }, [accountId, environmentId, shouldStartPullingLogs, end]);

  return results;
}
