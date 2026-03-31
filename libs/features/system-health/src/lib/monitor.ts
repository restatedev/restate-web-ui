import type { QueryClient, QueryCacheNotifyEvent } from '@tanstack/react-query';
import {
  isSummaryInvocationsQuery,
  isQueryHealthCheckQuery,
} from '@restate/data-access/admin-api-hooks';
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

type SummaryData = {
  byStatus: { name: string; count: number }[];
};

export interface SystemHealthMonitor {
  cleanup: () => void;
}

function closeKeys(keys: string[]) {
  for (const key of keys) issueQueue.close(key);
}

function computeGlobalIssues(summaryData: SummaryData): string[] {
  const globalStatusCounts = new Map<string, number>();
  for (const entry of summaryData.byStatus) {
    globalStatusCounts.set(
      entry.name,
      (globalStatusCounts.get(entry.name) ?? 0) + entry.count,
    );
  }

  return getGlobalIssues(globalStatusCounts).map((issue) =>
    issueQueue.add({ severity: issue.severity, label: issue.label }),
  );
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
    sla: [] as string[],
    queryHealth: null as string | null,
    additional: new Map<number, string[]>(),
  };

  const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
    if (!event || event.type !== 'updated') return;

    if (isSummaryInvocationsQuery(event)) {
      if (event.query.getObserversCount() === 0) return;
      const data = event.query.state.data as SummaryData | undefined;
      if (!data) return;
      closeKeys(tracked.sla);
      tracked.sla = tracked.queryHealth ? [] : computeGlobalIssues(data);
    }

    if (isQueryHealthCheckQuery(event)) {
      const { state } = event.query;
      if (state.status === 'error' && state.error && !tracked.queryHealth) {
        closeKeys(tracked.sla);
        tracked.sla = [];
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

    for (let i = 0; i < additionalObservers.length; i++) {
      const observer = additionalObservers[i];
      if (!observer?.match(event)) continue;
      closeKeys(tracked.additional.get(i) ?? []);
      tracked.additional.set(i, observer.onResult(event, { issueQueue }));
    }
  });

  return {
    cleanup() {
      unsubscribe();
      closeKeys(tracked.sla);
      if (tracked.queryHealth) issueQueue.close(tracked.queryHealth);
      for (const keys of tracked.additional.values()) closeKeys(keys);
    },
  };
}
