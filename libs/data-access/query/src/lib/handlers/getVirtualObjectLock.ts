import type { components } from '@restate/data-access-admin-api-spec';
import { quoteSqlString, type QueryContext } from './shared.js';
import {
  addEntryDetailsToLock,
  getVirtualObjectEntryDetails,
  isLockConsistent,
  lockEntryRows,
  virtualObjectSnapshotChangedResponse,
} from './virtualObjectEntries.js';

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

// Called for an exact Virtual Object identity.
export async function queryVirtualObjectLock(
  context: QueryContext,
  service: string,
  key: string,
  scope?: string,
): Promise<VirtualObjectLockResponse> {
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
    return {};
  }

  return {
    lockHolder: createVirtualObjectLockHolder(id, row.acquired_at),
  };
}

export async function getVirtualObjectLock(
  this: QueryContext,
  service: string,
  key: string,
  scope?: string,
) {
  let lock = await queryVirtualObjectLock(this, service, key, scope);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (!lock.lockHolder || lock.lockHolder.kind === 'other') {
      return Response.json(lock);
    }
    const lockDetails = await getVirtualObjectEntryDetails(
      this,
      lockEntryRows(lock),
      'all',
    );
    const hydratedLock = addEntryDetailsToLock(lock, lockDetails);
    if (isLockConsistent(hydratedLock, lockDetails)) {
      return Response.json(hydratedLock);
    }
    if (attempt === 0) {
      lock = await queryVirtualObjectLock(this, service, key, scope);
    }
  }
  return virtualObjectSnapshotChangedResponse();
}
