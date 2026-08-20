import type { components } from '@restate/data-access/admin-api-spec';
import { quoteSqlString, scopeClause, type QueryContext } from './shared';

type VirtualObjectStatsResponse =
  components['schemas']['VirtualObjectStatsResponse'];
type VirtualObjectStatsDurationRange =
  components['schemas']['VirtualObjectStatsDurationRange'];

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
  };
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
      SUM(num_inbox) AS num_inbox,
      MAX(last_enqueued_at) AS last_enqueued_at
    FROM sys_vqueue_meta
    WHERE service_name = ${quoteSqlString(service)}
      AND lock_name = ${quoteSqlString(`${service}/${key}`)}
      AND ${vqueueScopePredicate()}`,
      'virtual-objects/stats-vqueue-meta',
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
      'virtual-objects/stats-oldest-inboxed',
    ),
    this.query(
      `SELECT
      COUNT(*) AS num_keys,
      COALESCE(SUM(value_length), 0) AS total_size
    FROM state
    WHERE service_name = ${quoteSqlString(service)}
      AND service_key = ${quoteSqlString(key)}${scopeClause(this, scope, 'virtual_object')}`,
      'state/object-size',
    ),
  ]);

  const vqueueRow = (vqueueResult.rows.at(0) ?? {}) as Row;
  const inboxRow = (inboxResult.rows.at(0) ?? {}) as Row;
  const stateRow = (stateResult.rows.at(0) ?? {}) as Row;
  const attemptedVqueueCount = nonNegativeInteger(
    vqueueRow['attempted_vqueue_count'],
  );
  const averageInboxDuration = durationRange(
    vqueueRow,
    'avg_inbox_duration',
    attemptedVqueueCount,
  );
  const lastEnqueuedAt = stringValue(vqueueRow['last_enqueued_at']);
  const oldestInboxedAt = stringValue(inboxRow['oldest_inboxed_at']);

  return Response.json({
    supported: true,
    ...(averageInboxDuration ? { averageInboxDuration } : {}),
    numInbox: nonNegativeInteger(vqueueRow['num_inbox']),
    activity: {
      ...(oldestInboxedAt ? { oldestInboxedAt } : {}),
      ...(lastEnqueuedAt ? { lastEnqueuedAt } : {}),
    },
    state: {
      numKeys: nonNegativeInteger(stateRow['num_keys']),
      totalSize: nonNegativeInteger(stateRow['total_size']),
    },
  } satisfies VirtualObjectStatsResponse);
}
