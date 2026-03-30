import type { Deployment, Service } from '@restate/data-access/admin-api-spec';
import { MIN_SUPPORTED_SERVICE_PROTOCOL_VERSION } from '@restate/features/deployment';
import { SLA_THRESHOLDS, MIN_TRAFFIC_THRESHOLD } from './thresholds';

export type IssueSeverity = 'high' | 'low';

export type IssueKind = 'sla' | 'deprecated-sdk' | 'throttled';

export interface ServiceIssue {
  kind: IssueKind;
  severity: IssueSeverity;
  label: string;
  status?: string;
}

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

function checkSlaThresholds(
  statusCounts: Map<string, number>,
): ServiceIssue[] {
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
      issues.push({
        kind: 'sla',
        severity: 'high',
        label: threshold.highLabel,
        status,
      });
    } else if (ratio >= threshold.low) {
      issues.push({
        kind: 'sla',
        severity: 'low',
        label: threshold.lowLabel,
        status,
      });
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

