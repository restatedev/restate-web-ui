import type { QueryClient, QueryCacheNotifyEvent } from '@tanstack/react-query';
import {
  getInvocationStatusBreakdownV2,
  isQueryForPath,
  isQueryHealthCheckQuery,
  mergeInvocationSummaryBreakdowns,
} from '@restate/data-access/admin-api-hooks';
import { isOverviewRefreshQuery } from '@restate/data-access/admin-api';
import type { components } from '@restate/data-access/admin-api-spec';
import { issueQueue } from './issue-queue';
import { getGlobalIssues } from './service-issues';
import { RestateError } from '@restate/util/errors';

interface AdditionalObserver {
  match: (event: QueryCacheNotifyEvent) => boolean;
  onResult: (
    event: QueryCacheNotifyEvent,
    context: { issueQueue: typeof issueQueue },
  ) => string[];
}

interface SystemHealthMonitorOptions {
  additionalObservers?: AdditionalObserver[];
}

export interface SystemHealthMonitor {
  reset: () => void;
  cleanup: () => void;
}

function closeKeys(keys: string[]) {
  for (const key of keys) issueQueue.close(key);
}

type SummaryData = components['schemas']['SummaryInvocationsV2Response'];

function globalInvocationIssues(summary: SummaryData | undefined) {
  if (
    !summary ||
    summary.stageBuckets.some((stage) => stage.breakdownCanRefine)
  ) {
    return undefined;
  }
  return getGlobalIssues(
    new Map(
      getInvocationStatusBreakdownV2(summary).map(({ name, count }) => [
        name,
        count,
      ]),
    ),
  );
}

function getInvocationSummaryView(event: QueryCacheNotifyEvent) {
  const request = event.query.queryKey[1];
  if (!request || typeof request !== 'object' || !('body' in request)) {
    return undefined;
  }
  const body = request.body;
  if (!body || typeof body !== 'object' || !('view' in body)) return undefined;
  return body.view;
}

function toRestateError(error: unknown): RestateError {
  if (error instanceof RestateError) return error;
  return new RestateError(
    error instanceof Error ? error.message : String(error),
    undefined,
    true,
    error instanceof Error ? error.stack : undefined,
  );
}

export function createSystemHealthMonitor(
  queryClient: QueryClient,
  { additionalObservers = [] }: SystemHealthMonitorOptions = {},
): SystemHealthMonitor {
  const tracked = {
    invocationIssues: [] as string[],
    queryHealth: null as string | null,
    additional: new Map<number, string[]>(),
  };
  const invocationData: {
    stages?: SummaryData;
    breakdowns?: SummaryData;
  } = {};

  const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
    if (!event) return;

    // Handle the health check on ANY event (not only 'updated'): after a
    // reset() the query can already be in `error`, and re-subscribing fires
    // only observerAdded / observerResultsUpdated (no fresh 'updated' event),
    // which previously dropped the issue. Re-checking the current state on
    // every event re-detects an already-errored query.
    if (isQueryHealthCheckQuery(event)) {
      const { state } = event.query;
      if (state.status === 'error' && state.error && !tracked.queryHealth) {
        closeKeys(tracked.invocationIssues);
        tracked.invocationIssues = [];
        tracked.queryHealth = issueQueue.add({
          severity: 'high',
          label:
            'Cannot retrieve invocation data — some dashboard features may not work as expected',
          details: toRestateError(state.error),
        });
      } else if (state.status === 'success' && tracked.queryHealth) {
        issueQueue.close(tracked.queryHealth);
        tracked.queryHealth = null;
      }
    }

    if (event.type !== 'updated') return;

    if (
      event.query.state.status === 'success' &&
      isOverviewRefreshQuery(event.query)
    ) {
      if (
        isQueryForPath(event.query, '/query/v2/invocations/summary', 'post')
      ) {
        const data = event.query.state.data as SummaryData;
        if (getInvocationSummaryView(event) === 'breakdowns') {
          invocationData.breakdowns = data;
        } else {
          invocationData.stages = data;
        }
      }
      const issues = globalInvocationIssues(
        mergeInvocationSummaryBreakdowns(
          invocationData.stages,
          invocationData.breakdowns,
        ),
      );
      if (issues) {
        closeKeys(tracked.invocationIssues);
        tracked.invocationIssues = tracked.queryHealth
          ? []
          : issues.map((issue) => issueQueue.add(issue));
      }
    }

    for (let i = 0; i < additionalObservers.length; i++) {
      const observer = additionalObservers[i];
      if (!observer?.match(event)) continue;
      closeKeys(tracked.additional.get(i) ?? []);
      tracked.additional.set(i, observer.onResult(event, { issueQueue }));
    }
  });

  function clearTracked() {
    closeKeys(tracked.invocationIssues);
    tracked.invocationIssues = [];
    delete invocationData.stages;
    delete invocationData.breakdowns;
    if (tracked.queryHealth) {
      issueQueue.close(tracked.queryHealth);
      tracked.queryHealth = null;
    }
    for (const keys of tracked.additional.values()) closeKeys(keys);
    tracked.additional.clear();
  }

  return {
    reset() {
      clearTracked();
    },
    cleanup() {
      unsubscribe();
      clearTracked();
    },
  };
}
