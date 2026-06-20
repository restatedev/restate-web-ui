import type {
  FilterItem,
  components,
} from '@restate/data-access/admin-api-spec';
import { parseISODuration } from '@restate/util/intl';
import { convertInvocationsFilters } from '../convertFilters';
import { type QueryContext } from './shared';

export type CompletedInvocationsBreakdownArgs = {
  // Inclusive lower bound of the window (ISO 8601 date-time).
  startTime: string;
  // Exclusive upper bound of the window (ISO 8601 date-time).
  endTime: string;
  // Bucket width as an ISO 8601 duration, e.g. PT5M, PT1H, P1D.
  interval: string;
  // Optional scoping (service/handler/etc.), same shape as the other handlers.
  filters?: FilterItem[];
};

type BreakdownResponse =
  components['schemas']['CompletedInvocationsBreakdownResponse'];
type Bucket = BreakdownResponse['buckets'][number];

// Resolve an ISO 8601 duration to whole seconds for the bucket stride. Only
// fixed-length durations work: months and years aren't a fixed number of
// seconds, so they can't drive a uniform grid and are rejected. Returns null
// for unparseable, non-fixed, or sub-second input.
function intervalToSeconds(iso: string): number | null {
  let parsed: ReturnType<typeof parseISODuration>;
  try {
    parsed = parseISODuration(iso);
  } catch {
    return null;
  }
  if (parsed.years || parsed.months) return null;
  const seconds =
    (parsed.weeks ?? 0) * 7 * 24 * 60 * 60 +
    (parsed.days ?? 0) * 24 * 60 * 60 +
    (parsed.hours ?? 0) * 60 * 60 +
    (parsed.minutes ?? 0) * 60 +
    (parsed.seconds ?? 0) +
    (parsed.milliseconds ?? 0) / 1000;
  const rounded = Math.round(seconds);
  return rounded > 0 ? rounded : null;
}

function badRequest(message: string) {
  return Response.json({ message }, { status: 400 });
}

export async function completedInvocationsBreakdown(
  this: QueryContext,
  {
    startTime,
    endTime,
    interval,
    filters = [],
  }: CompletedInvocationsBreakdownArgs,
) {
  const startMs = Date.parse(startTime);
  const endMs = Date.parse(endTime);
  const intervalSeconds = intervalToSeconds(interval);

  if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
    return badRequest(
      'startTime and endTime must be valid ISO 8601 date-times',
    );
  }
  if (intervalSeconds === null) {
    return badRequest(
      `interval must be a fixed-length ISO 8601 duration of at least 1s (e.g. PT5M, PT1H, P1D), got: ${interval}`,
    );
  }
  if (endMs <= startMs) {
    return badRequest('endTime must be after startTime');
  }

  // Derive the JS grid stride from the same integer the SQL uses, so the
  // zero-fill boundaries line up exactly with date_bin's output.
  const intervalMs = intervalSeconds * 1000;
  const startIso = new Date(startMs).toISOString();
  const endIso = new Date(endMs).toISOString();

  // The breakdown is already scoped to completed outcomes, so a `status` filter
  // is meaningless here — drop it. `retry_count` isn't a column on
  // sys_invocation_status, and deployment matches on pinned_deployment_id only
  // (same constraints the summary handler applies to this table).
  const statusTableFilters = filters.filter(
    (f) => f.field !== 'status' && f.field !== 'retry_count',
  );
  const userWhere = convertInvocationsFilters(statusTableFilters, {
    deploymentFields: ['pinned_deployment_id'],
  }).replace(/^WHERE /, '');
  const filterClause = userWhere ? ` AND (${userWhere})` : '';

  // Bucket completed_at on the epoch grid (origin 1970-01-01) so boundaries
  // fall on clock times (e.g. :00/:30 for PT30M) regardless of startTime.
  // `to_unixtime` returns each boundary as epoch seconds — re-keying in JS off a
  // number avoids any timestamp/timezone parsing ambiguity. Killed and cancelled
  // both carry completion_result = 'failure' (they differ only in
  // completion_failure text), so `= 'failure'` folds them into `failed` for now;
  // splitting them out later means adding completion_failure-matched FILTERs.
  const query = `SELECT
      to_unixtime(date_bin(INTERVAL '${intervalSeconds} seconds', completed_at, TIMESTAMP '1970-01-01T00:00:00')) AS bucket,
      count(*) FILTER (WHERE completion_result = 'success') AS succeeded,
      count(*) FILTER (WHERE completion_result = 'failure') AS failed
    FROM sys_invocation_status
    WHERE status = 'completed'
      AND completed_at >= '${startIso}'
      AND completed_at < '${endIso}'${filterClause}
    GROUP BY bucket`;

  const { rows } = await this.query(query);

  const counts = new Map<number, { succeeded: number; failed: number }>();
  for (const row of rows) {
    const bucketMs = Number(row.bucket) * 1000;
    counts.set(bucketMs, {
      succeeded: Number(row.succeeded ?? 0),
      failed: Number(row.failed ?? 0),
    });
  }

  // Zero-fill: walk the epoch-aligned grid from the bucket containing startTime
  // up to (but excluding) endTime, so the series is contiguous for charting.
  const buckets: Bucket[] = [];
  const firstBucketMs = Math.floor(startMs / intervalMs) * intervalMs;
  for (let bucketMs = firstBucketMs; bucketMs < endMs; bucketMs += intervalMs) {
    const entry = counts.get(bucketMs);
    buckets.push({
      start: new Date(bucketMs).toISOString(),
      end: new Date(bucketMs + intervalMs).toISOString(),
      succeeded: entry?.succeeded ?? 0,
      failed: entry?.failed ?? 0,
    });
  }

  const response: BreakdownResponse = {
    startTime,
    endTime,
    interval,
    buckets,
  };
  return Response.json(response);
}
