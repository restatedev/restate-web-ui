import { QueryClient } from '@tanstack/react-query';
import { afterEach, describe, expect, it } from 'vitest';
import { issueQueue } from './issue-queue';
import { createSystemHealthMonitor } from './monitor';

const SUMMARY_PATH = '/query/v2/invocations/summary';

function stage(key: string, statuses: string[], count: number) {
  return {
    key,
    label: key,
    statuses,
    count,
    breakdownIsPartial: false,
    breakdownCoverage: 'full',
    breakdownCanRefine: false,
  };
}

const SUMMARY_WITH_PENDING_BACKLOG = {
  stageBuckets: [
    stage('inbox', ['pending'], 200),
    stage('running', ['running'], 100),
  ],
  statusBuckets: [
    { key: 'pending', label: 'Pending', statuses: ['pending'], count: 200 },
    { key: 'running', label: 'Running', statuses: ['running'], count: 100 },
  ],
  serviceBuckets: [],
};

const DEPLOYMENTS_SUMMARY = {
  stageBuckets: [],
  statusBuckets: [],
  serviceBuckets: [],
  deploymentBuckets: [{ deployment: 'dp_1', count: 3, statusBuckets: [] }],
};

function fetchSummary(client: QueryClient, view: string, data: unknown) {
  return client.fetchQuery({
    queryKey: [SUMMARY_PATH, { body: { view } }],
    queryFn: async () => data,
    meta: { overviewRefresh: true, path: SUMMARY_PATH, method: 'post' },
  });
}

function issueLabels() {
  return issueQueue.visibleToasts.map(({ content }) => content.label);
}

describe('createSystemHealthMonitor', () => {
  let cleanup: (() => void) | undefined;
  afterEach(() => cleanup?.());

  it('keeps global issues when a non-stage summary view refreshes', async () => {
    const client = new QueryClient();
    cleanup = createSystemHealthMonitor(client).cleanup;

    await fetchSummary(client, 'all', SUMMARY_WITH_PENDING_BACKLOG);
    expect(issueLabels()).toEqual([
      'More than 5% of inflight invocations are pending',
    ]);

    await fetchSummary(client, 'deployments', DEPLOYMENTS_SUMMARY);
    await fetchSummary(client, 'count', { ...DEPLOYMENTS_SUMMARY, total: 3 });
    expect(issueLabels()).toEqual([
      'More than 5% of inflight invocations are pending',
    ]);
  });
});
