import type { components } from '@restate/data-access/admin-api-spec';
import { quoteSqlString, scopeClause, type QueryContext } from './shared';

type VirtualObjectStatsResponse =
  components['schemas']['VirtualObjectStatsResponse'];
type VirtualObjectStatsDurationRange =
  components['schemas']['VirtualObjectStatsDurationRange'];
type VirtualObjectStatsBlockedDurationRange =
  components['schemas']['VirtualObjectStatsBlockedDurationRange'];

const BLOCKED_GATES = [
  'concurrency_rules',
  'invoker_concurrency',
  'invoker_throttling',
  'lock',
] as const;

type Row = Record<string, unknown>;

function stringValue(value: unknown) {
  return value === null || value === undefined ? undefined : String(value);
}

function nonNegativeInteger(value: unknown) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : 0;
}

function durationRange(
  row: Row,
  prefix: string,
  vqueueCount: number,
  oldestUpdatedAt?: string,
  latestUpdatedAt?: string,
): VirtualObjectStatsDurationRange | undefined {
  const min = stringValue(row[`min_${prefix}`]);
  const max = stringValue(row[`max_${prefix}`]);
  if (vqueueCount === 0 || min === undefined || max === undefined) {
    return undefined;
  }
  return {
    min,
    max,
    vqueueCount,
    ...(oldestUpdatedAt ? { oldestUpdatedAt } : {}),
    ...(latestUpdatedAt ? { latestUpdatedAt } : {}),
  };
}

function blockedDurationRanges(
  row: Row,
): VirtualObjectStatsBlockedDurationRange[] {
  const vqueueCount = nonNegativeInteger(row['blocked_duration_vqueue_count']);
  const oldestUpdatedAt = stringValue(row['oldest_attempt_at']);
  const latestUpdatedAt = stringValue(row['latest_attempt_at']);
  return BLOCKED_GATES.flatMap((gate) => {
    const range = durationRange(
      row,
      `avg_blocked_on_${gate}`,
      vqueueCount,
      oldestUpdatedAt,
      latestUpdatedAt,
    );
    return range ? [{ gate, ...range }] : [];
  });
}

export async function getVirtualObjectStats(
  this: QueryContext,
  service: string,
  key: string,
  scope?: string,
) {
  if (!this.features.has('vqueues')) {
    return Response.json({
      supported: false,
    } satisfies VirtualObjectStatsResponse);
  }

  const vqueueScopeClause =
    scope === undefined ? 'scope IS NULL' : `scope = ${quoteSqlString(scope)}`;
  const [vqueueResult, stateResult] = await Promise.all([
    this.query(
      `SELECT
      COUNT(last_start_at) AS queue_duration_vqueue_count,
      MIN(CASE WHEN last_start_at IS NOT NULL THEN avg_queue_duration END) AS min_avg_queue_duration,
      MAX(CASE WHEN last_start_at IS NOT NULL THEN avg_queue_duration END) AS max_avg_queue_duration,
      MIN(last_start_at) AS oldest_start_at,
      MAX(last_start_at) AS latest_start_at,
      COUNT(last_attempt_at) AS blocked_duration_vqueue_count,
      MIN(CASE WHEN last_attempt_at IS NOT NULL THEN avg_blocked_on_concurrency_rules END) AS min_avg_blocked_on_concurrency_rules,
      MAX(CASE WHEN last_attempt_at IS NOT NULL THEN avg_blocked_on_concurrency_rules END) AS max_avg_blocked_on_concurrency_rules,
      MIN(CASE WHEN last_attempt_at IS NOT NULL THEN avg_blocked_on_invoker_concurrency END) AS min_avg_blocked_on_invoker_concurrency,
      MAX(CASE WHEN last_attempt_at IS NOT NULL THEN avg_blocked_on_invoker_concurrency END) AS max_avg_blocked_on_invoker_concurrency,
      MIN(CASE WHEN last_attempt_at IS NOT NULL THEN avg_blocked_on_invoker_throttling END) AS min_avg_blocked_on_invoker_throttling,
      MAX(CASE WHEN last_attempt_at IS NOT NULL THEN avg_blocked_on_invoker_throttling END) AS max_avg_blocked_on_invoker_throttling,
      MIN(CASE WHEN last_attempt_at IS NOT NULL THEN avg_blocked_on_lock END) AS min_avg_blocked_on_lock,
      MAX(CASE WHEN last_attempt_at IS NOT NULL THEN avg_blocked_on_lock END) AS max_avg_blocked_on_lock,
      MIN(last_attempt_at) AS oldest_attempt_at,
      MAX(last_attempt_at) AS latest_attempt_at,
      MAX(last_enqueued_at) AS last_enqueued_at,
      MAX(last_finish_at) AS last_finish_at
    FROM sys_vqueue_meta
    WHERE service_name = ${quoteSqlString(service)}
      AND lock_name = ${quoteSqlString(`${service}/${key}`)}
      AND ${vqueueScopeClause}`,
    ),
    this.query(
      `SELECT
      COUNT(*) AS num_keys,
      COALESCE(SUM(value_length), 0) AS total_size
    FROM state
    WHERE service_name = ${quoteSqlString(service)}
      AND service_key = ${quoteSqlString(key)}${scopeClause(this, scope, 'virtual_object')}`,
    ),
  ]);

  const vqueueRow = (vqueueResult.rows.at(0) ?? {}) as Row;
  const stateRow = (stateResult.rows.at(0) ?? {}) as Row;
  const queueDurationVqueueCount = nonNegativeInteger(
    vqueueRow['queue_duration_vqueue_count'],
  );
  const averageQueueDuration = durationRange(
    vqueueRow,
    'avg_queue_duration',
    queueDurationVqueueCount,
    stringValue(vqueueRow['oldest_start_at']),
    stringValue(vqueueRow['latest_start_at']),
  );
  const lastEnqueuedAt = stringValue(vqueueRow['last_enqueued_at']);
  const lastStartedAt = stringValue(vqueueRow['latest_start_at']);
  const lastAttemptAt = stringValue(vqueueRow['latest_attempt_at']);
  const lastFinishedAt = stringValue(vqueueRow['last_finish_at']);

  return Response.json({
    supported: true,
    ...(averageQueueDuration ? { averageQueueDuration } : {}),
    averageBlockedDurations: blockedDurationRanges(vqueueRow),
    activity: {
      ...(lastEnqueuedAt ? { lastEnqueuedAt } : {}),
      ...(lastStartedAt ? { lastStartedAt } : {}),
      ...(lastAttemptAt ? { lastAttemptAt } : {}),
      ...(lastFinishedAt ? { lastFinishedAt } : {}),
    },
    state: {
      numKeys: nonNegativeInteger(stateRow['num_keys']),
      totalSize: nonNegativeInteger(stateRow['total_size']),
    },
  } satisfies VirtualObjectStatsResponse);
}
