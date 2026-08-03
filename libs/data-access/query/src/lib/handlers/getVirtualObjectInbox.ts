import type { components } from '@restate/data-access/admin-api-spec';
import { quoteSqlString, type QueryContext } from './shared';
import { queryVirtualObjectLock } from './getVirtualObjectLock';
import {
  addEntryDetailsToLock,
  entryDetailsContainLock,
  getVirtualObjectEntryDetails,
  isLockConsistent,
  lockEntryRows,
  mergeEntryDetails,
  type VirtualObjectEntryDetails,
  type VirtualObjectEntryRow,
} from './virtualObjectEntries';

const INBOX_LIMIT = 25;
const INBOX_QUERY_LIMIT = INBOX_LIMIT + 1;
const SCOPED_VQUEUE_QUERY_LIMIT = 250;

type VirtualObjectInboxResponse =
  components['schemas']['VirtualObjectInboxResponse'];
type VirtualObjectLock = components['schemas']['VirtualObjectLockResponse'];
type VirtualObjectInboxSnapshotChangedResponse =
  components['schemas']['VirtualObjectInboxSnapshotChangedResponse'];

const SNAPSHOT_CHANGED_MESSAGE =
  'Object activity changed while loading—try again.';

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

interface InboxDetailsOptions {
  requireVqueueInboxStage?: boolean;
  confirmMissingLegacyLock?: boolean;
  inboxCount?: number;
}

interface InboxResponseOptions {
  lock?: VirtualObjectLock;
  requireVqueueInboxStage?: boolean;
  inboxCount?: number;
  excludeLockHolder?: boolean;
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
  );
  const value = rows.at(0)?.['inbox_count'];
  if (value === null) return 0;
  const count = Number(value);
  return Number.isSafeInteger(count) && count >= 0 ? count : undefined;
}

async function queryLegacyVirtualObjectInboxCount(
  context: QueryContext,
  service: string,
  key: string,
) {
  const { rows } = await context.query(
    `SELECT COUNT(*) AS inbox_count
    FROM sys_inbox
    WHERE service_name = ${quoteSqlString(service)}
      AND service_key = ${quoteSqlString(key)}`,
  );
  const count = Number(rows.at(0)?.['inbox_count']);
  return Number.isSafeInteger(count) && count >= 0 ? count : undefined;
}

function queryInboxCount(
  context: QueryContext,
  virtualObjectIdentity: VirtualObjectIdentity,
) {
  return context.features.has('vqueues')
    ? queryVirtualObjectInboxCount(
        context,
        virtualObjectIdentity.service,
        virtualObjectIdentity.key,
        virtualObjectIdentity.scope,
      )
    : queryLegacyVirtualObjectInboxCount(
        context,
        virtualObjectIdentity.service,
        virtualObjectIdentity.key,
      );
}

// Called when `vqueues` is enabled and either the request
// has no scope or `scoped_virtual_objects` is unavailable.
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
  );
  return rows as VirtualObjectEntryRow[];
}

// Called when the `vqueues` feature is unavailable.
async function findLegacyInboxEntries(
  context: QueryContext,
  service: string,
  key: string,
) {
  const { rows } = await context.query(
    `SELECT id
    FROM sys_inbox
    WHERE service_name = ${quoteSqlString(service)}
      AND service_key = ${quoteSqlString(key)}
    LIMIT ${INBOX_QUERY_LIMIT}`,
  );
  return rows.map((row) => ({ id: row['id'], kind: 'invocation' }));
}

function snapshotChangedResponse() {
  const body: VirtualObjectInboxSnapshotChangedResponse = {
    message: SNAPSHOT_CHANGED_MESSAGE,
    restate_code: 'snapshot_changed',
  };
  return Response.json(body, { status: 409 });
}

function isInitialLockConsistent(
  context: QueryContext,
  lock: VirtualObjectLock,
  entryDetails: VirtualObjectEntryDetails,
  confirmMissingLegacyLock: boolean,
) {
  const { lockHolder: entryWithLock } = lock;
  if (entryWithLock) {
    return isLockConsistent(context, lock, entryDetails);
  }
  if (entryDetailsContainLock(entryDetails)) return false;
  return !confirmMissingLegacyLock || context.features.has('vqueues');
}

async function reconcileInboxLockDetails(
  context: QueryContext,
  virtualObjectIdentity: VirtualObjectIdentity,
  initialLock: VirtualObjectLock,
  entryDetails: VirtualObjectEntryDetails,
  confirmMissingLegacyLock: boolean,
): Promise<ReconciledInboxLockDetails | undefined> {
  const inferAcquiredAtFromInvocation = !context.features.has('vqueues');
  const lock = addEntryDetailsToLock(
    initialLock,
    entryDetails,
    inferAcquiredAtFromInvocation,
  );
  if (
    isInitialLockConsistent(
      context,
      lock,
      entryDetails,
      confirmMissingLegacyLock,
    )
  ) {
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
    inferAcquiredAtFromInvocation,
  );
  if (!isLockConsistent(context, lockWithDetails, refreshedLockDetails)) {
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
  requireVqueueInboxStage: boolean,
) {
  if (!entryRow.id) return undefined;
  const entry = entryDetails.entriesById.get(entryRow.id);
  if (!entry) return undefined;
  if (
    requireVqueueInboxStage &&
    (!entryDetails.vqueueEntryIds.has(entryRow.id) || entry.stage !== 'inbox')
  ) {
    return undefined;
  }
  if (entry.kind === 'invocation' && !entry.invocation) return undefined;
  return entry;
}

function buildInboxResponse(
  foundEntries: VirtualObjectEntryRow[],
  entryDetails: VirtualObjectEntryDetails,
  {
    lock,
    requireVqueueInboxStage = false,
    inboxCount,
    excludeLockHolder = false,
  }: InboxResponseOptions = {},
): VirtualObjectInboxResponse {
  const visibleEntries = foundEntries.flatMap((entryRow) => {
    const entry = visibleInboxEntry(
      entryRow,
      entryDetails,
      requireVqueueInboxStage,
    );
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
      : excludeLockHolder &&
        foundEntries.some((entry) => entry.id === actualLockHolderId)),
  );
  const lockHolderId = excludeLockHolder ? actualLockHolderId : undefined;
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
    supported: true,
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
  {
    requireVqueueInboxStage = false,
    confirmMissingLegacyLock = false,
    inboxCount,
  }: InboxDetailsOptions = {},
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
    confirmMissingLegacyLock,
  );
  return reconciledLockDetails
    ? Response.json(
        buildInboxResponse(foundEntries, reconciledLockDetails.entryDetails, {
          lock: reconciledLockDetails.lock,
          requireVqueueInboxStage,
          inboxCount,
          excludeLockHolder: true,
        }),
      )
    : snapshotChangedResponse();
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
    !isLockConsistent(context, lock, entryDetails) ||
    hasConflictingLockEntry(entryDetails, lock.lockHolder?.id)
  ) {
    return snapshotChangedResponse();
  }

  return Response.json(
    buildInboxResponse(foundEntries, entryDetails, {
      lock,
      requireVqueueInboxStage: true,
      inboxCount,
      excludeLockHolder: true,
    }),
  );
}

function unsupportedInbox(): VirtualObjectInboxResponse {
  return {
    supported: false,
    rows: [],
    limit: INBOX_LIMIT,
    truncated: false,
  };
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
    queryInboxCount(context, virtualObjectIdentity),
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
  options?: InboxDetailsOptions,
) {
  const [initialLock, foundEntries, inboxCount] = await Promise.all([
    queryVirtualObjectLock(
      context,
      virtualObjectIdentity.service,
      virtualObjectIdentity.key,
      virtualObjectIdentity.scope,
    ),
    findEntries(),
    queryInboxCount(context, virtualObjectIdentity),
  ]);
  return getInboxEntriesAndLockDetails(
    context,
    virtualObjectIdentity,
    foundEntries,
    initialLock,
    { ...options, inboxCount },
  );
}

export async function getVirtualObjectInbox(
  this: QueryContext,
  service: string,
  key: string,
  scope?: string,
) {
  if (scope !== undefined && !this.features.has('vqueues')) {
    return Response.json(unsupportedInbox());
  }

  const virtualObjectIdentity = { service, key, scope };

  if (!this.features.has('vqueues')) {
    return findInboxEntriesAndGetLockDetails(
      this,
      virtualObjectIdentity,
      () => findLegacyInboxEntries(this, service, key),
      { confirmMissingLegacyLock: true },
    );
  }
  if (scope !== undefined && this.features.has('scoped_virtual_objects')) {
    return findScopedInboxEntriesAndGetLockDetails(this, {
      service,
      key,
      scope,
    });
  }
  return findInboxEntriesAndGetLockDetails(
    this,
    virtualObjectIdentity,
    () => findSingleVqueueInboxEntries(this, service, key, scope),
    { requireVqueueInboxStage: true },
  );
}

export async function getVqueueInbox(this: QueryContext, vqueueId: string) {
  if (!this.features.has('vqueues')) {
    return Response.json(unsupportedInbox());
  }
  const foundEntries = await findVqueueInboxEntriesById(this, vqueueId);
  const entryDetails = await getVirtualObjectEntryDetails(this, foundEntries);
  return Response.json(
    buildInboxResponse(foundEntries, entryDetails, {
      requireVqueueInboxStage: true,
    }),
  );
}
