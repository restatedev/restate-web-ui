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
  const vqueueCount = nonNegativeInteger(row['attempted_vqueue_count']);
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

  const vqueueScopePredicate = (alias?: string) => {
    const column = alias ? `${alias}.scope` : 'scope';
    return scope === undefined
      ? `${column} IS NULL`
      : `${column} = ${quoteSqlString(scope)}`;
  };
  const [vqueueResult, inboxResult, stateResult] = await Promise.all([
    this.query(
      `SELECT
      COUNT(last_attempt_at) AS attempted_vqueue_count,
      MIN(CASE WHEN last_attempt_at IS NOT NULL THEN avg_inbox_duration END) AS min_avg_inbox_duration,
      MAX(CASE WHEN last_attempt_at IS NOT NULL THEN avg_inbox_duration END) AS max_avg_inbox_duration,
      MIN(last_attempt_at) AS oldest_attempt_at,
      MAX(last_attempt_at) AS latest_attempt_at,
      MIN(CASE WHEN last_attempt_at IS NOT NULL THEN avg_blocked_on_concurrency_rules END) AS min_avg_blocked_on_concurrency_rules,
      MAX(CASE WHEN last_attempt_at IS NOT NULL THEN avg_blocked_on_concurrency_rules END) AS max_avg_blocked_on_concurrency_rules,
      MIN(CASE WHEN last_attempt_at IS NOT NULL THEN avg_blocked_on_invoker_concurrency END) AS min_avg_blocked_on_invoker_concurrency,
      MAX(CASE WHEN last_attempt_at IS NOT NULL THEN avg_blocked_on_invoker_concurrency END) AS max_avg_blocked_on_invoker_concurrency,
      MIN(CASE WHEN last_attempt_at IS NOT NULL THEN avg_blocked_on_invoker_throttling END) AS min_avg_blocked_on_invoker_throttling,
      MAX(CASE WHEN last_attempt_at IS NOT NULL THEN avg_blocked_on_invoker_throttling END) AS max_avg_blocked_on_invoker_throttling,
      MIN(CASE WHEN last_attempt_at IS NOT NULL THEN avg_blocked_on_lock END) AS min_avg_blocked_on_lock,
      MAX(CASE WHEN last_attempt_at IS NOT NULL THEN avg_blocked_on_lock END) AS max_avg_blocked_on_lock,
      COALESCE(SUM(num_inbox), 0) AS num_inbox,
      MAX(last_enqueued_at) AS last_enqueued_at,
      MAX(last_start_at) AS latest_start_at,
      MAX(last_finish_at) AS last_finish_at
    FROM sys_vqueue_meta
    WHERE service_name = ${quoteSqlString(service)}
      AND lock_name = ${quoteSqlString(`${service}/${key}`)}
      AND ${vqueueScopePredicate()}`,
    ),
    this.query(
      `SELECT MIN(v.transitioned_at) AS oldest_inboxed_at
    FROM sys_vqueues v
    WHERE v.id IN (
      SELECT vm.id
      FROM sys_vqueue_meta vm
      WHERE vm.service_name = ${quoteSqlString(service)}
        AND vm.lock_name = ${quoteSqlString(`${service}/${key}`)}
        AND ${vqueueScopePredicate('vm')}
        AND vm.num_inbox > 0
    )
      AND v.stage = 'inbox'`,
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
  const inboxRow = (inboxResult.rows.at(0) ?? {}) as Row;
  const stateRow = (stateResult.rows.at(0) ?? {}) as Row;
  const attemptedVqueueCount = nonNegativeInteger(
    vqueueRow['attempted_vqueue_count'],
  );
  const oldestAttemptAt = stringValue(vqueueRow['oldest_attempt_at']);
  const latestAttemptAt = stringValue(vqueueRow['latest_attempt_at']);
  const averageInboxDuration = durationRange(
    vqueueRow,
    'avg_inbox_duration',
    attemptedVqueueCount,
    oldestAttemptAt,
    latestAttemptAt,
  );
  const lastEnqueuedAt = stringValue(vqueueRow['last_enqueued_at']);
  const oldestInboxedAt = stringValue(inboxRow['oldest_inboxed_at']);
  const lastStartedAt = stringValue(vqueueRow['latest_start_at']);
  const lastFinishedAt = stringValue(vqueueRow['last_finish_at']);

  return Response.json({
    supported: true,
    ...(averageInboxDuration ? { averageInboxDuration } : {}),
    numInbox: nonNegativeInteger(vqueueRow['num_inbox']),
    averageBlockedDurations: blockedDurationRanges(vqueueRow),
    activity: {
      ...(oldestInboxedAt ? { oldestInboxedAt } : {}),
      ...(lastEnqueuedAt ? { lastEnqueuedAt } : {}),
      ...(lastStartedAt ? { lastStartedAt } : {}),
      ...(latestAttemptAt ? { lastAttemptAt: latestAttemptAt } : {}),
      ...(lastFinishedAt ? { lastFinishedAt } : {}),
    },
    state: {
      numKeys: nonNegativeInteger(stateRow['num_keys']),
      totalSize: nonNegativeInteger(stateRow['total_size']),
    },
  } satisfies VirtualObjectStatsResponse);
}
