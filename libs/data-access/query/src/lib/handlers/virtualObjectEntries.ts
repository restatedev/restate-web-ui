import type {
  components,
  RawInvocation,
} from '@restate/data-access/admin-api-spec';
import { convertInvocation, type VqueueStatus } from '../convertInvocation';
import { TERMINAL_INVOCATION_STATUSES } from '../invocationStatuses';
import {
  getSysInvocationListColumns,
  quoteSqlString,
  type QueryContext,
} from './shared';

type VirtualObjectInboxEntry = components['schemas']['VirtualObjectInboxEntry'];
type VirtualObjectLock = components['schemas']['VirtualObjectLockResponse'];
type InvocationSelection = 'active' | 'all';

const TERMINAL_INVOCATION_STATUS_SET = new Set<string>(
  TERMINAL_INVOCATION_STATUSES,
);

export interface VirtualObjectEntryRow {
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
  num_pauses?: number;
  num_suspensions?: number;
  num_yields?: number;
  deployment?: string;
}

export interface VirtualObjectEntryDetails {
  entriesById: Map<string, VirtualObjectInboxEntry>;
  vqueueEntryIds: Set<string>;
}

function entryKind(value: unknown) {
  return value === 'invocation' || value === 'state-mutation' ? value : 'other';
}

async function getVqueueEntryDetailsByIds(
  context: QueryContext,
  entryIds: string[],
  includeFinished: boolean,
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
    WHERE entry_id IN (${entryIds.map(quoteSqlString).join(', ')})${
      includeFinished ? '' : "\n      AND stage <> 'finished'"
    }`,
    'vqueues/entry-details',
  );
  return rows as VirtualObjectEntryRow[];
}

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
    'invocations/by-ids',
  );
  return rows as RawInvocation[];
}

function toVqueueStatus(entryRow: VirtualObjectEntryRow): VqueueStatus {
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

export async function getVirtualObjectEntryDetails(
  context: QueryContext,
  foundEntries: VirtualObjectEntryRow[],
  invocationSelection: InvocationSelection = 'active',
  includeFinishedEntryStatus = false,
) {
  const entryRowsById = new Map<string, VirtualObjectEntryRow>();
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
    getVqueueEntryDetailsByIds(context, entryIds, includeFinishedEntryStatus),
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
      ...(entryRow.first_runnable_at
        ? { firstRunnableAt: entryRow.first_runnable_at }
        : {}),
      ...(entryRow.first_attempt_at
        ? { firstAttemptAt: entryRow.first_attempt_at }
        : {}),
      ...(entryRow.latest_attempt_at
        ? { latestAttemptAt: entryRow.latest_attempt_at }
        : {}),
      ...(entryRow.num_attempts !== undefined
        ? { numAttempts: entryRow.num_attempts }
        : {}),
      ...(entryRow.num_errors !== undefined
        ? { numErrors: entryRow.num_errors }
        : {}),
      ...(entryRow.num_pauses !== undefined
        ? { numPauses: entryRow.num_pauses }
        : {}),
      ...(entryRow.num_suspensions !== undefined
        ? { numSuspensions: entryRow.num_suspensions }
        : {}),
      ...(entryRow.num_yields !== undefined
        ? { numYields: entryRow.num_yields }
        : {}),
      ...(entryRow.deployment ? { deployment: entryRow.deployment } : {}),
    });
  }

  return { entriesById, vqueueEntryIds } satisfies VirtualObjectEntryDetails;
}

export function lockEntryRows(lock: VirtualObjectLock) {
  const { lockHolder } = lock;
  return lockHolder && lockHolder.kind !== 'other'
    ? [{ id: lockHolder.id, kind: lockHolder.kind }]
    : [];
}

export function addEntryDetailsToLock(
  lock: VirtualObjectLock,
  lockDetails: VirtualObjectEntryDetails,
  inferAcquiredAtFromInvocation = false,
): VirtualObjectLock {
  const { lockHolder } = lock;
  if (!lockHolder) return lock;
  const entry = lockDetails.entriesById.get(lockHolder.id);
  const acquiredAt =
    lockHolder.acquiredAt ??
    (inferAcquiredAtFromInvocation ? entry?.invocation?.running_at : undefined);
  return {
    ...lock,
    lockHolder: {
      ...(entry ?? {
        id: lockHolder.id,
        kind: lockHolder.kind,
      }),
      ...(acquiredAt ? { acquiredAt } : {}),
    },
  };
}

export function isLockConsistent(
  context: QueryContext,
  lock: VirtualObjectLock,
  lockDetails: VirtualObjectEntryDetails,
) {
  const { lockHolder } = lock;
  if (!lockHolder || lockHolder.kind === 'other') return true;
  const entry = lockDetails.entriesById.get(lockHolder.id);
  if (!entry) return false;
  if (context.features.has('vqueues')) {
    return (
      lockDetails.vqueueEntryIds.has(lockHolder.id) &&
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

export function entryDetailsContainLock(
  entryDetails: VirtualObjectEntryDetails,
) {
  return [...entryDetails.entriesById].some(
    ([id, entry]) =>
      entryDetails.vqueueEntryIds.has(id) &&
      entry.hasLock === true &&
      entry.stage !== 'finished',
  );
}

export function mergeEntryDetails(
  entryDetails: VirtualObjectEntryDetails,
  refreshedLockDetails: VirtualObjectEntryDetails,
): VirtualObjectEntryDetails {
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
