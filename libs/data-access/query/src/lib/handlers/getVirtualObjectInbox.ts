import type { components } from '@restate/data-access-admin-api-spec';
import { isInvocationId, quoteSqlString, type QueryContext } from './shared';
import { queryVirtualObjectLock } from './getVirtualObjectLock';
import {
  addEntryDetailsToLock,
  entryDetailsContainLock,
  getVirtualObjectEntryDetails,
  isLockConsistent,
  lockEntryRows,
  mergeEntryDetails,
  virtualObjectSnapshotChangedResponse,
  type VirtualObjectEntryDetails,
  type VirtualObjectEntryRow,
} from './virtualObjectEntries';
import { ENTRY_NEXT_AT_BY_VIRTUAL_OBJECT, selectFromIndex } from './indexes';
import { usesIndexesV1 } from '../uiFeatures';

const INBOX_LIMIT = 25;
const INBOX_QUERY_LIMIT = INBOX_LIMIT + 1;
const SCOPED_VQUEUE_QUERY_LIMIT = 250;

type VirtualObjectInboxResponse =
  components['schemas']['VirtualObjectInboxResponse'];
type VirtualObjectLock = components['schemas']['VirtualObjectLockResponse'];
interface ReconciledInboxLockDetails {
  lock: VirtualObjectLock;
  entryDetails: VirtualObjectEntryDetails;
}

interface VirtualObjectIdentity {
  service: string;
  key: string;
  scope?: string;
}

interface ScopedVirtualObjectIdentity extends VirtualObjectIdentity {
  scope: string;
}

interface InboxResponseOptions {
  lock?: VirtualObjectLock;
  inboxCount?: number;
}

async function queryVirtualObjectInboxCount(
  context: QueryContext,
  service: string,
  key: string,
  scope?: string,
) {
  const scopeClause =
    scope === undefined ? 'scope IS NULL' : `scope = ${quoteSqlString(scope)}`;
  const { rows } = await context.query(
    `SELECT SUM(num_inbox) AS inbox_count
    FROM sys_vqueue_meta
    WHERE service_name = ${quoteSqlString(service)}
      AND lock_name = ${quoteSqlString(`${service}/${key}`)}
      AND ${scopeClause}`,
    'virtual-objects/inbox-count',
  );
  const value = rows.at(0)?.['inbox_count'];
  if (value === null) return 0;
  const count = Number(value);
  return Number.isSafeInteger(count) && count >= 0 ? count : undefined;
}

// Called when the request has no scope.
async function findSingleVqueueInboxEntries(
  context: QueryContext,
  service: string,
  key: string,
  scope?: string,
) {
  const scopeClause =
    scope === undefined ? 'scope IS NULL' : `scope = ${quoteSqlString(scope)}`;
  const queueResult = await context.query(
    `SELECT id
    FROM sys_vqueue_meta
    WHERE service_name = ${quoteSqlString(service)}
      AND lock_name = ${quoteSqlString(`${service}/${key}`)}
      AND ${scopeClause}
    LIMIT 1`,
    'virtual-objects/vqueue-id-lookup',
  );
  const queueId = queueResult.rows.at(0)?.['id'] as string | undefined;
  if (!queueId) return [];

  return findVqueueInboxEntriesById(context, queueId);
}

// Called after the single-VQueue metadata query returns an ID and for every
// VQueue inbox endpoint request.
async function findVqueueInboxEntriesById(
  context: QueryContext,
  vqueueId: string,
) {
  // Exact VQueue ID narrows the scan to its partition. With the inbox-stage
  // filter, the current storage iterator emits this VQueue's entries in
  // encoded queue order and LIMIT permits early termination.
  const { rows } = await context.query(
    `SELECT
      id AS vqueue_id,
      entry_id AS id,
      entry_kind AS kind,
      stage,
      status,
      has_lock,
      run_at,
      sequence_number,
      created_at,
      transitioned_at
    FROM sys_vqueues
    WHERE id = ${quoteSqlString(vqueueId)}
      AND stage = 'inbox'
    LIMIT ${INBOX_QUERY_LIMIT}`,
    'vqueues/inbox-entries',
  );
  return rows as VirtualObjectEntryRow[];
}

async function findScopedVirtualObjectInboxEntries(
  context: QueryContext,
  service: string,
  key: string,
  scope: string,
) {
  const { rows } = await context.query(
    `SELECT
      v.id AS vqueue_id,
      v.entry_id AS id,
      v.entry_kind AS kind,
      v.stage,
      v.status,
      v.has_lock,
      v.run_at,
      v.sequence_number,
      v.created_at,
      v.transitioned_at
    FROM sys_vqueues v
    WHERE v.id IN (
      SELECT vm.id
      FROM sys_vqueue_meta vm
      WHERE vm.service_name = ${quoteSqlString(service)}
        AND vm.lock_name = ${quoteSqlString(`${service}/${key}`)}
        AND vm.scope = ${quoteSqlString(scope)}
        AND vm.num_inbox > 0
      LIMIT ${SCOPED_VQUEUE_QUERY_LIMIT}
    )
      AND v.stage = 'inbox'
    ORDER BY v.run_at ASC NULLS LAST
    LIMIT ${INBOX_QUERY_LIMIT}`,
    'virtual-objects/scoped-inbox-entries',
  );
  return rows as VirtualObjectEntryRow[];
}

async function findIndexedVirtualObjectInboxEntries(
  context: QueryContext,
  service: string,
  key: string,
  scope?: string,
): Promise<VirtualObjectEntryRow[]> {
  const rows = await selectFromIndex(context, ENTRY_NEXT_AT_BY_VIRTUAL_OBJECT, {
    keys: { service_name: service, scope: scope ?? null, key, stage: 'inbox' },
    columns: ['entry_id', 'stage', 'next_at', 'seq'],
    sorted: true,
    limit: INBOX_QUERY_LIMIT,
    id: 'indexes/entries-next-at-by-virtual-object',
  });
  return rows.map((row) => ({
    id: row.entry_id,
    kind: isInvocationId(row.entry_id) ? 'invocation' : 'state-mutation',
    stage: row.stage,
    run_at: row.next_at,
    sequence_number: row.seq,
  }));
}

function isInitialLockConsistent(
  lock: VirtualObjectLock,
  entryDetails: VirtualObjectEntryDetails,
) {
  const { lockHolder: entryWithLock } = lock;
  if (entryWithLock) {
    return isLockConsistent(lock, entryDetails);
  }
  return !entryDetailsContainLock(entryDetails);
}

async function reconcileInboxLockDetails(
  context: QueryContext,
  virtualObjectIdentity: VirtualObjectIdentity,
  initialLock: VirtualObjectLock,
  entryDetails: VirtualObjectEntryDetails,
): Promise<ReconciledInboxLockDetails | undefined> {
  const lock = addEntryDetailsToLock(initialLock, entryDetails);
  if (isInitialLockConsistent(lock, entryDetails)) {
    return { lock, entryDetails };
  }

  const refreshedLock = await queryVirtualObjectLock(
    context,
    virtualObjectIdentity.service,
    virtualObjectIdentity.key,
    virtualObjectIdentity.scope,
  );
  const { lockHolder: refreshedLockEntry } = refreshedLock;
  if (!refreshedLockEntry) {
    return { lock: refreshedLock, entryDetails };
  }
  const refreshedLockDetails = await getVirtualObjectEntryDetails(
    context,
    lockEntryRows(refreshedLock),
  );
  const lockWithDetails = addEntryDetailsToLock(
    refreshedLock,
    refreshedLockDetails,
  );
  if (!isLockConsistent(lockWithDetails, refreshedLockDetails)) {
    return undefined;
  }
  return {
    lock: lockWithDetails,
    entryDetails: mergeEntryDetails(entryDetails, refreshedLockDetails),
  };
}

function visibleInboxEntry(
  entryRow: VirtualObjectEntryRow,
  entryDetails: VirtualObjectEntryDetails,
) {
  if (!entryRow.id) return undefined;
  const entry = entryDetails.entriesById.get(entryRow.id);
  if (!entry) return undefined;
  if (
    !entryDetails.vqueueEntryIds.has(entryRow.id) ||
    entry.stage !== 'inbox'
  ) {
    return undefined;
  }
  if (entry.kind === 'invocation' && !entry.invocation) return undefined;
  return entry;
}

function buildInboxResponse(
  foundEntries: VirtualObjectEntryRow[],
  entryDetails: VirtualObjectEntryDetails,
  { lock, inboxCount }: InboxResponseOptions = {},
): VirtualObjectInboxResponse {
  const visibleEntries = foundEntries.flatMap((entryRow) => {
    const entry = visibleInboxEntry(entryRow, entryDetails);
    return entry ? [entry] : [];
  });
  const actualLockHolderId = lock?.lockHolder?.id;
  const lockHolderDetails = actualLockHolderId
    ? entryDetails.entriesById.get(actualLockHolderId)
    : undefined;
  const lockHolderIsInInbox = Boolean(
    actualLockHolderId &&
    (entryDetails.vqueueEntryIds.has(actualLockHolderId)
      ? lockHolderDetails?.stage === 'inbox'
      : foundEntries.some((entry) => entry.id === actualLockHolderId)),
  );
  const lockHolderId = actualLockHolderId;
  const rows = lockHolderId
    ? visibleEntries.filter((entry) => entry.id !== lockHolderId)
    : visibleEntries;
  const visibleInboxCount =
    inboxCount !== undefined
      ? Math.max(0, inboxCount - (lockHolderIsInInbox ? 1 : 0))
      : undefined;
  const candidateCount =
    foundEntries.length -
    (lockHolderId && foundEntries.some((entry) => entry.id === lockHolderId)
      ? 1
      : 0);

  return {
    rows: rows.slice(0, INBOX_LIMIT),
    ...(visibleInboxCount !== undefined
      ? { inboxCount: visibleInboxCount }
      : {}),
    limit: INBOX_LIMIT,
    truncated: candidateCount > INBOX_LIMIT,
  };
}

async function getInboxEntriesAndLockDetails(
  context: QueryContext,
  virtualObjectIdentity: VirtualObjectIdentity,
  foundEntries: VirtualObjectEntryRow[],
  initialLock: VirtualObjectLock,
  inboxCount?: number,
): Promise<Response> {
  const entryDetails = await getVirtualObjectEntryDetails(context, [
    ...foundEntries,
    ...lockEntryRows(initialLock),
  ]);
  const reconciledLockDetails = await reconcileInboxLockDetails(
    context,
    virtualObjectIdentity,
    initialLock,
    entryDetails,
  );
  return reconciledLockDetails
    ? Response.json(
        buildInboxResponse(foundEntries, reconciledLockDetails.entryDetails, {
          lock: reconciledLockDetails.lock,
          inboxCount,
        }),
      )
    : virtualObjectSnapshotChangedResponse();
}

function hasConflictingLockEntry(
  entryDetails: VirtualObjectEntryDetails,
  lockHolderId?: string,
) {
  return [...entryDetails.entriesById].some(
    ([id, entry]) =>
      id !== lockHolderId &&
      entryDetails.vqueueEntryIds.has(id) &&
      entry.hasLock === true &&
      entry.stage !== 'finished',
  );
}

async function getScopedInboxEntriesAndLockDetails(
  context: QueryContext,
  virtualObjectIdentity: ScopedVirtualObjectIdentity,
  foundEntries: VirtualObjectEntryRow[],
  initialLock: VirtualObjectLock,
  inboxCount?: number,
) {
  const [initialEntryDetails, refreshedLock] = await Promise.all([
    getVirtualObjectEntryDetails(context, [
      ...foundEntries,
      ...lockEntryRows(initialLock),
    ]),
    queryVirtualObjectLock(
      context,
      virtualObjectIdentity.service,
      virtualObjectIdentity.key,
      virtualObjectIdentity.scope,
    ),
  ]);
  const { lockHolder: initialEntryWithLock } = initialLock;
  const { lockHolder: refreshedLockEntry } = refreshedLock;
  const lockEntryChanged = initialEntryWithLock?.id !== refreshedLockEntry?.id;
  let entryDetails = initialEntryDetails;
  if (refreshedLockEntry && lockEntryChanged) {
    entryDetails = mergeEntryDetails(
      entryDetails,
      await getVirtualObjectEntryDetails(context, lockEntryRows(refreshedLock)),
    );
  }
  const lock = addEntryDetailsToLock(refreshedLock, entryDetails);
  if (
    !isLockConsistent(lock, entryDetails) ||
    hasConflictingLockEntry(entryDetails, lock.lockHolder?.id)
  ) {
    return virtualObjectSnapshotChangedResponse();
  }

  return Response.json(
    buildInboxResponse(foundEntries, entryDetails, {
      lock,
      inboxCount,
    }),
  );
}

async function findScopedInboxEntriesAndGetLockDetails(
  context: QueryContext,
  virtualObjectIdentity: ScopedVirtualObjectIdentity,
) {
  const [initialLock, foundEntries, inboxCount] = await Promise.all([
    queryVirtualObjectLock(
      context,
      virtualObjectIdentity.service,
      virtualObjectIdentity.key,
      virtualObjectIdentity.scope,
    ),
    findScopedVirtualObjectInboxEntries(
      context,
      virtualObjectIdentity.service,
      virtualObjectIdentity.key,
      virtualObjectIdentity.scope,
    ),
    queryVirtualObjectInboxCount(
      context,
      virtualObjectIdentity.service,
      virtualObjectIdentity.key,
      virtualObjectIdentity.scope,
    ),
  ]);
  return getScopedInboxEntriesAndLockDetails(
    context,
    virtualObjectIdentity,
    foundEntries,
    initialLock,
    inboxCount,
  );
}

async function findInboxEntriesAndGetLockDetails(
  context: QueryContext,
  virtualObjectIdentity: VirtualObjectIdentity,
  findEntries: () => Promise<VirtualObjectEntryRow[]>,
) {
  const [initialLock, foundEntries, inboxCount] = await Promise.all([
    queryVirtualObjectLock(
      context,
      virtualObjectIdentity.service,
      virtualObjectIdentity.key,
      virtualObjectIdentity.scope,
    ),
    findEntries(),
    queryVirtualObjectInboxCount(
      context,
      virtualObjectIdentity.service,
      virtualObjectIdentity.key,
      virtualObjectIdentity.scope,
    ),
  ]);
  return getInboxEntriesAndLockDetails(
    context,
    virtualObjectIdentity,
    foundEntries,
    initialLock,
    inboxCount,
  );
}

export async function getVirtualObjectInbox(
  this: QueryContext,
  service: string,
  key: string,
  scope?: string,
) {
  const virtualObjectIdentity = { service, key, scope };

  if (usesIndexesV1(this)) {
    return findInboxEntriesAndGetLockDetails(this, virtualObjectIdentity, () =>
      findIndexedVirtualObjectInboxEntries(this, service, key, scope),
    );
  }
  if (scope !== undefined) {
    return findScopedInboxEntriesAndGetLockDetails(this, {
      service,
      key,
      scope,
    });
  }
  return findInboxEntriesAndGetLockDetails(this, virtualObjectIdentity, () =>
    findSingleVqueueInboxEntries(this, service, key, scope),
  );
}
