import type {
  components,
  RawInvocation,
  Service,
} from '@restate/data-access/admin-api-spec';
import { convertInvocation, type VqueueStatus } from '../convertInvocation';
import { TERMINAL_INVOCATION_STATUSES } from '../invocationStatuses';
import {
  getSysInvocationListColumns,
  quoteSqlString,
  type QueryContext,
} from './shared';
import { queryVirtualObjectLock } from './getVirtualObjectLock';

const INBOX_LIMIT = 25;
const QUERY_LIMIT = INBOX_LIMIT + 1;
const SCOPED_VQUEUE_QUERY_LIMIT = 250;

export type VirtualObjectInboxMode = 'exclusive' | 'shared';
type VirtualObjectInboxEntry = components['schemas']['VirtualObjectInboxEntry'];
type VirtualObjectInboxResponse =
  components['schemas']['VirtualObjectInboxResponse'];
type VirtualObjectLock = components['schemas']['VirtualObjectLockResponse'];
type VirtualObjectInboxSnapshotChangedResponse =
  components['schemas']['VirtualObjectInboxSnapshotChangedResponse'];

const SNAPSHOT_CHANGED_MESSAGE =
  'Object activity changed while loading—try again.';

const TERMINAL_INVOCATION_STATUS_SET = new Set<string>(
  TERMINAL_INVOCATION_STATUSES,
);

interface InboxEntryRow {
  id?: string;
  kind?: string;
  stage?: string;
  status?: string;
  has_lock?: boolean;
  run_at?: string;
  sequence_number?: number;
  created_at?: string;
  transitioned_at?: string;
  vqueue_id?: string;
  first_attempt_at?: string;
  latest_attempt_at?: string;
  first_runnable_at?: string;
  retry_attempts?: number;
  retry_count_since_last_stored_command?: number;
  num_attempts?: number;
  num_errors?: number;
  deployment?: string;
}

interface InboxEntryDetails {
  entriesById: Map<string, VirtualObjectInboxEntry>;
  vqueueEntryIds: Set<string>;
}

interface ReconciledInboxLockDetails {
  lock: VirtualObjectLock;
  entryDetails: InboxEntryDetails;
}

type InvocationSelection = 'active' | 'all';

interface VirtualObjectIdentity {
  service: string;
  key: string;
  scope?: string;
}

interface ScopedVirtualObjectIdentity extends VirtualObjectIdentity {
  scope: string;
}

interface InboxDetailsOptions {
  invocationSelection?: InvocationSelection;
  requireVqueueInboxStage?: boolean;
  confirmMissingLegacyLock?: boolean;
  inboxCount?: number;
}

interface InboxResponseOptions {
  lock?: VirtualObjectLock;
  requireVqueueInboxStage?: boolean;
  inboxCount?: number;
}

function entryKind(value: unknown) {
  return value === 'invocation' || value === 'state-mutation' ? value : 'other';
}

function handlerClause(handlerNames: string[]) {
  return handlerNames.map(quoteSqlString).join(', ');
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

// Called for every `mode=shared` request after resolving the service's shared
// handlers; it returns without querying when that handler set is empty.
async function findSharedInboxEntries(
  context: QueryContext,
  service: string,
  key: string,
  handlerNames: string[],
  scope?: string,
) {
  if (handlerNames.length === 0) return [];

  const scopeClause = context.features.has('vqueues')
    ? scope === undefined
      ? '\n      AND si.scope IS NULL'
      : `\n      AND si.scope = ${quoteSqlString(scope)}`
    : '';
  const { rows } = await context.query(
    `SELECT si.id
    FROM sys_invocation_status si
    WHERE si.target_service_ty = 'virtual_object'
      AND si.target_service_name = ${quoteSqlString(service)}
      AND si.target_service_key = ${quoteSqlString(key)}${scopeClause}
      AND si.target_handler_name IN (${handlerClause(handlerNames)})
    ORDER BY si.created_at DESC NULLS LAST
    LIMIT ${QUERY_LIMIT}`,
  );
  return rows.map((row) => ({ id: row['id'], kind: 'invocation' }));
}

// Called for `mode=exclusive` when `vqueues` is enabled and either the request
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
    LIMIT ${QUERY_LIMIT}`,
  );
  return rows as InboxEntryRow[];
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
    LIMIT ${QUERY_LIMIT}`,
  );
  return rows as InboxEntryRow[];
}

// Called for `mode=exclusive` when the `vqueues` feature is unavailable.
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
    LIMIT ${QUERY_LIMIT}`,
  );
  return rows.map((row) => ({ id: row['id'], kind: 'invocation' }));
}

// Called while loading inbox entries when `vqueues` is enabled and at least
// one entry ID was returned by an inbox or Virtual Object lock query.
async function getVqueueEntryDetailsByIds(
  context: QueryContext,
  entryIds: string[],
) {
  if (!context.features.has('vqueues') || entryIds.length === 0) {
    return [];
  }
  const { rows } = await context.query(
    `SELECT
      entry_id AS id,
      entry_kind AS kind,
      vqueue_id,
      stage,
      status,
      has_lock,
      next_at AS run_at,
      sequence_number,
      created_at,
      transitioned_at,
      first_attempt_at,
      latest_attempt_at,
      first_runnable_at,
      retry_attempts,
      retry_count_since_last_stored_command,
      num_attempts,
      num_errors,
      deployment
    FROM sys_vqueue_entry_status
    WHERE entry_id IN (${entryIds.map(quoteSqlString).join(', ')})
      AND stage <> 'finished'`,
  );
  return rows as InboxEntryRow[];
}

// Called while loading inbox entries when at least one entry is an invocation;
// exclusive requests retain only active invocations while shared requests keep
// recent invocations in every status.
async function getInvocationsByIds(
  context: QueryContext,
  invocationIds: string[],
  invocationSelection: InvocationSelection,
) {
  if (invocationIds.length === 0) return [];
  const statusClause =
    invocationSelection === 'active' ? "\n      AND status <> 'completed'" : '';
  const { rows } = await context.query(
    `SELECT ${getSysInvocationListColumns(context.features).join(', ')}
    FROM sys_invocation
    WHERE id IN (${invocationIds.map(quoteSqlString).join(', ')})${statusClause}`,
  );
  return rows as RawInvocation[];
}

function toVqueueStatus(entryRow: InboxEntryRow): VqueueStatus {
  return {
    vqueue_id: entryRow.vqueue_id,
    stage: entryRow.stage as VqueueStatus['stage'],
    status: entryRow.status,
    next_at: entryRow.run_at,
    created_at: entryRow.created_at,
    transitioned_at: entryRow.transitioned_at,
    first_attempt_at: entryRow.first_attempt_at,
    latest_attempt_at: entryRow.latest_attempt_at,
    first_runnable_at: entryRow.first_runnable_at,
    retry_attempts: entryRow.retry_attempts,
    retry_count_since_last_stored_command:
      entryRow.retry_count_since_last_stored_command,
    num_attempts: entryRow.num_attempts,
    num_errors: entryRow.num_errors,
    deployment: entryRow.deployment,
  };
}

async function getEntryDetails(
  context: QueryContext,
  foundEntries: InboxEntryRow[],
  invocationSelection: InvocationSelection = 'active',
) {
  const entryRowsById = new Map<string, InboxEntryRow>();
  for (const entry of foundEntries) {
    if (entry.id && !entryRowsById.has(entry.id)) {
      entryRowsById.set(entry.id, entry);
    }
  }
  const entryIds = [...entryRowsById.keys()];
  const invocationIds = entryIds.filter((id) => {
    const entry = entryRowsById.get(id);
    return entry?.kind === 'invocation' || id.startsWith('inv_');
  });
  const [statusRows, invocationRows] = await Promise.all([
    getVqueueEntryDetailsByIds(context, entryIds),
    getInvocationsByIds(context, invocationIds, invocationSelection),
  ]);
  const vqueueEntryIds = new Set<string>();
  for (const statusRow of statusRows) {
    if (statusRow.id) {
      vqueueEntryIds.add(statusRow.id);
      entryRowsById.set(statusRow.id, {
        ...entryRowsById.get(statusRow.id),
        ...statusRow,
      });
    }
  }
  const rawInvocationsById = new Map(
    invocationRows.flatMap((invocation) =>
      invocationSelection === 'all' || invocation.status !== 'completed'
        ? [[invocation.id, invocation] as const]
        : [],
    ),
  );
  const entriesById = new Map<string, VirtualObjectInboxEntry>();

  for (const [id, entryRow] of entryRowsById) {
    const kind = entryKind(entryRow.kind);
    const rawInvocation = rawInvocationsById.get(id);
    const invocation = rawInvocation
      ? convertInvocation(rawInvocation, toVqueueStatus(entryRow))
      : undefined;
    entriesById.set(id, {
      id,
      kind,
      ...(invocation ? { invocation } : {}),
      ...(entryRow.vqueue_id ? { vqueueId: entryRow.vqueue_id } : {}),
      ...(entryRow.has_lock !== undefined
        ? { hasLock: entryRow.has_lock }
        : {}),
      ...(entryRow.run_at ? { runAt: entryRow.run_at } : {}),
      ...(entryRow.sequence_number !== undefined
        ? { sequenceNumber: entryRow.sequence_number }
        : {}),
      ...(entryRow.stage ? { stage: entryRow.stage } : {}),
      ...(entryRow.status ? { status: entryRow.status } : {}),
      ...(entryRow.created_at ? { createdAt: entryRow.created_at } : {}),
      ...(entryRow.transitioned_at
        ? { transitionedAt: entryRow.transitioned_at }
        : {}),
    });
  }

  return { entriesById, vqueueEntryIds } satisfies InboxEntryDetails;
}

function lockEntryRows(lock: VirtualObjectLock) {
  const { lockHolder: entryWithLock } = lock;
  return entryWithLock && entryWithLock.kind !== 'other'
    ? [{ id: entryWithLock.id, kind: entryWithLock.kind }]
    : [];
}

function addEntryDetailsToLock(
  lock: VirtualObjectLock,
  lockDetails: InboxEntryDetails,
  inferAcquiredAtFromInvocation = false,
): VirtualObjectLock {
  const { lockHolder: entryWithLock } = lock;
  if (!entryWithLock) return lock;
  const entry = lockDetails.entriesById.get(entryWithLock.id);
  const acquiredAt =
    entryWithLock.acquiredAt ??
    (inferAcquiredAtFromInvocation ? entry?.invocation?.running_at : undefined);
  return {
    ...lock,
    lockHolder: {
      ...(entry ?? {
        id: entryWithLock.id,
        kind: entryWithLock.kind,
      }),
      ...(acquiredAt ? { acquiredAt } : {}),
    },
  };
}

function isLockConsistent(
  context: QueryContext,
  lock: VirtualObjectLock,
  lockDetails: InboxEntryDetails,
) {
  const { lockHolder: entryWithLock } = lock;
  if (!entryWithLock) return true;
  if (entryWithLock.kind === 'other') return true;
  const entry = lockDetails.entriesById.get(entryWithLock.id);
  if (!entry) return false;
  if (context.features.has('vqueues')) {
    return (
      lockDetails.vqueueEntryIds.has(entryWithLock.id) &&
      entry.hasLock === true &&
      entry.stage !== 'finished' &&
      (entry.kind !== 'invocation' || Boolean(entry.invocation))
    );
  }
  return Boolean(
    entry.invocation &&
    !TERMINAL_INVOCATION_STATUS_SET.has(entry.invocation.status),
  );
}

function entryDetailsContainLock(entryDetails: InboxEntryDetails) {
  return [...entryDetails.entriesById].some(
    ([id, entry]) =>
      entryDetails.vqueueEntryIds.has(id) &&
      entry.hasLock === true &&
      entry.stage !== 'finished',
  );
}

function mergeEntryDetails(
  entryDetails: InboxEntryDetails,
  refreshedLockDetails: InboxEntryDetails,
): InboxEntryDetails {
  const entriesById = new Map(entryDetails.entriesById);
  for (const [id, entry] of refreshedLockDetails.entriesById) {
    entriesById.set(id, entry);
  }
  const vqueueEntryIds = new Set(entryDetails.vqueueEntryIds);
  for (const id of refreshedLockDetails.vqueueEntryIds) {
    vqueueEntryIds.add(id);
  }
  return { entriesById, vqueueEntryIds };
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
  entryDetails: InboxEntryDetails,
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
  entryDetails: InboxEntryDetails,
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
  const refreshedLockDetails = await getEntryDetails(
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
  entryRow: InboxEntryRow,
  entryDetails: InboxEntryDetails,
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
  foundEntries: InboxEntryRow[],
  entryDetails: InboxEntryDetails,
  {
    lock,
    requireVqueueInboxStage = false,
    inboxCount,
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

  return {
    supported: true,
    rows: visibleEntries.slice(0, INBOX_LIMIT),
    ...(lock ? { lock } : {}),
    ...(inboxCount !== undefined ? { inboxCount } : {}),
    limit: INBOX_LIMIT,
    truncated: foundEntries.length > INBOX_LIMIT,
  };
}

async function getInboxEntriesAndLockDetails(
  context: QueryContext,
  virtualObjectIdentity: VirtualObjectIdentity,
  foundEntries: InboxEntryRow[],
  initialLock: VirtualObjectLock,
  {
    invocationSelection = 'active',
    requireVqueueInboxStage = false,
    confirmMissingLegacyLock = false,
    inboxCount,
  }: InboxDetailsOptions = {},
): Promise<Response> {
  const entryDetails = await getEntryDetails(
    context,
    [...foundEntries, ...lockEntryRows(initialLock)],
    invocationSelection,
  );
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
        }),
      )
    : snapshotChangedResponse();
}

function hasConflictingLockEntry(
  entryDetails: InboxEntryDetails,
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
  foundEntries: InboxEntryRow[],
  initialLock: VirtualObjectLock,
  inboxCount?: number,
) {
  const [initialEntryDetails, refreshedLock] = await Promise.all([
    getEntryDetails(context, [...foundEntries, ...lockEntryRows(initialLock)]),
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
      await getEntryDetails(context, lockEntryRows(refreshedLock)),
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

async function findSharedVirtualObjectInboxEntries(
  context: QueryContext,
  virtualObjectIdentity: VirtualObjectIdentity,
) {
  const serviceMetadata = await context.adminApi<Service>(
    `/services/${encodeURIComponent(virtualObjectIdentity.service)}`,
  );
  const handlerNames = serviceMetadata.handlers
    .filter((handler) => handler.ty === 'Shared')
    .map((handler) => handler.name);
  return findSharedInboxEntries(
    context,
    virtualObjectIdentity.service,
    virtualObjectIdentity.key,
    handlerNames,
    virtualObjectIdentity.scope,
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
  findEntries: () => Promise<InboxEntryRow[]>,
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
  mode: VirtualObjectInboxMode,
  scope?: string,
) {
  if (scope !== undefined && !this.features.has('vqueues')) {
    return Response.json({
      ...unsupportedInbox(),
      lock: { supported: false },
    });
  }

  const virtualObjectIdentity = { service, key, scope };

  if (mode === 'shared') {
    return findInboxEntriesAndGetLockDetails(
      this,
      virtualObjectIdentity,
      () => findSharedVirtualObjectInboxEntries(this, virtualObjectIdentity),
      { invocationSelection: 'all' },
    );
  }
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
  const entryDetails = await getEntryDetails(this, foundEntries);
  return Response.json(
    buildInboxResponse(foundEntries, entryDetails, {
      requireVqueueInboxStage: true,
    }),
  );
}
