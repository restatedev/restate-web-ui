import type { components } from '@restate/data-access/admin-api-spec';
import { parseISODuration } from '@restate/util/intl';
import type { QueryContext } from '../shared';
import { queryFinishedHistoryFromInvocationStatus } from './finishedHistory/queryFinishedHistoryFromInvocationStatus';
import { queryFinishedHistoryFromVqueues } from './finishedHistory/queryFinishedHistoryFromVqueues';
import { badRequest, hasCompleteVqueueInvocationPopulation } from './shared';

export type FinishedInvocationsHistoryV2Args =
  components['schemas']['FinishedInvocationsHistoryV2RequestBody'];

type HistoryResponse =
  components['schemas']['FinishedInvocationsHistoryV2Response'];
type HistoryBucket = HistoryResponse['buckets'][number];

const MAX_FINISHED_HISTORY_BUCKETS = 10_000;

function intervalToSeconds(interval: string): number {
  const parsed = parseISODuration(interval);
  return (
    (parsed.weeks ?? 0) * 7 * 24 * 60 * 60 +
    (parsed.days ?? 0) * 24 * 60 * 60 +
    (parsed.hours ?? 0) * 60 * 60 +
    (parsed.minutes ?? 0) * 60 +
    (parsed.seconds ?? 0) +
    (parsed.milliseconds ?? 0) / 1000
  );
}

/**
 * Returns a contiguous, zero-filled history of finished outcomes. VQueue mode
 * separates all four outcomes; invocation status groups non-success as failed.
 */
export async function finishedInvocationsHistoryV2(
  this: QueryContext,
  { startTime, endTime, interval }: FinishedInvocationsHistoryV2Args,
): Promise<Response> {
  const startMs = Date.parse(startTime);
  const endMs = Date.parse(endTime);
  const intervalSeconds = intervalToSeconds(interval);

  if (!Number.isFinite(intervalSeconds) || intervalSeconds <= 0) {
    return badRequest('interval must be a positive duration');
  }

  const intervalMs = intervalSeconds * 1000;
  const firstBucketMs = Math.floor(startMs / intervalMs) * intervalMs;
  const bucketCount = Math.ceil((endMs - firstBucketMs) / intervalMs);
  if (bucketCount > MAX_FINISHED_HISTORY_BUCKETS) {
    return badRequest(
      `startTime, endTime, and interval must produce at most ${MAX_FINISHED_HISTORY_BUCKETS} buckets`,
    );
  }

  const useVqueues = hasCompleteVqueueInvocationPopulation(this);
  const { rows } = useVqueues
    ? await queryFinishedHistoryFromVqueues(
        this,
        startTime,
        endTime,
        intervalSeconds,
      )
    : await queryFinishedHistoryFromInvocationStatus(
        this,
        startTime,
        endTime,
        intervalSeconds,
      );

  const counts = new Map<
    number,
    Pick<HistoryBucket, 'succeeded' | 'failed' | 'cancelled' | 'killed'>
  >();
  for (const row of rows) {
    counts.set(Number(row.bucket) * 1000, {
      succeeded: Number(row.succeeded ?? 0),
      failed: Number(row.failed ?? 0),
      cancelled: useVqueues ? Number(row.cancelled ?? 0) : 0,
      killed: useVqueues ? Number(row.killed ?? 0) : 0,
    });
  }

  const buckets: HistoryBucket[] = [];
  for (let bucketMs = firstBucketMs; bucketMs < endMs; bucketMs += intervalMs) {
    const count = counts.get(bucketMs);
    buckets.push({
      start: new Date(bucketMs).toISOString(),
      end: new Date(bucketMs + intervalMs).toISOString(),
      succeeded: count?.succeeded ?? 0,
      failed: count?.failed ?? 0,
      cancelled: count?.cancelled ?? 0,
      killed: count?.killed ?? 0,
    });
  }

  return Response.json({
    startTime,
    endTime,
    interval,
    granularity: useVqueues ? 'exact' : 'failure-grouped',
    buckets,
  } satisfies HistoryResponse);
}
