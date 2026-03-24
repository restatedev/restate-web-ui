import type { Deployment, Service } from '@restate/data-access/admin-api-spec';
import { MIN_SUPPORTED_SERVICE_PROTOCOL_VERSION } from '@restate/features/deployment';
import type { IssueSeverity } from '@restate/ui/notification';

export type IssueKind = 'sla' | 'deprecated-sdk';

export interface ServiceIssue {
  kind: IssueKind;
  severity: IssueSeverity;
  label: string;
  status?: string;
}

const MIN_TRAFFIC_THRESHOLD = 10;

interface SlaThreshold {
  low: number;
  high: number;
  lowLabel: string;
  highLabel: string;
}

const SLA_THRESHOLDS: Record<string, SlaThreshold> = {
  failed: {
    low: 0.1,
    high: Infinity,
    lowLabel: 'Failure rate above 10% of completed invocations',
    highLabel: 'Failure rate above 100% of completed invocations',
  },
  'backing-off': {
    low: 0.05,
    high: 0.1,
    lowLabel: 'More than 5% of inflight invocations are backing-off',
    highLabel: 'More than 10% of inflight invocations are backing-off',
  },
  paused: {
    low: 0.01,
    high: 0.05,
    lowLabel: 'More than 1% of inflight invocations are paused',
    highLabel: 'More than 5% of inflight invocations are paused',
  },
  pending: {
    low: 0.01,
    high: 0.05,
    lowLabel: 'More than 1% of inflight invocations are pending',
    highLabel: 'More than 5% of inflight invocations are pending',
  },
  ready: {
    low: 0.01,
    high: 0.05,
    lowLabel: 'More than 1% of inflight invocations are waiting to run',
    highLabel: 'More than 5% of inflight invocations are waiting to run',
  },
};

const COMPLETED_STATUSES = ['succeeded', 'failed'];
const NON_COMPLETED_STATUSES = [
  'running',
  'suspended',
  'scheduled',
  'pending',
  'ready',
  'backing-off',
  'paused',
];

function checkSlaThresholds(statusCounts: Map<string, number>): ServiceIssue[] {
  const issues: ServiceIssue[] = [];

  let completed = 0;
  let nonCompleted = 0;
  for (const [status, count] of statusCounts) {
    if (COMPLETED_STATUSES.includes(status)) completed += count;
    if (NON_COMPLETED_STATUSES.includes(status)) nonCompleted += count;
  }

  const total = completed + nonCompleted;
  if (total < MIN_TRAFFIC_THRESHOLD) return issues;

  for (const [status, threshold] of Object.entries(SLA_THRESHOLDS)) {
    const count = statusCounts.get(status) ?? 0;
    if (count === 0) continue;

    const denominator = status === 'failed' ? completed : nonCompleted;
    if (denominator === 0) continue;

    const ratio = count / denominator;
    if (ratio >= threshold.high) {
      issues.push({ kind: 'sla', severity: 'high', label: threshold.highLabel, status });
    } else if (ratio >= threshold.low) {
      issues.push({ kind: 'sla', severity: 'low', label: threshold.lowLabel, status });
    }
  }

  return issues;
}

export function getServiceIssues({
  service,
  deployment,
  isVersionGte,
  statusCounts,
}: {
  service: Service;
  deployment?: Deployment;
  isVersionGte?: (version: string) => boolean;
  statusCounts: Map<string, number>;
}): ServiceIssue[] {
  const issues: ServiceIssue[] = [];

  if (
    deployment &&
    deployment.max_protocol_version < MIN_SUPPORTED_SERVICE_PROTOCOL_VERSION &&
    isVersionGte?.('1.6.0')
  ) {
    issues.push({
      kind: 'deprecated-sdk',
      severity: 'low',
      label: 'Deployment uses an outdated SDK version that may lose support',
    });
  }

  issues.push(...checkSlaThresholds(statusCounts));
  return issues;
}

export function getGlobalIssues(
  globalStatusCounts: Map<string, number>,
): ServiceIssue[] {
  return checkSlaThresholds(globalStatusCounts);
}

export function issuesSortScore(issues: ServiceIssue[]): number {
  let highCount = 0;
  let lowCount = 0;
  for (const issue of issues) {
    if (issue.severity === 'high') highCount++;
    else lowCount++;
  }
  return highCount * 1000 + lowCount;
}
