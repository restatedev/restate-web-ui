// Minimum number of total invocations (completed + inflight) required
// before SLA checks are applied. Prevents false positives on low-traffic
// services where a single paused invocation could trigger a warning.
export const MIN_TRAFFIC_THRESHOLD = 100;

export interface SlaThreshold {
  // Ratio at which a low-severity warning is raised.
  low: number;
  // Ratio at which a high-severity alert is raised.
  // Use Infinity to disable the high tier for a given status.
  high: number;
  // Human-readable label shown when the low threshold is exceeded.
  lowLabel: string;
  // Human-readable label shown when the high threshold is exceeded.
  highLabel: string;
}

// Each key is an invocation status name (post-merge, so "failed" includes
// cancelled and killed). The ratio is computed as:
//   - For "failed": count / completed invocations
//   - For all others: count / inflight (non-completed) invocations
export const SLA_THRESHOLDS: Record<string, SlaThreshold> = {
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
