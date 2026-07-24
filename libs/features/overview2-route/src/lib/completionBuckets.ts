const FIVE_MINUTES_MS = 5 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export type CompletionTimeRange = 'PT1H' | 'P1D' | 'ALL';

export function normalizeCompletionTimeRange(
  range: string | undefined,
): CompletionTimeRange {
  return range === 'P1D' || range === 'ALL' ? range : 'PT1H';
}

export type CompletionBucket = {
  start: string;
  end: string;
  succeeded: number;
  failed: number;
  cancelled: number;
  killed: number;
};

type CompletionOutcomeCount = {
  status: string;
  count: number;
};

export function getCompletionRangeStartTime(
  timeRange: CompletionTimeRange,
  now = Date.now(),
) {
  if (timeRange === 'ALL') return undefined;
  const duration = timeRange === 'PT1H' ? HOUR_MS : DAY_MS;
  return new Date(
    Math.floor((now - duration) / FIVE_MINUTES_MS) * FIVE_MINUTES_MS,
  ).toISOString();
}

export function createCompletionBucket(
  outcomes: CompletionOutcomeCount[],
  start: string | undefined,
  now = Date.now(),
): CompletionBucket {
  const counts = new Map(
    outcomes.map(({ status, count }) => [status, count] as const),
  );
  return {
    start: start ?? new Date(0).toISOString(),
    end: new Date(
      Math.ceil(now / FIVE_MINUTES_MS) * FIVE_MINUTES_MS,
    ).toISOString(),
    succeeded: counts.get('succeeded') ?? 0,
    failed: counts.get('failed') ?? 0,
    cancelled: counts.get('cancelled') ?? 0,
    killed: counts.get('killed') ?? 0,
  };
}

export function combineCompletionBuckets(
  buckets: CompletionBucket[],
): CompletionBucket | undefined {
  const first = buckets.at(0);
  const last = buckets.at(-1);
  if (!first || !last) return undefined;

  const counts = buckets.reduce(
    (total, bucket) => ({
      succeeded: total.succeeded + bucket.succeeded,
      failed: total.failed + bucket.failed,
      cancelled: total.cancelled + bucket.cancelled,
      killed: total.killed + bucket.killed,
    }),
    { succeeded: 0, failed: 0, cancelled: 0, killed: 0 },
  );

  return {
    start: first.start,
    end: last.end,
    ...counts,
  };
}

export function getCompletionTotal(bucket: CompletionBucket | undefined) {
  if (!bucket) return 0;
  return bucket.succeeded + bucket.failed + bucket.cancelled + bucket.killed;
}
