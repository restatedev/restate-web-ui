import type {
  components,
  RawInvocation,
} from '@restate/data-access/admin-api-spec';
import { convertInvocation } from '../convertInvocation';
import {
  getSysInvocationListColumns,
  quoteSqlString,
  targetServiceKeyClause,
  type QueryContext,
} from './shared';
import { fetchVqueueStatuses } from './vqueue';

const RECENT_INVOCATION_LIMIT = 50;
const RECENT_INVOCATION_QUERY_LIMIT = RECENT_INVOCATION_LIMIT + 1;

type VirtualObjectInvocationsResponse =
  components['schemas']['VirtualObjectInvocationsResponse'];

function unsupportedInvocations(): VirtualObjectInvocationsResponse {
  return {
    supported: false,
    rows: [],
    limit: RECENT_INVOCATION_LIMIT,
    truncated: false,
  };
}

export async function getVirtualObjectInvocations(
  this: QueryContext,
  service: string,
  key: string,
  scope?: string,
) {
  if (scope !== undefined && !this.features.has('vqueues')) {
    return Response.json(unsupportedInvocations());
  }

  const scopeClause = this.features.has('vqueues')
    ? scope === undefined
      ? '\n      AND si.scope IS NULL'
      : `\n      AND si.scope = ${quoteSqlString(scope)}`
    : '';
  const { rows: candidateRows } = await this.query(
    `SELECT si.id
    FROM sys_invocation_status si
    WHERE si.target_service_ty = 'virtual_object'
      AND si.target_service_name = ${quoteSqlString(service)}
      AND ${targetServiceKeyClause(this, key, 'si.target_service_key')}${scopeClause}
    ORDER BY si.created_at DESC NULLS LAST
    LIMIT ${RECENT_INVOCATION_QUERY_LIMIT}`,
    'virtual-objects/recent-invocation-ids',
  );
  const truncated = candidateRows.length > RECENT_INVOCATION_LIMIT;
  const ids = candidateRows
    .slice(0, RECENT_INVOCATION_LIMIT)
    .map((row) => String(row['id']));
  const [invocationResult, vqueueStatuses] = await Promise.all([
    ids.length > 0
      ? this.query(
          `SELECT ${getSysInvocationListColumns(this.features).join(', ')}
    FROM sys_invocation
    WHERE id IN (${ids.map(quoteSqlString).join(', ')})`,
          'invocations/by-ids',
        )
      : Promise.resolve({ rows: [] }),
    fetchVqueueStatuses(this, ids),
  ]);
  const invocationById = new Map(
    (invocationResult.rows as RawInvocation[]).map((invocation) => [
      invocation.id,
      invocation,
    ]),
  );
  const rows = ids.flatMap((id) => {
    const invocation = invocationById.get(id);
    return invocation
      ? [convertInvocation(invocation, vqueueStatuses.get(id))]
      : [];
  });

  return Response.json({
    supported: true,
    rows,
    limit: RECENT_INVOCATION_LIMIT,
    truncated,
  } satisfies VirtualObjectInvocationsResponse);
}
