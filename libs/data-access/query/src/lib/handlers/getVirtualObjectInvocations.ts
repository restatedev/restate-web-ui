import type {
  components,
  RawInvocation,
} from '@restate/data-access-admin-api-spec';
import { convertInvocation } from '../convertInvocation';
import {
  SYS_INVOCATION_LIST_SELECT_COLUMNS,
  isInvocationId,
  quoteSqlString,
  targetServiceKeyClause,
  type QueryContext,
} from './shared';
import { fetchVqueueStatuses } from './vqueue';
import { toVqueueEntry } from './virtualObjectEntries';
import { ENTRY_BY_VIRTUAL_OBJECT, selectFromIndex } from './indexes';
import { usesIndexesV1 } from '../uiFeatures';

const RECENT_INVOCATION_LIMIT = 50;
const RECENT_INVOCATION_QUERY_LIMIT = RECENT_INVOCATION_LIMIT + 1;

type VirtualObjectInvocationsResponse =
  components['schemas']['VirtualObjectInvocationsResponse'];

async function queryRecentInvocationIds(
  context: QueryContext,
  service: string,
  key: string,
  scope?: string,
) {
  const scopeClause =
    scope === undefined
      ? '\n      AND si.scope IS NULL'
      : `\n      AND si.scope = ${quoteSqlString(scope)}`;
  const { rows } = await context.query(
    `SELECT si.id
    FROM sys_invocation_status si
    WHERE si.target_service_ty = 'virtual_object'
      AND si.target_service_name = ${quoteSqlString(service)}
      AND ${targetServiceKeyClause(key, 'si.target_service_key')}${scopeClause}
    ORDER BY si.created_at DESC NULLS LAST
    LIMIT ${RECENT_INVOCATION_QUERY_LIMIT}`,
    'virtual-objects/recent-invocation-ids',
  );
  return rows.map((row) => String(row['id']));
}

async function queryRecentEntryIds(
  context: QueryContext,
  service: string,
  key: string,
  scope?: string,
) {
  const rows = await selectFromIndex(context, ENTRY_BY_VIRTUAL_OBJECT, {
    keys: { service_name: service, scope: scope ?? null, key },
    columns: ['entry_id'],
    sorted: true,
    limit: RECENT_INVOCATION_QUERY_LIMIT,
    id: 'indexes/entries-by-virtual-object',
  });
  return rows.map(({ entry_id }) => entry_id);
}

export async function getVirtualObjectInvocations(
  this: QueryContext,
  service: string,
  key: string,
  scope?: string,
) {
  const candidateIds = usesIndexesV1(this)
    ? await queryRecentEntryIds(this, service, key, scope)
    : await queryRecentInvocationIds(this, service, key, scope);
  const truncated = candidateIds.length > RECENT_INVOCATION_LIMIT;
  const ids = candidateIds.slice(0, RECENT_INVOCATION_LIMIT);
  const invocationIds = ids.filter(isInvocationId);
  const [invocationResult, vqueueStatuses] = await Promise.all([
    invocationIds.length > 0
      ? this.query(
          `SELECT ${SYS_INVOCATION_LIST_SELECT_COLUMNS.join(', ')}
    FROM sys_invocation
    WHERE id IN (${invocationIds.map(quoteSqlString).join(', ')})`,
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
  const rows = ids.flatMap<VirtualObjectInvocationsResponse['rows'][number]>(
    (id) => {
      const vqueue = vqueueStatuses.get(id);
      if (!isInvocationId(id)) {
        return vqueue
          ? [toVqueueEntry(id, { ...vqueue, kind: 'state-mutation' })]
          : [];
      }
      const invocation = invocationById.get(id);
      return invocation ? [convertInvocation(invocation, vqueue)] : [];
    },
  );

  return Response.json({
    rows,
    limit: RECENT_INVOCATION_LIMIT,
    truncated,
  } satisfies VirtualObjectInvocationsResponse);
}
