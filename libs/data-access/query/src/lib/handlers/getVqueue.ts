import type {
  components,
  RawInvocation,
  VqueueEntryStage,
  VqueueEntryStatus,
  VqueueGateDuration,
  VqueueSnapshot,
} from '@restate/data-access/admin-api-spec';
import { convertInvocationV2, type VqueueStatus } from '../convertInvocation';
import {
  getSysInvocationColumns,
  type QueryContext,
  quoteSqlString,
} from './shared';
import {
  parseVqueueBlockedResource,
  parseVqueueSchedulingStatus,
} from './vqueueScheduler';

const GATES = [
  'concurrency_rules',
  'throttling_rules',
  'invoker_concurrency',
  'invoker_throttling',
  'invoker_memory',
  'lock',
  'deployment_concurrency',
] as const;

const AVG_GATES = [
  'concurrency_rules',
  'invoker_concurrency',
  'invoker_throttling',
  'lock',
] as const;

const VQUEUE_ENTRY_STAGES = [
  'inbox',
  'running',
  'suspended',
  'paused',
  'finished',
] as const satisfies readonly VqueueEntryStage[];

const VQUEUE_ENTRY_STATUSES = [
  'new',
  'scheduled',
  'backing-off',
  'yielded',
  'started',
  'succeeded',
  'failed',
  'cancelled',
  'killed',
] as const satisfies readonly VqueueEntryStatus[];

function enumValue<T extends string>(values: readonly T[], value?: string) {
  return values.find((item) => item === value);
}

function metaQuery(vqueueId: string) {
  return `SELECT
  service_name,
  scope,
  lock_name,
  limit_key,
  created_at,
  queue_is_paused,
  num_inbox,
  num_running,
  num_suspended,
  num_paused,
  num_finished,
  avg_inbox_duration,
  avg_run_duration,
  avg_suspension_duration,
  avg_queue_duration,
  avg_end_to_end_duration,
  avg_blocked_on_concurrency_rules,
  avg_blocked_on_invoker_concurrency,
  avg_blocked_on_invoker_throttling,
  avg_blocked_on_lock,
  last_enqueued_at,
  last_start_at,
  last_attempt_at,
  last_finish_at
FROM sys_vqueue_meta
WHERE id = ${quoteSqlString(vqueueId)}`;
}

function schedulerWithHeadQuery(vqueueId: string) {
  return `SELECT
  s.status,
  s.blocked_on,
  s.blocked_on_json,
  s.head_entry_id,
  s.scheduled_at,
  s.invoker_concurrency_block_duration,
  s.throttling_rules_block_duration,
  s.invoker_throttling_block_duration,
  s.invoker_memory_block_duration,
  s.concurrency_rules_block_duration,
  s.lock_block_duration,
  s.deployment_concurrency_block_duration,
  h.entry_id AS head_status_entry_id,
  h.stage AS head_stage,
  h.status AS head_status,
  h.entry_kind AS head_kind,
  h.transitioned_at AS head_transitioned_at,
  h.next_at AS head_next_at,
  h.created_at AS head_created_at,
  h.sequence_number AS head_sequence_number,
  h.retry_attempts AS head_retry_attempts,
  h.num_attempts AS head_num_attempts,
  h.num_errors AS head_num_errors,
  h.num_suspensions AS head_num_suspensions,
  h.num_pauses AS head_num_pauses,
  h.num_yields AS head_num_yields,
  h.deployment AS head_deployment,
  h.has_lock AS head_has_lock,
  h.total_blocked_on_invoker_concurrency AS head_total_blocked_on_invoker_concurrency,
  h.total_blocked_on_throttling_rules AS head_total_blocked_on_throttling_rules,
  h.total_blocked_on_invoker_throttling AS head_total_blocked_on_invoker_throttling,
  h.total_blocked_on_invoker_memory AS head_total_blocked_on_invoker_memory,
  h.total_blocked_on_concurrency_rules AS head_total_blocked_on_concurrency_rules,
  h.total_blocked_on_lock AS head_total_blocked_on_lock,
  h.total_blocked_on_deployment_concurrency AS head_total_blocked_on_deployment_concurrency
FROM sys_scheduler s
LEFT JOIN sys_vqueue_entry_status h
  ON h.vqueue_id = s.id AND h.entry_id = s.head_entry_id
WHERE s.id = ${quoteSqlString(vqueueId)}`;
}

type Row = Record<string, unknown>;

interface MetaRow extends Row {
  service_name: string;
  scope?: string;
  lock_name?: string;
  limit_key?: string;
  created_at?: string;
  queue_is_paused: boolean;
  num_inbox: number;
  num_running: number;
  num_suspended: number;
  num_paused: number;
  num_finished: number;
  avg_inbox_duration?: string;
  avg_run_duration?: string;
  avg_suspension_duration?: string;
  avg_queue_duration?: string;
  avg_end_to_end_duration?: string;
  last_enqueued_at?: string;
  last_start_at?: string;
  last_attempt_at?: string;
  last_finish_at?: string;
}

interface SchedulerRow extends Row {
  status?: string;
  blocked_on?: string;
  blocked_on_json?: unknown;
  head_entry_id?: string;
  scheduled_at?: string;
  head_status_entry_id?: string;
  head_stage?: string;
  head_status?: string;
  head_kind?: string;
  head_transitioned_at?: string;
  head_next_at?: string;
  head_created_at?: string;
  head_sequence_number?: number;
  head_retry_attempts?: number;
  head_num_attempts?: number;
  head_num_errors?: number;
  head_num_suspensions?: number;
  head_num_pauses?: number;
  head_num_yields?: number;
  head_deployment?: string;
  head_has_lock?: boolean;
}

interface EntryRow extends Row {
  entry_id?: string;
  vqueue_id?: string;
  stage?: string;
  status?: string;
  sequence_number?: number;
  transitioned_at?: string;
  next_at?: string;
  created_at?: string;
  first_runnable_at?: string;
  first_attempt_at?: string;
  latest_attempt_at?: string;
  retry_attempts?: number;
  retry_count_since_last_stored_command?: number;
  num_attempts?: number;
  num_errors?: number;
  num_suspensions?: number;
  num_pauses?: number;
  num_yields?: number;
  deployment?: string;
}

interface PositionRow extends Row {
  position?: number;
}

function numberValue(value: unknown): number | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function gateDurations(
  row: Row | undefined,
  columnFor: (gate: string) => string,
  gates: readonly string[],
): VqueueGateDuration[] {
  if (!row) {
    return [];
  }
  return gates.flatMap((gate) => {
    const value = row[columnFor(gate)];
    if (value === null || value === undefined || value === '' || value === 0) {
      return [];
    }
    const duration = String(value);
    return duration === '0' || duration === 'PT0S' ? [] : [{ gate, duration }];
  });
}

function headSnapshot(
  meta: MetaRow,
  scheduler: SchedulerRow | undefined,
): VqueueSnapshot['head'] {
  const stage = enumValue(VQUEUE_ENTRY_STAGES, scheduler?.head_stage);
  const status = enumValue(VQUEUE_ENTRY_STATUSES, scheduler?.head_status);

  return {
    ...(scheduler?.head_entry_id && { entryId: scheduler.head_entry_id }),
    ...(scheduler?.head_status_entry_id && {
      stage,
      status,
      kind: scheduler.head_kind,
      transitionedAt: scheduler.head_transitioned_at,
      nextAt: scheduler.head_next_at,
      createdAt: scheduler.head_created_at,
      sequenceNumber: scheduler.head_sequence_number,
      retryAttempts: scheduler.head_retry_attempts,
      numAttempts: scheduler.head_num_attempts,
      numErrors: scheduler.head_num_errors,
      numSuspensions: scheduler.head_num_suspensions,
      numPauses: scheduler.head_num_pauses,
      numYields: scheduler.head_num_yields,
      deployment: scheduler.head_deployment,
      hasLock: scheduler.head_has_lock,
    }),
    totalBlocks: gateDurations(
      scheduler,
      (gate) => `head_total_blocked_on_${gate}`,
      GATES,
    ),
    nowBlocks: gateDurations(
      scheduler,
      (gate) => `${gate}_block_duration`,
      GATES,
    ),
    avgBlocks: gateDurations(
      meta,
      (gate) => `avg_blocked_on_${gate}`,
      AVG_GATES,
    ),
  };
}

function focusEntryQuery(focusEntryId: string) {
  return `SELECT
  e.entry_id,
  e.vqueue_id,
  e.stage,
  e.status,
  e.sequence_number,
  e.created_at,
  e.first_runnable_at,
  e.first_attempt_at,
  e.latest_attempt_at,
  e.transitioned_at,
  e.next_at,
  e.retry_attempts,
  e.retry_count_since_last_stored_command,
  e.num_attempts,
  e.num_errors,
  e.num_suspensions,
  e.num_pauses,
  e.num_yields,
  e.deployment,
  e.total_blocked_on_invoker_concurrency,
  e.total_blocked_on_throttling_rules,
  e.total_blocked_on_invoker_throttling,
  e.total_blocked_on_invoker_memory,
  e.total_blocked_on_concurrency_rules,
  e.total_blocked_on_lock,
  e.total_blocked_on_deployment_concurrency,
  e.latest_attempt_blocked_on_invoker_concurrency,
  e.latest_attempt_blocked_on_throttling_rules,
  e.latest_attempt_blocked_on_invoker_throttling,
  e.latest_attempt_blocked_on_invoker_memory,
  e.latest_attempt_blocked_on_concurrency_rules,
  e.latest_attempt_blocked_on_lock,
  e.latest_attempt_blocked_on_deployment_concurrency
FROM sys_vqueue_entry_status e
WHERE e.entry_id = ${quoteSqlString(focusEntryId)}
  AND e.entry_kind = 'invocation'`;
}

function focusedInvocationQuery(context: QueryContext, focusEntryId: string) {
  return `SELECT ${getSysInvocationColumns(context.features).join(', ')} FROM sys_invocation WHERE id = ${quoteSqlString(focusEntryId)}`;
}

function focusEntryPositionQuery(vqueueId: string, focusEntryId: string) {
  return `SELECT position
FROM (
  SELECT
    entry_id,
    ROW_NUMBER() OVER (
      ORDER BY has_lock DESC, run_at ASC, sequence_number ASC, entry_id ASC
    ) AS position
  FROM sys_vqueues
  WHERE id = ${quoteSqlString(vqueueId)}
    AND stage = 'inbox'
) ranked
WHERE entry_id = ${quoteSqlString(focusEntryId)}`;
}

function toFocusEntry(
  row: EntryRow,
  focusEntryId: string,
  position: PositionRow | undefined,
) {
  return {
    id: row.entry_id ?? focusEntryId,
    status: enumValue(VQUEUE_ENTRY_STATUSES, row.status),
    stage: enumValue(VQUEUE_ENTRY_STAGES, row.stage),
    position: numberValue(position?.position),
    attempts: row.num_attempts,
    suspensions: row.num_suspensions,
    pauses: row.num_pauses,
    yields: row.num_yields,
    errors: row.num_errors,
    createdAt: row.created_at,
    firstRunnableAt: row.first_runnable_at,
    firstAttemptAt: row.first_attempt_at,
    transitionedAt: row.transitioned_at,
    nextAt: row.next_at,
    totalBlocks: gateDurations(
      row,
      (gate) => `total_blocked_on_${gate}`,
      GATES,
    ),
    latestBlocks: gateDurations(
      row,
      (gate) => `latest_attempt_blocked_on_${gate}`,
      GATES,
    ),
  };
}

export async function getVqueue(
  this: QueryContext,
  vqueueId: string,
  focusEntryId?: string,
) {
  if (!this.features.has('vqueues') || !vqueueId) {
    return new Response(null, { status: 204 });
  }

  const snapshot = await getVqueueSnapshot.call(this, vqueueId, focusEntryId);

  return snapshot
    ? Response.json(snapshot)
    : new Response(null, { status: 204 });
}

export async function getVqueueSnapshot(
  this: QueryContext,
  vqueueId: string,
  focusEntryId?: string,
  options?: {
    focusedInvocation?: components['schemas']['InvocationV2'];
    requestTime?: string;
  },
): Promise<VqueueSnapshot | undefined> {
  if (!this.features.has('vqueues') || !vqueueId) {
    return undefined;
  }

  const requestTime = options?.requestTime ?? new Date().toISOString();
  const [
    metaResult,
    schedulerResult,
    focusEntryResult,
    focusedInvocationResult,
  ] = await Promise.all([
    this.query(metaQuery(vqueueId), 'vqueues/snapshot-meta'),
    this.query(schedulerWithHeadQuery(vqueueId), 'vqueues/snapshot-scheduler'),
    focusEntryId
      ? this.query(focusEntryQuery(focusEntryId), 'vqueues/focus-entry')
      : Promise.resolve(undefined),
    focusEntryId && !options?.focusedInvocation
      ? this.query(
          focusedInvocationQuery(this, focusEntryId),
          'invocations/get',
        )
      : Promise.resolve(undefined),
  ]);

  const meta = metaResult.rows.at(0) as MetaRow | undefined;
  if (!meta) {
    return undefined;
  }

  const scheduler = schedulerResult.rows.at(0) as SchedulerRow | undefined;
  const focusEntryRow = focusEntryResult?.rows.at(0) as EntryRow | undefined;
  const focusEntryBelongs = focusEntryRow?.vqueue_id === vqueueId;
  const focusedInvocationRow = focusedInvocationResult?.rows.at(0) as
    | RawInvocation
    | undefined;
  const focusedInvocation =
    options?.focusedInvocation ??
    (focusedInvocationRow
      ? convertInvocationV2(
          focusedInvocationRow,
          focusEntryRow as VqueueStatus | undefined,
          requestTime,
        )
      : undefined);
  const focusPositionResult =
    focusEntryId && focusEntryBelongs && focusEntryRow?.stage === 'inbox'
      ? await this.query(
          focusEntryPositionQuery(vqueueId, focusEntryId),
          'vqueues/focus-entry-position',
        )
      : undefined;
  const focusPosition = focusPositionResult?.rows.at(0) as
    | PositionRow
    | undefined;

  const objectKey =
    meta.lock_name && meta.lock_name.startsWith(`${meta.service_name}/`)
      ? meta.lock_name.slice(meta.service_name.length + 1)
      : undefined;
  const blockedResource = parseVqueueBlockedResource(
    scheduler?.blocked_on_json,
  );
  const scheduling = parseVqueueSchedulingStatus(scheduler?.status);
  return {
    identity: {
      service: meta.service_name,
      ...(objectKey && { objectKey }),
      ...(meta.scope && { scope: meta.scope }),
      ...(meta.limit_key && { limitKey: meta.limit_key }),
      isPaused: Boolean(meta.queue_is_paused),
      vqueueId,
    },
    status: {
      blocked:
        Boolean(scheduler?.blocked_on) ||
        scheduler?.status === 'blocked' ||
        Boolean(blockedResource),
      ...(scheduler?.blocked_on && { blockedOn: scheduler.blocked_on }),
      ...(scheduling && { scheduling }),
      ...(scheduler?.scheduled_at && {
        scheduledAt: scheduler.scheduled_at,
      }),
      ...(blockedResource && { blockedResource }),
    },
    counts: {
      inbox: meta.num_inbox,
      running: meta.num_running,
      suspended: meta.num_suspended,
      paused: meta.num_paused,
      finished: meta.num_finished,
    },
    stageAvg: {
      ...(meta.avg_inbox_duration && { inbox: meta.avg_inbox_duration }),
      ...(meta.avg_run_duration && { running: meta.avg_run_duration }),
      ...(meta.avg_suspension_duration && {
        suspended: meta.avg_suspension_duration,
      }),
      ...(meta.avg_queue_duration && { queue: meta.avg_queue_duration }),
      ...(meta.avg_end_to_end_duration && {
        endToEnd: meta.avg_end_to_end_duration,
      }),
    },
    events: {
      ...(meta.created_at && { createdAt: meta.created_at }),
      ...(meta.last_enqueued_at && { enqueuedAt: meta.last_enqueued_at }),
      ...(meta.last_start_at && { startAt: meta.last_start_at }),
      ...(meta.last_attempt_at && { attemptAt: meta.last_attempt_at }),
      ...(meta.last_finish_at && { finishAt: meta.last_finish_at }),
    },
    head: headSnapshot(meta, scheduler),
    ...(focusedInvocation && { focusedInvocation }),
    ...(focusEntryId &&
      focusEntryBelongs &&
      focusEntryRow && {
        focusEntry: toFocusEntry(focusEntryRow, focusEntryId, focusPosition),
      }),
  };
}
