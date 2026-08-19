import type { components } from '@restate/data-access/admin-api-spec';
import { quoteSqlString, type QueryContext } from './shared';
import {
  addEntryDetailsToLock,
  getVirtualObjectEntryDetails,
  isLockConsistent,
  lockEntryRows,
} from './virtualObjectEntries';

interface LockHolderRow {
  acquired_by?: string;
  acquired_at?: string;
}

type VirtualObjectLockResponse =
  components['schemas']['VirtualObjectLockResponse'];
type VirtualObjectLockHolder = components['schemas']['VirtualObjectLockHolder'];

export function createVirtualObjectLockHolder(
  id: string,
  acquiredAt?: string,
): VirtualObjectLockHolder {
  const kind: VirtualObjectLockHolder['kind'] = id.startsWith('inv_')
    ? 'invocation'
    : id.startsWith('mut_')
      ? 'state-mutation'
      : 'other';
  return {
    id,
    kind,
    ...(acquiredAt ? { acquiredAt } : {}),
  };
}

// Called for an exact Virtual Object identity; it uses the legacy keyed-service
// lock when `vqueues` is unavailable and `sys_locks` otherwise.
export async function queryVirtualObjectLock(
  context: QueryContext,
  service: string,
  key: string,
  scope?: string,
): Promise<VirtualObjectLockResponse> {
  if (!context.features.has('vqueues')) {
    if (scope !== undefined) {
      return { supported: false };
    }
    const { rows } = await context.query(
      `SELECT invocation_id
      FROM sys_keyed_service_status
      WHERE service_name = ${quoteSqlString(service)}
        AND service_key = ${quoteSqlString(key)}
        AND invocation_id IS NOT NULL
      LIMIT 1`,
      'virtual-objects/lock-from-keyed-status',
    );
    const id = rows.at(0)?.['invocation_id'] as string | undefined;
    return {
      supported: true,
      ...(id ? { lockHolder: { id, kind: 'invocation' as const } } : {}),
    };
  }

  const scopeClause =
    scope === undefined ? 'scope IS NULL' : `scope = ${quoteSqlString(scope)}`;
  const { rows } = await context.query(
    `SELECT acquired_by, acquired_at
    FROM sys_locks
    WHERE lock_name = ${quoteSqlString(`${service}/${key}`)}
      AND ${scopeClause}
      AND acquired_by IS NOT NULL
    LIMIT 1`,
    'virtual-objects/lock',
  );
  const row = rows.at(0) as LockHolderRow | undefined;
  const id = row?.acquired_by;
  if (!row || !id) {
    return { supported: true };
  }

  return {
    supported: true,
    lockHolder: createVirtualObjectLockHolder(id, row.acquired_at),
  };
}

export async function getVirtualObjectLock(
  this: QueryContext,
  service: string,
  key: string,
  scope?: string,
) {
  const lock = await queryVirtualObjectLock(this, service, key, scope);
  if (!lock.lockHolder || lock.lockHolder.kind === 'other') {
    return Response.json(lock);
  }
  const lockDetails = await getVirtualObjectEntryDetails(
    this,
    lockEntryRows(lock),
    'all',
  );
  const hydratedLock = addEntryDetailsToLock(
    lock,
    lockDetails,
    !this.features.has('vqueues'),
  );
  return Response.json(
    isLockConsistent(this, hydratedLock, lockDetails) ? hydratedLock : lock,
  );
}
